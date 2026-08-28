import React from 'react';
import { Trash2 } from 'lucide-react';

const PlantClosingTable = ({ items, onRemove }) => {
  // Calculate Totals
  const totalQuantity = items.reduce((sum, item) => sum + parseFloat(item.quantity || 0), 0);
  const totalFatKg = items.reduce((sum, item) => sum + parseFloat(item.fatKg || 0), 0);
  const totalSnfKg = items.reduce((sum, item) => sum + parseFloat(item.snfKg || 0), 0);
  
  const weightedFatPct = totalQuantity > 0 ? (totalFatKg / totalQuantity) * 100 : 0;
  const weightedSnfPct = totalQuantity > 0 ? (totalSnfKg / totalQuantity) * 100 : 0;

  return (
    <div className="flex flex-col rounded-sm border border-slate-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="border-b border-blue-100 bg-blue-50/50 px-4 py-3 flex justify-between items-center">
        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800">
          Plant Closing Entries
        </h3>
      </div>
      
      <div className="p-4 overflow-x-auto">
        <div className="rounded-sm border border-slate-200">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase w-12 text-center">SL</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase">Plant</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right w-24">Quantity</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right w-20">FAT %</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right w-20">SNF %</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right w-24">FAT KG</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right w-24">SNF KG</th>
                <th className="border-b border-slate-200 px-3 py-2 font-bold uppercase text-center w-16">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="hover:gray-50/50 transition-colors">
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-center text-slate-500 font-medium">
                    {index + 1}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-800 font-medium whitespace-nowrap">
                    {item.plant}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-right font-medium text-slate-800 bg-slate-50/30">
                    {item.quantity.toFixed(2)}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-right text-slate-600">
                    {item.fat.toFixed(2)}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-right text-slate-600">
                    {item.snf.toFixed(2)}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-right font-bold text-blue-800 bg-blue-50/30">
                    {item.fatKg.toFixed(2)}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-right font-bold text-green-800 bg-green-50/30">
                    {item.snfKg.toFixed(2)}
                  </td>
                  <td className="border-b border-slate-200 px-3 py-2 flex justify-center items-center">
                    <button 
                      className="text-red-500 hover:text-red-700 transition-colors"
                      onClick={() => onRemove(item.id)}
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-3 py-6 text-center text-slate-500">
                    No plant closings added.
                  </td>
                </tr>
              )}
            </tbody>
            {/* Totals Footer */}
            {items.length > 0 && (
              <tfoot className="bg-slate-100/50">
                <tr>
                  <td colSpan="2" className="border-t border-r border-slate-200 px-3 py-2 font-bold text-right text-slate-700 uppercase tracking-wider text-[10px]">
                    Grand Total
                  </td>
                  <td className="border-t border-r border-slate-200 px-3 py-2 font-bold text-right text-sm text-slate-800">
                    {totalQuantity.toFixed(2)}
                  </td>
                  <td className="border-t border-r border-slate-200 px-3 py-2 font-bold text-right text-slate-600 bg-slate-50">
                    {weightedFatPct.toFixed(2)}
                  </td>
                  <td className="border-t border-r border-slate-200 px-3 py-2 font-bold text-right text-slate-600 bg-slate-50">
                    {weightedSnfPct.toFixed(2)}
                  </td>
                  <td className="border-t border-r border-slate-200 px-3 py-2 font-bold text-right text-sm text-blue-800 bg-blue-50">
                    {totalFatKg.toFixed(2)}
                  </td>
                  <td className="border-t border-r border-slate-200 px-3 py-2 font-bold text-right text-sm text-green-800 bg-green-50">
                    {totalSnfKg.toFixed(2)}
                  </td>
                  <td className="border-t border-slate-200 px-3 py-2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default PlantClosingTable;
