import React, { useState } from 'react';
import {
  RefreshCw,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  Table2,
  Layers,
  BarChart3,
  Play,
} from 'lucide-react';

/* ──────────────────────────────────────────────
   CHIP GROUP
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
   VIEW MODE TOGGLE
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
    MILK:        'bg-blue-500 text-white',
    'ICE CREAM': 'bg-red-500 text-white',
  };
  return (
    <span className={`inline-flex items-center rounded px-2 py-[2px] text-[9.5px] font-extrabold uppercase tracking-wider ${styles[division] || 'bg-gray-100 text-gray-600'}`}>
      {division}
    </span>
  );
};

/* ──────────────────────────────────────────────
   MOCK QUALITY DATA
   ────────────────────────────────────────────── */
const qualityData = [
  { date: '22/03/26', shift: 'Morning', division: 'MILK', supplier: 'BADU CHILLING',  vehicle: 2910, sampleNo: 'QC-0088', qty: 4070,  fat: 7.15, snf: 8.85, clr: 26.50, ph: 6.68, acidity: 0.14, adulteration: 'Nil' },
  { date: '22/03/26', shift: 'Evening', division: 'MILK', supplier: 'RAMPUR COOP',    vehicle: 1840, sampleNo: 'QC-0089', qty: 3200,  fat: 6.20, snf: 8.62, clr: 26.10, ph: 6.70, acidity: 0.17, adulteration: 'Marginal' },
  { date: '23/03/26', shift: 'Morning', division: 'MILK', supplier: 'SINGH DAIRY',    vehicle: 3021, sampleNo: 'QC-0090', qty: 5370,  fat: 5.80, snf: 7.90, clr: 23.80, ph: 6.42, acidity: 0.19, adulteration: 'Warning' },
  { date: '24/03/26', shift: 'Morning', division: 'MILK', supplier: 'BADU CHILLING',  vehicle: 2910, sampleNo: 'QC-0092', qty: 4870,  fat: 7.10, snf: 8.72, clr: 26.00, ph: 6.65, acidity: 0.14, adulteration: 'Nil' },
  { date: '24/03/26', shift: 'Evening', division: 'MILK', supplier: 'RAMPUR COOP',    vehicle: 1840, sampleNo: 'QC-0093', qty: 3100,  fat: 7.05, snf: 8.80, clr: 25.90, ph: 6.66, acidity: 0.15, adulteration: 'Nil' },
  { date: '25/03/26', shift: 'Morning', division: 'MILK', supplier: 'SINGH DAIRY',    vehicle: 3021, sampleNo: 'QC-0095', qty: 4200,  fat: 7.20, snf: 8.90, clr: 26.80, ph: 6.72, acidity: 0.13, adulteration: 'Nil' },
  { date: '25/03/26', shift: 'Evening', division: 'MILK', supplier: 'BADU CHILLING',  vehicle: 2910, sampleNo: 'QC-0096', qty: 3850,  fat: 6.90, snf: 8.55, clr: 25.40, ph: 6.60, acidity: 0.16, adulteration: 'Nil' },
  { date: '26/03/26', shift: 'Morning', division: 'MILK', supplier: 'RAMPUR COOP',    vehicle: 1840, sampleNo: 'QC-0097', qty: 2980,  fat: 6.75, snf: 8.48, clr: 25.20, ph: 6.58, acidity: 0.15, adulteration: 'Nil' },
  { date: '26/03/26', shift: 'Morning', division: 'MILK', supplier: 'SINGH DAIRY',    vehicle: 3021, sampleNo: 'QC-0098', qty: 5100,  fat: 7.30, snf: 9.00, clr: 27.10, ph: 6.74, acidity: 0.12, adulteration: 'Nil' },
  { date: '27/03/26', shift: 'Morning', division: 'MILK', supplier: 'BADU CHILLING',  vehicle: 2910, sampleNo: 'QC-0099', qty: 4500,  fat: 7.00, snf: 8.78, clr: 26.30, ph: 6.70, acidity: 0.14, adulteration: 'Nil' },
];

/* ──────────────────────────────────────────────
   QUALITY PAGE
   ────────────────────────────────────────────── */
