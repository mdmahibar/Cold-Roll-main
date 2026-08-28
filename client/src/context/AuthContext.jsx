import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useCookies } from 'react-cookie';
import { LoginData, GetLoginWiseData, UserLogOutData } from '../services/Auth';
import { GetUserWiseMenuData } from '../services/UserPermission';
import {
    buildPermissionMap,
    buildPermissionMapFromLoginWise,
    EMPTY_PERMISSION,
    FULL_PERMISSION,
} from '../common/Permission';
import {
    encryptData,
    setSecureItem,
    getSecureItem,
    clearSecureStorage,
    normalizePath,
    unwrapResponse,
    toBool,
} from '../common/Function';
import {
    COOKIE,
    AUTH_COOKIE_LIST,
    COOKIE_OPTIONS,
    STORAGE,
    LOCAL_STORAGE,
    AUTH_EVENT,
    ACTION,
    RETURN_CODE,
} from '../constants/auth';
import { buildMenuTree } from '../routes/dynamicMenu';
import { getConfig } from '../config';

/** Mirror the raw access key / auth token into plain localStorage. */
const writeLocalAuth = ({ userId, accessKey, authToken }) => {
    try {
        localStorage.setItem(LOCAL_STORAGE.ACCESS_KEY, accessKey ?? '');
        localStorage.setItem(LOCAL_STORAGE.AUTH_TOKEN, authToken ?? '');
        localStorage.setItem(LOCAL_STORAGE.USER_ID, String(userId ?? ''));
    } catch {
        /* localStorage disabled (private mode / quota) — cookies still hold the session */
    }
};

const clearLocalAuth = () => {
    Object.values(LOCAL_STORAGE).forEach((key) => {
        try {
            localStorage.removeItem(key);
        } catch {
            /* ignore */
        }
    });
};

const AuthContext = createContext(null);

