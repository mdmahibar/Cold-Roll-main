/**
 * Central place for every auth related magic string.
 * Nothing else in the app should hard-code a cookie / storage key.
 */

//! Cookie names — read by every service through buildAuthHeaders()
export const COOKIE = {
    ACCESS_KEY: 'AccessKey',
    USER_ID: 'UserId',
    AUTH_TOKEN: 'AuthToken',
    SAP_APPLICABLE: 'SAPApplicable',
};

export const AUTH_COOKIE_LIST = [
    COOKIE.ACCESS_KEY,
    COOKIE.USER_ID,
    COOKIE.AUTH_TOKEN,
    COOKIE.SAP_APPLICABLE,
];

//! Cookie options — session cookies (cleared when browser closes)
export const COOKIE_OPTIONS = {
    path: '/',
    sameSite: 'strict',
    secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
};

//! sessionStorage keys (encrypted payloads that are too large for a cookie)
export const STORAGE = {
    PROFILE: 'CR_SESSION_PROFILE',
    PERMISSIONS: 'CR_SESSION_PERMISSIONS',
    LOGIN_WISE: 'CR_SESSION_LOGINWISE',
};

//! localStorage keys — the raw session token / access key kept in plain
//! localStorage so they survive a browser restart and can be read by any
//! non-React helper (e.g. a fetch outside the axios layer). The cookie jar
//! remains the source of truth used by buildAuthHeaders(); these are a mirror.
export const LOCAL_STORAGE = {
    ACCESS_KEY: 'accesskey',
    AUTH_TOKEN: 'authtoken',
    USER_ID: 'userid',
};

//! Permission actions returned by /api/UserPermission/GetUserWiseMenu
export const ACTION = {
    VIEW: 'view',
    ADD: 'add',
    EDIT: 'edit',
    DELETE: 'delete',
};

//! Maps API flag names (canView / canAdd ...) to internal action names
export const API_ACTION_FLAG = {
    [ACTION.VIEW]: 'canView',
    [ACTION.ADD]: 'canAdd',
    [ACTION.EDIT]: 'canEdit',
    [ACTION.DELETE]: 'canDelete',
};

//! Global window events used to break the circular dependency between
//! apiService (no React) and AuthContext (React).
export const AUTH_EVENT = {
    SESSION_EXPIRED: 'auth:session-expired',
};

//! API return codes used by the .NET backend
export const RETURN_CODE = {
    SUCCESS: 'Y',
    FAIL: 'N',
    VALIDATION: 'F',
};
