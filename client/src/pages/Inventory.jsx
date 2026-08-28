import React, { useState } from 'react';
import {
  RefreshCw,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  Table2,
  Layers,
  BarChart3,
} from 'lucide-react';

/* ──────────────────────────────────────────────
   MOCK DATA
   ────────────────────────────────────────────── */
const stockData = [
  { code: 'MLK-BUF-001', desc: 'Buffalo Milk (Raw)',       category: 'Raw Milk',       division: 'MILK',      location: 'Rampurhat', warehouse: 'Raw Milk Store',    opening: 0,     receipts: 13440, issues: 4200, closing: 9240, stockValue: 813120 },
  { code: 'PKG-FOIL-001', desc: 'Milk Packaging Foil',    category: 'Packaging',      division: 'MILK',      location: 'Rampurhat', warehouse: 'Packaging Store',   opening: 1200,  receipts: 3500,  issues: 2800, closing: 1900, stockValue: 47500 },
  { code: 'SGR-001',      desc: 'Sugar (Refined)',         category: 'Ingredients',    division: 'ICE CREAM', location: 'Rampurhat', warehouse: 'Ice Cream RM',      opening: 800,   receipts: 0,     issues: 0,    closing: 800,  stockValue: 28000 },
  { code: 'CIP-CHM-001',  desc: 'CIP Chemical',           category: 'Chemicals',      division: 'MILK',      location: 'Rampurhat', warehouse: 'Chemicals Store',   opening: 0,     receipts: 100,   issues: 0,    closing: 100,  stockValue: 4500 },
  { code: 'IC-VAN-500',   desc: 'Vanilla Ice Cream 500ml',category: 'Finished Goods', division: 'ICE CREAM', location: 'Rampurhat', warehouse: 'Finished Goods',    opening: 200,   receipts: 780,   issues: 0,    closing: 980,  stockValue: 68600 },
  { code: 'VAN-ESS-001',  desc: 'Vanilla Essence',        category: 'Ingredients',    division: 'ICE CREAM', location: 'Rampurhat', warehouse: 'Ice Cream RM',      opening: 50,    receipts: 150,   issues: 0,    closing: 200,  stockValue: 14000 },
  { code: 'PLT-CAP-001',  desc: 'Plastic Caps',           category: 'Packaging',      division: 'MILK',      location: 'Rampurhat', warehouse: 'Packaging Store',   opening: 0,     receipts: 0,     issues: 0,    closing: 0,    stockValue: 0 },
  { code: 'MLK-BUF-002',  desc: 'Buffalo Milk (Raw)',     category: 'Raw Milk',       division: 'ICE CREAM', location: 'Rampurhat', warehouse: 'Ice Cream RM',      opening: 0,     receipts: 4200,  issues: 4200, closing: 0,    stockValue: 0 },
  { code: 'IC-CHO-500',   desc: 'Chocolate Ice Cream 500ml', category: 'Finished Goods', division: 'ICE CREAM', location: 'Rampurhat', warehouse: 'Finished Goods', opening: 150,  receipts: 600,   issues: 320,  closing: 430,  stockValue: 30100 },
  { code: 'CRM-FRS-001',  desc: 'Fresh Cream',            category: 'Raw Milk',       division: 'ICE CREAM', location: 'Rampurhat', warehouse: 'Ice Cream RM',      opening: 0,     receipts: 500,   issues: 350,  closing: 150,  stockValue: 13500 },
  { code: 'MLK-COW-001',  desc: 'Cow Milk (Raw)',         category: 'Raw Milk',       division: 'MILK',      location: 'Rampurhat', warehouse: 'Raw Milk Store',    opening: 0,     receipts: 8200,  issues: 3100, closing: 5100, stockValue: 357000 },
  { code: 'STB-CUL-001',  desc: 'Stabilizer Culture',     category: 'Ingredients',    division: 'ICE CREAM', location: 'Rampurhat', warehouse: 'Ice Cream RM',      opening: 25,    receipts: 0,     issues: 10,   closing: 15,   stockValue: 7500 },
];

