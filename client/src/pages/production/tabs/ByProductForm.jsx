import React, { useState } from 'react';
import { Plus } from 'lucide-react';

const ByProductForm = ({ onAdd }) => {
  const [product, setProduct] = useState('Cream');
  const [quantity, setQuantity] = useState(0);
  const [unit, setUnit] = useState('KGS');
  const [pieces, setPieces] = useState(0);
  const [value, setValue] = useState(0);

  const handleAdd = () => {
    if (quantity <= 0) return;
    onAdd({
      id: Date.now(),
      product,
      quantity,
      unit,
      pieces,
      value
    });
    // Reset inputs
    setQuantity(0);
    setPieces(0);
    setValue(0);
  };

  return (
    <div className="flex flex-col rounded-sm border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-blue-800 bg-blue-50/50 p-2 border-b border-blue-100">
        Add Product Entry
      </h3>
      
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex flex-col gap-1 w-full md:w-1/4">
          <label className="text-[10px] font-bold uppercase text-slate-500">Product</label>
          <select
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
          >
            <option value="Cream">Cream</option>
            <option value="Butter Milk">Butter Milk</option>
            <option value="SMP">SMP</option>
          </select>
        </div>

        <div className="flex flex-col gap-1 w-full md:w-1/6">
          <label className="text-[10px] font-bold uppercase text-slate-500">Qty Creation</label>
          <input 
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
          />
        </div>

        <div className="flex flex-col gap-1 w-full md:w-1/6">
          <label className="text-[10px] font-bold uppercase text-slate-500">Unit</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
          >
            <option value="KGS">KGS</option>
            <option value="LTR">LTR</option>
            <option value="PCS">PCS</option>
          </select>
        </div>

        <div className="flex flex-col gap-1 w-full md:w-1/6">
          <label className="text-[10px] font-bold uppercase text-slate-500">Pieces</label>
          <input 
            type="number"
            value={pieces}
            onChange={(e) => setPieces(parseFloat(e.target.value) || 0)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
          />
        </div>

        <div className="flex flex-col gap-1 w-full md:w-1/6">
          <label className="text-[10px] font-bold uppercase text-slate-500">Value (Opt.)</label>
          <input 
            type="number"
            value={value}
            onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
          />
        </div>

        <div className="flex shrink-0">
           <button 
              onClick={handleAdd}
              className="flex h-8 items-center justify-center gap-1 rounded bg-blue-600 px-4 w-full md:w-auto text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" />
              ADD
            </button>
        </div>
      </div>
    </div>
  );
};

export default ByProductForm;
