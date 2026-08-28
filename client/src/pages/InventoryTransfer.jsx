import React, { useState } from 'react';
import {
  Search,
  Plus,
  ChevronDown,
  Check,
  Truck,
  AlertTriangle,
} from 'lucide-react';

/* ──────────────────────────────────────────────
   MOCK TRANSFER DATA
   ────────────────────────────────────────────── */
const mockTransfers = [
  {
    id: 'IT-2026-0028',
    refNo: 'TR-2026-0015',
    fromDivision: 'MILK DIVISION',
    toDivision: 'ICE CREAM DIVISION',
    date: '2026-04-03',
    lines: [
      { sl: 1, item: 'Buffalo Milk (Raw)', fromWH: 'RAMPURHAT — Raw Milk', toWH: 'RAMPURHAT — Ice Cream RM', requested: 4200, transferQty: 4200, unit: 'KG' },
    ],
  },
  {
    id: 'IT-2026-0027',
    refNo: 'TR-2026-0014',
    fromDivision: 'MILK DIVISION',
    toDivision: 'ICE CREAM DIVISION',
    date: '2026-04-02',
    lines: [
      { sl: 1, item: 'Fresh Cream', fromWH: 'RAMPURHAT — Raw Milk', toWH: 'RAMPURHAT — Ice Cream RM', requested: 500, transferQty: 500, unit: 'KG' },
      { sl: 2, item: 'Cow Milk (Raw)', fromWH: 'RAMPURHAT — Raw Milk', toWH: 'RAMPURHAT — Ice Cream RM', requested: 2000, transferQty: 2000, unit: 'KG' },
    ],
  },
  {
    id: 'IT-2026-0026',
    refNo: 'TR-2026-0013',
    fromDivision: 'ICE CREAM DIVISION',
    toDivision: 'MILK DIVISION',
    date: '2026-04-01',
    lines: [
      { sl: 1, item: 'Packaging Foil', fromWH: 'RAMPURHAT — Finished Goods', toWH: 'RAMPURHAT — Packaging Store', requested: 1200, transferQty: 1200, unit: 'PCS' },
    ],
  },
];

/* ──────────────────────────────────────────────
   INVENTORY TRANSFER PAGE
   ────────────────────────────────────────────── */
