import React from 'react';

const ToProductSection = ({ data, setData }) => {
  const handleChange = (field, value) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex flex-col rounded-sm border border-slate-200 bg-white shadow-sm h-full">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-green-800 bg-green-50/50 p-3 border-b border-green-100">
        B. To Product (Output)
      </h3>
      
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow">
        <div className="flex flex-col gap-1 sm:col-span-2 text-red-500">
          <label className="text-[10px] font-bold uppercase text-slate-500">Receive Date</label>
          <input 
            type="date"
            value={data.receiveDate}
            onChange={(e) => handleChange('receiveDate', e.target.value)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
          />
        </div>

        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-[10px] font-bold uppercase text-slate-500">Product</label>
          <select
            value={data.product}
            onChange={(e) => handleChange('product', e.target.value)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
          >
            <option value="Standardized Milk">Standardized Milk</option>
            <option value="Toned Milk">Toned Milk</option>
            <option value="Double Toned Milk">Double Toned Milk</option>
            <option value="Full Cream Milk">Full Cream Milk</option>
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

      </div>
    </div>
  );
};

export default ToProductSection;
