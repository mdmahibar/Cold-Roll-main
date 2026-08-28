import React from 'react';
import { Trash2 } from 'lucide-react';

const FinishDamageTable = ({ items, onUpdate, onRemove }) => {
  // Calculate Totals
  const grossAmount = items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

  return (
    <div className="flex flex-col rounded-sm border border-slate-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="border-b border-blue-100 bg-blue-50/50 px-4 py-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800">
          Damaged Finish Product Entry List
        </h3>
      </div>
      
      <div className="p-4 overflow-x-auto">
        <div className="rounded-sm border border-slate-200">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase w-12 text-center">SL</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase">Product</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-center w-20">Unit</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right w-32">Quantity (Edit)</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right w-32">Sale Rate (Edit)</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right w-32">Amount</th>
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
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-center text-slate-500 font-medium">
                    {item.unit}
                  </td>
                  <td className="border-b border-r border-slate-200 px-2 py-1.5 text-right font-medium">
                    <input 
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity === 0 ? '' : item.quantity}
                      onChange={(e) => onUpdate(item.id, 'quantity', e.target.value)}
                      className="w-full text-right rounded-sm border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-sap-primary outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
                    />
                  </td>
                  <td className="border-b border-r border-slate-200 px-2 py-1.5 text-right font-medium">
                    <input 
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.saleRate === 0 ? '' : item.saleRate}
                      onChange={(e) => onUpdate(item.id, 'saleRate', e.target.value)}
                      className="w-full text-right rounded-sm border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
                    />
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-right font-bold text-slate-800 bg-slate-50/30">
                    {item.amount.toFixed(2)}
                  </td>
                  <td className="border-b border-slate-200 px-3 py-2 flex justify-center items-center">
                    <button 
                      className="text-red-500 hover:text-red-700 transition-colors mt-0.5"
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
                  <td colSpan="7" className="px-3 py-6 text-center text-slate-500">
                    No damaged finished products added.
                  </td>
                </tr>
              )}
            </tbody>
            {/* Totals Footer */}
            {items.length > 0 && (
              <tfoot className="bg-slate-100/50">
                <tr>
                  <td colSpan="5" className="border-t border-r border-slate-200 px-3 py-2 font-bold text-right text-slate-700 uppercase tracking-wider text-[10px]">
                    Gross Amount
                  </td>
                  <td className="border-t border-r border-slate-200 px-3 py-2 font-bold text-right text-lg text-red-700">
                    {grossAmount.toFixed(2)}
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

export default FinishDamageTable;
