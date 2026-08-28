import React from 'react';

const FromProductSection = ({ data, setData }) => {
  const handleChange = (field, value) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const quantity = parseFloat(data.quantity) || 0;
  const fat = parseFloat(data.fat) || 0;
  const snf = parseFloat(data.snf) || 0;

  const fatKg = (quantity * fat) / 100;
  const snfKg = (quantity * snf) / 100;

  return (
    <div className="flex flex-col rounded-sm border border-slate-200 bg-white shadow-sm h-full">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-blue-800 bg-blue-50/50 p-3 border-b border-blue-100">
        A. From Product (Input)
      </h3>
      
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-grow">
        <div className="flex flex-col gap-1 lg:col-span-2">
          <label className="text-[10px] font-bold uppercase text-slate-500">Product</label>
          <select
            value={data.product}
            onChange={(e) => handleChange('product', e.target.value)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
          >
            <option value="Raw Cow Milk">Raw Cow Milk</option>
            <option value="Raw Buffalo Milk">Raw Buffalo Milk</option>
            <option value="Standardized Milk">Standardized Milk</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-slate-500">Unit</label>
          <select
            value={data.unit}
            onChange={(e) => handleChange('unit', e.target.value)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
          >
            <option value="LTR">LTR</option>
            <option value="KGS">KGS</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-slate-500">Quantity</label>
          <input 
            type="number"
            min="0"
            step="0.01"
            value={data.quantity === 0 ? '' : data.quantity}
            onChange={(e) => handleChange('quantity', e.target.value)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            placeholder="0.00"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-slate-500">CLR (%)</label>
          <input 
            type="number"
            min="0"
            step="0.01"
            value={data.clr === 0 ? '' : data.clr}
            onChange={(e) => handleChange('clr', e.target.value)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            placeholder="0.00"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-slate-500">FAT %</label>
          <input 
            type="number"
            min="0"
            step="0.01"
            value={data.fat === 0 ? '' : data.fat}
            onChange={(e) => handleChange('fat', e.target.value)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            placeholder="0.00"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-slate-500">SNF %</label>
          <input 
            type="number"
            min="0"
            step="0.01"
            value={data.snf === 0 ? '' : data.snf}
            onChange={(e) => handleChange('snf', e.target.value)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            placeholder="0.00"
          />
        </div>

        <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-2 justify-end">
          <label className="text-[10px] font-bold uppercase text-slate-500 mb-1">Calculated Assets</label>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center justify-between rounded-sm border border-blue-200 bg-blue-50 px-3 py-1.5">
              <span className="text-[10px] font-bold text-blue-700 uppercase">FAT KG</span>
              <span className="text-xs font-bold text-blue-900">{fatKg.toFixed(2)}</span>
            </div>
            <div className="flex-1 flex items-center justify-between rounded-sm border border-green-200 bg-green-50 px-3 py-1.5">
              <span className="text-[10px] font-bold text-green-700 uppercase">SNF KG</span>
              <span className="text-xs font-bold text-green-900">{snfKg.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FromProductSection;
