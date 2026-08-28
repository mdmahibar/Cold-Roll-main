import React from 'react';

const ReprocessTable = ({ items, onQuantityChange }) => {
  return (
    <div className="flex flex-col rounded-sm border border-slate-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="border-b border-blue-100 bg-blue-50/50 px-4 py-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800">
          Source Ingredients
        </h3>
      </div>
      
      <div className="p-4 overflow-x-auto">
        <div className="rounded-sm border border-slate-200">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase w-12 text-center">SL</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase">Product</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-center w-16">Unit</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right w-32">Quantity (Edit)</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right w-20">FAT %</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right w-20">SNF %</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right w-24">FAT KG</th>
                <th className="border-b border-slate-200 px-3 py-2 font-bold uppercase text-right w-24">SNF KG</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const fatKg = (item.quantity * item.fat) / 100 || 0;
                const snfKg = (item.quantity * item.snf) / 100 || 0;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="border-b border-r border-slate-200 px-3 py-2 text-center text-slate-500 font-medium">
                      {index + 1}
                    </td>
                    <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-800 font-medium whitespace-nowrap">
                      {item.product}
                    </td>
                    <td className="border-b border-r border-slate-200 px-3 py-2 text-center text-slate-500 font-medium">
                      {item.unit}
                    </td>
                    <td className="border-b border-r border-slate-200 px-2 py-1.5 text-right font-medium">
                      <input 
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity === 0 ? '' : item.quantity}
                        onChange={(e) => onQuantityChange(item.id, e.target.value)}
                        placeholder="0.00"
                        className="w-full text-right rounded-sm border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-sap-primary outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
                      />
                    </td>
                    <td className="border-b border-r border-slate-200 px-3 py-2 text-right text-slate-600">
                      {item.fat.toFixed(2)}
                    </td>
                    <td className="border-b border-r border-slate-200 px-3 py-2 text-right text-slate-600">
                      {item.snf.toFixed(2)}
                    </td>
                    <td className="border-b border-r border-slate-200 px-3 py-2 text-right font-bold text-slate-700 bg-slate-50/30">
                      {fatKg.toFixed(2)}
                    </td>
                    <td className="border-b border-slate-200 px-3 py-2 text-right font-bold text-slate-700 bg-slate-50/30">
                      {snfKg.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-3 py-6 text-center text-slate-500">
                    Search for a process to display ingredients.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReprocessTable;
