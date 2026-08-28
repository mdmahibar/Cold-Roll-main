import React from 'react';
import { Edit } from 'lucide-react';

const dummyHistory = [
  { id: 1, date: '2023-10-25', vehicleNo: 'DL-1C-AA-1111', product: 'Buffalo Milk', from: 'Main Plant Silo 1', to: 'Processing Tank B', qty: 5000, clr: 28, fat: 6.5, snf: 9.0, fatKg: 325, snfKg: 450 },
  { id: 2, date: '2023-10-26', vehicleNo: 'HR-26-BR-2222', product: 'Cow Milk', from: 'Cold Storage A', to: 'Curd Vat 1', qty: 3000, clr: 27, fat: 4.0, snf: 8.5, fatKg: 120, snfKg: 255 },
];

const MilkTransferTable = () => {
  return (
    <div className="flex flex-col rounded-sm border border-slate-200 bg-white shadow-sm mt-4">
      <div className="border-b border-blue-100 bg-blue-50/50 px-4 py-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800">
          All Milk Stock Transfer List
        </h3>
      </div>
      
      <div className="p-4 overflow-x-auto">
        <div className="rounded-sm border border-slate-200">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase w-24">Date</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase w-24">Vehicle No</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase">Product</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-red-700">From</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-green-700">To</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right">Qty</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right">CLR</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right">FAT %</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right">SNF %</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right text-blue-700">FAT KG</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right text-green-700">SNF KG</th>
                <th className="border-b border-slate-200 px-3 py-2 font-bold uppercase text-center w-16">Action</th>
              </tr>
            </thead>
            <tbody>
              {dummyHistory.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-600 whitespace-nowrap">{item.date}</td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-600 font-bold uppercase">{item.vehicleNo}</td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-800 font-medium whitespace-nowrap">{item.product}</td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-700 font-medium whitespace-nowrap">{item.from}</td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-700 font-medium whitespace-nowrap">{item.to}</td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-right font-medium text-slate-800 bg-slate-50/30">{item.qty}</td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-right text-slate-600">{item.clr}</td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-right text-slate-600">{item.fat}</td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-right text-slate-600">{item.snf}</td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-right font-bold text-blue-800 bg-blue-50/30">{item.fatKg.toFixed(2)}</td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-right font-bold text-green-800 bg-green-50/30">{item.snfKg.toFixed(2)}</td>
                  <td className="border-b border-slate-200 px-3 py-2 flex justify-center items-center">
                    <button 
                      className="text-sap-primary hover:text-blue-800 transition-colors mt-0.5"
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

export default MilkTransferTable;
