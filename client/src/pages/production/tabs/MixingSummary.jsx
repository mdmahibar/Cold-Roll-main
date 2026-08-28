import React from 'react';

const MixingSummary = ({ items }) => {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  
  // Assuming Actual Quantity is matching Total Quantity for MVP unless there's an explicit loss calculation. 
  // Let's just make it equal to totalQuantity for summary purposes.
  const actualQuantity = totalQuantity;
  
  // Mixing / Kg usually is calculated as total value / total quantity
  const totalValue = items.reduce((sum, item) => sum + item.value, 0);
  const mixingPerKg = totalQuantity > 0 ? totalValue / totalQuantity : 0;

  return (
    <div className="flex flex-col rounded-sm border border-slate-200 bg-sap-light/30 shadow-[0_1px_2px_rgba(0,0,0,0.02)] h-full">
      <div className="border-b border-slate-200 bg-slate-50/50 px-4 py-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Summary
        </h3>
      </div>
      
      <div className="p-4 flex flex-col gap-4">
        {/* Total Quantity */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Quantity
          </span>
          <span className="text-sm font-bold text-slate-800">
            {totalQuantity.toFixed(2)} Kg
          </span>
        </div>
        
        {/* Actual Quantity */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Actual Quantity
          </span>
          <span className="text-sm font-bold text-blue-700">
            {actualQuantity.toFixed(2)} Kg
          </span>
        </div>
        
        {/* Total Value (Bonus) */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Value
          </span>
          <span className="text-sm font-bold text-slate-800">
            ₹ {totalValue.toFixed(2)}
          </span>
        </div>

        {/* Mixing / Kg */}
        <div className="flex items-center justify-between rounded bg-green-50 p-2 border border-green-100">
          <span className="text-[11px] font-bold uppercase tracking-wider text-green-800">
            Mixing / Kg
          </span>
          <span className="text-base font-bold text-green-900">
            ₹ {mixingPerKg.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MixingSummary;
