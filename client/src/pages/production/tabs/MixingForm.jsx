import React, { useState, useEffect } from 'react';

const MixingForm = ({ onAdd }) => {
  // State for form fields
  const [product, setProduct] = useState('Raw Cow Milk');
  const [unit, setUnit] = useState('KGS');
  const [quantity, setQuantity] = useState(0);
  const [fat, setFat] = useState(0);
  const [snf, setSnf] = useState(0);
  
  // Rate section
  const [rateFat, setRateFat] = useState(0);
  const [rateSnf, setRateSnf] = useState(0);

  // Auto-calculated fields
  const [fatKg, setFatKg] = useState(0);
  const [snfKg, setSnfKg] = useState(0);
  const [value, setValue] = useState(0);

  // Auto-calculation logic
  useEffect(() => {
    const calculatedFatKg = (quantity * fat) / 100;
    const calculatedSnfKg = (quantity * snf) / 100;
    const calculatedValue = (calculatedFatKg * rateFat) + (calculatedSnfKg * rateSnf);

    setFatKg(calculatedFatKg || 0);
    setSnfKg(calculatedSnfKg || 0);
    setValue(calculatedValue || 0);
  }, [quantity, fat, snf, rateFat, rateSnf]);

  const handleUpdate = () => {
    if (quantity <= 0) return; // Basic validation
    onAdd({
      product,
      unit,
      quantity,
      fat,
      snf,
      fatKg,
      snfKg,
      rateFat,
      rateSnf,
      value
    });
    // Reset form optionally or keep the last input. Let's reset quantity to require explicit entry.
    setQuantity(0);
  };

  const handleCancel = () => {
    setQuantity(0);
    setFat(0);
    setSnf(0);
    setRateFat(0);
    setRateSnf(0);
  };

  return (
    <div className="flex flex-col rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
        Add Ingredient (Entry Row)
      </h3>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Ingredient Section */}
        <div className="flex-1 grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="flex flex-col gap-1 col-span-2 lg:col-span-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Product</label>
            <select
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            >
              <option value="Raw Cow Milk">Raw Cow Milk</option>
              <option value="Raw Buffalo Milk">Raw Buffalo Milk</option>
              <option value="SMP">SMP</option>
              <option value="Cream">Cream</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Unit</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            >
              <option value="KGS">KGS</option>
              <option value="LTR">LTR</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Quantity</label>
            <input 
              type="number" 
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">FAT %</label>
            <input 
              type="number" 
              step="0.1"
              value={fat}
              onChange={(e) => setFat(parseFloat(e.target.value) || 0)}
              className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">SNF %</label>
            <input 
              type="number" 
              step="0.1"
              value={snf}
              onChange={(e) => setSnf(parseFloat(e.target.value) || 0)}
              className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            />
          </div>
          {/* Auto Calculated Details Info */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-400">FAT KG</label>
            <input 
              type="number" 
              value={fatKg.toFixed(2)}
              disabled
              className="w-full rounded-sm border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500 outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-400">SNF KG</label>
            <input 
              type="number" 
              value={snfKg.toFixed(2)}
              disabled
              className="w-full rounded-sm border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500 outline-none"
            />
          </div>
        </div>

        {/* Separator on desktop */}
        <div className="hidden lg:block w-px bg-slate-200" />

        {/* Rates Section */}
        <div className="flex-1 lg:max-w-xs flex flex-col justify-between gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">Rate (FAT / Pur)</label>
              <input 
                type="number" 
                value={rateFat}
                onChange={(e) => setRateFat(parseFloat(e.target.value) || 0)}
                className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">Rate (SNF)</label>
              <input 
                type="number" 
                value={rateSnf}
                onChange={(e) => setRateSnf(parseFloat(e.target.value) || 0)}
                className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-1 bg-green-50/50 p-2 rounded border border-green-100/50">
             <label className="text-[10px] font-bold uppercase text-green-700">Value (Auto Calc)</label>
              <div className="text-sm font-bold text-green-800">
                ₹ {value.toFixed(2)}
              </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex lg:flex-col justify-end lg:justify-end gap-2 shrink-0">
          <button 
            onClick={handleCancel}
            className="rounded border border-red-300 bg-white px-4 py-1.5 text-[11px] font-bold text-red-600 shadow-sm transition-colors hover:bg-red-50"
          >
            CANCEL
          </button>
          <button 
            onClick={handleUpdate}
            className="rounded bg-green-600 px-6 py-1.5 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-green-700"
          >
            UPDATE
          </button>
        </div>
      </div>
    </div>
  );
};

export default MixingForm;
