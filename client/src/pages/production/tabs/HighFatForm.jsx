import React from 'react';

const HighFatForm = ({ data, setData }) => {
  const handleChange = (field, value) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const quantity = parseFloat(data.quantity) || 0;
  const fatKg = parseFloat(data.fatKg) || 0;
  
  // Calculate FAT %
  const fatPct = quantity > 0 ? (fatKg / quantity) * 100 : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Top Document Details */}
      <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-blue-800 border-b border-blue-100 pb-2">
          Document Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Docket No</label>
            <input 
              type="text" 
              value={data.docketNo}
              onChange={(e) => handleChange('docketNo', e.target.value)}
              className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Date</label>
            <input 
              type="date" 
              value={data.date}
              onChange={(e) => handleChange('date', e.target.value)}
              className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            />
          </div>
          <div className="flex flex-col gap-1 lg:col-span-2">
            <label className="text-[10px] font-bold uppercase text-slate-500">Note</label>
            <input 
              type="text"
              value={data.note}
              onChange={(e) => handleChange('note', e.target.value)}
              className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            />
          </div>
        </div>
      </div>

      {/* Conversion Details */}
      <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-blue-800 border-b border-blue-100 pb-2">
          Fat Conversion Parameters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Quantity</label>
            <input 
              type="number"
              min="0"
              step="0.01"
              value={data.quantity === 0 ? '' : data.quantity}
              onChange={(e) => handleChange('quantity', e.target.value)}
              className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">FAT Kg</label>
            <input 
              type="number"
              min="0"
              step="0.01"
              value={data.fatKg === 0 ? '' : data.fatKg}
              onChange={(e) => handleChange('fatKg', e.target.value)}
              className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">SNF Kg</label>
            <input 
              type="number"
              min="0"
              step="0.01"
              value={data.snfKg === 0 ? '' : data.snfKg}
              onChange={(e) => handleChange('snfKg', e.target.value)}
              className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-sap-primary mb-1">Derived FAT %</label>
            <input 
              type="text"
              value={`${fatPct.toFixed(2)} %`}
              disabled
              className="w-full rounded-sm border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-900 outline-none cursor-not-allowed"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HighFatForm;
