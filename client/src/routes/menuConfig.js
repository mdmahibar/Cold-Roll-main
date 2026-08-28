import {
    LayoutDashboard,
    Milk,
    Truck,
    FileText,
    ClipboardList,
    ArrowRightLeft,
    Warehouse,
    Factory,
    PackageOpen,
    PackagePlus,
    ShoppingCart,
    FileBox,
    Receipt,
    FileDown,
    PieChart,
    ClipboardCheck,
    FlaskConical,
    BarChart3,
    Package,
    Users,
    ShieldCheck,
    Settings as SettingsIcon,
} from 'lucide-react';

/**
 * SINGLE SOURCE OF TRUTH for navigation + authorization.
 *
 * `path` must exactly match the MenuURL stored in the Menu master
 * (/api/Menu/GetAllMenu), because that is the key used to look the
 * permission up in GetUserWiseMenu. Comparison is case-insensitive and
 * trailing-slash insensitive (see normalizePath).
 *
 * Add a screen here and it is automatically:
 *   1. permission-guarded in the router,
 *   2. hidden from the sidebar / top tabs when canView is false.
 */

export const MENU_SECTIONS = [
    {
        title: 'DASHBOARD',
        items: [{ name: 'Overview', icon: LayoutDashboard, path: '/dashboard', topNav: true }],
    },
    {
        title: 'MILK COLLECTION',
        items: [
            { name: 'Collect Milk', icon: Milk, path: '/collect-milk', topNav: true },
            { name: 'Collect Milk Interunit', icon: Truck, path: '/collect-milk-interunit', topNav: true },
            { name: 'Farmers', icon: Users, path: '/farmers' },
            { name: 'AP Invoice (SAP B1)', icon: FileText, path: '/ap-invoice' },
        ],
    },
    {
        title: 'INVENTORY (CUSTOM)',
        items: [
            { name: 'Purchase Requisition', icon: ClipboardList, path: '/purchase-requisition' },
            { name: 'Transfer Request', icon: ArrowRightLeft, path: '/transfer-request' },
            { name: 'Inventory Transfer', icon: Warehouse, path: '/inventory-transfer' },
            { name: 'Production (Issue & Receipt)', icon: Factory, path: '/production', topNav: true },
            { name: 'Adhoc Goods Issue', icon: PackageOpen, path: '/adhoc-goods' },
            { name: 'Stock', icon: Package, path: '/stock', topNav: true },
        ],
    },
    {
        title: 'PRODUCTION MANAGEMENT',
        items: [
            { name: 'Production Order', icon: ClipboardList, path: '/production-order' },
            { name: 'Production Issue', icon: Factory, path: '/production-issue' },
            { name: 'Production Receive Request', icon: PackagePlus, path: '/production-receive-request' },
            { name: 'Production Receive', icon: PackageOpen, path: '/production-receive' },
            { name: 'Production Receipt', icon: Receipt, path: '/production-reciept' },
            { name: 'Store Dispatch', icon: Truck, path: '/store-dispatch' },
        ],
    },
    {
        title: 'SAP B1 MODULES',
        items: [
            { name: 'Purchase Order', icon: ShoppingCart, path: '/purchase-order' },
            { name: 'GRPO', icon: FileBox, path: '/grpo' },
            { name: 'AP Invoice', icon: Receipt, path: '/sap-ap-invoice' },
            { name: 'Purchase Debit Note', icon: FileDown, path: '/purchase-debit-note' },
            { name: 'Division P&L', icon: PieChart, path: '/division-pnl', topNav: true },
        ],
    },
    {
        title: 'QUALITY',
        items: [{ name: 'Quality', icon: FlaskConical, path: '/quality', topNav: true }],
    },
    {
        title: 'REPORTS',
        items: [
            { name: 'Purchase Order Register', icon: ClipboardCheck, path: '/purchase-order-register' },
            { name: 'GRPO', icon: FileBox, path: '/grpo-debit-note' },
            { name: 'Production Register', icon: Factory, path: '/production-register' },
            { name: 'Consumption Register', icon: BarChart3, path: '/consumption-register' },
            { name: 'Quality Check Register', icon: FlaskConical, path: '/quality-check-register' },
            { name: 'Stock Summary', icon: Package, path: '/stock-summary' },
            { name: 'Reports', icon: BarChart3, path: '/reports' },
        ],
    },
    {
        title: 'ADMINISTRATION',
        items: [
            { name: 'Users & Roles', icon: Users, path: '/users', topNav: true },
            { name: 'Authorisation Matrix', icon: ShieldCheck, path: '/auth', topNav: true },
            { name: 'Settings', icon: SettingsIcon, path: '/settings' },
        ],
    },
];

/** Flat list of every registered menu item. */
export const MENU_ITEMS = MENU_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({ ...item, section: section.title }))
);

/** Items that should also appear as tabs in the TopNav strip. */
export const TOP_NAV_ITEMS = MENU_ITEMS.filter((item) => item.topNav);

/**
 * Routes that every authenticated user may open regardless of the
 * permission matrix (landing page, error pages, own profile).
 */
export const PUBLIC_AUTHENTICATED_PATHS = ['/forbidden', '/change-password'];
