import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';

const FinishedForm = ({ onAdd }) => {
  const [product, setProduct] = useState('Standardized Milk 500ml');
  const [quantity, setQuantity] = useState(0);
  const [unit, setUnit] = useState('LTR');
  const [pieces, setPieces] = useState(0);
  const [fat, setFat] = useState(0);
  const [snf, setSnf] = useState(0);

  const [fatKg, setFatKg] = useState(0);
  const [snfKg, setSnfKg] = useState(0);

  useEffect(() => {
    setFatKg((quantity * fat) / 100 || 0);
    setSnfKg((quantity * snf) / 100 || 0);
  }, [quantity, fat, snf]);

  const handleAdd = () => {
    if (quantity <= 0) return;
    onAdd({
      id: Date.now(),
      product,
      quantity,
      unit,
      pieces,
      fat,
      snf,
      fatKg,
      snfKg
    });
    // Reset specific fields
    setQuantity(0);
    setPieces(0);
  };

  return (
    <div className="flex flex-col rounded-sm border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-blue-800 bg-blue-50/50 p-2 border-b border-blue-100">
        Add Product Entry
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3 items-end">
        <div className="flex flex-col gap-1 lg:col-span-2">
          <label className="text-[10px] font-bold uppercase text-slate-500">Product</label>
          <select
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
          >
            <option value="Standardized Milk 500ml">Standardized Milk 500ml</option>
            <option value="Pasteurized Milk 1L">Pasteurized Milk 1L</option>
            <option value="Butter 100g">Butter 100g</option>
            <option value="Ghee 1L">Ghee 1L</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-slate-500">Quantity</label>
          <input 
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-slate-500">Unit</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
          >
            <option value="LTR">LTR</option>
            <option value="KGS">KGS</option>
            <option value="PCS">PCS</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-slate-500">Pieces</label>
          <input 
            type="number"
            value={pieces}
            onChange={(e) => setPieces(parseFloat(e.target.value) || 0)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-slate-500">FAT %</label>
          <input 
            type="number"
            step="0.1"
            value={fat}
            onChange={(e) => setFat(parseFloat(e.target.value) || 0)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-slate-500">SNF %</label>
          <input 
            type="number"
            step="0.1"
            value={snf}
            onChange={(e) => setSnf(parseFloat(e.target.value) || 0)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
          />
        </div>

        <div className="flex flex-col gap-1 col-span-2 lg:col-span-2">
          <div className="flex gap-2">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">FAT KG</label>
              <input 
                type="number"
                value={fatKg.toFixed(2)}
                disabled
                className="w-full rounded-sm border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-500 outline-none"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">SNF KG</label>
              <input 
                type="number"
                value={snfKg.toFixed(2)}
                disabled
                className="w-full rounded-sm border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-500 outline-none"
              />
            </div>
            <div className="flex items-end shrink-0">
               <button 
                  onClick={handleAdd}
                  className="flex h-8 items-center justify-center gap-1 rounded bg-blue-600 px-3 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  ADD
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinishedForm;
