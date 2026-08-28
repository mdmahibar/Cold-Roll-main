import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  ChevronDown,
  ChevronRight,
  Calendar,
  AlignLeft,
  Columns,
  Rows,
  Sigma,
  List,
  Layers,
  BarChart2,
  FolderOpen,
  Info,
  Package
} from 'lucide-react';

const mockData = [
  { itemCode: 'MLK-BUF-001', itemDesc: 'Buffalo Milk (Raw)', category: 'Raw Milk', division: 'MILK', location: 'Rampurhat', warehouse: 'Raw Milk Store', opening: 0, receipts: 13440, issues: 4200, closing: 9240, unit: 'KG', reorderLvl: 2000, valRate: 88.00, stockValue: 813120, status: 'OK' },
  { itemCode: 'PKG-FOIL-001', itemDesc: 'Milk Packaging Foil', category: 'Packaging', division: 'MILK', location: 'Rampurhat', warehouse: 'Packaging Store', opening: 1200, receipts: 3500, issues: 2800, closing: 1900, unit: 'KG', reorderLvl: 500, valRate: 120.00, stockValue: 228000, status: 'OK' },
  { itemCode: 'SGR-001', itemDesc: 'Sugar (Refined)', category: 'Ingredients', division: 'ICE CREAM', location: 'Rampurhat', warehouse: 'Ice Cream RM', opening: 800, receipts: 0, issues: 740, closing: 60, unit: 'KG', reorderLvl: 200, valRate: 80.00, stockValue: 4800, status: 'Low' },
  { itemCode: 'CIP-CHM-001', itemDesc: 'CIP Chemical', category: 'Chemicals', division: 'MILK', location: 'Rampurhat', warehouse: 'Chemicals Store', opening: 0, receipts: 100, issues: 100, closing: 0, unit: 'KG', reorderLvl: 20, valRate: 450.00, stockValue: 0, status: 'Zero' },
  { itemCode: 'IC-VAN-500', itemDesc: 'Vanilla Ice Cream 500ml', category: 'Finished Goods', division: 'ICE CREAM', location: 'Rampurhat', warehouse: 'Finished Goods', opening: 200, receipts: 780, issues: 320, closing: 660, unit: 'PCS', reorderLvl: 100, valRate: 245.00, stockValue: 161700, status: 'OK' },
  { itemCode: 'VAN-ESS-001', itemDesc: 'Vanilla Essence', category: 'Ingredients', division: 'ICE CREAM', location: 'Rampurhat', warehouse: 'Ice Cream RM', opening: 50, receipts: 150, issues: 165, closing: 35, unit: 'LTR', reorderLvl: 40, valRate: 890.00, stockValue: 31150, status: 'Low' },
  { itemCode: 'PLT-CAP-001', itemDesc: 'Plastic Caps', category: 'Packaging', division: 'MILK', location: 'Rampurhat', warehouse: 'Packaging Store', opening: 0, receipts: 0, issues: 0, closing: 0, unit: 'PCS', reorderLvl: 1000, valRate: 0.00, stockValue: 0, status: 'Zero' },
  { itemCode: 'MLK-BUF-001', itemDesc: 'Buffalo Milk (Raw)', category: 'Raw Milk', division: 'ICE CREAM', location: 'Rampurhat', warehouse: 'Ice Cream RM', opening: 0, receipts: 4200, issues: 4200, closing: 0, unit: 'KG', reorderLvl: 500, valRate: 88.00, stockValue: 0, status: 'Zero' },
];

const fmtAmount = (n) => typeof n === 'number' ? n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : n;
const fmtRate = (n) => typeof n === 'number' ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : n;

/* ─── Pill Button Component ─── */
const Pill = ({ label, active, onClick, activeColor = 'blue' }) => {
  const base = 'px-2 py-[3px] text-[10px] font-bold rounded cursor-pointer transition-all duration-150 border whitespace-nowrap select-none';
  const styles = {
    blue: active
      ? 'bg-sap-primary text-white border-sap-primary shadow-sm'
      : 'bg-white text-gray-500 border-gray-200 hover:border-sap-primary hover:text-sap-primary',
    orange: active
      ? 'bg-[#F26419] border-[#F26419] text-white shadow-sm'
      : 'bg-white text-gray-500 border-gray-200 hover:border-[#F26419] hover:text-[#F26419]',
  };
  return (
    <span className={`${base} ${styles[activeColor]}`} onClick={onClick}>
      {label}
    </span>
  );
};

