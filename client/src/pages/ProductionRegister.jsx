import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Play,
  ChevronDown,
  ChevronRight,
  Calendar,
  ClipboardList,
  AlignLeft,
  Columns,
  Rows,
  Sigma,
  List,
  Layers,
  BarChart2,
  FolderOpen,
  Info,
  MapPin
} from 'lucide-react';

const mockData = [
  { issueNo: 'PI-2026-0005', receiptNo: 'PR-2026-0005', batch: 'BATCH-0005', division: 'ICE CREAM', date: '10/03/26', product: 'Vanilla 500ml', issuedRM: 3200, produced: '780 PCS', rejected: '8', yieldPct: '98.9%', issueStatus: 'Posted', receiptStatus: 'Posted', location: 'Rampurhat' },
  { issueNo: 'PI-2026-0006', receiptNo: 'PR-2026-0006', batch: 'BATCH-0006', division: 'ICE CREAM', date: '14/03/26', product: 'Mango 1L', issuedRM: 4100, produced: '940 LTR', rejected: '15', yieldPct: '98.4%', issueStatus: 'Posted', receiptStatus: 'Posted', location: 'Rampurhat' },
  { issueNo: 'PI-2026-0007', receiptNo: 'PR-2026-0007', batch: 'BATCH-0007', division: 'ICE CREAM', date: '17/03/26', product: 'Vanilla 500ml', issuedRM: 3500, produced: '840 PCS', rejected: '5', yieldPct: '99.4%', issueStatus: 'Posted', receiptStatus: 'Posted', location: 'Rampurhat' },
  { issueNo: 'PI-2026-0008', receiptNo: 'PR-2026-0008', batch: 'BATCH-0008', division: 'ICE CREAM', date: '23/03/26', product: 'Mango 1L', issuedRM: 3800, produced: '920 LTR', rejected: '12', yieldPct: '98.7%', issueStatus: 'Posted', receiptStatus: 'Posted', location: 'Rampurhat' },
  { issueNo: 'PI-2026-0009', receiptNo: '-', batch: 'BATCH-0009', division: 'ICE CREAM', date: '24/03/26', product: 'Vanilla 500ml', issuedRM: 4620, produced: '-', rejected: '-', yieldPct: '-', issueStatus: 'Posted', receiptStatus: 'Pending', location: 'Rampurhat' },
];

const fmtAmount = (n) => typeof n === 'number' ? n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : n;

