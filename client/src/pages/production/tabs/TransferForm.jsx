import React, { useState } from 'react';
import { Plus } from 'lucide-react';

const TransferForm = ({ onAdd }) => {
  const [product, setProduct] = useState('Standardized Milk');
  const [hsn, setHsn] = useState('04012000');
  const [unit, setUnit] = useState('LTR');
  const [quantity, setQuantity] = useState('');

  const handleAdd = () => {
    if (!quantity || parseFloat(quantity) <= 0) return;
    onAdd({
      id: Date.now(),
      product,
      hsn,
      unit,
      quantity: parseFloat(quantity)
    });
    setQuantity('');
    setProduct('Standardized Milk');
  };

  return (
    <div className="flex flex-col rounded-sm border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-blue-800 bg-blue-50/50 p-2 border-b border-blue-100">
        Product Entry
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 items-end">
        <div className="flex flex-col gap-1 lg:col-span-2">
          <label className="text-[10px] font-bold uppercase text-slate-500">Product</label>
          <select
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
          >
            <option value="Standardized Milk">Standardized Milk</option>
            <option value="Pasteurized Milk">Pasteurized Milk</option>
            <option value="Curd">Curd</option>
            <option value="Ghee">Ghee</option>
            <option value="Butter">Butter</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-slate-500">HSN/SAC Code</label>
          <input 
            type="text"
            value={hsn}
            onChange={(e) => setHsn(e.target.value)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-slate-500">Unit</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
          >
            <option value="LTR">LTR</option>
            <option value="KGS">KGS</option>
            <option value="PCS">PCS</option>
            <option value="BOX">BOX</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-slate-500">Quantity</label>
          <input 
            type="number"
            min="0"
            step="0.01"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
          />
        </div>

        <div className="flex shrink-0 col-span-1 justify-end">
           <button 
              onClick={handleAdd}
              className="flex w-full md:w-32 h-8 items-center justify-center gap-1 rounded bg-blue-600 px-4 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" />
              ADD
            </button>
        </div>
      </div>
    </div>
  );
};

export default TransferForm;
