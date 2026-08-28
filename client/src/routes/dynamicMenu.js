import { Circle } from 'lucide-react';
import { MENU_ITEMS } from './menuConfig';
import { normalizePath, toBool } from '../common/Function';

/**
 * Turns the `objMenu` list returned by /api/LoginData/LoginWiseData into the
 * navigation tree the sidebar renders. The server owns the menu now — this
 * module only decorates each node with the lucide icon already registered in
 * menuConfig (matched by MenuURL) and normalises the mixed casing the .NET API
 * uses between endpoints.
 *
 * objMenu row shape (see LoginWiseData sample):
 *   { menuId, parentMenuId, title, description, menuURL, cssFont,
 *     isActive, displaySlNo, shortName }
 */

const read = (row, ...keys) => {
    for (const key of keys) {
        if (row?.[key] !== undefined && row[key] !== null) return row[key];
    }
    return undefined;
};

//! path -> icon component, harvested once from the static config so the
//! server never has to ship an icon name.
const ICON_BY_PATH = MENU_ITEMS.reduce((acc, item) => {
    acc[normalizePath(item.path)] = item.icon;
    return acc;
}, {});

/** Returns an array of root nodes, each `{ id, name, path, icon, children[] }`. */
export function buildMenuTree(loginWiseData) {
    const rawMenu = read(loginWiseData, 'objMenu', 'ObjMenu');
    if (!Array.isArray(rawMenu) || rawMenu.length === 0) return [];

    const nodes = rawMenu
        .filter((m) => toBool(read(m, 'isActive', 'IsActive') ?? 'Y'))
        .map((m) => {
            const path = read(m, 'menuURL', 'MenuURL', 'menuUrl') ?? '';
            return {
                id: Number(read(m, 'menuId', 'MenuId') ?? 0),
                parentId: Number(read(m, 'parentMenuId', 'ParentMenuId') ?? 0),
                name: read(m, 'title', 'Title') ?? '',
                shortName: read(m, 'shortName', 'ShortName') ?? '',
                path,
                order: Number(read(m, 'displaySlNo', 'DisplaySlNo') ?? 0),
                icon: ICON_BY_PATH[normalizePath(path)] ?? Circle,
                children: [],
            };
        });

    const byId = new Map(nodes.map((n) => [n.id, n]));
    const roots = [];
    nodes.forEach((n) => {
        const parent = n.parentId && byId.get(n.parentId);
        if (parent) parent.children.push(n);
        else roots.push(n);
    });

    const sortRec = (list) => {
        list.sort((a, b) => a.order - b.order);
        list.forEach((n) => sortRec(n.children));
    };
    sortRec(roots);

    return roots;
}

/**
 * Flattens the tree into the `{ title, items }[]` shape the sidebar renderer
 * already understands, applying the live permission check to every leaf:
 *
 *   - a root WITH children becomes a titled section (its children are links),
 *   - a root WITHOUT children becomes a plain link grouped under a leading,
 *     untitled section.
 *
 * `canView` is `(pathOrMenuId) => boolean` — pass the auth context's helper.
 */
export function menuTreeToSections(tree, canView) {
    if (!Array.isArray(tree) || tree.length === 0) return [];

    const sections = [];
    const looseItems = [];

    const toLink = (node) => {
        let name = node.name;
        if (node.path === '/grpo-debit-note') {
            name = 'GRPO';
        }
        return { name, path: node.path, icon: node.icon };
    };
    const visible = (node) => Boolean(node.path) && canView(node.path, 'view');

    tree.forEach((node) => {
        if (node.children.length > 0) {
            const items = node.children.filter(visible).map(toLink);
            if (items.length) sections.push({ title: node.name, items });
        } else if (visible(node)) {
            looseItems.push(toLink(node));
        }
    });

    if (looseItems.length) sections.unshift({ title: '', items: looseItems });
    return sections;
}
