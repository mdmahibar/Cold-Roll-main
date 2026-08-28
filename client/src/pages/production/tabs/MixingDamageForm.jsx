import React, { useState } from 'react';
import { Plus } from 'lucide-react';

const MixingDamageForm = ({ onAdd }) => {
  const [product, setProduct] = useState('Standardized Milk Mix');
  const [unit, setUnit] = useState('LTR');
  const [quantity, setQuantity] = useState(0);
  const [rate, setRate] = useState(0);

  const amount = (parseFloat(quantity) || 0) * (parseFloat(rate) || 0);

  const handleAdd = () => {
    if (quantity <= 0 || rate <= 0) return;
    onAdd({
      id: Date.now(),
      product,
      unit,
      quantity: parseFloat(quantity),
      rate: parseFloat(rate),
      amount
    });
    // Reset numerical inputs
    setQuantity(0);
    setRate(0);
  };

  return (
    <div className="flex flex-col rounded-sm border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-blue-800 bg-blue-50/50 p-2 border-b border-blue-100">
        Add Damaged Entry
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
        <div className="flex flex-col gap-1 lg:col-span-2">
          <label className="text-[10px] font-bold uppercase text-slate-500">Mixing Product</label>
          <select
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
          >
            <option value="Standardized Milk Mix">Standardized Milk Mix</option>
            <option value="Curd Mix Starter">Curd Mix Starter</option>
            <option value="Flavored Milk Base">Flavored Milk Base</option>
            <option value="Ice Cream Mix">Ice Cream Mix</option>
          </select>
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

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-slate-500">Rate</label>
          <input 
            type="number"
            min="0"
            step="0.01"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-slate-500">Amount</label>
          <input 
            type="number"
            value={amount.toFixed(2)}
            disabled
            className="w-full rounded-sm border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-600 outline-none cursor-not-allowed text-right"
          />
        </div>

        <div className="flex shrink-0 col-span-1 lg:col-span-6 justify-end">
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

export default MixingDamageForm;
