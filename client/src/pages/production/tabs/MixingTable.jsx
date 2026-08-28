import React from 'react';
import { Trash2, Edit } from 'lucide-react';

const MixingTable = ({ items, onRemove }) => {
  return (
    <div className="flex flex-col rounded-sm border border-slate-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)] h-full">
      <div className="border-b border-slate-200 bg-slate-50/50 px-4 py-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Mixing Ingredients
        </h3>
      </div>
      
      <div className="p-4 overflow-x-auto">
        <div className="rounded-sm border border-slate-200">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase">Product</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase w-16 text-center">Unit</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right w-20">Qty</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right w-16">FAT %</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right w-16">SNF %</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right w-20">FAT KG</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right w-20">SNF KG</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right w-20">FAT Rate</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right w-20">SNF Rate</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right w-24">Value</th>
                <th className="border-b border-slate-200 px-3 py-2 font-bold uppercase text-center w-16">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="border-b border-r border-slate-200 px-3 py-1.5 text-slate-800 font-medium whitespace-nowrap">
                    {item.product}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-1.5 text-center text-slate-500 font-medium">
                    {item.unit}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-1.5 text-right font-medium text-slate-800">
                    {item.quantity.toFixed(2)}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-1.5 text-right text-slate-600">
                    {item.fat.toFixed(2)}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-1.5 text-right text-slate-600">
                    {item.snf.toFixed(2)}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-1.5 text-right font-medium text-slate-700 bg-slate-50/30">
                    {item.fatKg.toFixed(2)}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-1.5 text-right font-medium text-slate-700 bg-slate-50/30">
                    {item.snfKg.toFixed(2)}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-1.5 text-right text-slate-600">
                    {item.rateFat.toFixed(2)}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-1.5 text-right text-slate-600">
                    {item.rateSnf.toFixed(2)}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-1.5 text-right font-bold text-slate-800 bg-green-50/20">
                    ₹ {item.value.toFixed(2)}
                  </td>
                  <td className="border-b border-slate-200 px-3 py-1.5 flex justify-center items-center gap-2">
                    <button 
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Edit"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
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
                  <td colSpan="11" className="px-3 py-6 text-center text-slate-500">
                    No ingredients added yet.
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

export default MixingTable;
