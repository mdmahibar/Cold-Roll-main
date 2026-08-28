import React from 'react';
import { Eye } from 'lucide-react';

const dummyHistory = [
  { id: 1, docketNo: 'DKT-RMD-2023-001', date: '2023-10-25', netAmount: 1450.00, note: 'Spoiled milk batches', user: 'Admin' },
  { id: 2, docketNo: 'DKT-RMD-2023-002', date: '2023-10-26', netAmount: 320.50, note: 'Torn packaging film rolls', user: 'Supervisor' },
  { id: 3, docketNo: 'DKT-RMD-2023-003', date: '2023-10-27', netAmount: 95.00, note: 'Crushed cartons during transport', user: 'Admin' },
];

const RMDamageHistory = () => {
  return (
    <div className="flex flex-col rounded-sm border border-slate-200 bg-white shadow-sm mt-8">
      <div className="border-b border-blue-100 bg-blue-50/50 px-4 py-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800">
          All Raw Materials Damaged List
        </h3>
      </div>
      
      <div className="p-4 overflow-x-auto">
        <div className="rounded-sm border border-slate-200">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase">Docket No</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase w-24">Date</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right w-32">Net Amount</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase">Note</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase w-32">User</th>
                <th className="border-b border-slate-200 px-3 py-2 font-bold uppercase text-center w-16">Action</th>
              </tr>
            </thead>
            <tbody>
              {dummyHistory.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-800 font-medium whitespace-nowrap">
                    {item.docketNo}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-600 whitespace-nowrap">
                    {item.date}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 font-bold text-red-700 text-right bg-red-50/30">
                    {item.netAmount.toFixed(2)}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-600 truncate max-w-[250px]">
                    {item.note}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-600">
                    {item.user}
                  </td>
                  <td className="border-b border-slate-200 px-3 py-2 flex justify-center items-center">
                    <button 
                      className="text-sap-primary hover:text-blue-800 transition-colors"
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RMDamageHistory;
