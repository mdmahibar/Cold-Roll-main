import React from 'react';
import { Trash2 } from 'lucide-react';

const TransferTable = ({ items, onRemove }) => {
  return (
    <div className="flex flex-col rounded-sm border border-slate-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="border-b border-blue-100 bg-blue-50/50 px-4 py-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800">
          Transfer Products List
        </h3>
      </div>
      
      <div className="p-4 overflow-x-auto">
        <div className="rounded-sm border border-slate-200">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase w-12 text-center">SL</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase">Description of Goods</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase w-32">HSN/SAC Code</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-center w-24">Unit</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right w-32">Quantity</th>
                <th className="border-b border-slate-200 px-3 py-2 font-bold uppercase text-center w-20">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-center text-slate-500 font-medium">
                    {index + 1}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-800 font-medium whitespace-nowrap">
                    {item.product}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-600 font-medium">
                    {item.hsn}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-center text-slate-500 font-medium">
                    {item.unit}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-right font-bold text-slate-800 bg-slate-50/30">
                    {item.quantity.toFixed(2)}
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
                  <td colSpan="6" className="px-3 py-6 text-center text-slate-500">
                    No products added to the transfer list.
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

export default TransferTable;
