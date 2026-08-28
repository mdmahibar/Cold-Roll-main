import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useCookies } from 'react-cookie';
import { Link } from 'react-router-dom';
import { Shield, Save, RotateCcw, Search, Info, Loader2, Check } from 'lucide-react';

import { GetAllMenuListData } from '../../services/Menu';
import { GetAllRoleListData } from '../../services/Role';
import { GetAllUserListData } from '../../services/User';
import {
    GetRoleWiseMenuData,
    GetUserWiseMenuData,
    PostRolePermissionData,
    PostUserPermissionData,
} from '../../services/UserPermission';
import { toPermissionRow } from '../../common/Permission';
import { unwrapList, toBool, toFlag } from '../../common/Function';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../hooks/usePermission';
import { AUTH_COOKIE_LIST, ACTION } from '../../constants/auth';
import './index.css';

const ACTIONS = [ACTION.VIEW, ACTION.ADD, ACTION.EDIT, ACTION.DELETE];
const ACTION_LABEL = { view: 'View', add: 'Add', edit: 'Edit', delete: 'Delete' };
const BLANK = { view: false, add: false, edit: false, delete: false };

/* ═══════════════════════════════════════════════════════════════
   Authorisation Matrix
   ───────────────────────────────────────────────────────────────
   Role-wise  : GET  /api/UserPermission/GetRoleWiseMenu?RoleId
                POST /api/UserPermission/PostRolePermission
   User-wise  : GET  /api/UserPermission/GetUserWiseMenu?UserId
                POST /api/UserPermission/PostUserPermission
   Menu tree  : GET  /api/Menu/GetAllMenu
   ═══════════════════════════════════════════════════════════════ */

