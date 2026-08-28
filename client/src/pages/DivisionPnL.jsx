import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Play,
  ChevronDown,
  Zap,
  MapPin,
  Calendar,
  Milk,
  IceCream,
  BarChart3,
} from 'lucide-react';

/* ──────────────────────────────────────────────
   MOCK P&L DATA
   ────────────────────────────────────────────── */
const milkPnL = {
  division: 'Milk Division',
  period: 'Mar 2026',
  color: 'blue',
  revenue: [
    { head: 'Milk Sales',                     amount: 12456000 },
    { head: 'Internal Transfer → Ice Cream',  amount: 4872000 },
  ],
  expenses: [
    { head: 'Milk Procurement',   amount: 9840000 },
    { head: 'Processing Cost',    amount: 1260000 },
    { head: 'Logistics',          amount: 420000 },
  ],
};

const iceCreamPnL = {
  division: 'Ice Cream Division',
  period: 'Mar 2026',
  color: 'purple',
  revenue: [
    { head: 'Ice Cream Sales', amount: 21840000 },
  ],
  expenses: [
    { head: 'Milk Transfer from Milk Div',  amount: 4872000 },
    { head: 'Other RM Cost',                amount: 3840000 },
    { head: 'Production Cost',              amount: 2880000 },
    { head: 'Marketing & Distribution',     amount: 1820000 },
  ],
};

const calcNet = (data) => {
  const totalRev = data.revenue.reduce((s, r) => s + r.amount, 0);
  const totalExp = data.expenses.reduce((s, r) => s + r.amount, 0);
  return { totalRev, totalExp, netProfit: totalRev - totalExp };
};

const fmtAmount = (n) => n.toLocaleString('en-IN');

/* ──────────────────────────────────────────────
   P&L CARD COMPONENT
   ────────────────────────────────────────────── */
const PnLCard = ({ data }) => {
  const { netProfit } = calcNet(data);
  const isBlue = data.color === 'blue';

  const headerBg = isBlue
    ? 'bg-[#0070F2]'
    : 'bg-[#6B21A8]'; // Purple for Ice cream

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col h-full">
      {/* Card Header */}
      <div className={`${headerBg} px-5 py-3 flex items-center gap-2.5`}>
        {isBlue ? (
          <Milk className="h-4 w-4 text-white" />
        ) : (
          <IceCream className="h-4 w-4 text-white" />
        )}
        <h3 className="text-[13px] font-bold text-white tracking-wide">
          {data.division} — P&L ({data.period})
        </h3>
      </div>

      {/* Table Header */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-200 bg-gray-50/50">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Head</span>
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Amount (₹)</span>
      </div>

      {/* Revenue Section */}
      <div className="flex flex-col">
        <div className="px-5 py-2 border-b border-gray-100 bg-white">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0070F2]">
            REVENUE
          </span>
        </div>
        {data.revenue.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-white"
          >
            <span className="text-[11.5px] text-gray-700 font-medium">{item.head}</span>
            <span className="text-[12px] font-bold text-green-600 tabular-nums">{fmtAmount(item.amount)}</span>
          </div>
        ))}
      </div>

      {/* Expenses Section */}
      <div className="flex flex-col">
        <div className="px-5 py-2 bg-[#FFFDE7] border-b border-gray-100">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-600">
            EXPENSES
          </span>
        </div>
        {data.expenses.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-white"
          >
            <span className="text-[11.5px] text-gray-700 font-medium">{item.head}</span>
            <span className="text-[12px] font-bold text-red-600 tabular-nums">({fmtAmount(item.amount)})</span>
          </div>
        ))}
      </div>

      {/* Net Profit Row */}
      <div className="flex items-center justify-between px-5 py-4 bg-[#E8F5E9] border-t border-gray-200 mt-auto">
        <span className="text-[13px] font-extrabold text-gray-900">Net Profit</span>
        <span className="text-[14px] font-extrabold tabular-nums text-green-700">
          {fmtAmount(Math.abs(netProfit))}
        </span>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────
   MAIN P&L PAGE
   ────────────────────────────────────────────── */
