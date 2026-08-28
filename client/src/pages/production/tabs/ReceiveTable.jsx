import React from 'react';

const ReceiveTable = ({ dispatches, onReceiveClick }) => {
  return (
    <div className="flex flex-col rounded-sm border border-slate-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {/* Card Header */}
      <div className="border-b border-slate-200 bg-slate-50/50 px-4 py-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Item Dispatched List
        </h3>
      </div>
      
      {/* Table Content */}
      <div className="p-4">
        <div className="overflow-x-auto rounded-sm border border-slate-200">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase w-12 text-center">SL</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase">Dispatch No</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase">Date</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase">Note</th>
                <th className="border-b border-slate-200 px-3 py-2 font-bold uppercase w-24 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {dispatches.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-center text-slate-500 font-medium">
                    {index + 1}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-800 font-medium whitespace-nowrap">
                    {item.dispatchNo}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-600 whitespace-nowrap">
                    {item.date}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-600">
                    {item.note}
                  </td>
                  <td className="border-b border-slate-200 px-3 py-2 text-center">
                    <button
                      onClick={() => onReceiveClick(item)}
                      className="inline-flex items-center justify-center rounded bg-sap-primary px-3 py-1 text-[10px] font-bold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none"
                    >
                      Receive
                    </button>
                  </td>
                </tr>
              ))}
              {dispatches.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-3 py-4 text-center text-slate-500">
                    No items dispatched.
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

export default ReceiveTable;
