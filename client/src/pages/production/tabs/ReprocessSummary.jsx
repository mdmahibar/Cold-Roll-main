import React from 'react';

const ReprocessSummary = ({ items }) => {
  // Calculate Totals based on current quantity and fixed percentages
  const totals = items.reduce((acc, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const fatKg = (qty * item.fat) / 100;
    const snfKg = (qty * item.snf) / 100;

    return {
      totalFatKg: acc.totalFatKg + fatKg,
      totalSnfKg: acc.totalSnfKg + snfKg,
    };
  }, { totalFatKg: 0, totalSnfKg: 0 });

  return (
    <div className="flex flex-col rounded-sm border border-slate-200 bg-sap-light/30 shadow-[0_1px_2px_rgba(0,0,0,0.02)] h-full">
      <div className="border-b border-blue-100 bg-blue-50/50 px-4 py-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800 text-right">
          Reprocessing Summary
        </h3>
      </div>
      
      <div className="p-4 flex flex-col gap-4">
        {/* Total FAT KG */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total FAT KG
          </span>
          <span className="text-sm font-bold text-slate-800">
            {totals.totalFatKg.toFixed(2)} Kg
          </span>
        </div>
        
        {/* Total SNF KG */}
        <div className="flex items-center justify-between rounded bg-green-50 p-2 border border-green-100">
          <span className="text-[11px] font-bold uppercase tracking-wider text-green-800">
            Total SNF KG
          </span>
          <span className="text-base font-bold text-green-900">
            {totals.totalSnfKg.toFixed(2)} Kg
          </span>
        </div>
      </div>
    </div>
  );
};

export default ReprocessSummary;