const AuthMatrix = () => {
    const [cookies] = useCookies(AUTH_COOKIE_LIST);
    const { user, refreshPermissions } = useAuth();
    const { canEdit } = usePermission('/auth');

    const [viewBy, setViewBy] = useState('role'); // 'role' | 'user'
    const [search, setSearch] = useState('');

    const [menus, setMenus] = useState([]);
    const [roles, setRoles] = useState([]);
    const [users, setUsers] = useState([]);

    const [selectedId, setSelectedId] = useState(null);
    const [matrix, setMatrix] = useState({});         // { [menuId]: {view,add,edit,delete} }
    const [baseline, setBaseline] = useState({});     // last saved copy, for Reset

    const [isLoadingMasters, setIsLoadingMasters] = useState(true);
    const [isLoadingMatrix, setIsLoadingMatrix] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    /* ── Masters: menus + roles + users ─────────────────────── */
    useEffect(() => {
        if (!cookies.AuthToken) return;

        let cancelled = false;

        (async () => {
            setIsLoadingMasters(true);
            try {
                const [menuRes, roleRes, userRes] = await Promise.all([
                    GetAllMenuListData('GetAllMenu', {}, cookies),
                    GetAllRoleListData('GetAllRole', {}, cookies),
                    GetAllUserListData('GetAllUser', {}, cookies),
                ]);
                if (cancelled) return;

                setMenus(unwrapList(menuRes).map(toPermissionRow).sort((a, b) => a.displaySlNo - b.displaySlNo));
                setRoles(unwrapList(roleRes));
                setUsers(unwrapList(userRes));
            } catch {
                if (!cancelled) toast.error('Could not load the menu / role masters.');
            } finally {
                if (!cancelled) setIsLoadingMasters(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [cookies.AuthToken]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Normalised subject list for the left panel ─────────── */
    const subjects = useMemo(() => {
        if (viewBy === 'role') {
            return roles.map((r) => ({
                id: Number(r.RoleId ?? r.roleId),
                name: r.RoleName ?? r.roleName ?? '',
                sub: r.Description ?? r.description ?? '',
                isActive: toBool(r.IsActive ?? r.isActive ?? 'Y'),
            }));
        }
        return users.map((u) => ({
            id: Number(u.UserId ?? u.userId),
            name: u.UserName ?? u.userName ?? u.UserCode ?? '',
            sub: u.RoleName ?? u.roleName ?? u.UserCode ?? '',
            roleId: Number(u.RoleId ?? u.roleId ?? 0),
            isActive: toBool(u.IsActive ?? u.isActive ?? 'Y'),
        }));
    }, [viewBy, roles, users]);

    const filteredSubjects = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return subjects;
        return subjects.filter((s) => `${s.name} ${s.sub}`.toLowerCase().includes(q));
    }, [subjects, search]);

    const selectedSubject = useMemo(
        () => subjects.find((s) => s.id === selectedId) ?? null,
        [subjects, selectedId]
    );

    /* ── Load the matrix for the selected role / user ───────── */
    const loadMatrix = useCallback(
        async (id) => {
            if (!id) return;
            setIsLoadingMatrix(true);
            try {
                const response =
                    viewBy === 'role'
                        ? await GetRoleWiseMenuData('GetRoleWiseMenu', { RoleId: id }, cookies)
                        : await GetUserWiseMenuData('GetUserWiseMenu', { UserId: id }, cookies);

                const next = {};
                unwrapList(response)
                    .map(toPermissionRow)
                    .forEach((row) => {
                        if (!row.menuId) return;
                        next[row.menuId] = {
                            view: row.view,
                            add: row.add,
                            edit: row.edit,
                            delete: row.delete,
                        };
                    });

                setMatrix(next);
                setBaseline(next);
            } catch {
                toast.error('Could not load the permission matrix.');
                setMatrix({});
                setBaseline({});
            } finally {
                setIsLoadingMatrix(false);
            }
        },
        [viewBy, cookies]
    );

    useEffect(() => {
        //! Switching between role / user view resets the selection
        setSelectedId(null);
        setMatrix({});
        setBaseline({});
    }, [viewBy]);

    const handleSelectSubject = (id) => {
        setSelectedId(id);
        loadMatrix(id);
    };

    /* ── Matrix editing ─────────────────────────────────────── */
    const permOf = (menuId) => matrix[menuId] ?? BLANK;

    const togglePermission = (menuId, action) => {
        if (!canEdit) return;
        setMatrix((prev) => {
            const current = prev[menuId] ?? BLANK;
            const next = { ...current, [action]: !current[action] };

            //! Add / Edit / Delete are meaningless without View, and clearing
            //! View must clear everything — keeps the payload self-consistent.
            if (action === ACTION.VIEW && !next.view) {
                next.add = false;
                next.edit = false;
                next.delete = false;
            } else if (action !== ACTION.VIEW && next[action]) {
                next.view = true;
            }

            return { ...prev, [menuId]: next };
        });
    };

    const toggleRow = (menuId) => {
        if (!canEdit) return;
        const current = permOf(menuId);
        const allOn = ACTIONS.every((a) => current[a]);
        setMatrix((prev) => ({
            ...prev,
            [menuId]: allOn ? { ...BLANK } : { view: true, add: true, edit: true, delete: true },
        }));
    };

    const toggleColumn = (action) => {
        if (!canEdit) return;
        const allOn = menus.every((m) => permOf(m.menuId)[action]);
        setMatrix((prev) => {
            const next = { ...prev };
            menus.forEach((m) => {
                const current = next[m.menuId] ?? BLANK;
                const updated = { ...current, [action]: !allOn };
                if (action === ACTION.VIEW && allOn) {
                    updated.add = false;
                    updated.edit = false;
                    updated.delete = false;
                } else if (action !== ACTION.VIEW && !allOn) {
                    updated.view = true;
                }
                next[m.menuId] = updated;
            });
            return next;
        });
    };

    const isDirty = useMemo(() => JSON.stringify(matrix) !== JSON.stringify(baseline), [matrix, baseline]);

    /* ── Save ───────────────────────────────────────────────── */
    const handleSave = async () => {
        if (!selectedSubject) {
            toast.error('Select a role or user first.');
            return;
        }
        if (!canEdit) {
            toast.error('You do not have permission to change the authorisation matrix.');
            return;
        }

        setIsSaving(true);
        try {
            const rows = menus.map((menu) => {
                const perm = permOf(menu.menuId);
                return {
                    menuId: menu.menuId,
                    canView: toFlag(perm.view),
                    canAdd: toFlag(perm.add),
                    canEdit: toFlag(perm.edit),
                    canDelete: toFlag(perm.delete),
                };
            });

            const response =
                viewBy === 'role'
                    ? await PostRolePermissionData(
                          'PostRolePermission',
                          rows.map((r) => ({ roleId: selectedSubject.id, ...r })),
                          cookies
                      )
                    : await PostUserPermissionData(
                          'PostUserPermission',
                          rows.map((r) => ({
                              userId: selectedSubject.id,
                              roleId: selectedSubject.roleId ?? 0,
                              ...r,
                          })),
                          cookies
                      );

            const result = Array.isArray(response.data) ? response.data[0] : response.data;
            const code = result?.ReturnCode ?? result?.returnCode;

            if (code === 'N') {
                toast.error(result?.ReturnMsg ?? result?.returnMsg ?? 'Failed to save permissions.');
                return;
            }

            toast.success(`Permissions saved for ${selectedSubject.name}.`);
            setBaseline(matrix);

            //! If the admin just changed their own access, reload it now so
            //! the sidebar / guards reflect reality without a re-login.
            const changedSelf =
                (viewBy === 'user' && Number(selectedSubject.id) === Number(user?.userId)) ||
                (viewBy === 'role' && Number(selectedSubject.id) === Number(user?.roleId));
            if (changedSelf) await refreshPermissions();
        } catch {
            toast.error('Could not save the permissions. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => setMatrix(baseline);

    /* ── Group menus by parent for display ──────────────────── */
    const groupedMenus = useMemo(() => {
        const parents = menus.filter((m) => !m.parentMenuId);
        const childrenOf = (parentId) => menus.filter((m) => m.parentMenuId === parentId);

        const groups = parents.map((parent) => ({
            id: parent.menuId,
            label: parent.title,
            items: childrenOf(parent.menuId).length ? childrenOf(parent.menuId) : [parent],
        }));

        //! Menus whose parent is missing from the master still need a home.
        const covered = new Set(groups.flatMap((g) => g.items.map((i) => i.menuId)));
        const orphans = menus.filter((m) => !covered.has(m.menuId));
        if (orphans.length) groups.push({ id: 'other', label: 'OTHER', items: orphans });

        return groups;
    }, [menus]);

    /* ── Render ─────────────────────────────────────────────── */
    return (
        <div className="am-container">
            <Toaster position="top-right" />

            <div className="am-header">
                <div className="am-header-left">
                    <div className="am-title-row">
                        <Shield className="am-title-icon" />
                        <h1 className="am-title">Authorisation Matrix</h1>
                    </div>
                    <p className="am-subtitle">
                        Grant screen-level View / Add / Edit / Delete rights per role or per user.
                    </p>
                    <ul className="am-breadcrumb">
                        <li>
                            <Link className="am-breadcrumb-link" to="/dashboard">Home</Link>
                        </li>
                        <li className="am-breadcrumb-current">Authorisation Matrix</li>
                    </ul>
                </div>

                <div className="am-header-right">
                    <div className="am-view-by-wrapper">
                        <span className="am-view-by-label">View by</span>
                        <select
                            className="am-view-select"
                            value={viewBy}
                            onChange={(e) => setViewBy(e.target.value)}
                        >
                            <option value="role">Role</option>
                            <option value="user">User</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="am-panels">
                {/* ── Left: role / user picker ── */}
                <aside className="am-panel-left">
                    <h2 className="am-panel-title">
                        <Shield className="am-panel-title-icon" />
                        {viewBy === 'role' ? 'Roles' : 'Users'}
                    </h2>

                    <div className="am-search-wrapper">
                        <Search className="am-search-icon" />
                        <input
                            className="am-search-input"
                            placeholder={`Search ${viewBy === 'role' ? 'roles' : 'users'}...`}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="am-role-list">
                        {isLoadingMasters && (
                            <p className="am-tip">
                                <Loader2 className="am-btn-icon am-spin" /> Loading...
                            </p>
                        )}

                        {!isLoadingMasters && filteredSubjects.length === 0 && (
                            <p className="am-tip">No {viewBy === 'role' ? 'roles' : 'users'} found.</p>
                        )}

                        {filteredSubjects.map((subject) => (
                            <button
                                type="button"
                                key={subject.id}
                                onClick={() => handleSelectSubject(subject.id)}
                                className={`am-role-item ${selectedId === subject.id ? 'am-role-item--active' : ''}`}
                            >
                                <span className="am-role-radio">{selectedId === subject.id ? <Check size={12} /> : null}</span>
                                <span>
                                    <span className="am-role-name">{subject.name}</span>
                                    {subject.sub ? <span className="am-role-sub">{subject.sub}</span> : null}
                                </span>
                            </button>
                        ))}
                    </div>
                </aside>

                {/* ── Right: the matrix ── */}
                <section className="am-panel-right">
                    {!selectedSubject && (
                        <div className="am-matrix-empty">
                            <Info size={18} />
                            <p>Select a {viewBy} on the left to load its permissions.</p>
                        </div>
                    )}

                    {selectedSubject && isLoadingMatrix && (
                        <div className="am-matrix-empty">
                            <Loader2 size={18} className="am-spin" />
                            <p>Loading permissions for {selectedSubject.name}...</p>
                        </div>
                    )}

                    {selectedSubject && !isLoadingMatrix && (
                        <div className="am-matrix-wrapper">
                            <table className="am-matrix-table">
                                <thead className="am-matrix-thead">
                                    <tr>
                                        <th className="am-matrix-th">Screen</th>
                                        {ACTIONS.map((action) => (
                                            <th key={action} className="am-matrix-th am-matrix-th--perm">
                                                <button
                                                    type="button"
                                                    className="am-th-col-content"
                                                    onClick={() => toggleColumn(action)}
                                                    disabled={!canEdit}
                                                    title={`Toggle ${ACTION_LABEL[action]} for every screen`}
                                                >
                                                    <span className={`am-th-col-label am-th-col-label--${action}`}>
                                                        {ACTION_LABEL[action]}
                                                    </span>
                                                </button>
                                            </th>
                                        ))}
                                        <th className="am-matrix-th am-matrix-th--action">All</th>
                                    </tr>
                                </thead>

                                <tbody className="am-matrix-tbody">
                                    {groupedMenus.length === 0 && (
                                        <tr>
                                            <td className="am-matrix-item-td" colSpan={6}>
                                                No menus configured. Add them under Menu master first.
                                            </td>
                                        </tr>
                                    )}

                                    {groupedMenus.map((group) => (
                                        <React.Fragment key={group.id}>
                                            <tr className="am-matrix-group-row">
                                                <td className="am-matrix-group-td" colSpan={6}>
                                                    <span className="am-matrix-group-label">{group.label}</span>
                                                </td>
                                            </tr>

                                            {group.items.map((menu) => {
                                                const perm = permOf(menu.menuId);
                                                return (
                                                    <tr className="am-matrix-item-row" key={menu.menuId}>
                                                        <td className="am-matrix-item-td">
                                                            {menu.title}
                                                            {menu.menuURL ? (
                                                                <small style={{ color: '#94a3b8', marginLeft: 6 }}>
                                                                    {menu.menuURL}
                                                                </small>
                                                            ) : null}
                                                        </td>

                                                        {ACTIONS.map((action) => (
                                                            <td className="am-matrix-item-td-perm" key={action}>
                                                                <input
                                                                    type="checkbox"
                                                                    className={`am-checkbox am-checkbox--${action}`}
                                                                    checked={Boolean(perm[action])}
                                                                    disabled={!canEdit}
                                                                    onChange={() => togglePermission(menu.menuId, action)}
                                                                />
                                                            </td>
                                                        ))}

                                                        <td className="am-matrix-item-td-perm">
                                                            <input
                                                                type="checkbox"
                                                                className="am-checkbox"
                                                                checked={ACTIONS.every((a) => perm[a])}
                                                                disabled={!canEdit}
                                                                onChange={() => toggleRow(menu.menuId)}
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>

            <div className="am-bottom-bar">
                <div className="am-legend">
                    <span className="am-legend-item">View — open the screen</span>
                    <span className="am-legend-item">Add — create records</span>
                    <span className="am-legend-item">Edit — modify records</span>
                    <span className="am-legend-item">Delete — remove records</span>
                </div>

                <div>
                    <button
                        type="button"
                        className="am-btn-reset"
                        onClick={handleReset}
                        disabled={!isDirty || isSaving}
                    >
                        <RotateCcw className="am-btn-icon" /> Reset
                    </button>
                    <button
                        type="button"
                        className="am-btn-save"
                        onClick={handleSave}
                        disabled={!selectedSubject || !isDirty || isSaving || !canEdit}
                        title={canEdit ? 'Save permissions' : 'You do not have Edit permission'}
                    >
                        {isSaving ? <Loader2 className="am-btn-icon am-spin" /> : <Save className="am-btn-icon" />}
                        {isSaving ? 'Saving...' : 'Save Permissions'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthMatrix;
