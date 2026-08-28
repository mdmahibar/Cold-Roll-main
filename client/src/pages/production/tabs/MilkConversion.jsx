import React, { useState } from 'react';
import FromProductSection from './FromProductSection';
import ToProductSection from './ToProductSection';
import MilkConversionHistory from './MilkConversionHistory';
import { AlertCircle } from 'lucide-react';

const MilkConversion = () => {
  // Top Form State
  const [docketNo, setDocketNo] = useState('DKT-MC-2023-004');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  // Conversion Sections State
  const [fromData, setFromData] = useState({
    product: 'Raw Cow Milk',
    unit: 'LTR',
    quantity: 1000,
    clr: 28,
    fat: 4.5,
    snf: 8.5
  });

  const [toData, setToData] = useState({
    receiveDate: new Date().toISOString().split('T')[0],
    product: 'Standardized Milk',
    unit: 'LTR',
    quantity: 1000,
  });

  // Validation Logic (Mass Balance Basic Check)
  const qtyDiff = Math.abs((parseFloat(fromData.quantity) || 0) - (parseFloat(toData.quantity) || 0));
  const isImbalanced = qtyDiff > 5; // allow minimal spillage diff

  const handleSave = () => {
    if (isImbalanced) {
      const confirmSave = window.confirm(`There is a mass mismatch of ${qtyDiff} units between From and To products. Proceed with saving?`);
      if (!confirmSave) return;
    }
    console.log('Saved Milk Conversion:', { docketNo, date, note, fromData, toData });
    // Submit logic here
  };

  const handleReset = () => {
    setDocketNo('');
    setNote('');
    setDate(new Date().toISOString().split('T')[0]);
    setFromData({
      product: 'Raw Cow Milk',
      unit: 'LTR',
      quantity: 0,
      clr: 0,
      fat: 0,
      snf: 0
    });
    setToData({
      receiveDate: new Date().toISOString().split('T')[0],
      product: 'Standardized Milk',
      unit: 'LTR',
      quantity: 0,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-800 uppercase">
            Milk Conversion
          </h2>
        </div>
        <button className="rounded bg-sap-primary px-4 py-1.5 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-blue-700">
          ADD NEW
        </button>
      </div>

      {/* Top Document Section */}
      <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-blue-800 border-b border-blue-100 pb-2">
          Conversion Document Details
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

      {/* Conversion Dual Form Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Side: From Product */}
        <FromProductSection data={fromData} setData={setFromData} />

        {/* Right Side: To Product */}
        <ToProductSection data={toData} setData={setToData} />
      </div>

      {/* Validation Warning block */}
      {isImbalanced && (
         <div className="flex items-center gap-2 rounded-sm border border-orange-200 bg-orange-50 px-4 py-3 text-orange-800">
           <AlertCircle className="h-4 w-4" />
           <span className="text-xs font-medium">
             Warning: Mass balance mismatch detected! From ({fromData.quantity}) to Target ({toData.quantity}) exceeds margin.
           </span>
         </div>
      )}

      {/* Bottom Buttons */}
      <div className="flex flex-row justify-end rounded-sm border border-slate-200 bg-white p-4 shadow-sm mt-2">
        <div className="flex gap-3">
          <button 
            onClick={handleReset}
            className="rounded border border-slate-300 bg-white px-6 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            RESET
          </button>
          <button 
            onClick={handleSave}
            className="rounded bg-green-600 px-8 py-1.5 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-green-700 hover:shadow-md"
          >
            SAVE
          </button>
        </div>
      </div>

      {/* History Component */}
      <MilkConversionHistory />
    </div>
  );
};

export default MilkConversion;
