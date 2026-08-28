import React from 'react';
import { Edit } from 'lucide-react';

const dummyHistory = [
  { id: 1, docketNo: 'DKT-HF-2023-001', date: '2023-10-25', quantity: 2000, fat: 90, snf: 170 },
  { id: 2, docketNo: 'DKT-HF-2023-002', date: '2023-10-26', quantity: 1500, fat: 70, snf: 130 },
  { id: 3, docketNo: 'DKT-HF-2023-003', date: '2023-10-27', quantity: 1800, fat: 85, snf: 155 },
];

const HighFatList = () => {
  return (
    <div className="flex flex-col rounded-sm border border-slate-200 bg-white shadow-sm mt-4">
      <div className="border-b border-blue-100 bg-blue-50/50 px-4 py-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800">
          All Milk Convert To High FAT List
        </h3>
      </div>
      
      <div className="p-4 overflow-x-auto">
        <div className="rounded-sm border border-slate-200">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase w-32">Docket No</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase w-24">Date</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right w-32">Quantity</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right w-24">FAT Kg</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right w-24">SNF Kg</th>
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
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-right font-medium text-slate-800 bg-slate-50/30">
                    {item.quantity.toFixed(2)}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-right text-slate-600">
                    {item.fat.toFixed(2)}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-right text-slate-600">
                    {item.snf.toFixed(2)}
                  </td>
                  <td className="border-b border-slate-200 px-3 py-2 flex justify-center items-center">
                    <button 
                      className="text-sap-primary hover:text-blue-800 transition-colors"
                      title="Modify"
                    >
                      <Edit className="h-3.5 w-3.5" />
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

export default HighFatList;