const InventoryTransfer = () => {
  const [activeTransfer, setActiveTransfer] = useState(mockTransfers[0]);
  const [transferLines, setTransferLines] = useState(
    mockTransfers[0].lines.map(l => ({ ...l }))
  );

  /* ── New Transfer form state ── */
  const [showNewForm, setShowNewForm] = useState(false);
  const [newRefNo, setNewRefNo] = useState('');
  const [newFromDiv, setNewFromDiv] = useState('MILK DIVISION');
  const [newToDiv, setNewToDiv] = useState('ICE CREAM DIVISION');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));

  const handleSelectTransfer = (t) => {
    setActiveTransfer(t);
    setTransferLines(t.lines.map(l => ({ ...l })));
    setShowNewForm(false);
  };

  const handleQtyChange = (idx, val) => {
    setTransferLines(prev =>
      prev.map((l, i) => i === idx ? { ...l, transferQty: Number(val) || 0 } : l)
    );
  };

  const fmt = (n) => n.toLocaleString('en-IN');

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-4 pb-10">

      {/* ═══ Breadcrumb + Title ═══ */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span>Home</span> <span>›</span>
            <span className="text-gray-600 font-medium">Inventory Transfer</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-lg">🚛</span>
            <h1 className="text-[17px] font-bold text-gray-800 tracking-tight">
              Inventory Transfer
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 mt-3">
          <span className="inline-flex items-center gap-1.5 rounded border border-orange-300 bg-orange-50 px-3 py-[5px] text-[10.5px] font-bold text-orange-700 tracking-wide">
            <AlertTriangle className="h-3 w-3" /> Division Mandatory
          </span>
          <button
            onClick={() => setShowNewForm(true)}
            className="inline-flex items-center gap-1.5 rounded bg-sap-primary px-4 py-[6px] text-[11px] font-bold text-white hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> New Transfer
          </button>
        </div>
      </div>

      {/* ═══ Transfer Card ═══ */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50/60">
          <h3 className="text-[13px] font-bold text-gray-700">
            Inventory Transfer — <span className="text-sap-primary">{activeTransfer.id}</span>
          </h3>
        </div>

        {/* Form Row */}
        <div className="grid grid-cols-4 gap-5 px-5 py-4 border-b border-gray-100">
          {/* Transfer Ref */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-gray-500">
              Transfer Ref.
            </label>
            <div className="relative">
              <input
                type="text"
                value={activeTransfer.refNo}
                readOnly
                className="form-input text-[12px] font-semibold text-gray-800 pr-9"
              />
              <button className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-sap-primary transition-colors">
                <Search className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* From Division */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-gray-500">
              From Division <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={activeTransfer.fromDivision}
                readOnly
                className="form-select text-[12px] font-semibold pr-8"
              >
                <option>MILK DIVISION</option>
                <option>ICE CREAM DIVISION</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
              <span className="text-[10px] font-semibold text-blue-600">{activeTransfer.fromDivision}</span>
            </div>
          </div>

          {/* To Division */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-gray-500">
              To Division <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={activeTransfer.toDivision}
                readOnly
                className="form-select text-[12px] font-semibold pr-8"
              >
                <option>MILK DIVISION</option>
                <option>ICE CREAM DIVISION</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
              <span className="text-[10px] font-semibold text-green-600">{activeTransfer.toDivision}</span>
            </div>
          </div>

          {/* Transfer Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-gray-500">
              Transfer Date
            </label>
            <input
              type="date"
              value={activeTransfer.date}
              readOnly
              className="form-input text-[12px] font-semibold text-gray-800"
            />
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11.5px] border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 font-extrabold uppercase tracking-wider text-gray-500 text-[10px] w-10 text-center">#</th>
                <th className="px-4 py-2.5 font-extrabold uppercase tracking-wider text-gray-500 text-[10px]">Item</th>
                <th className="px-4 py-2.5 font-extrabold uppercase tracking-wider text-gray-500 text-[10px]">From WH</th>
                <th className="px-4 py-2.5 font-extrabold uppercase tracking-wider text-gray-500 text-[10px]">To WH</th>
                <th className="px-4 py-2.5 font-extrabold uppercase tracking-wider text-gray-500 text-[10px] text-right">Requested</th>
                <th className="px-4 py-2.5 font-extrabold uppercase tracking-wider text-gray-500 text-[10px] text-right">Transfer Qty</th>
                <th className="px-4 py-2.5 font-extrabold uppercase tracking-wider text-gray-500 text-[10px] text-center">Unit</th>
              </tr>
            </thead>
            <tbody>
              {transferLines.map((line, idx) => (
                <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3 border-b border-gray-100 text-center text-gray-400 font-bold">
                    {line.sl}
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-800 whitespace-nowrap">
                    {line.item}
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 text-gray-600 font-medium whitespace-nowrap">
                    {line.fromWH}
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 text-gray-600 font-medium whitespace-nowrap">
                    {line.toWH}
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 text-right font-bold text-gray-800 whitespace-nowrap">
                    {fmt(line.requested)} <span className="text-gray-400 font-semibold text-[10px]">{line.unit}</span>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 text-right whitespace-nowrap">
                    <input
                      type="number"
                      value={line.transferQty}
                      onChange={e => handleQtyChange(idx, e.target.value)}
                      className="w-24 rounded border border-gray-300 px-2 py-1 text-[12px] font-bold text-gray-800 text-right focus:border-sap-primary focus:ring-1 focus:ring-sap-primary outline-none transition-colors"
                    />
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 text-center text-gray-500 font-semibold">
                    {line.unit}
                  </td>
                </tr>
              ))}
              {transferLines.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400 font-medium">
                    No line items added yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 bg-gray-50/40">
          <button className="rounded border border-gray-300 bg-white px-5 py-[7px] text-[11.5px] font-semibold text-gray-600 hover:bg-gray-50 shadow-sm transition-colors">
            Cancel
          </button>
          <button className="inline-flex items-center gap-1.5 rounded bg-green-600 px-5 py-[7px] text-[11.5px] font-bold text-white hover:bg-green-700 shadow-sm transition-colors">
            <Check className="h-3.5 w-3.5" /> Confirm Transfer
          </button>
        </div>
      </div>

      {/* ═══ Recent Transfers List ═══ */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50/60 flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-gray-700">Recent Transfers</h3>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            {mockTransfers.length} transfers
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11.5px] border-collapse">
            <thead>
              <tr className="bg-gradient-to-b from-gray-50 to-gray-100/80">
                <th className="px-4 py-2.5 font-extrabold uppercase tracking-wider text-sap-primary text-[10px] border-b-2 border-blue-200">Transfer ID</th>
                <th className="px-4 py-2.5 font-extrabold uppercase tracking-wider text-sap-primary text-[10px] border-b-2 border-blue-200">Ref No.</th>
                <th className="px-4 py-2.5 font-extrabold uppercase tracking-wider text-sap-primary text-[10px] border-b-2 border-blue-200">Date</th>
                <th className="px-4 py-2.5 font-extrabold uppercase tracking-wider text-sap-primary text-[10px] border-b-2 border-blue-200">From Division</th>
                <th className="px-4 py-2.5 font-extrabold uppercase tracking-wider text-sap-primary text-[10px] border-b-2 border-blue-200">To Division</th>
                <th className="px-4 py-2.5 font-extrabold uppercase tracking-wider text-sap-primary text-[10px] border-b-2 border-blue-200 text-right">Items</th>
                <th className="px-4 py-2.5 font-extrabold uppercase tracking-wider text-sap-primary text-[10px] border-b-2 border-blue-200 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {mockTransfers.map((t, idx) => {
                const isActive = activeTransfer.id === t.id;
                return (
                  <tr
                    key={t.id}
                    className={`transition-colors cursor-pointer ${
                      isActive ? 'bg-blue-50/60' : 'hover:bg-gray-50/60'
                    }`}
                    onClick={() => handleSelectTransfer(t)}
                  >
                    <td className={`px-4 py-2.5 border-b border-gray-100 font-bold whitespace-nowrap ${isActive ? 'text-sap-primary' : 'text-gray-700'}`}>
                      {t.id}
                    </td>
                    <td className="px-4 py-2.5 border-b border-gray-100 text-gray-600 font-medium whitespace-nowrap">
                      {t.refNo}
                    </td>
                    <td className="px-4 py-2.5 border-b border-gray-100 text-gray-600 whitespace-nowrap">
                      {t.date}
                    </td>
                    <td className="px-4 py-2.5 border-b border-gray-100 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                        <span className="text-gray-700 font-medium">{t.fromDivision}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 border-b border-gray-100 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                        <span className="text-gray-700 font-medium">{t.toDivision}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 border-b border-gray-100 text-right font-bold text-gray-700">
                      {t.lines.length}
                    </td>
                    <td className="px-4 py-2.5 border-b border-gray-100 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSelectTransfer(t); }}
                        className={`rounded px-3 py-1 text-[10px] font-bold shadow-sm transition-colors ${
                          isActive
                            ? 'bg-sap-primary text-white'
                            : 'bg-white border border-gray-200 text-gray-600 hover:border-sap-primary hover:text-sap-primary'
                        }`}
                      >
                        {isActive ? 'ACTIVE' : 'VIEW'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryTransfer;