/* ──────────────────────────────────────────────
   CHIP GROUP (reusable pill toggle list)
   ────────────────────────────────────────────── */
const ChipGroup = ({ label, icon, color, chips, active, setActive, multi }) => (
  <div className="flex items-start gap-3">
    <span className={`shrink-0 mt-0.5 flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-wider ${color}`}>
      {icon} {label}
    </span>
    <div className="flex flex-wrap gap-1.5">
      {chips.map(c => {
        const isActive = multi ? active.includes(c) : active === c;
        return (
          <button
            key={c}
            onClick={() => {
              if (multi) {
                setActive(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
              } else {
                setActive(c);
              }
            }}
            className={`rounded-md px-3 py-[5px] text-[11px] font-semibold border transition-all duration-150 ${
              isActive
                ? 'bg-sap-primary text-white border-sap-primary shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-sap-primary hover:bg-blue-50/50'
            }`}
          >
            {c}
          </button>
        );
      })}
    </div>
  </div>
);

/* ──────────────────────────────────────────────
   VIEW MODE BUTTON GROUP
   ────────────────────────────────────────────── */
const ViewModeToggle = ({ viewMode, setViewMode }) => {
  const modes = [
    { id: 'flat',  label: 'Flat',  icon: <Table2 className="h-3 w-3" /> },
    { id: 'group', label: 'Group', icon: <Layers className="h-3 w-3" /> },
    { id: 'pivot', label: 'Pivot', icon: <BarChart3 className="h-3 w-3" /> },
  ];
  return (
    <div className="flex items-center gap-0 rounded-md border border-gray-200 overflow-hidden shadow-sm">
      {modes.map(m => (
        <button
          key={m.id}
          onClick={() => setViewMode(m.id)}
          className={`flex items-center gap-1.5 px-3.5 py-[6px] text-[11px] font-bold transition-colors border-r last:border-r-0 border-gray-200 ${
            viewMode === m.id
              ? 'bg-sap-primary text-white'
              : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700'
          }`}
        >
          {m.icon} {m.label}
        </button>
      ))}
    </div>
  );
};

/* ──────────────────────────────────────────────
   DIVISION BADGE
   ────────────────────────────────────────────── */
const DivisionBadge = ({ division }) => {
  const styles = {
    MILK:       'bg-blue-500 text-white',
    'ICE CREAM': 'bg-red-500 text-white',
  };
  return (
    <span className={`inline-flex items-center rounded px-2 py-[2px] text-[9.5px] font-extrabold uppercase tracking-wider ${styles[division] || 'bg-gray-100 text-gray-600'}`}>
      {division}
    </span>
  );
};

/* ──────────────────────────────────────────────
   MAIN INVENTORY (STOCK SUMMARY) PAGE
   ────────────────────────────────────────────── */
const Inventory = () => {
  /* ── Filter state ── */
  const [division, setDivision]       = useState('All Divisions');
  const [location, setLocation]       = useState('All Locations');
  const [warehouse, setWarehouse]     = useState('All Warehouses');
  const [itemCategory, setItemCategory] = useState('All Categories');
  const [stockStatus, setStockStatus] = useState('All');
  const [asOnDate, setAsOnDate]       = useState('2026-04-03');

  /* ── Grouping state ── */
  const groupByChips    = ['Division', 'Location', 'Warehouse', 'Item Category', 'Supplier'];
  const [groupBy, setGroupBy]         = useState([]);
  const [pivotRow, setPivotRow]       = useState([]);
  const [pivotCol, setPivotCol]       = useState([]);
  const valueFieldChips = ['Opening', 'Receipts', 'Issues', 'Closing', 'Stock Value'];
  const [valueFields, setValueFields] = useState(['Opening']);
  const [viewMode, setViewMode]       = useState('flat');

  /* ── Computed totals ── */
  const totals = stockData.reduce(
    (acc, row) => ({
      opening:    acc.opening    + row.opening,
      receipts:   acc.receipts   + row.receipts,
      issues:     acc.issues     + row.issues,
      closing:    acc.closing    + row.closing,
      stockValue: acc.stockValue + row.stockValue,
    }),
    { opening: 0, receipts: 0, issues: 0, closing: 0, stockValue: 0 }
  );

  const fmt = (n) => n.toLocaleString('en-IN');

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-4 pb-10">

      {/* ═══ Breadcrumb + Title Row ═══ */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span>Home</span> <span>›</span>
            <span>Reports</span> <span>›</span>
            <span className="text-gray-600 font-medium">Stock Summary</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-lg">📦</span>
            <div>
              <h1 className="text-[17px] font-bold text-gray-800 tracking-tight">
                Division &amp; Location-wise Stock Summary
              </h1>
              <p className="text-[11px] text-gray-500 mt-0.5 font-medium">
                Live inventory levels · Division · Location · Warehouse filters · Multiple grouping
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <button className="inline-flex items-center gap-1.5 rounded border border-gray-200 bg-white px-3 py-[6px] text-[11px] font-semibold text-gray-600 hover:bg-gray-50 shadow-sm transition-colors">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </button>
          <button className="inline-flex items-center gap-1.5 rounded border border-gray-200 bg-white px-3 py-[6px] text-[11px] font-semibold text-gray-600 hover:bg-gray-50 shadow-sm transition-colors">
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          <button className="inline-flex items-center gap-1.5 rounded bg-sap-primary px-4 py-[6px] text-[11px] font-bold text-white hover:bg-blue-700 shadow-sm transition-colors">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh Stock
          </button>
        </div>
      </div>

      {/* ═══ Filters Card ═══ */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {/* ── Row 1: Dropdowns ── */}
        <div className="grid grid-cols-7 gap-3 px-5 py-4 border-b border-gray-100">
          {/* Division */}
          <div className="flex flex-col gap-1">
            <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-sap-primary">Division</label>
            <div className="relative">
              <select
                value={division}
                onChange={e => setDivision(e.target.value)}
                className="form-select text-[11.5px] pr-8"
              >
                <option>All Divisions</option>
                <option>Milk</option>
                <option>Ice Cream</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Location */}
          <div className="flex flex-col gap-1">
            <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-sap-primary">Location</label>
            <div className="relative">
              <select
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="form-select text-[11.5px] pr-8"
              >
                <option>All Locations</option>
                <option>Rampurhat</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Warehouse */}
          <div className="flex flex-col gap-1">
            <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-sap-primary">Warehouse</label>
            <div className="relative">
              <select
                value={warehouse}
                onChange={e => setWarehouse(e.target.value)}
                className="form-select text-[11.5px] pr-8"
              >
                <option>All Warehouses</option>
                <option>Raw Milk Store</option>
                <option>Packaging Store</option>
                <option>Ice Cream RM</option>
                <option>Chemicals Store</option>
                <option>Finished Goods</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Item Category */}
          <div className="flex flex-col gap-1">
            <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-sap-primary">Item Category</label>
            <div className="relative">
              <select
                value={itemCategory}
                onChange={e => setItemCategory(e.target.value)}
                className="form-select text-[11.5px] pr-8"
              >
                <option>All Categories</option>
                <option>Raw Milk</option>
                <option>Packaging</option>
                <option>Ingredients</option>
                <option>Chemicals</option>
                <option>Finished Goods</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Stock Status */}
          <div className="flex flex-col gap-1">
            <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-sap-primary">Stock Status</label>
            <div className="relative">
              <select
                value={stockStatus}
                onChange={e => setStockStatus(e.target.value)}
                className="form-select text-[11.5px] pr-8"
              >
                <option>All</option>
                <option>In Stock</option>
                <option>Out of Stock</option>
                <option>Low Stock</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* As On Date */}
          <div className="flex flex-col gap-1">
            <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-sap-primary">As On Date</label>
            <input
              type="date"
              value={asOnDate}
              onChange={e => setAsOnDate(e.target.value)}
              className="form-input text-[11.5px]"
            />
          </div>

          {/* Apply / Reset */}
          <div className="flex flex-col justify-end gap-1.5">
            <div className="flex gap-2">
              <button className="flex-1 rounded bg-sap-primary px-3 py-[6px] text-[11px] font-bold text-white hover:bg-blue-700 shadow-sm transition-colors">
                Apply
              </button>
              <button className="rounded border border-gray-300 bg-white px-3 py-[6px] text-[11px] font-semibold text-gray-600 hover:bg-gray-50 shadow-sm transition-colors">
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* ── Row 2: Group By + Pivot Row ── */}
        <div className="grid grid-cols-2 gap-6 px-5 py-3 border-b border-gray-100">
          <ChipGroup
            label="Group By"
            icon="■"
            color="text-gray-700"
            chips={groupByChips}
            active={groupBy}
            setActive={setGroupBy}
            multi
          />
          <ChipGroup
            label="Pivot Row"
            icon="↔"
            color="text-sap-primary"
            chips={groupByChips}
            active={pivotRow}
            setActive={setPivotRow}
            multi
          />
        </div>

        {/* ── Row 3: Pivot Column + Value Field ── */}
        <div className="grid grid-cols-2 gap-6 px-5 py-3 border-b border-gray-100">
          <ChipGroup
            label="Pivot Column"
            icon="↕"
            color="text-orange-600"
            chips={groupByChips}
            active={pivotCol}
            setActive={setPivotCol}
            multi
          />
          <ChipGroup
            label="Value Field"
            icon="Σ"
            color="text-emerald-700"
            chips={valueFieldChips}
            active={valueFields}
            setActive={setValueFields}
            multi
          />
        </div>

        {/* ── Row 4: View Mode ── */}
        <div className="flex items-center justify-end px-5 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">View Mode</span>
            <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
          </div>
        </div>
      </div>

      {/* ═══ Report Data Table ═══ */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Table header bar */}
        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50/60">
          <h3 className="text-[13px] font-bold text-gray-700 tracking-wide">Report Data</h3>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11.5px] border-collapse">
            <thead>
              <tr className="bg-gradient-to-b from-gray-50 to-gray-100/80">
                <th className="px-3.5 py-2.5 font-extrabold uppercase tracking-wider text-sap-primary text-[10px] border-b-2 border-blue-200 whitespace-nowrap">
                  Item Code
                </th>
                <th className="px-3.5 py-2.5 font-extrabold uppercase tracking-wider text-sap-primary text-[10px] border-b-2 border-blue-200 whitespace-nowrap">
                  Item Description
                </th>
                <th className="px-3.5 py-2.5 font-extrabold uppercase tracking-wider text-sap-primary text-[10px] border-b-2 border-blue-200 whitespace-nowrap">
                  Category
                </th>
                <th className="px-3.5 py-2.5 font-extrabold uppercase tracking-wider text-sap-primary text-[10px] border-b-2 border-blue-200 whitespace-nowrap">
                  Division
                </th>
                <th className="px-3.5 py-2.5 font-extrabold uppercase tracking-wider text-sap-primary text-[10px] border-b-2 border-blue-200 whitespace-nowrap">
                  Location
                </th>
                <th className="px-3.5 py-2.5 font-extrabold uppercase tracking-wider text-sap-primary text-[10px] border-b-2 border-blue-200 whitespace-nowrap">
                  Warehouse
                </th>
                <th className="px-3.5 py-2.5 font-extrabold uppercase tracking-wider text-sap-primary text-[10px] border-b-2 border-blue-200 text-right whitespace-nowrap">
                  Opening
                </th>
                <th className="px-3.5 py-2.5 font-extrabold uppercase tracking-wider text-sap-primary text-[10px] border-b-2 border-blue-200 text-right whitespace-nowrap">
                  Receipts
                </th>
                <th className="px-3.5 py-2.5 font-extrabold uppercase tracking-wider text-sap-primary text-[10px] border-b-2 border-blue-200 text-right whitespace-nowrap">
                  Issues
                </th>
                <th className="px-3.5 py-2.5 font-extrabold uppercase tracking-wider text-sap-primary text-[10px] border-b-2 border-blue-200 text-right whitespace-nowrap">
                  Closing
                </th>
                <th className="px-3.5 py-2.5 font-extrabold uppercase tracking-wider text-sap-primary text-[10px] border-b-2 border-blue-200 text-right whitespace-nowrap">
                  Stock Value
                </th>
              </tr>
            </thead>
            <tbody>
              {stockData.map((row, idx) => (
                <tr
                  key={idx}
                  className={`transition-colors hover:bg-blue-50/40 ${idx % 2 === 1 ? 'bg-gray-50/30' : 'bg-white'}`}
                >
                  <td className="px-3.5 py-2 border-b border-gray-100 font-bold text-sap-primary whitespace-nowrap">
                    {row.code}
                  </td>
                  <td className="px-3.5 py-2 border-b border-gray-100 text-gray-800 font-medium whitespace-nowrap">
                    {row.desc}
                  </td>
                  <td className="px-3.5 py-2 border-b border-gray-100 text-gray-600 whitespace-nowrap">
                    {row.category}
                  </td>
                  <td className="px-3.5 py-2 border-b border-gray-100 whitespace-nowrap">
                    <DivisionBadge division={row.division} />
                  </td>
                  <td className="px-3.5 py-2 border-b border-gray-100 text-gray-700 whitespace-nowrap">
                    {row.location}
                  </td>
                  <td className="px-3.5 py-2 border-b border-gray-100 text-gray-700 whitespace-nowrap">
                    {row.warehouse}
                  </td>
                  <td className="px-3.5 py-2 border-b border-gray-100 text-right font-semibold text-gray-800 tabular-nums whitespace-nowrap">
                    {fmt(row.opening)}
                  </td>
                  <td className="px-3.5 py-2 border-b border-gray-100 text-right font-semibold text-gray-800 tabular-nums whitespace-nowrap">
                    {fmt(row.receipts)}
                  </td>
                  <td className="px-3.5 py-2 border-b border-gray-100 text-right font-semibold text-gray-800 tabular-nums whitespace-nowrap">
                    {fmt(row.issues)}
                  </td>
                  <td className="px-3.5 py-2 border-b border-gray-100 text-right font-semibold text-gray-800 tabular-nums whitespace-nowrap">
                    {fmt(row.closing)}
                  </td>
                  <td className="px-3.5 py-2 border-b border-gray-100 text-right font-semibold text-gray-800 tabular-nums whitespace-nowrap">
                    ₹{fmt(row.stockValue)}
                  </td>
                </tr>
              ))}

              {/* ── Grand Total Row ── */}
              <tr className="bg-blue-50 border-t-2 border-blue-200">
                <td className="px-3.5 py-2.5 font-extrabold text-sap-primary text-[12px]" colSpan={6}>
                  Grand Total
                </td>
                <td className="px-3.5 py-2.5 text-right font-extrabold text-sap-primary text-[12px] tabular-nums">
                  {fmt(totals.opening)}
                </td>
                <td className="px-3.5 py-2.5 text-right font-extrabold text-sap-primary text-[12px] tabular-nums">
                  {fmt(totals.receipts)}
                </td>
                <td className="px-3.5 py-2.5 text-right font-extrabold text-sap-primary text-[12px] tabular-nums">
                  {fmt(totals.issues)}
                </td>
                <td className="px-3.5 py-2.5 text-right font-extrabold text-sap-primary text-[12px] tabular-nums">
                  {fmt(totals.closing)}
                </td>
                <td className="px-3.5 py-2.5 text-right font-extrabold text-sap-primary text-[12px] tabular-nums">
                  ₹{fmt(totals.stockValue)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