const Quality = () => {
  /* ── Filter state ── */
  const [division, setDivision]     = useState('All Divisions');
  const [location, setLocation]     = useState('All Locations');
  const [supplier, setSupplier]     = useState('All Suppliers');
  const [shift, setShift]           = useState('All');
  const [result, setResult]         = useState('All');
  const [fromDate, setFromDate]     = useState('2026-03-01');
  const [toDate, setToDate]         = useState('2026-03-31');

  /* ── Grouping state ── */
  const groupChips = ['Date', 'Supplier', 'Shift', 'Vehicle', 'Result'];
  const [groupBy, setGroupBy]       = useState([]);
  const [pivotRow, setPivotRow]     = useState([]);
  const [pivotCol, setPivotCol]     = useState([]);
  const valueFieldChips             = ['Qty (KG)'];
  const [valueFields, setValueFields] = useState(['Qty (KG)']);
  const [viewMode, setViewMode]     = useState('flat');

  /* ── Totals ── */
  const totalQty = qualityData.reduce((s, r) => s + r.qty, 0);
  const fmt = (n) => n.toLocaleString('en-IN');

  /* ── FAT % color helper (red if below 6.5) ── */
  const fatColor = (v) => v < 6.5 ? 'text-red-600 font-bold' : 'text-gray-800 font-semibold';
  const snfColor = (v) => v < 8.0 ? 'text-red-600 font-bold' : 'text-gray-800 font-semibold';

  /* ── Adulteration badge ── */
  const adulterationBadge = (val) => {
    if (val === 'Nil') return <span className="text-gray-400 font-medium text-[10.5px]">Nil</span>;
    if (val === 'Marginal') return <span className="inline-flex items-center rounded px-1.5 py-[1px] text-[9.5px] font-bold bg-amber-100 text-amber-700 border border-amber-200">Marginal</span>;
    return <span className="inline-flex items-center rounded px-1.5 py-[1px] text-[9.5px] font-bold bg-red-100 text-red-700 border border-red-200">Warning</span>;
  };

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-4 pb-10">

      {/* ═══ Breadcrumb + Title ═══ */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span>Home</span> <span>›</span>
            <span>Reports</span> <span>›</span>
            <span className="text-gray-600 font-medium">Quality Check</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-lg">🧪</span>
            <div>
              <h1 className="text-[17px] font-bold text-gray-800 tracking-tight">
                Quality Checking Register
              </h1>
              <p className="text-[11px] text-gray-500 mt-0.5 font-medium">
                Milk quality parameters (FAT, SNF, CLR, pH, Acidity) · Supplier, Date, Division filters
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
            <Play className="h-3.5 w-3.5 fill-white" /> Run Report
          </button>
        </div>
      </div>

      {/* ═══ Filters Card ═══ */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {/* Row 1: Filter Dropdowns */}
        <div className="grid grid-cols-8 gap-3 px-5 py-4 border-b border-gray-100 items-end">
          {/* Division */}
          <div className="flex flex-col gap-1">
            <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-sap-primary">Division</label>
            <div className="relative">
              <select value={division} onChange={e => setDivision(e.target.value)} className="form-select text-[11.5px] pr-8">
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
              <select value={location} onChange={e => setLocation(e.target.value)} className="form-select text-[11.5px] pr-8">
                <option>All Locations</option>
                <option>Rampurhat</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Supplier */}
          <div className="flex flex-col gap-1">
            <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-sap-primary">Supplier</label>
            <div className="relative">
              <select value={supplier} onChange={e => setSupplier(e.target.value)} className="form-select text-[11.5px] pr-8">
                <option>All Suppliers</option>
                <option>BADU CHILLING</option>
                <option>RAMPUR COOP</option>
                <option>SINGH DAIRY</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Shift */}
          <div className="flex flex-col gap-1">
            <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-sap-primary">Shift</label>
            <div className="relative">
              <select value={shift} onChange={e => setShift(e.target.value)} className="form-select text-[11.5px] pr-8">
                <option>All</option>
                <option>Morning</option>
                <option>Evening</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Result */}
          <div className="flex flex-col gap-1">
            <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-sap-primary">Result</label>
            <div className="relative">
              <select value={result} onChange={e => setResult(e.target.value)} className="form-select text-[11.5px] pr-8">
                <option>All</option>
                <option>Pass</option>
                <option>Fail</option>
                <option>Warning</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* From Date */}
          <div className="flex flex-col gap-1">
            <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-sap-primary">From Date</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="form-input text-[11.5px]" />
          </div>

          {/* To Date */}
          <div className="flex flex-col gap-1">
            <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-sap-primary">To Date</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="form-input text-[11.5px]" />
          </div>

          {/* Apply / Reset */}
          <div className="flex gap-2">
            <button className="flex-1 rounded bg-sap-primary px-3 py-[6px] text-[11px] font-bold text-white hover:bg-blue-700 shadow-sm transition-colors">
              Apply
            </button>
            <button className="rounded border border-gray-300 bg-white px-3 py-[6px] text-[11px] font-semibold text-gray-600 hover:bg-gray-50 shadow-sm transition-colors">
              Reset
            </button>
          </div>
        </div>

        {/* Row 2: Group By + Pivot Row + Pivot Column */}
        <div className="grid grid-cols-3 gap-5 px-5 py-3 border-b border-gray-100">
          <ChipGroup label="Group By" icon="■" color="text-gray-700" chips={groupChips} active={groupBy} setActive={setGroupBy} multi />
          <ChipGroup label="Pivot Row" icon="↔" color="text-sap-primary" chips={groupChips} active={pivotRow} setActive={setPivotRow} multi />
          <ChipGroup label="Pivot Column" icon="↕" color="text-orange-600" chips={groupChips} active={pivotCol} setActive={setPivotCol} multi />
        </div>

        {/* Row 3: Value Field + View Mode */}
        <div className="flex items-center justify-between px-5 py-2.5">
          <ChipGroup label="Value Field" icon="Σ" color="text-emerald-700" chips={valueFieldChips} active={valueFields} setActive={setValueFields} multi />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">View Mode</span>
            <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
          </div>
        </div>
      </div>

      {/* ═══ Report Data Table ═══ */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50/60">
          <h3 className="text-[13px] font-bold text-gray-700 tracking-wide">Report Data</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11.5px] border-collapse">
            <thead>
              <tr className="bg-gradient-to-b from-gray-50 to-gray-100/80">
                {['Date', 'Shift', 'Division', 'Supplier', 'Vehicle', 'Sample No.', 'Qty (KG)', 'FAT %', 'SNF %', 'CLR', 'pH', 'Acidity', 'Adulteration'].map(col => (
                  <th
                    key={col}
                    className={`px-3.5 py-2.5 font-extrabold uppercase tracking-wider text-sap-primary text-[10px] border-b-2 border-blue-200 whitespace-nowrap ${
                      ['Qty (KG)', 'FAT %', 'SNF %', 'CLR', 'pH', 'Acidity'].includes(col) ? 'text-right' : ''
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {qualityData.map((row, idx) => (
                <tr
                  key={idx}
                  className={`transition-colors hover:bg-blue-50/40 ${idx % 2 === 1 ? 'bg-gray-50/30' : 'bg-white'}`}
                >
                  <td className="px-3.5 py-2 border-b border-gray-100 text-gray-700 font-medium whitespace-nowrap">{row.date}</td>
                  <td className="px-3.5 py-2 border-b border-gray-100 text-gray-700 whitespace-nowrap">{row.shift}</td>
                  <td className="px-3.5 py-2 border-b border-gray-100 whitespace-nowrap"><DivisionBadge division={row.division} /></td>
                  <td className="px-3.5 py-2 border-b border-gray-100 text-gray-800 font-semibold whitespace-nowrap">{row.supplier}</td>
                  <td className="px-3.5 py-2 border-b border-gray-100 text-gray-600 whitespace-nowrap">{row.vehicle}</td>
                  <td className="px-3.5 py-2 border-b border-gray-100 font-bold text-sap-primary whitespace-nowrap">{row.sampleNo}</td>
                  <td className="px-3.5 py-2 border-b border-gray-100 text-right font-bold text-gray-800 tabular-nums whitespace-nowrap">{fmt(row.qty)}</td>
                  <td className={`px-3.5 py-2 border-b border-gray-100 text-right tabular-nums whitespace-nowrap ${fatColor(row.fat)}`}>{row.fat.toFixed(2)}</td>
                  <td className={`px-3.5 py-2 border-b border-gray-100 text-right tabular-nums whitespace-nowrap ${snfColor(row.snf)}`}>{row.snf.toFixed(2)}</td>
                  <td className="px-3.5 py-2 border-b border-gray-100 text-right font-semibold text-gray-800 tabular-nums whitespace-nowrap">{row.clr.toFixed(2)}</td>
                  <td className="px-3.5 py-2 border-b border-gray-100 text-right font-semibold text-gray-800 tabular-nums whitespace-nowrap">{row.ph.toFixed(2)}</td>
                  <td className="px-3.5 py-2 border-b border-gray-100 text-right font-semibold text-gray-800 tabular-nums whitespace-nowrap">{row.acidity.toFixed(2)}</td>
                  <td className="px-3.5 py-2 border-b border-gray-100 whitespace-nowrap">{adulterationBadge(row.adulteration)}</td>
                </tr>
              ))}

              {/* Grand Total */}
              <tr className="bg-blue-50 border-t-2 border-blue-200">
                <td className="px-3.5 py-2.5 font-extrabold text-sap-primary text-[12px]" colSpan={6}>
                  Grand Total
                </td>
                <td className="px-3.5 py-2.5 text-right font-extrabold text-sap-primary text-[12px] tabular-nums">
                  {fmt(totalQty)}
                </td>
                <td colSpan={6}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Quality;
