import React, { useState } from 'react';
import ByProductForm from './ByProductForm';
import ByProductTable from './ByProductTable';
import ByProductList from './ByProductList';

const ByProduct = () => {
  // Top Form State
  const [docketNo, setDocketNo] = useState('DKT-O-2023-004');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mixingDocNo, setMixingDocNo] = useState('MIX-2023-509');
  const [mixingQty, setMixingQty] = useState(1200); // Readonly
  const [handlingLoss, setHandlingLoss] = useState(0);
  const [note, setNote] = useState('');

  // Table Items State
  const [items, setItems] = useState([]);

  const handleAdd = (newItem) => {
    setItems([...items, newItem]);
  };

  const handleRemove = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleSave = () => {
    console.log('Saved items:', items);
    console.log('Form Details:', { docketNo, date, mixingDocNo, mixingQty, handlingLoss, note });
    // Submit logic here
  };

  const handleReset = () => {
    setItems([]);
    setDocketNo('');
    setNote('');
    setMixingDocNo('');
    setHandlingLoss(0);
    setDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-800 uppercase">
            Others Finished Product Creation
          </h2>
        </div>
        <button className="rounded bg-sap-primary px-4 py-1.5 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-blue-700">
          ADD NEW
        </button>
      </div>

      {/* Top Form Section */}
      <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-blue-800 border-b border-blue-100 pb-2">
          Creation Details
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
          <div className="flex flex-col gap-1 col-span-2 lg:col-span-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Docket No</label>
            <input 
              type="text" 
              value={docketNo}
              onChange={(e) => setDocketNo(e.target.value)}
              className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            />
          </div>
          <div className="flex flex-col gap-1 col-span-2 lg:col-span-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Date</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            />
          </div>
          <div className="flex flex-col gap-1 col-span-2 lg:col-span-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Mixing Doc No</label>
            <input 
              type="text"
              value={mixingDocNo}
              onChange={(e) => setMixingDocNo(e.target.value)}
              placeholder="e.g. MIX-2023-..."
              className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            />
          </div>
          <div className="flex flex-col gap-1 col-span-2 lg:col-span-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Mixing Quantity</label>
             <input 
                type="number"
                value={mixingQty}
                disabled
                className="w-full rounded-sm border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500 outline-none font-bold"
              />
          </div>
          <div className="flex flex-col gap-1 col-span-2 lg:col-span-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Handling Loss</label>
            <input 
              type="number" 
              step="0.01"
              value={handlingLoss}
              onChange={(e) => setHandlingLoss(parseFloat(e.target.value) || 0)}
              className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            />
          </div>
          <div className="flex flex-col gap-1 col-span-2 lg:col-span-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Note (Opt.)</label>
            <input 
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            />
          </div>
        </div>
      </div>

      {/* Entry Component */}
      <ByProductForm onAdd={handleAdd} />

      {/* Table Component */}
      <ByProductTable items={items} onRemove={handleRemove} />

      {/* Bottom Buttons */}
      <div className="flex justify-end gap-3 rounded-sm border border-slate-200 bg-white p-4 shadow-sm">
        <button 
          onClick={handleReset}
          className="rounded border border-slate-300 bg-white px-6 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          RESET
        </button>
        <button 
          onClick={handleSave}
          className="rounded bg-green-600 px-8 py-1.5 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-green-700"
        >
          SAVE
        </button>
      </div>

      {/* History Component */}
      <ByProductList />
    </div>
  );
};

export default ByProduct;
