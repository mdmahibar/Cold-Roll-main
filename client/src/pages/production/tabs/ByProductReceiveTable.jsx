import React from 'react';

const ByProductReceiveTable = ({ items, onReceive }) => {
  return (
    <div className="flex flex-col rounded-sm border border-slate-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {/* Table Header Section */}
      <div className="border-b border-blue-100 bg-blue-50/50 px-4 py-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800">
          Others Finished Product Received In Store List
        </h3>
      </div>
      
      {/* Table Content */}
      <div className="p-4 overflow-x-auto">
        <div className="rounded-sm border border-slate-200">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase w-12 text-center">SL</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase">Docket No</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase">Date</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase">Mixing Doc No</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase">Product</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right w-24">Quantity</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-center w-16">Unit</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase">User</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-center w-24">Status</th>
                <th className="border-b border-slate-200 px-3 py-2 font-bold uppercase text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-center text-slate-500 font-medium">
                    {index + 1}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-800 font-medium whitespace-nowrap">
                    {item.docketNo}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-600 whitespace-nowrap">
                    {item.date}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-600 font-medium">
                    {item.mixingDocNo}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-800 font-medium">
                    {item.product}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-right font-bold text-slate-800 bg-slate-50/30">
                    {item.quantity.toFixed(2)}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-center text-slate-500 font-medium">
                    {item.unit}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-600">
                    {item.user}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-center">
                    <span 
                      className={`inline-flex items-center justify-center rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                        item.status === 'Received' 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="border-b border-slate-200 px-3 py-2 text-center">
                    {item.status === 'Pending' ? (
                       <button
                         onClick={() => onReceive && onReceive(item.id)}
                         className="inline-flex items-center justify-center rounded bg-sap-primary px-3 py-1 text-[10px] font-bold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none"
                       >
                         Receive
                       </button>
                    ) : (
                       <span className="text-[10px] font-bold text-slate-400 uppercase">Received</span>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan="10" className="px-3 py-8 text-center text-slate-500 font-medium">
                    <div className="flex flex-col items-center justify-center gap-1 text-slate-400">
                      <span className="text-sm">No records found</span>
                      <span className="text-[10px] font-normal">There are no pending or received finished products.</span>
                    </div>
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

export default ByProductReceiveTable;