const ProductionRegister = () => {
  const [viewMode, setViewMode] = useState('Flat'); // 'Flat', 'Group', 'Pivot'
  const [groupBy, setGroupBy] = useState('');
  const [pivotRow, setPivotRow] = useState('');
  const [pivotColumn, setPivotColumn] = useState('');
  const [valueField, setValueField] = useState('Issued RM (KG)');
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const toggleGroup = (groupName) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const dimensions = ['Product', 'Division', 'Location', 'Week', 'Batch'];
  const valueFields = ['Issued RM (KG)'];

  const keyMap = {
    'Product': 'product',
    'Division': 'division',
    'Location': 'location',
    'Week': 'date',
    'Batch': 'batch'
  };

  const valKeyMap = {
    'Issued RM (KG)': 'issuedRM',
  };

  const getVal = (row, field) => {
    if (!field) return '';
    let val = row[keyMap[field]];
    if (field === 'Week') {
      const parts = val.split('/');
      const day = parseInt(parts[0], 10);
      const weekNum = Math.ceil(day / 7);
      return `Week ${weekNum}`;
    }
    if (field === 'Division') {
      return val === 'MILK' ? 'MILK Division' : val === 'ICE CREAM' ? 'ICE CREAM Division' : val;
    }
    return val;
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
        issuedRM: items.reduce((sum, item) => sum + item.issuedRM, 0),
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

  const grandTotals = useMemo(() => {
    return {
      issuedRM: mockData.reduce((sum, item) => sum + item.issuedRM, 0),
    };
  }, []);

  const renderBadge = (text) => {
    if (text === '-') return <span className="font-medium text-gray-500">-</span>;
    if (text === 'Pending') return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-orange-300 text-[9.5px] font-bold text-orange-600 bg-orange-50">
        Pending
      </span>
    );
    if (text === 'Posted') return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-green-300 text-[9.5px] font-bold text-green-600 bg-transparent">
        Posted
      </span>
    );
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-[9.5px] font-bold text-gray-700">
        {text}
      </span>
    );
  };

  const renderRow = (row, i) => (
    <tr key={row.issueNo + i} className="hover:bg-blue-50/30 transition-colors">
      <td className="px-4 py-2.5 font-bold text-sap-primary">{row.issueNo}</td>
      <td className="px-4 py-2.5 font-bold text-sap-primary">{row.receiptNo !== '-' ? row.receiptNo : <span className="text-gray-500">-</span>}</td>
      <td className="px-4 py-2.5 font-medium text-gray-700">{row.batch}</td>
      <td className="px-4 py-2.5">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9.5px] font-bold ${
          row.division === 'MILK' ? 'bg-blue-50 text-sap-primary' : 'bg-purple-50 text-purple-700'
        }`}>
          {row.division}
        </span>
      </td>
      <td className="px-4 py-2.5 font-medium text-gray-600">{row.date}</td>
      <td className="px-4 py-2.5 font-medium text-gray-700">{row.product}</td>
      <td className="px-4 py-2.5 text-right font-bold text-gray-700 tabular-nums">{fmtAmount(row.issuedRM)}</td>
      <td className="px-4 py-2.5 font-medium text-gray-600">{row.produced}</td>
      <td className="px-4 py-2.5 font-medium text-gray-600">{row.rejected}</td>
      <td className="px-4 py-2.5 font-medium text-gray-600">{row.yieldPct}</td>
      <td className="px-4 py-2.5">{renderBadge(row.issueStatus)}</td>
      <td className="px-4 py-2.5">{renderBadge(row.receiptStatus)}</td>
    </tr>
  );

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-4 pb-10">
      {/* Breadcrumb + Title */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span className="cursor-pointer hover:text-sap-primary transition-colors">Home</span> 
            <span>›</span>
            <span className="cursor-pointer hover:text-sap-primary transition-colors">Reports</span>
            <span>›</span>
            <span className="text-gray-600 font-medium">Production Register</span>
          </div>
          <div className="flex items-center gap-2.5">
            <ClipboardList className="h-5 w-5 text-gray-500" />
            <div>
              <h1 className="text-[17px] font-bold text-gray-800 tracking-tight">
                Periodic Production Register
              </h1>
              <p className="text-[11px] text-gray-500 mt-0.5 font-medium">
                Issue vs Receipt summary - Division - Location - Product filters
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
            <Play className="h-3.5 w-3.5 fill-white" /> Run Report
          </button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="rounded-lg border border-[#cbe1f8] bg-[#f4f9ff] shadow-sm flex flex-col gap-3 p-4">
        <div className="grid grid-cols-7 gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-sap-primary uppercase tracking-wider">Division</label>
            <div className="relative">
              <select className="form-select text-[11.5px] h-8 border-gray-300 rounded focus:border-sap-primary focus:ring-sap-primary text-gray-700 w-full bg-white">
                <option>All Divisions</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-sap-primary uppercase tracking-wider">Location</label>
            <div className="relative">
              <select className="form-select pl-7 text-[11.5px] h-8 border-gray-300 rounded focus:border-sap-primary focus:ring-sap-primary text-gray-700 w-full bg-white">
                <option>Rampurhat</option>
              </select>
              <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-pink-500" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-sap-primary uppercase tracking-wider">Product</label>
            <div className="relative">
              <select className="form-select text-[11.5px] h-8 border-gray-300 rounded focus:border-sap-primary focus:ring-sap-primary text-gray-700 w-full bg-white">
                <option>Mango Ice Cream 1L</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-sap-primary uppercase tracking-wider">From Date</label>
            <div className="relative">
              <input type="text" defaultValue="01-03-2026" readOnly className="form-input text-[11.5px] h-8 border-gray-300 rounded focus:border-sap-primary focus:ring-sap-primary text-gray-700 w-full bg-white pr-8" />
              <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-sap-primary uppercase tracking-wider">To Date</label>
            <div className="relative">
              <input type="text" defaultValue="31-03-2026" readOnly className="form-input text-[11.5px] h-8 border-gray-300 rounded focus:border-sap-primary focus:ring-sap-primary text-gray-700 w-full bg-white pr-8" />
              <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-sap-primary uppercase tracking-wider">Status</label>
            <div className="relative">
              <select className="form-select text-[11.5px] h-8 border-gray-300 rounded focus:border-sap-primary focus:ring-sap-primary text-gray-700 w-full bg-white">
                <option>All Status</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 h-8">
            <button className="flex-1 rounded bg-sap-primary text-[11px] font-bold text-white hover:bg-blue-700 shadow-sm transition-colors">Apply</button>
            <button className="flex-1 rounded border border-gray-300 bg-white text-[11px] font-semibold text-gray-600 hover:bg-gray-50 shadow-sm transition-colors">Reset</button>
          </div>
        </div>

        <div className="h-px bg-blue-100 my-1"></div>

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[10px] font-extrabold text-sap-primary uppercase tracking-wider w-[70px]">
              <AlignLeft className="h-3 w-3" /> Group By
            </div>
            <div className="flex gap-1.5">
              {dimensions.map((p) => (
                <span 
                  key={p} onClick={() => setGroupBy(groupBy === p ? '' : p)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-full cursor-pointer transition-colors border ${
                    groupBy === p ? 'bg-sap-primary text-white border-sap-primary shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-sap-primary hover:text-sap-primary'
                  }`}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[10px] font-extrabold text-sap-primary uppercase tracking-wider w-[80px]">
              <Rows className="h-3 w-3" /> Pivot Row
            </div>
            <div className="flex gap-1.5">
              {dimensions.map((p) => (
                <span 
                  key={p} onClick={() => setPivotRow(pivotRow === p ? '' : p)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-full cursor-pointer transition-colors border ${
                    pivotRow === p ? 'bg-sap-primary text-white border-sap-primary shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-sap-primary hover:text-sap-primary'
                  }`}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[10px] font-extrabold text-sap-primary uppercase tracking-wider w-[100px]">
              <Columns className="h-3 w-3" /> Pivot Column
            </div>
            <div className="flex gap-1.5">
              {dimensions.map((p) => (
                <span 
                  key={p} onClick={() => setPivotColumn(pivotColumn === p ? '' : p)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-full cursor-pointer transition-colors border ${
                    pivotColumn === p ? 'bg-sap-primary text-white border-sap-primary shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-sap-primary hover:text-sap-primary'
                  }`}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[10px] font-extrabold text-sap-primary uppercase tracking-wider w-[70px]">
              <Sigma className="h-3 w-3" /> Value Field
            </div>
            <div className="flex gap-1.5">
              {valueFields.map((p) => (
                <span 
                  key={p} onClick={() => setValueField(p)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-full cursor-pointer transition-colors border shadow-sm ${
                    valueField === p ? 'bg-[#F26419] border-[#F26419] text-white' : 'bg-white text-gray-600 border-gray-200 hover:border-[#F26419] hover:text-[#F26419]'
                  }`}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-sap-primary uppercase tracking-wider">View Mode</span>
            <div className="flex bg-white rounded border border-gray-200 p-0.5">
              <button 
                onClick={() => setViewMode('Flat')}
                className={`flex items-center gap-1 px-3 py-1 text-[10px] font-bold rounded transition-colors ${
                  viewMode === 'Flat' ? 'bg-sap-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <List className="h-3 w-3" /> Flat
              </button>
              <button 
                onClick={() => setViewMode('Group')}
                className={`flex items-center gap-1 px-3 py-1 text-[10px] font-bold rounded transition-colors ${
                  viewMode === 'Group' ? 'bg-sap-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Layers className="h-3 w-3" /> Group
              </button>
              <button 
                onClick={() => setViewMode('Pivot')}
                className={`flex items-center gap-1 px-3 py-1 text-[10px] font-bold rounded transition-colors ${
                  viewMode === 'Pivot' ? 'bg-sap-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <BarChart2 className="h-3 w-3" /> Pivot
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table / Pivot Card */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
        {viewMode === 'Group' && groupBy && (
          <div className="flex items-center justify-between px-5 py-2 border-b border-gray-200 bg-gray-50/50">
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
            <p className="text-[11.5px]">Please select both a Pivot Row and Pivot Column above to view the pivot table.</p>
          </div>
        )}

        <div className="overflow-x-auto">
          {viewMode === 'Pivot' && pivotRow && pivotColumn && pivotData ? (
            <table className="w-full text-left text-[11.5px] whitespace-nowrap">
              <thead>
                <tr className="bg-sap-primary text-white">
                  <th className="px-5 py-3 font-extrabold border-r border-blue-600/50 uppercase tracking-wider">{pivotRow} \ {pivotColumn}</th>
                  {pivotData.cols.map(c => (
                    <th key={c} className="px-5 py-3 font-extrabold text-right border-r border-blue-600/50 uppercase tracking-wider">{c}</th>
                  ))}
                  <th className="px-5 py-3 font-extrabold text-right uppercase tracking-wider">Grand Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pivotData.rows.map(r => {
                  let rowTotal = 0;
                  return (
                    <tr key={r} className="hover:bg-blue-50/20 transition-colors">
                      <td className="px-5 py-3 font-bold bg-gray-50 border-r border-gray-200 text-gray-700">{r}</td>
                      {pivotData.cols.map(c => {
                        const val = pivotData.matrix[r][c] || 0;
                        rowTotal += val;
                        return <td key={c} className="px-5 py-3 text-right font-medium text-gray-600 border-r border-gray-100 tabular-nums">{val ? fmtAmount(val) : '-'}</td>;
                      })}
                      <td className="px-5 py-3 text-right font-bold bg-[#f4f9ff] text-sap-primary tabular-nums">{fmtAmount(rowTotal)}</td>
                    </tr>
                  );
                })}
                <tr className="bg-[#eaf3fc] border-t-2 border-[#b5d5f5]">
                  <td className="px-5 py-3 font-extrabold text-gray-800 border-r border-blue-200">Grand Total</td>
                  {pivotData.cols.map(c => {
                    const colTotal = pivotData.rows.reduce((sum, r) => sum + (pivotData.matrix[r][c] || 0), 0);
                    return <td key={c} className="px-5 py-3 text-right font-extrabold text-gray-800 border-r border-blue-200 tabular-nums">{fmtAmount(colTotal)}</td>;
                  })}
                  <td className="px-5 py-3 text-right font-extrabold text-sap-primary tabular-nums">
                    {fmtAmount(pivotData.rows.reduce((sum, r) => sum + pivotData.cols.reduce((s, c) => s + (pivotData.matrix[r][c] || 0), 0), 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : viewMode !== 'Pivot' ? (
            <table className="w-full text-left text-[11px] whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2.5 font-extrabold uppercase tracking-wider text-gray-500 text-[9.5px]">Issue No. <span className="text-gray-300 ml-1">↕</span></th>
                  <th className="px-4 py-2.5 font-extrabold uppercase tracking-wider text-gray-500 text-[9.5px]">Receipt No. <span className="text-gray-300 ml-1">↕</span></th>
                  <th className="px-4 py-2.5 font-extrabold uppercase tracking-wider text-gray-500 text-[9.5px]">Batch <span className="text-gray-300 ml-1">↕</span></th>
                  <th className="px-4 py-2.5 font-extrabold uppercase tracking-wider text-gray-500 text-[9.5px]">Division <span className="text-gray-300 ml-1">↕</span></th>
                  <th className="px-4 py-2.5 font-extrabold uppercase tracking-wider text-gray-500 text-[9.5px]">Date <span className="text-gray-300 ml-1">↕</span></th>
                  <th className="px-4 py-2.5 font-extrabold uppercase tracking-wider text-gray-500 text-[9.5px]">Product <span className="text-gray-300 ml-1">↕</span></th>
                  <th className="px-4 py-2.5 font-extrabold uppercase tracking-wider text-gray-500 text-[9.5px] text-right">Issued RM (KG) <span className="text-gray-300 ml-1">↕</span></th>
                  <th className="px-4 py-2.5 font-extrabold uppercase tracking-wider text-gray-500 text-[9.5px]">Produced <span className="text-gray-300 ml-1">↕</span></th>
                  <th className="px-4 py-2.5 font-extrabold uppercase tracking-wider text-gray-500 text-[9.5px]">Rejected <span className="text-gray-300 ml-1">↕</span></th>
                  <th className="px-4 py-2.5 font-extrabold uppercase tracking-wider text-gray-500 text-[9.5px]">Yield % <span className="text-gray-300 ml-1">↕</span></th>
                  <th className="px-4 py-2.5 font-extrabold uppercase tracking-wider text-gray-500 text-[9.5px]">Issue Status <span className="text-gray-300 ml-1">↕</span></th>
                  <th className="px-4 py-2.5 font-extrabold uppercase tracking-wider text-gray-500 text-[9.5px]">Receipt Status <span className="text-gray-300 ml-1">↕</span></th>
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
                        <td colSpan={11} className="px-4 py-2 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            {collapsedGroups[group.groupName] ? (
                              <ChevronRight className="h-4 w-4 text-sap-primary" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-sap-primary" />
                            )}
                            <span className="font-bold text-gray-500">{groupBy}:</span>
                            <span className="font-bold text-sap-primary">{group.groupName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right text-[10px] text-gray-500 font-medium">
                          {group.items.length} records
                        </td>
                      </tr>
                      
                      {!collapsedGroups[group.groupName] && group.items.map((row, i) => renderRow(row, i))}
                      
                      {!collapsedGroups[group.groupName] && (
                        <tr className="bg-[#f0f7ff] border-t border-[#cbe1f8]">
                          <td colSpan={6} className="px-4 py-2.5 font-bold italic text-sap-primary text-[11px]">
                            ↳ Subtotal
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold text-sap-primary text-[11.5px] tabular-nums">{fmtAmount(group.subtotals.issuedRM)}</td>
                          <td colSpan={5}></td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
                
                <tr className="bg-[#eaf3fc] border-t-2 border-[#b5d5f5]">
                  <td colSpan={6} className="px-4 py-3 font-extrabold text-gray-800 text-[11.5px]">Grand Total</td>
                  <td className="px-4 py-3 text-right font-extrabold text-gray-800 text-[11.5px] tabular-nums">{fmtAmount(grandTotals.issuedRM)}</td>
                  <td colSpan={5}></td>
                </tr>
              </tbody>
            </table>
          ) : null}
        </div>
      </div>

    </div>
  );
};

export default ProductionRegister;
