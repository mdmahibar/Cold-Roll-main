import React, { useState } from 'react';
import FinishDamageForm from './FinishDamageForm';
import FinishDamageTable from './FinishDamageTable';
import FinishDamageHistory from './FinishDamageHistory';

const FinishDamage = () => {
  // Top Form State
  const [docketNo, setDocketNo] = useState('DKT-FD-2023-004');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  // Table Items State
  const [items, setItems] = useState([]);

  const handleAdd = (newItem) => {
    setItems([...items, newItem]);
  };

  const handleRemove = (id) => {
    setItems(items.filter(item => item.id !== id));
  };
  
  // Real-time Update function for editable Table Rows
  const handleUpdate = (id, field, value) => {
    setItems(prevItems => 
      prevItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value === '' ? '' : parseFloat(value) };
          // Instant amount recalculation on either rate or quantity shift
          const qty = parseFloat(updatedItem.quantity) || 0;
          const rate = parseFloat(updatedItem.saleRate) || 0;
          updatedItem.amount = qty * rate;
          return updatedItem;
        }
        return item;
      })
    );
  };

  const handleSave = () => {
    console.log('Saved Damage Entry:', items);
    console.log('Form Details:', { docketNo, date, note });
    // Submit logic here
  };

  const handleReset = () => {
    setItems([]);
    setDocketNo('');
    setNote('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-800 uppercase">
            Finish Product Damaged Entry
          </h2>
        </div>
        <button className="rounded bg-sap-primary px-4 py-1.5 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-blue-700">
          ADD NEW
        </button>
      </div>

      {/* Top Form Section */}
      <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-blue-800 border-b border-blue-100 pb-2">
          Document Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Docket No</label>
            <input 
              type="text" 
              value={docketNo}
              onChange={(e) => setDocketNo(e.target.value)}
              className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Date</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            />
          </div>
          <div className="flex flex-col gap-1 lg:col-span-2">
            <label className="text-[10px] font-bold uppercase text-slate-500">Note</label>
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
      <FinishDamageForm onAdd={handleAdd} />

      {/* Table Component */}
      <FinishDamageTable 
        items={items} 
        onUpdate={handleUpdate} 
        onRemove={handleRemove} 
      />

      {/* Bottom Buttons */}
      <div className="flex flex-row justify-end rounded-sm border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex gap-3">
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
      </div>

      {/* History Component */}
      <FinishDamageHistory />
    </div>
  );
};

export default FinishDamage;