const DivisionPnL = () => {
  const [location, setLocation] = useState('Rampurhat');
  const [division, setDivision] = useState('All');
  const [fromDate, setFromDate] = useState('2026-04-01');
  const [toDate, setToDate]     = useState('2026-03-24');

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-4 pb-10">

      {/* ═══ Breadcrumb + Title ═══ */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span className="cursor-pointer hover:text-sap-primary transition-colors">Home</span> 
            <span>›</span>
            <span className="text-gray-600 font-medium">Division P&L</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex gap-[2px] items-end h-5 w-5 bg-gray-100 rounded p-0.5">
              <div className="w-[4px] h-2.5 bg-red-400"></div>
              <div className="w-[4px] h-4 bg-yellow-400"></div>
              <div className="w-[4px] h-3 bg-blue-400"></div>
            </div>
            <div>
              <h1 className="text-[17px] font-bold text-gray-800 tracking-tight">
                Division-wise P&L
              </h1>
              <p className="text-[11px] text-gray-500 mt-0.5 font-medium">
                SAP B1 Finance — Real-time by Division (Rampurhat)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <button className="inline-flex items-center gap-1.5 rounded border border-gray-300 bg-white px-3 py-[6px] text-[11px] font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
            Export
          </button>
          <button className="inline-flex items-center gap-1.5 rounded bg-sap-primary px-4 py-[6px] text-[11.5px] font-bold text-white hover:bg-blue-700 shadow-sm transition-colors">
            Run Report
          </button>
        </div>
      </div>

      {/* ═══ SAP B1 Integration Banner ═══ */}
      <div className="rounded-lg bg-[#1a293c] px-5 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-white/10 text-white">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-white tracking-wide">
              SAP B1 — Division P&L (Live)
            </h3>
            <p className="text-[11px] text-slate-300 mt-0.5 font-medium">
              Profit Centre / Business Unit dimension - Real-time from MASHAKTI_PROD_2026
            </p>
          </div>
        </div>
        <span className="inline-flex items-center rounded bg-blue-600 px-3 py-1 text-[11px] font-bold text-white tracking-wider shadow-sm">
          SAP B1
        </span>
      </div>

      {/* ═══ Filters Card ═══ */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-[12px] font-bold text-gray-800">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 px-5 py-4">
          {/* Location */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-gray-700">Location</label>
            <div className="relative">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-pink-500">
                <MapPin className="h-3.5 w-3.5" />
              </div>
              <select value={location} onChange={e => setLocation(e.target.value)} className="form-select text-[12px] pl-8 h-9 border-gray-300 rounded-md focus:border-sap-primary focus:ring-sap-primary text-gray-700 w-full">
                <option value="Rampurhat">Rampurhat</option>
              </select>
            </div>
          </div>

          {/* Division */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-gray-700">Division</label>
            <div className="relative">
              <select value={division} onChange={e => setDivision(e.target.value)} className="form-select text-[12px] h-9 border-gray-300 rounded-md focus:border-sap-primary focus:ring-sap-primary text-gray-700 w-full">
                <option value="All">All</option>
                <option value="Milk">Milk</option>
                <option value="Ice Cream">Ice Cream</option>
              </select>
            </div>
          </div>

          {/* From Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-gray-700">From Date</label>
            <div className="relative">
              <input type="text" value="01-04-2026" readOnly className="form-input text-[12px] h-9 border-gray-300 rounded-md focus:border-sap-primary focus:ring-sap-primary text-gray-700 w-full bg-white pr-8" />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                <Calendar className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>

          {/* To Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-gray-700">To Date</label>
            <div className="relative">
              <input type="text" value="24-03-2026" readOnly className="form-input text-[12px] h-9 border-gray-300 rounded-md focus:border-sap-primary focus:ring-sap-primary text-gray-700 w-full bg-white pr-8" />
               <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                <Calendar className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Division P&L Cards (Side by Side) ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PnLCard data={milkPnL} />
        <PnLCard data={iceCreamPnL} />
      </div>

    </div>
  );
};

export default DivisionPnL;
