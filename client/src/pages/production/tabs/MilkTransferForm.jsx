import React from 'react';

const MilkTransferForm = ({ data, setData }) => {
  const handleChange = (field, value) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const quantity = parseFloat(data.quantity) || 0;
  const fat = parseFloat(data.fat) || 0;
  const snf = parseFloat(data.snf) || 0;
  
  // Auto Calculations
  const fatKg = (fat * quantity) / 100;
  const snfKg = (snf * quantity) / 100;

  return (
    <div className="flex flex-col gap-4">
      {/* Route & Transport Parameters */}
      <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-blue-800 border-b border-blue-100 pb-2">
          Transport Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Transfer Date</label>
            <input 
              type="date" 
              value={data.transferDate}
              onChange={(e) => handleChange('transferDate', e.target.value)}
              className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Vehicle No</label>
            <input 
              type="text" 
              value={data.vehicleNo}
              onChange={(e) => handleChange('vehicleNo', e.target.value)}
              className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary uppercase"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Transfer From</label>
            <select
              value={data.transferFrom}
              onChange={(e) => handleChange('transferFrom', e.target.value)}
              className="w-full rounded-sm border border-slate-300 bg-red-50 text-red-900 px-2.5 py-1.5 text-xs font-bold outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            >
              <option value="Main Plant Silo 1">Main Plant Silo 1</option>
              <option value="Cold Storage A">Cold Storage A</option>
              <option value="Receiving Dock">Receiving Dock</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Transfer To</label>
            <select
              value={data.transferTo}
              onChange={(e) => handleChange('transferTo', e.target.value)}
              className="w-full rounded-sm border border-slate-300 bg-green-50 text-green-900 px-2.5 py-1.5 text-xs font-bold outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            >
              <option value="Processing Tank B">Processing Tank B</option>
              <option value="Curd Vat 1">Curd Vat 1</option>
              <option value="Pasteurizer Hold">Pasteurizer Hold</option>
            </select>
          </div>
        </div>
      </div>

      {/* Milk Quality Parameters */}
      <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-blue-800 border-b border-blue-100 pb-2">
          Milk Quality & Volume Parameters
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
          <div className="flex flex-col gap-1 lg:col-span-2">
            <label className="text-[10px] font-bold uppercase text-slate-500">Product</label>
            <select
              value={data.product}
              onChange={(e) => handleChange('product', e.target.value)}
              className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            >
              <option value="Buffalo Milk">Buffalo Milk</option>
              <option value="Cow Milk">Cow Milk</option>
              <option value="Standardized Milk">Standardized Milk</option>
              <option value="Skimmed Milk">Skimmed Milk</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Quantity (KG)</label>
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
            <label className="text-[10px] font-bold uppercase text-slate-500">CLR (%)</label>
            <input 
              type="number"
              min="0"
              step="0.01"
              value={data.clr === 0 ? '' : data.clr}
              onChange={(e) => handleChange('clr', e.target.value)}
              className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
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
            />
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-6">
             <div className="flex w-full gap-2 mt-1">
               <div className="flex w-1/2 flex-col rounded-sm border border-blue-200 bg-blue-50 px-3 py-2 text-center shadow-sm">
                 <span className="text-[10px] font-bold uppercase text-blue-800 tracking-wider">FAT KG (Auto)</span>
                 <span className="text-sm font-bold text-blue-900">{fatKg.toFixed(2)} Kg</span>
               </div>
               <div className="flex w-1/2 flex-col rounded-sm border border-green-200 bg-green-50 px-3 py-2 text-center shadow-sm">
                 <span className="text-[10px] font-bold uppercase text-green-800 tracking-wider">SNF KG (Auto)</span>
                 <span className="text-sm font-bold text-green-900">{snfKg.toFixed(2)} Kg</span>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MilkTransferForm;
