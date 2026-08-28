import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { ProtectedRoute, PermissionRoute } from '../components/auth';
import PublicRoute from '../components/auth/PublicRoute';

import LoginPage from '../pages/LoginPage';
import Forbidden from '../pages/Forbidden';
import NotFound from '../pages/NotFound';

import Dashboard from '../pages/Dashboard';
import CollectMilk from '../pages/CollectMilk';
import CollectMilkInterunit from '../pages/CollectMilkInterunit.jsx';
import Farmers from '../pages/Farmers';
import Inventory from '../pages/Inventory';
import InventoryTransfer from '../pages/InventoryTransfer';
import Reports from '../pages/Reports';
import Settings from '../pages/Settings';
import Production from '../pages/production/Production';
import Quality from '../pages/Quality';
import DivisionPnL from '../pages/DivisionPnL';
import UsersAndRoles from '../pages/UsersAndRoles/index.jsx';
import AuthMatrix from '../pages/AuthMatrix/index.jsx';
import PurchaseRequisition from '../pages/PurchaseRequisition';
import TransferRequest from '../pages/TransferRequest';
import AdhocGoodsIssue from '../pages/AdhocGoodsIssue';
import PurchaseOrderRegister from '../pages/PurchaseOrderRegister';
import GrpoDebitNoteRegister from '../pages/GrpoDebitNoteRegister';
import ProductionRegister from '../pages/ProductionRegister';
import ConsumptionRegister from '../pages/ConsumptionRegister';
import QualityCheckRegister from '../pages/QualityCheckRegister';
import StockSummary from '../pages/StockSummary';

//! Production Management
import ProductionOrder from '../pages/Production_Management/ProductionOrder.jsx'
import ProductionIssue from '../pages/Production_Management/ProductionIssue.jsx'
import ProductionReceipt from '../pages/Production_Management/ProductionReceipt.jsx'
import StoreDispatch from '../pages/Production_Management/StoreDispatch.jsx'
import ProductionReceive from '../pages/Production_Management/ProductionReceive.jsx'
import ProductionReceiveRequest from '../pages/Production_Management/ProductionReceiveRequest.jsx'

/**
 * `menuKey` on each row must match the MenuURL configured in the Menu
 * master, because that is the key the permission matrix is keyed on.
 * Keeping it next to the path makes drift obvious in review.
 */
const guarded = (menuKey, element) => (
    <PermissionRoute menuKey={menuKey}>{element}</PermissionRoute>
);

const router = createBrowserRouter([
    {
        path: '/login',
        element: (
            <PublicRoute>
                <LoginPage />
            </PublicRoute>
        ),
    },

    {
        path: '/',
        element: (
            <ProtectedRoute>
                <Layout />
            </ProtectedRoute>
        ),
        children: [
            { index: true, element: <Navigate to="/dashboard" replace /> },

            //! Always reachable by an authenticated user
            { path: 'forbidden', element: <Forbidden /> },

            //! Permission-guarded screens
            { path: 'dashboard', element: guarded('/dashboard', <Dashboard />) },
            { path: 'collect-milk', element: guarded('/collect-milk', <CollectMilk />) },
            { path: 'collect-milk-interunit', element: guarded('/collect-milk-interunit', <CollectMilkInterunit />) },
            { path: 'farmers', element: guarded('/farmers', <Farmers />) },
            { path: 'stock', element: guarded('/stock', <Inventory />) },
            { path: 'inventory-transfer', element: guarded('/inventory-transfer', <InventoryTransfer />) },
            { path: 'reports', element: guarded('/reports', <Reports />) },
            { path: 'settings', element: guarded('/settings', <Settings />) },
            { path: 'production', element: guarded('/production', <Production />) },
            { path: 'quality', element: guarded('/quality', <Quality />) },
            { path: 'division-pnl', element: guarded('/division-pnl', <DivisionPnL />) },
            { path: 'users', element: guarded('/users', <UsersAndRoles />) },
            { path: 'auth', element: guarded('/auth', <AuthMatrix />) },
            { path: 'purchase-requisition', element: guarded('/purchase-requisition', <PurchaseRequisition />) },
            { path: 'transfer-request', element: guarded('/transfer-request', <TransferRequest />) },
            { path: 'adhoc-goods', element: guarded('/adhoc-goods', <AdhocGoodsIssue />) },
            { path: 'purchase-order-register', element: guarded('/purchase-order-register', <PurchaseOrderRegister />) },
            { path: 'grpo-debit-note', element: guarded('/grpo-debit-note', <GrpoDebitNoteRegister />) },
            { path: 'production-register', element: guarded('/production-register', <ProductionRegister />) },
            { path: 'consumption-register', element: guarded('/consumption-register', <ConsumptionRegister />) },
            { path: 'quality-check-register', element: guarded('/quality-check-register', <QualityCheckRegister />) },
            { path: 'stock-summary', element: guarded('/stock-summary', <StockSummary />) },
            { path: 'production-order', element: guarded('/production-order', <ProductionOrder />) },
            { path: 'production-issue', element: guarded('/production-issue', <ProductionIssue />) },
            { path: 'production-receive-request', element: guarded('/production-receive-request', <ProductionReceiveRequest />) },
            { path: 'production-receive', element: guarded('/production-receive', <ProductionReceive />) },
            { path: 'production-reciept', element: guarded('/production-reciept', <ProductionReceipt />) },
            { path: 'store-dispatch', element: guarded('/store-dispatch', <StoreDispatch />) },

            { path: '*', element: <NotFound /> },
        ],
    },

    { path: '*', element: <Navigate to="/login" replace /> },
]);

export default router;
