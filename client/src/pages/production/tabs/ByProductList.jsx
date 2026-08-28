import React from 'react';
import { Eye } from 'lucide-react';

const dummyHistory = [
  { 
    id: 1, 
    docketNo: 'DKT-O-2023-001', 
    date: '2023-10-25', 
    mixingDocNo: 'MIX-2023-501', 
    mixingQty: 500, 
    loss: 2.5,
    note: 'Initial cream extraction', 
    user: 'Admin' 
  },
  { 
    id: 2, 
    docketNo: 'DKT-O-2023-002', 
    date: '2023-10-26', 
    mixingDocNo: 'MIX-2023-502', 
    mixingQty: 1000, 
    loss: 5.0,
    note: 'Butter milk separate', 
    user: 'Manager' 
  },
  { 
    id: 3, 
    docketNo: 'DKT-O-2023-003', 
    date: '2023-10-27', 
    mixingDocNo: 'MIX-2023-506', 
    mixingQty: 800, 
    loss: 4.2,
    note: 'Standard SMP output', 
    user: 'Admin' 
  },
];

const ByProductList = () => {
  return (
    <div className="flex flex-col rounded-sm border border-slate-200 bg-white shadow-sm mt-8">
      <div className="border-b border-blue-100 bg-blue-50/50 px-4 py-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800">
          All Others Finish Product Creation List
        </h3>
      </div>
      
      <div className="p-4 overflow-x-auto">
        <div className="rounded-sm border border-slate-200">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase">Docket No</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase w-24">Date</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase">Mixing Doc No</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right">Mixing Qty</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right">Handling Loss</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase">Note</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase">User</th>
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
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-600 font-medium">
                    {item.mixingDocNo}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-600 text-right">
                    {item.mixingQty}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-600 text-right text-red-600">
                    {item.loss}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-600 truncate max-w-[150px]">
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

export default ByProductList;