/** Reads a field from the login response regardless of its casing. */
const pick = (obj, ...keys) => {
    for (const key of keys) {
        if (obj?.[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
    }
    return undefined;
};

export const AuthProvider = ({ children }) => {
    const [cookies, setCookie, removeCookie] = useCookies(AUTH_COOKIE_LIST);

    const [user, setUser] = useState(null);
    const [permissions, setPermissions] = useState({ rows: [], byPath: {}, byMenuId: {} });
    const [loginWiseData, setLoginWiseData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    //! Keeps the latest cookie jar available inside callbacks without
    //! re-creating them on every cookie change.
    const cookieRef = useRef(cookies);
    cookieRef.current = cookies;

    const enforcePermissions = getConfig('REACT_APP_ENFORCE_PERMISSIONS', 'Y') !== 'N';

    /* ═══════════════════════════════════════════════════════════
       Cookie / storage plumbing
       ═══════════════════════════════════════════════════════════ */

    const writeSessionCookies = useCallback(
        ({ userId, accessKey, authToken, sapApplicable }) => {
            //! UserId is stored in clear text because it is also sent as a
            //! plain header value. Everything else is AES encrypted.
            setCookie(COOKIE.USER_ID, String(userId ?? ''), COOKIE_OPTIONS);
            setCookie(COOKIE.ACCESS_KEY, encryptData(accessKey ?? ''), COOKIE_OPTIONS);
            setCookie(COOKIE.AUTH_TOKEN, encryptData(authToken ?? ''), COOKIE_OPTIONS);
            setCookie(COOKIE.SAP_APPLICABLE, encryptData(sapApplicable ?? 'N'), COOKIE_OPTIONS);

            //! Plain (unencrypted) mirror in localStorage — persists across a
            //! browser restart and is readable outside the React/axios layer.
            writeLocalAuth({ userId, accessKey, authToken });

            //! Returned so the very next request can run before React
            //! has committed the cookie state.
            return {
                [COOKIE.USER_ID]: String(userId ?? ''),
                [COOKIE.ACCESS_KEY]: encryptData(accessKey ?? ''),
                [COOKIE.AUTH_TOKEN]: encryptData(authToken ?? ''),
                [COOKIE.SAP_APPLICABLE]: encryptData(sapApplicable ?? 'N'),
            };
        },
        [setCookie]
    );

    const clearSession = useCallback(() => {
        setUser(null);
        setPermissions({ rows: [], byPath: {}, byMenuId: {} });
        setLoginWiseData(null);
        clearSecureStorage();
        clearLocalAuth();
        AUTH_COOKIE_LIST.forEach((name) => removeCookie(name, { path: '/' }));
    }, [removeCookie]);

    /* ═══════════════════════════════════════════════════════════
       Permission + login-wise data loading
       ═══════════════════════════════════════════════════════════ */

    //! Kept for the admin AuthMatrix flow / explicit refresh: pulls the
    //! permission matrix straight from GetUserWiseMenu. Note this endpoint's
    //! rows may not carry a MenuURL, so byPath can come back empty — the
    //! runtime gate is fed by LoginWiseData below, which joins in the URLs.
    const loadPermissions = useCallback(async (userId, jar) => {
        const response = await GetUserWiseMenuData('GetUserWiseMenu', { UserId: userId }, jar);
        const map = buildPermissionMap(response);
        //! Only adopt it if it actually resolved paths; otherwise keep whatever
        //! LoginWiseData already established.
        if (Object.keys(map.byPath).length > 0) {
            setPermissions(map);
            setSecureItem(STORAGE.PERMISSIONS, map);
        }
        return map;
    }, []);

    const loadLoginWiseData = useCallback(async (userId, jar) => {
        const response = await GetLoginWiseData('LoginWiseData', { UserId: userId }, jar);
        //! The API wraps the payload in a single-element array ([{ ... }]);
        //! unwrapResponse peels that (and { Table: [...] }) back to the object.
        const data = unwrapResponse(response);
        setLoginWiseData(data);
        setSecureItem(STORAGE.LOGIN_WISE, data);

        //! LoginWiseData carries BOTH the menu master (objMenu) and the user's
        //! permission rows (objUserMenu). Joined on menuId they yield a map with
        //! a populated byPath — this is the authoritative source the sidebar and
        //! PermissionRoute rely on.
        const map = buildPermissionMapFromLoginWise(data);
        if (map.rows.length > 0) {
            setPermissions(map);
            setSecureItem(STORAGE.PERMISSIONS, map);
        }
        return data;
    }, []);

    /* ═══════════════════════════════════════════════════════════
       Bootstrap — restore an existing session on hard refresh
       ═══════════════════════════════════════════════════════════ */

    useEffect(() => {
        let cancelled = false;

        (async () => {
            const jar = cookieRef.current;
            const storedProfile = getSecureItem(STORAGE.PROFILE, null);
            const userId = jar[COOKIE.USER_ID];
            const authToken = jar[COOKIE.AUTH_TOKEN];

            //! No cookies -> nothing to restore.
            if (!userId || !authToken || !storedProfile) {
                if (!cancelled) {
                    if (userId || authToken) clearSession();
                    setIsLoading(false);
                }
                return;
            }

            if (cancelled) return;
            setUser(storedProfile);

            //! Use the cached copies first so a refresh is instant, then
            //! silently revalidate against the API.
            const cachedPerms = getSecureItem(STORAGE.PERMISSIONS, null);
            if (cachedPerms) setPermissions(cachedPerms);
            const cachedLoginWise = getSecureItem(STORAGE.LOGIN_WISE, null);
            if (cachedLoginWise) setLoginWiseData(cachedLoginWise);

            try {
                await Promise.all([
                    loadPermissions(storedProfile.userId, jar),
                    loadLoginWiseData(storedProfile.userId, jar),
                ]);
            } catch {
                //! Revalidation failure is non-fatal: a 401 is handled by the
                //! session-expired listener below, anything else keeps cache.
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ═══════════════════════════════════════════════════════════
       Session expiry raised by the axios response interceptor
       ═══════════════════════════════════════════════════════════ */

    useEffect(() => {
        const handler = () => clearSession();
        window.addEventListener(AUTH_EVENT.SESSION_EXPIRED, handler);
        return () => window.removeEventListener(AUTH_EVENT.SESSION_EXPIRED, handler);
    }, [clearSession]);

    /* ═══════════════════════════════════════════════════════════
       login()
       ═══════════════════════════════════════════════════════════ */

    const login = useCallback(
        async (userCode, password) => {
            setIsLoggingIn(true);
            try {
                const payload = { userCode, password, authToken: '' };
                const response = await LoginData('UserLogin', payload);
                const data = unwrapResponse(response);

                const returnCode = pick(data, 'returnCode', 'ReturnCode') ?? RETURN_CODE.FAIL;
                const returnMsg = pick(data, 'returnMsg', 'ReturnMsg') ?? 'Login failed.';

                if (returnCode !== RETURN_CODE.SUCCESS) {
                    return { success: false, message: returnMsg, returnCode };
                }

                //! The live server does not return the documented field names
                //! (userId/authToken/...). Instead it wraps the login result in
                //! the same generic {returnDocEntry, returnObjType, returnSeries,
                //! returnDocNum} shape used for SAP document operations, with
                //! `userId` present in the payload but always null. Confirmed
                //! mapping: returnDocEntry -> numeric user id, returnObjType ->
                //! AccessKey header, returnDocNum -> AuthToken header. These are
                //! two DIFFERENT opaque tokens; do not use one for both headers.
                const userId = pick(data, 'userId', 'UserId', 'returnDocEntry', 'ReturnDocEntry') ?? '';
                const accessKey =
                    pick(data, 'accessKey', 'AccessKey', 'returnObjType', 'ReturnObjType') ??
                    getConfig('REACT_APP_ACCESS_KEY', '');
                const authToken = pick(data, 'authToken', 'AuthToken', 'returnDocNum', 'ReturnDocNum') ?? '';
                const sapApplicable =
                    pick(data, 'sapApplicable', 'SAPApplicable') ?? getConfig('REACT_APP_SAP_APPLICABLE', 'N');

                if (import.meta.env.DEV) {
                    // eslint-disable-next-line no-console
                    console.warn(
                        '[auth] UserLogin response field mapping is inferred, not confirmed:',
                        { rawResponse: data, resolvedUserId: userId, resolvedAuthToken: authToken }
                    );
                }

                if (!userId || !authToken) {
                    return { success: false, message: 'Login response did not contain a session token.' };
                }

                const jar = writeSessionCookies({ userId, accessKey, authToken, sapApplicable });

                const profile = {
                    userId,
                    userCode: pick(data, 'userCode', 'UserCode') ?? userCode,
                    userName: pick(data, 'userName', 'UserName') ?? userCode,
                    roleId: pick(data, 'roleId', 'RoleId') ?? null,
                    roleName: pick(data, 'roleName', 'RoleName') ?? '',
                    emailID: pick(data, 'emailID', 'EmailID') ?? '',
                    employeeID: pick(data, 'employeeID', 'EmployeeID') ?? '',
                    sapApplicable,
                    isSuperUser: toBool(pick(data, 'isSuperUser', 'IsSuperUser', 'isAdmin', 'IsAdmin')),
                    isApprovalUser: toBool(pick(data, 'isApprovalUser', 'IsApprovalUser')),
                    lastLoginTime: pick(data, 'lastLoginTime', 'LastLoginTime') ?? '',
                    loginTime: new Date().toISOString(),
                };

                setUser(profile);
                setSecureItem(STORAGE.PROFILE, profile);

                //! LoginWiseData is mandatory — it supplies the navigation menu
                //! AND the permission matrix (joined objMenu + objUserMenu) the
                //! router depends on, so it must resolve before we report success.
                await loadLoginWiseData(userId, jar);
                //! Best-effort: refine with GetUserWiseMenu if it returns URLs.
                loadPermissions(userId, jar).catch(() => {});

                return { success: true, message: returnMsg, profile };
            } catch (error) {
                const message =
                    error?.response?.status === 401
                        ? 'Invalid user code or password.'
                        : 'Unable to reach the authentication server. Please try again.';
                return { success: false, message };
            } finally {
                setIsLoggingIn(false);
            }
        },
        [writeSessionCookies, loadPermissions, loadLoginWiseData]
    );

    /* ═══════════════════════════════════════════════════════════
       logout()
       ═══════════════════════════════════════════════════════════ */

    const logout = useCallback(async () => {
        const jar = cookieRef.current;
        try {
            //! UserId identifies whose session to invalidate — like every other
            //! authenticated GET, UserLogOut needs it as a query param, not just
            //! in the header. Without it the server can't kill the session.
            const userId = jar[COOKIE.USER_ID];
            if (jar[COOKIE.AUTH_TOKEN] && userId) {
                await UserLogOutData('UserLogOut', { UserId: userId }, jar);
            }
        } catch {
            //! Server-side logout is best effort — always clear locally.
        } finally {
            clearSession();
        }
    }, [clearSession]);

    /* ═══════════════════════════════════════════════════════════
       Permission helpers
       ═══════════════════════════════════════════════════════════ */

    const getPermission = useCallback(
        (menuKey) => {
            if (!menuKey) return EMPTY_PERMISSION;
            if (!enforcePermissions) return FULL_PERMISSION;
            if (user?.isSuperUser) return FULL_PERMISSION;

            if (typeof menuKey === 'number') {
                return permissions.byMenuId[menuKey] ?? EMPTY_PERMISSION;
            }
            return permissions.byPath[normalizePath(menuKey)] ?? EMPTY_PERMISSION;
        },
        [permissions, user, enforcePermissions]
    );

    const can = useCallback(
        (menuKey, action = ACTION.VIEW) => Boolean(getPermission(menuKey)[action]),
        [getPermission]
    );

    const refreshPermissions = useCallback(async () => {
        if (!user?.userId) return null;
        //! Reload LoginWiseData — it re-joins objMenu + objUserMenu, so both the
        //! menu and the permission matrix stay in sync after an admin edit.
        return loadLoginWiseData(user.userId, cookieRef.current);
    }, [user, loadLoginWiseData]);

    /* ═══════════════════════════════════════════════════════════
       Derived from LoginWiseData — the server-owned navigation tree
       plus the division / location masters the shell needs.
       ═══════════════════════════════════════════════════════════ */

    const menu = useMemo(() => buildMenuTree(loginWiseData), [loginWiseData]);
    const divisions = useMemo(
        () => loginWiseData?.objDivision ?? loginWiseData?.ObjDivision ?? [],
        [loginWiseData]
    );
    const locations = useMemo(
        () => loginWiseData?.objLocation ?? loginWiseData?.ObjLocation ?? [],
        [loginWiseData]
    );

    /* ═══════════════════════════════════════════════════════════ */

    const value = useMemo(
        () => ({
            user,
            permissions,
            loginWiseData,
            menu,
            divisions,
            locations,
            isLoading,
            isLoggingIn,
            isAuthenticated: Boolean(user && cookies[COOKIE.AUTH_TOKEN]),
            enforcePermissions,
            login,
            logout,
            can,
            getPermission,
            refreshPermissions,
        }),
        [
            user,
            permissions,
            loginWiseData,
            menu,
            divisions,
            locations,
            isLoading,
            isLoggingIn,
            cookies,
            enforcePermissions,
            login,
            logout,
            can,
            getPermission,
            refreshPermissions,
        ]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
