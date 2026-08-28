import { normalizePath, toBool, unwrapList } from './Function';
import { ACTION } from '../constants/auth';

/**
 * Turns the raw /api/UserPermission/GetUserWiseMenu response into two
 * lookup structures the UI can use in O(1):
 *
 *   byPath  -> { '/users': { view:true, add:true, edit:false, delete:false } }
 *   byMenuId-> { 14: { view:true, ... } }
 *
 * The API row shape is:
 *   { MenuId, Title, MenuURL, ParentMenuId, DisplaySlNo,
 *     canView, canAdd, canEdit, canDelete }
 * Casing varies between endpoints, so every field is read defensively.
 */

const pick = (row, ...keys) => {
    for (const key of keys) {
        if (row?.[key] !== undefined && row[key] !== null) return row[key];
    }
    return undefined;
};

export function toPermissionRow(row) {
    return {
        menuId: Number(pick(row, 'MenuId', 'menuId', 'MENUID') ?? 0),
        parentMenuId: Number(pick(row, 'ParentMenuId', 'parentMenuId') ?? 0),
        title: pick(row, 'Title', 'title', 'MenuName') ?? '',
        shortName: pick(row, 'ShortName', 'shortName') ?? '',
        menuURL: pick(row, 'MenuURL', 'menuURL', 'MenuUrl', 'menuUrl') ?? '',
        cssFont: pick(row, 'CssFont', 'cssFont') ?? '',
        displaySlNo: Number(pick(row, 'DisplaySlNo', 'displaySlNo') ?? 0),
        [ACTION.VIEW]: toBool(pick(row, 'canView', 'CanView', 'IsView')),
        [ACTION.ADD]: toBool(pick(row, 'canAdd', 'CanAdd', 'IsAdd')),
        [ACTION.EDIT]: toBool(pick(row, 'canEdit', 'CanEdit', 'IsEdit')),
        [ACTION.DELETE]: toBool(pick(row, 'canDelete', 'CanDelete', 'IsDelete')),
    };
}

export function buildPermissionMap(response) {
    const rows = unwrapList(response).map(toPermissionRow);

    const byPath = {};
    const byMenuId = {};

    rows.forEach((row) => {
        const perms = {
            [ACTION.VIEW]: row[ACTION.VIEW],
            [ACTION.ADD]: row[ACTION.ADD],
            [ACTION.EDIT]: row[ACTION.EDIT],
            [ACTION.DELETE]: row[ACTION.DELETE],
        };
        if (row.menuId) byMenuId[row.menuId] = perms;
        if (row.menuURL) byPath[normalizePath(row.menuURL)] = perms;
    });

    return { rows, byPath, byMenuId };
}

/**
 * Builds the permission map from the LoginWiseData payload.
 *
 * The wrinkle: `objUserMenu` rows carry the flags (canView/canAdd/...) keyed by
 * `menuId` only — they have NO menuURL. The URL lives in the `objMenu` master.
 * So we join the two on menuId before delegating to buildPermissionMap, which
 * gives us a populated `byPath` (path-based route/sidebar checks need it) as
 * well as `byMenuId`.
 */
export function buildPermissionMapFromLoginWise(loginWiseData) {
    const menus = pick(loginWiseData, 'objMenu', 'ObjMenu') ?? [];
    const userMenus = pick(loginWiseData, 'objUserMenu', 'ObjUserMenu') ?? [];

    //! menuId -> menuURL, harvested from the menu master.
    const urlByMenuId = {};
    (Array.isArray(menus) ? menus : []).forEach((m) => {
        const id = Number(pick(m, 'menuId', 'MenuId') ?? 0);
        const url = pick(m, 'menuURL', 'MenuURL', 'menuUrl', 'menuUrl') ?? '';
        if (id) urlByMenuId[id] = url;
    });

    //! Graft the URL (and title, for completeness) onto each permission row so
    //! the shared row parser can key it by path.
    const joined = (Array.isArray(userMenus) ? userMenus : []).map((row) => {
        const id = Number(pick(row, 'menuId', 'MenuId') ?? 0);
        const master = (Array.isArray(menus) ? menus : []).find(
            (m) => Number(pick(m, 'menuId', 'MenuId') ?? 0) === id
        );
        return {
            ...row,
            MenuURL: urlByMenuId[id] ?? '',
            Title: pick(master, 'title', 'Title') ?? '',
            ParentMenuId: pick(master, 'parentMenuId', 'ParentMenuId') ?? 0,
            DisplaySlNo: pick(master, 'displaySlNo', 'DisplaySlNo') ?? 0,
        };
    });

    return buildPermissionMap(joined);
}

export const EMPTY_PERMISSION = {
    [ACTION.VIEW]: false,
    [ACTION.ADD]: false,
    [ACTION.EDIT]: false,
    [ACTION.DELETE]: false,
};

export const FULL_PERMISSION = {
    [ACTION.VIEW]: true,
    [ACTION.ADD]: true,
    [ACTION.EDIT]: true,
    [ACTION.DELETE]: true,
};
