import { useDivision } from '../context/DivisionContext';
import {
  RefreshCw,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Info,
  Zap,
  FileText,
  ClipboardList,
  Package,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Milk,
  ArrowRightLeft,
  Receipt,
  AlertCircle,
  Factory,
  FlaskConical,
  Eye,
  ChevronRight,
  Activity,
  BarChart3,
  Droplets,
} from 'lucide-react';

import { loginToSAP } from '../SAPB1/auth/login.js';
import { getAllItems } from '../SAPB1/Items/ItemServices.js';
import { usePurchaseDeliveryNotes } from "../SAPB1/PurchaseDeliveryNotes/PurchaseDeliveryNotesServices.js"
import Loader from '../components/Loader/Loader.jsx';
import useItemMasterHook from '../hooks/useItemMasterHook.js';
import { getAllWarehouses } from '../SAPB1/warehouse/warehouseServices.js';
import useWarehouseHook from '../hooks/useWarehouseHook.js';
import useWarehouseStore from '../store/warehouseStore.js';


//! Tanstack Queary test
import { useAllDocSeries } from '../hooks/useGetDocSeries.js';

//! End Tanstack Queary

const Dashboard = () => {
  const { selectedDivision } = useDivision();

  const { itemMaster, refreshItemMaster } = useItemMasterHook();

  const { data: allDocsData, error, isPending, isFetching } = useAllDocSeries();
  useWarehouseHook();
  /* ─── Metric cards (unified row — includes P&L) ─── */
  const metricCards = [
    {
      label: "TODAY'S COLLECTION",
      value: '13,440',
      unit: 'KG',
      subtitle: 'Milk Division · Rampurhat',
      icon: Droplets,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-600',
      trend: '+8.2%',
      trendUp: true,
    },
    {
      label: 'PENDING TRANSFER',
      value: '4,200',
      unit: 'KG',
      subtitle: 'Ice Cream Division',
      icon: ArrowRightLeft,
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600',
      trend: null,
    },
    {
      label: 'AP INVOICES (TODAY)',
      value: '₹5.6L',
      unit: '',
      subtitle: '7 posted · SAP B1',
      icon: Receipt,
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-600',
      trend: '+3',
      trendUp: true,
    },
    {
      label: 'OPEN PRS',
      value: '12',
      unit: '',
      subtitle: 'Pending Approval',
      icon: AlertCircle,
      iconBg: 'bg-rose-500/10',
      iconColor: 'text-rose-600',
      trend: '-2',
      trendUp: false,
    },
    {
      label: 'PRODUCTION ISSUES',
      value: '3',
      unit: '',
      subtitle: 'Ice Cream · Today',
      icon: Factory,
      iconBg: 'bg-violet-500/10',
      iconColor: 'text-violet-600',
      trend: null,
    },
    {
      label: 'COMBINED P&L',
      value: '₹1.42Cr',
      unit: '',
      subtitle: 'Net Profit · Mar \'26',
      icon: TrendingUp,
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-600',
      trend: '+12.4%',
      trendUp: true,
    },
  ];

  /* ─── Transfer flow steps ─── */
  const flowSteps = [
    { label: 'Collection', sub: '13,440 KG', done: true },
    { label: 'Transfer Req.', sub: 'Raised', done: true },
    { label: 'Inv. Transfer', sub: 'In Progress', count: 3, active: true },
    { label: 'Prod. Issue', sub: 'Pending', count: 4 },
    { label: 'Prod. Receipt', sub: 'Pending', count: 5 },
  ];

  /* ─── Pending actions ─── */
  const pendingActions = [
    {
      title: 'AP Invoice Pending',
      desc: '7 awaiting SAP B1 post',
      badge: 7,
      borderColor: 'border-l-blue-500',
      bgColor: 'bg-blue-50/70',
      titleColor: 'text-blue-800',
      badgeBorder: 'border-blue-400 text-blue-600',
    },
    {
      title: 'PR Approvals',
      desc: '12 purchase requisitions',
      badge: 12,
      borderColor: 'border-l-amber-500',
      bgColor: 'bg-amber-50/70',
      titleColor: 'text-amber-800',
      badgeBorder: 'border-amber-400 text-amber-600',
    },
    {
      title: 'Prod. Receipts',
      desc: '2 receipts to post',
      badge: 2,
      borderColor: 'border-l-emerald-500',
      bgColor: 'bg-emerald-50/70',
      titleColor: 'text-emerald-800',
      badgeBorder: 'border-emerald-400 text-emerald-600',
    },
  ];

  /* ─── Recent AP Invoices ─── */
  const invoices = [
    { supplier: 'BADU CHILLING', date: '24/03', division: 'MILK', qty: '4,870', amount: '₹4,28,560', status: 'Posted' },
    { supplier: 'RAMPUR COOP', date: '23/03', division: 'MILK', qty: '3,200', amount: '₹2,81,600', status: 'Pending' },
    { supplier: 'SINGH DAIRY', date: '22/03', division: 'MILK', qty: '5,370', amount: '₹4,72,560', status: 'Posted' },
  ];

  /* ─── Quality summary ─── */
  const qualityMetrics = [
    { label: 'Avg FAT %', value: '7.12%', color: 'text-orange-600', bg: 'bg-orange-50', icon: '🔥' },
    { label: 'Avg SNF %', value: '8.79%', color: 'text-blue-600', bg: 'bg-blue-50', icon: '💧' },
    { label: 'Avg CLR', value: '26.3', color: 'text-teal-600', bg: 'bg-teal-50', icon: '🧪' },
  ];

  // const { isPending, isFetching , error, data} = usePurchaseDeliveryNotes();

  if (isPending || isFetching) {
    return (
      <>
        <Loader label="Loading…" size="sm" />
      </>
    )
  }

  if (error) {
    return (
      <>
        <h1>{error.message}</h1>
      </>
    )
  }

  console.log(allDocsData);

  return (
    <div className="flex flex-col gap-5 max-w-[1400px] pb-6">
      {/* <button
        onClick={async () => {
          try {
            const cookie = await loginToSAP();
            console.log('Session Cookie:', cookie);
          } catch (error) {
            console.error('Login failed:', error);
          }
        }}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Login to SAP
      </button> */}
      {/* <button
        onClick={async () => {
          try {
            const items = await getAllItems();
            console.log('Fetched Items:', items);
          } catch (error) {
            console.error('Failed to fetch items:', error);
          }
        }}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Getting Items
      </button> */}

      {/* <button
        onClick={async () => {
          try {
            const itemmaster = await refreshItemMaster();
            console.log('Master Item Data=> ', itemmaster);
          } catch (error) {
            console.error("Failed to Fetch Master: ", error);
          }
        }}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Getting Item Master Data
      </button> */}

      {/* <button
        onClick={async () => {
          try {
            const warehouses = await getAllWarehouses();
            console.log('Warehouse Data=> ', warehouses);
            useWarehouseStore.getState().setWarehouses(warehouses);
          } catch (error) {
            console.error("Failed to Fetch Warehouses: ", error);
          }
        }}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Getting Warehouse Data
      </button> */}


      {/* ═══ Breadcrumb + Title + Action Buttons ═══ */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <span>Home</span>
          <span>›</span>
          <span className="text-gray-600 font-medium">Overview</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Operations Dashboard</h1>
            <p className="text-[11px] text-gray-500 mt-0.5 font-medium">
              MASHAKTI FOOD PRODUCTS LTD · Rampurhat · FY 2025–26
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-[11px] font-semibold text-sap-primary cursor-pointer hover:bg-blue-100 transition-colors">
              🥛 Milk Division
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-[11px] font-semibold text-red-600 cursor-pointer hover:bg-red-100 transition-colors">
              <MapPin className="h-3 w-3" /> Rampurhat
            </span>
            <button className="inline-flex items-center gap-1.5 rounded-full bg-white border border-gray-200 px-3 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ═══ SAP Business One Integration Banner ═══ */}
      <div className="rounded-xl bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#1a2744] px-5 py-4 flex items-center justify-between shadow-lg border border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/30 to-blue-400/10 text-blue-400 border border-blue-500/20 shadow-inner">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-white tracking-wide">
              SAP Business One Integration — Active
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              PO · GRPO · AP Invoice · Debit Notes · Division P&L — Synced via SAP B1 DI-API · Rampurhat
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.4)]"></div>
            <span className="text-[10px] font-semibold text-green-400">Connected</span>
          </div>
          <span className="inline-flex items-center rounded-lg bg-white/10 border border-white/10 backdrop-blur-sm px-3.5 py-1.5 text-[11px] font-extrabold text-white tracking-wider shadow-sm">
            SAP B1
          </span>
        </div>
      </div>

      {/* ═══ Metric Cards Row — 6 equal cards (includes Combined P&L) ═══ */}
      <div className="grid grid-cols-6 gap-3">
        {metricCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="group rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-default"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.iconBg}`}>
                  <Icon className={`h-4 w-4 ${card.iconColor}`} />
                </div>
                {card.trend && (
                  <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold rounded-full px-2 py-0.5 ${card.trendUp
                    ? 'bg-green-50 text-green-600'
                    : 'bg-red-50 text-red-600'
                    }`}>
                    {card.trendUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                    {card.trend}
                  </span>
                )}
              </div>
              <p className="text-[9.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">{card.label}</p>
              <p className="text-[22px] font-extrabold tracking-tight text-gray-900 leading-none">
                {card.value}
                {card.unit && <span className="text-[11px] font-semibold text-gray-400 ml-1">{card.unit}</span>}
              </p>
              <p className="mt-1.5 text-[10px] text-gray-500 font-medium">{card.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* ═══ Division Transfer Flow + Pending Actions ═══ */}
      <div className="grid grid-cols-[1fr_320px] gap-4">
        {/* Left: Transfer Flow */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-sap-primary via-blue-500 to-blue-600 px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-white">
              <Activity className="h-4 w-4 opacity-80" />
              <h3 className="text-[13px] font-bold tracking-wide">Division Transfer Flow — Today</h3>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-[10px] font-bold text-white tracking-wider border border-white/10">
              <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></div>
              LIVE
            </span>
          </div>

          {/* Flow Steps */}
          <div className="px-6 py-6">
            <div className="flex items-center justify-between relative">
              {/* Background connector line */}
              <div className="absolute top-[18px] left-[10%] right-[10%] h-[2px] bg-gray-200 z-0"></div>
              <div className="absolute top-[18px] left-[10%] h-[2px] bg-green-400 z-[1]" style={{ width: '35%' }}></div>

              {flowSteps.map((step, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center text-center relative z-10">
                  {/* Circle / Count */}
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${step.done
                      ? 'bg-green-50 border-2 border-green-500 text-green-600 shadow-[0_0_0_3px_rgba(34,197,94,0.1)]'
                      : step.active
                        ? 'bg-sap-primary text-white shadow-lg shadow-blue-500/30 ring-4 ring-blue-100'
                        : 'bg-gray-50 border-2 border-gray-200 text-gray-400'
                      }`}
                  >
                    {step.done ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      step.count
                    )}
                  </div>
                  <p className={`mt-2.5 text-[11px] font-semibold ${step.active ? 'text-sap-primary' : step.done ? 'text-gray-700' : 'text-gray-400'}`}>
                    {step.label}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${step.active ? 'text-sap-primary font-bold' : step.done ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                    {step.sub}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Info Bar */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-50/50 border-t border-blue-100 px-5 py-3 flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
              <Info className="h-3 w-3 text-sap-primary" />
            </div>
            <p className="text-[11.5px] text-gray-700">
              <span className="font-bold text-sap-primary">4,200 KG</span> awaiting transfer:&nbsp;
              <span className="font-bold text-gray-900">Milk Division</span>
              <ArrowRight className="h-3 w-3 inline mx-1.5 text-gray-400" />
              <span className="font-bold text-gray-900">Ice Cream Division</span>
              &nbsp;&nbsp;<span className="text-gray-400">(Rampurhat)</span>
            </p>
          </div>
        </div>

        {/* Right: Pending Actions */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden border-t-[3px] border-t-orange-500">
          <div className="px-4 py-3.5 border-b border-gray-100">
            <h3 className="text-[14px] font-bold text-gray-800 flex items-center gap-2">
              <span className="text-amber-500">⚡</span> Pending Actions
            </h3>
          </div>
          <div className="flex flex-col p-3 gap-2.5">
            {pendingActions.map((action, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-4 py-3.5 rounded-lg border-l-[3.5px] ${action.borderColor} ${action.bgColor} hover:shadow-sm cursor-pointer transition-all duration-200`}
              >
                <div>
                  <p className={`text-[12.5px] font-bold ${action.titleColor}`}>{action.title}</p>
                  <p className="text-[10.5px] text-gray-500 mt-0.5">{action.desc}</p>
                </div>
                <span className={`inline-flex items-center justify-center h-7 min-w-[28px] rounded-full text-[11.5px] font-bold border-2 ${action.badgeBorder} bg-white shadow-sm`}>
                  {action.badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ Recent AP Invoice + Quality Summary ═══ */}
      <div className="grid grid-cols-[1fr_320px] gap-4">
        {/* Left: Recent AP Invoice Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden border-t-[3px] border-t-blue-500">
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-gray-100">
            <h3 className="text-[14px] font-bold text-gray-800 flex items-center gap-2">
              <span>👍</span> Recent AP Invoice — SAP B1
            </h3>
            <button className="text-[11px] font-semibold text-sap-primary hover:text-blue-700 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors">
              View All
            </button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>SUPPLIER</th>
                <th>DATE</th>
                <th>DIVISION</th>
                <th className="text-right">QTY KG</th>
                <th className="text-right">AMOUNT</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => (
                <tr key={i} className="hover:bg-gray-50/80 transition-colors">
                  <td className="font-semibold text-gray-800">{inv.supplier}</td>
                  <td className="text-gray-500">{inv.date}</td>
                  <td>
                    <span className="inline-flex items-center rounded-md bg-sap-primary/10 px-2 py-0.5 text-[10px] font-bold text-sap-primary">
                      {inv.division}
                    </span>
                  </td>
                  <td className="text-right font-medium tabular-nums">{inv.qty}</td>
                  <td className="text-right font-semibold text-green-700 tabular-nums">{inv.amount}</td>
                  <td>
                    {inv.status === 'Posted' ? (
                      <span className="badge-posted">{inv.status}</span>
                    ) : (
                      <span className="badge-pending">{inv.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right: Quality Summary */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden border-t-[3px] border-t-emerald-500">
          <div className="px-4 py-3.5 border-b border-gray-100">
            <h3 className="text-[14px] font-bold text-gray-800 flex items-center gap-2">
              <span>🧪</span> Quality Summary
            </h3>
          </div>
          <div className="flex flex-col">
            {qualityMetrics.map((q, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-5 py-4 hover:bg-gray-50/80 transition-colors ${i < qualityMetrics.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
              >
                <span className="text-[12.5px] text-gray-600 font-medium">{q.label}</span>
                <span className={`text-[18px] font-extrabold tracking-tight font-mono ${q.color}`}>{q.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