const StockSummary = () => {
  const [viewMode, setViewMode] = useState('Flat');
  const [groupBy, setGroupBy] = useState('');
  const [pivotRow, setPivotRow] = useState('');
  const [pivotColumn, setPivotColumn] = useState('');
  const [valueField, setValueField] = useState('Opening');
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const toggleGroup = (groupName) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const dimensions = ['Division', 'Location', 'Warehouse', 'Item Category', 'Supplier'];
  const valueFields = ['Opening', 'Receipts', 'Issues', 'Closing', 'Stock Value'];

  const keyMap = {
    'Division': 'division',
    'Location': 'location',
    'Warehouse': 'warehouse',
    'Item Category': 'category',
    'Supplier': 'supplier' // Not in mock data currently but left for UI consistency
  };

  const valKeyMap = {
    'Opening': 'opening',
    'Receipts': 'receipts',
    'Issues': 'issues',
    'Closing': 'closing',
    'Stock Value': 'stockValue'
  };

  const getVal = (row, field) => {
    if (!field) return '';
    let val = row[keyMap[field]];
    if (field === 'Division') {
      return val === 'MILK' ? 'MILK Division' : val === 'ICE CREAM' ? 'ICE CREAM Division' : val;
    }
    return val || 'Unknown';
  };

  const groupedData = useMemo(() => {
    if (viewMode !== 'Group' || !groupBy) return null;
    const groups = {};
    mockData.forEach(row => {
      const val = getVal(row, groupBy);
      if (!groups[val]) groups[val] = [];
      groups[val].push(row);
    });
    return Object.entries(groups).map(([groupName, items]) => {
      const subtotals = {
        opening: items.reduce((sum, item) => sum + item.opening, 0),
        receipts: items.reduce((sum, item) => sum + item.receipts, 0),
        issues: items.reduce((sum, item) => sum + item.issues, 0),
        closing: items.reduce((sum, item) => sum + item.closing, 0),
        stockValue: items.reduce((sum, item) => sum + item.stockValue, 0),
      };
      return { groupName, items, subtotals };
    });
  }, [viewMode, groupBy]);

  const pivotData = useMemo(() => {
    if (viewMode !== 'Pivot' || !pivotRow || !pivotColumn || !valueField) return null;
    const valKey = valKeyMap[valueField];
    const rowValues = new Set();
    const colValues = new Set();
    const matrix = {};
    mockData.forEach(row => {
      const r = getVal(row, pivotRow);
      const c = getVal(row, pivotColumn);
      const v = row[valKey] || 0;
      rowValues.add(r);
      colValues.add(c);
      if (!matrix[r]) matrix[r] = {};
      if (!matrix[r][c]) matrix[r][c] = 0;
      matrix[r][c] += v;
    });
    const rows = Array.from(rowValues).sort();
    const cols = Array.from(colValues).sort();
    return { rows, cols, matrix, valKey };
  }, [viewMode, pivotRow, pivotColumn, valueField]);

  const grandTotals = useMemo(() => ({
    opening: mockData.reduce((sum, item) => sum + item.opening, 0),
    receipts: mockData.reduce((sum, item) => sum + item.receipts, 0),
    issues: mockData.reduce((sum, item) => sum + item.issues, 0),
    closing: mockData.reduce((sum, item) => sum + item.closing, 0),
    stockValue: mockData.reduce((sum, item) => sum + item.stockValue, 0),
  }), []);

  const renderStatusBadge = (text) => {
    if (text === 'OK') {
      return (
        <span className="inline-flex items-center px-2 py-[2px] rounded-full border border-green-300 text-[9px] font-bold text-green-700 bg-green-50">
          OK
        </span>
      );
    }
    if (text === 'Low') {
      return (
        <span className="inline-flex items-center px-2 py-[2px] rounded-full border border-orange-300 text-[9px] font-bold text-orange-600 bg-orange-50">
          Low
        </span>
      );
    }
    if (text === 'Zero') {
      return (
        <span className="inline-flex items-center px-2 py-[2px] rounded-full border border-pink-300 text-[9px] font-bold text-pink-600 bg-pink-50">
          Zero
        </span>
      );
    }
    return text;
  };

  const renderRow = (row, i) => (
    <tr key={row.itemCode + i} className="hover:bg-blue-50/30 transition-colors">
      <td className="px-3 py-2.5 font-medium text-gray-700">{row.itemCode}</td>
      <td className="px-3 py-2.5 font-medium text-gray-600">{row.itemDesc}</td>
      <td className="px-3 py-2.5 font-medium text-gray-600">{row.category}</td>
      <td className="px-3 py-2.5">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9.5px] font-bold ${
          row.division === 'MILK' ? 'bg-blue-50 text-sap-primary' : 'bg-purple-50 text-purple-700'
        }`}>
          {row.division}
        </span>
      </td>
      <td className="px-3 py-2.5 font-medium text-gray-600">{row.location}</td>
      <td className="px-3 py-2.5 font-medium text-gray-600">{row.warehouse}</td>
      <td className="px-3 py-2.5 text-right font-bold text-gray-700 tabular-nums">{fmtAmount(row.opening)}</td>
      <td className="px-3 py-2.5 text-right font-bold text-gray-700 tabular-nums">{fmtAmount(row.receipts)}</td>
      <td className="px-3 py-2.5 text-right font-bold text-gray-700 tabular-nums">{fmtAmount(row.issues)}</td>
      <td className={`px-3 py-2.5 text-right font-bold tabular-nums ${row.closing === 0 ? 'text-red-500' : 'text-gray-700'}`}>{fmtAmount(row.closing)}</td>
      <td className="px-3 py-2.5 font-medium text-gray-600 text-[10px]">{row.unit}</td>
      <td className="px-3 py-2.5 text-right font-medium text-gray-600 tabular-nums">{fmtAmount(row.reorderLvl)}</td>
      <td className="px-3 py-2.5 text-right font-medium text-gray-600 tabular-nums">{fmtRate(row.valRate)}</td>
      <td className="px-3 py-2.5 text-right font-bold text-gray-700 tabular-nums">{fmtAmount(row.stockValue)}</td>
      <td className="px-3 py-2.5 text-center">{renderStatusBadge(row.status)}</td>
    </tr>
  );

  /* ═══════════════════ RENDER ═══════════════════ */
  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-3 pb-10">

      {/* ── Breadcrumb + Title ── */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span className="cursor-pointer hover:text-sap-primary transition-colors">Home</span>
            <span>›</span>
            <span className="cursor-pointer hover:text-sap-primary transition-colors">Reports</span>
            <span>›</span>
            <span className="text-gray-600 font-medium">Stock Summary</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Package className="h-5 w-5 text-gray-500" />
            <div>
              <h1 className="text-[17px] font-bold text-gray-800 tracking-tight">
                Division & Location-wise Stock Summary
              </h1>
              <p className="text-[11px] text-gray-500 mt-0.5 font-medium">
                Live inventory levels - Division - Location - Warehouse filters - Multiple grouping
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <button className="inline-flex items-center gap-1.5 rounded border border-gray-300 bg-white px-3 py-[6px] text-[11px] font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </button>
          <button className="inline-flex items-center gap-1.5 rounded border border-gray-300 bg-white px-3 py-[6px] text-[11px] font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          <button className="inline-flex items-center gap-1.5 rounded bg-sap-primary px-4 py-[6px] text-[11.5px] font-bold text-white hover:bg-blue-700 shadow-sm transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Refresh Stock
          </button>
        </div>
      </div>

      {/* ── Filters Row ── */}
      <div className="rounded-lg border border-[#cbe1f8] bg-[#f4f9ff] shadow-sm p-3">
        <div className="grid grid-cols-7 gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-extrabold text-sap-primary uppercase tracking-wider">Division</label>
            <select className="form-select text-[11px] h-[30px] border-gray-300 rounded focus:border-sap-primary focus:ring-sap-primary text-gray-700 w-full bg-white">
              <option>All Divisions</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-extrabold text-sap-primary uppercase tracking-wider">Location</label>
            <select className="form-select text-[11px] h-[30px] border-gray-300 rounded focus:border-sap-primary focus:ring-sap-primary text-gray-700 w-full bg-white">
              <option>All Locations</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-extrabold text-sap-primary uppercase tracking-wider">Warehouse</label>
            <select className="form-select text-[11px] h-[30px] border-gray-300 rounded focus:border-sap-primary focus:ring-sap-primary text-gray-700 w-full bg-white">
              <option>All Warehouses</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-extrabold text-sap-primary uppercase tracking-wider">Item Category</label>
            <select className="form-select text-[11px] h-[30px] border-gray-300 rounded focus:border-sap-primary focus:ring-sap-primary text-gray-700 w-full bg-white">
              <option>All Categories</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-extrabold text-sap-primary uppercase tracking-wider">Stock Status</label>
            <select className="form-select text-[11px] h-[30px] border-gray-300 rounded focus:border-sap-primary focus:ring-sap-primary text-gray-700 w-full bg-white">
              <option>All</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-extrabold text-sap-primary uppercase tracking-wider">As On Date</label>
            <div className="relative">
              <input type="text" defaultValue="24-03-2026" readOnly className="form-input text-[11px] h-[30px] border-gray-300 rounded focus:border-sap-primary focus:ring-sap-primary text-gray-700 w-full bg-white pr-7" />
              <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
            </div>
          </div>
          <div className="flex gap-2 h-[30px]">
            <button className="flex-1 rounded bg-sap-primary text-[11px] font-bold text-white hover:bg-blue-700 shadow-sm transition-colors">Apply</button>
            <button className="flex-1 rounded border border-gray-300 bg-white text-[11px] font-semibold text-gray-600 hover:bg-gray-50 shadow-sm transition-colors">Reset</button>
          </div>
        </div>
      </div>

      {/* ── Grouping / Pivot / Value / View Mode Strip ── */}
      <div className="rounded-lg border border-[#cbe1f8] bg-[#f4f9ff] shadow-sm px-3 py-2.5 flex items-center gap-3 overflow-x-auto">
        {/* GROUP BY */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="flex items-center gap-0.5 text-[9px] font-extrabold text-sap-primary uppercase tracking-wider whitespace-nowrap">
            <AlignLeft className="h-3 w-3" /> Group By
          </span>
          <div className="flex gap-1">
            {dimensions.map(p => (
              <Pill key={p} label={p} active={groupBy === p} onClick={() => setGroupBy(groupBy === p ? '' : p)} />
            ))}
          </div>
        </div>

        <div className="w-px h-5 bg-blue-200 shrink-0" />

        {/* PIVOT ROW */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="flex items-center gap-0.5 text-[9px] font-extrabold text-sap-primary uppercase tracking-wider whitespace-nowrap">
            <Rows className="h-3 w-3" /> Pivot Row
          </span>
          <div className="flex gap-1">
            {dimensions.map(p => (
              <Pill key={p} label={p} active={pivotRow === p} onClick={() => setPivotRow(pivotRow === p ? '' : p)} />
            ))}
          </div>
        </div>

        <div className="w-px h-5 bg-blue-200 shrink-0" />

        {/* PIVOT COLUMN */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="flex items-center gap-0.5 text-[9px] font-extrabold text-sap-primary uppercase tracking-wider whitespace-nowrap">
            <Columns className="h-3 w-3" /> Pivot Column
          </span>
          <div className="flex gap-1">
            {dimensions.map(p => (
              <Pill key={p} label={p} active={pivotColumn === p} onClick={() => setPivotColumn(pivotColumn === p ? '' : p)} />
            ))}
          </div>
        </div>

        <div className="w-px h-5 bg-blue-200 shrink-0" />

        {/* VALUE FIELD */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="flex items-center gap-0.5 text-[9px] font-extrabold text-sap-primary uppercase tracking-wider whitespace-nowrap">
            <Sigma className="h-3 w-3" /> Value Field
          </span>
          <div className="flex gap-1">
            {valueFields.map(p => (
              <Pill key={p} label={p} active={valueField === p} onClick={() => setValueField(p)} activeColor="orange" />
            ))}
          </div>
        </div>

        {/* VIEW Mode - pushed right */}
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <span className="text-[9px] font-extrabold text-sap-primary uppercase tracking-wider whitespace-nowrap">View Mode</span>
          <div className="flex bg-white rounded border border-gray-200 p-[2px]">
            {[
              { id: 'Flat', icon: List },
              { id: 'Group', icon: Layers },
              { id: 'Pivot', icon: BarChart2 }
            ].map(({ id, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setViewMode(id)}
                className={`flex items-center gap-1 px-2 py-[3px] text-[10px] font-bold rounded transition-colors ${
                  viewMode === id ? 'bg-sap-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-3 w-3" /> {id}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Table / Pivot Card ── */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
        {/* Card header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-white">
          <h2 className="text-[13px] font-extrabold text-gray-800">Report Data</h2>
          {viewMode === 'Pivot' && pivotRow && pivotColumn && (
            <div className="flex items-center gap-3 text-[10px] text-gray-500 font-medium">
              <span>◆ Rows: <b className="text-sap-primary">{pivotRow}</b></span>
              <span>◆ Cols: <b className="text-sap-primary">{pivotColumn}</b></span>
              <span>◆ Value: <b className="text-[#F26419]">{valueField}</b></span>
              <span className="text-gray-400">| {pivotData?.rows?.length || 0} rows · {pivotData?.cols?.length || 0} cols · {mockData.length} source records</span>
            </div>
          )}
        </div>

        {viewMode === 'Group' && groupBy && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50/50">
            <div className="flex items-center gap-2 text-[11px] font-bold text-sap-primary flex-1 justify-center">
              <FolderOpen className="h-3.5 w-3.5" /> Grouped by: {groupBy}
            </div>
            <div className="text-[10px] text-gray-500 font-medium">
              — {groupedData?.length || 0} groups · {mockData.length} records | click group header to collapse/expand
            </div>
          </div>
        )}

        {viewMode === 'Pivot' && (!pivotRow || !pivotColumn) && (
          <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-2">
            <Info className="h-8 w-8 text-blue-400" />
            <p className="text-[13px] font-bold text-gray-700">Incomplete Pivot Selection</p>
            <p className="text-[11.5px]">Please select both a <b>Pivot Row</b> and <b>Pivot Column</b> above, then switch to <b>Pivot</b> view mode.</p>
          </div>
        )}

        <div className="overflow-x-auto">
          {/* ── PIVOT TABLE ── */}
          {viewMode === 'Pivot' && pivotRow && pivotColumn && pivotData ? (
            <table className="w-full text-left text-[11px] whitespace-nowrap">
              <thead>
                <tr className="bg-[#1C3347] text-white">
                  <th className="px-4 py-3 font-extrabold uppercase tracking-wider text-[9.5px] border-r border-gray-600">{pivotRow} \\ {pivotColumn}</th>
                  {pivotData.cols.map(c => (
                    <th key={c} className="px-4 py-3 font-extrabold text-right uppercase tracking-wider text-[9.5px] border-r border-gray-600">{c}</th>
                  ))}
                  <th className="px-4 py-3 font-extrabold text-right uppercase tracking-wider text-gray-300 text-[9.5px]">ROW TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pivotData.rows.map(r => {
                  let rowTotal = 0;
                  return (
                    <tr key={r} className="hover:bg-blue-50/20 transition-colors">
                      <td className="px-4 py-2.5 font-bold bg-white border-r border-gray-200 text-gray-700">{r}</td>
                      {pivotData.cols.map(c => {
                        const val = pivotData.matrix[r][c] || 0;
                        rowTotal += val;
                        return (
                          <td key={c} className="px-4 py-2.5 text-right font-bold text-gray-600 border-r border-gray-100 tabular-nums">
                            {val ? fmtAmount(val) : <span className="text-gray-300">—</span>}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2.5 text-right font-extrabold bg-gray-50/60 text-sap-primary tabular-nums">{fmtAmount(rowTotal)}</td>
                    </tr>
                  );
                })}
                <tr className="bg-[#eaf3fc] border-t-2 border-blue-400">
                  <td className="px-4 py-2.5 font-extrabold text-gray-800 border-r border-blue-200">Col Total</td>
                  {pivotData.cols.map(c => {
                    const colTotal = pivotData.rows.reduce((sum, r) => sum + (pivotData.matrix[r][c] || 0), 0);
                    return <td key={c} className="px-4 py-2.5 text-right font-extrabold text-gray-800 border-r border-blue-200 tabular-nums">{fmtAmount(colTotal)}</td>;
                  })}
                  <td className="px-4 py-2.5 text-right font-extrabold text-sap-primary tabular-nums">
                    {fmtAmount(pivotData.rows.reduce((sum, r) => sum + pivotData.cols.reduce((s, c) => s + (pivotData.matrix[r][c] || 0), 0), 0))}
                  </td>
                </tr>
              </tbody>
            </table>

          /* ── FLAT / GROUP TABLE ── */
          ) : viewMode !== 'Pivot' ? (
            <table className="w-full text-left text-[11px] whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Item Code', 'Item Description', 'Category', 'Division', 'Location', 'Warehouse'].map(h => (
                    <th key={h} className="px-3 py-2.5 font-extrabold uppercase tracking-wider text-gray-500 text-[9.5px]">{h} <span className="text-gray-300 ml-0.5">↕</span></th>
                  ))}
                  {['Opening', 'Receipts', 'Issues', 'Closing'].map(h => (
                    <th key={h} className="px-3 py-2.5 font-extrabold uppercase tracking-wider text-gray-500 text-[9.5px] text-right">{h} <span className="text-gray-300 ml-0.5">↕</span></th>
                  ))}
                  <th className="px-3 py-2.5 font-extrabold uppercase tracking-wider text-gray-500 text-[9.5px]">Unit <span className="text-gray-300 ml-0.5">↕</span></th>
                  {['Reorder Lvl', 'Val. Rate', 'Stock Value'].map(h => (
                    <th key={h} className="px-3 py-2.5 font-extrabold uppercase tracking-wider text-gray-500 text-[9.5px] text-right">{h} <span className="text-gray-300 ml-0.5">↕</span></th>
                  ))}
                  <th className="px-3 py-2.5 font-extrabold uppercase tracking-wider text-gray-500 text-[9.5px] text-center">Status <span className="text-gray-300 ml-0.5">↕</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {viewMode === 'Flat' ? (
                  mockData.map((row, i) => renderRow(row, i))
                ) : (
                  groupedData && groupedData.map((group, idx) => (
                    <React.Fragment key={idx}>
                      <tr
                        className="bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors border-y border-gray-200"
                        onClick={() => toggleGroup(group.groupName)}
                      >
                        <td colSpan={15} className="px-3 py-2 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            {collapsedGroups[group.groupName]
                              ? <ChevronRight className="h-4 w-4 text-sap-primary" />
                              : <ChevronDown className="h-4 w-4 text-sap-primary" />
                            }
                            <span className="font-bold text-gray-500">{groupBy}:</span>
                            <span className="font-bold text-sap-primary">{group.groupName}</span>
                            <span className="ml-2 text-[10px] text-gray-400 font-medium">({group.items.length} records)</span>
                          </div>
                        </td>
                      </tr>
                      {!collapsedGroups[group.groupName] && group.items.map((row, i) => renderRow(row, i))}
                      {!collapsedGroups[group.groupName] && (
                        <tr className="bg-[#f0f7ff] border-t border-[#cbe1f8]">
                          <td colSpan={6} className="px-3 py-2.5 font-bold italic text-sap-primary text-[11px]">↳ Subtotal</td>
                          <td className="px-3 py-2.5 text-right font-bold text-sap-primary text-[11.5px] tabular-nums">{fmtAmount(group.subtotals.opening)}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-sap-primary text-[11.5px] tabular-nums">{fmtAmount(group.subtotals.receipts)}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-sap-primary text-[11.5px] tabular-nums">{fmtAmount(group.subtotals.issues)}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-sap-primary text-[11.5px] tabular-nums">{fmtAmount(group.subtotals.closing)}</td>
                          <td colSpan={3}></td>
                          <td className="px-3 py-2.5 text-right font-bold text-sap-primary text-[11.5px] tabular-nums">{fmtAmount(group.subtotals.stockValue)}</td>
                          <td></td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
                <tr className="bg-[#eaf3fc] border-t-2 border-[#b5d5f5]">
                  <td colSpan={6} className="px-3 py-3 font-extrabold text-gray-800 text-[11.5px]">Grand Total</td>
                  <td className="px-3 py-3 text-right font-extrabold text-gray-800 text-[11.5px] tabular-nums">{fmtAmount(grandTotals.opening)}</td>
                  <td className="px-3 py-3 text-right font-extrabold text-gray-800 text-[11.5px] tabular-nums">{fmtAmount(grandTotals.receipts)}</td>
                  <td className="px-3 py-3 text-right font-extrabold text-gray-800 text-[11.5px] tabular-nums">{fmtAmount(grandTotals.issues)}</td>
                  <td className="px-3 py-3 text-right font-extrabold text-gray-800 text-[11.5px] tabular-nums">{fmtAmount(grandTotals.closing)}</td>
                  <td colSpan={3}></td>
                  <td className="px-3 py-3 text-right font-extrabold text-gray-800 text-[11.5px] tabular-nums">{fmtAmount(grandTotals.stockValue)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default StockSummary;
