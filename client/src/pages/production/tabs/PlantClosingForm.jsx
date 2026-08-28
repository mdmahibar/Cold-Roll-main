import React, { useState } from 'react';
import { Plus } from 'lucide-react';

const PlantClosingForm = ({ onAdd }) => {
  const [plant, setPlant] = useState('Milk Processing Plant 1');
  const [quantity, setQuantity] = useState(0);
  const [fat, setFat] = useState(0);
  const [snf, setSnf] = useState(0);

  const fatKg = (parseFloat(quantity) || 0) * (parseFloat(fat) || 0) / 100;
  const snfKg = (parseFloat(quantity) || 0) * (parseFloat(snf) || 0) / 100;

  const handleAdd = () => {
    if (quantity <= 0) return;
    onAdd({
      id: Date.now(),
      plant,
      quantity: parseFloat(quantity),
      fat: parseFloat(fat),
      snf: parseFloat(snf),
      fatKg,
      snfKg
    });
    // Reset numerical inputs
    setQuantity(0);
    setFat(0);
    setSnf(0);
  };

  return (
    <div className="flex flex-col rounded-sm border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-blue-800 bg-blue-50/50 p-2 border-b border-blue-100">
        Add Closing Entry
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4 items-end">
        <div className="flex flex-col gap-1 lg:col-span-2">
          <label className="text-[10px] font-bold uppercase text-slate-500">Plant</label>
          <select
            value={plant}
            onChange={(e) => setPlant(e.target.value)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
          >
            <option value="Milk Processing Plant 1">Milk Processing Plant 1</option>
            <option value="Ice Cream Plant 2">Ice Cream Plant 2</option>
            <option value="Paneer Production Unit">Paneer Production Unit</option>
            <option value="Ghee Production Unit">Ghee Production Unit</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-slate-500">Quantity (KG/LTR)</label>
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
          <label className="text-[10px] font-bold uppercase text-slate-500">FAT %</label>
          <input 
            type="number"
            min="0"
            step="0.01"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-slate-500">SNF %</label>
          <input 
            type="number"
            min="0"
            step="0.01"
            value={snf}
            onChange={(e) => setSnf(e.target.value)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-slate-500">Auto Calc (Kg)</label>
          <div className="flex w-full gap-1">
             <input 
               type="text"
               value={`F: ${fatKg.toFixed(2)}`}
               disabled
               className="w-1/2 rounded-sm border border-slate-200 bg-slate-50 px-1 py-1.5 text-[10px] font-bold text-blue-800 outline-none cursor-not-allowed text-center"
             />
             <input 
               type="text"
               value={`S: ${snfKg.toFixed(2)}`}
               disabled
               className="w-1/2 rounded-sm border border-slate-200 bg-slate-50 px-1 py-1.5 text-[10px] font-bold text-green-800 outline-none cursor-not-allowed text-center"
             />
          </div>
        </div>

        <div className="flex shrink-0 col-span-1 justify-end">
           <button 
              onClick={handleAdd}
              className="flex w-full h-8 items-center justify-center gap-1 rounded bg-blue-600 px-4 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" />
              ADD
            </button>
        </div>
      </div>
    </div>
  );
};

export default PlantClosingForm;
