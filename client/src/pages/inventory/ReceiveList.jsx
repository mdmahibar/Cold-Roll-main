import React, { useState } from 'react';
import { CheckCircle2, Clock, Eye } from 'lucide-react';

const ReceiveList = ({ items, onReceive, onView }) => {
  return (
    <div className="flex flex-col rounded-sm border border-slate-200 bg-white shadow-sm h-full">
      <div className="border-b border-blue-100 bg-blue-50/50 px-4 py-3 flex justify-between items-center">
        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800">
          Item Stock Receive In Store List
        </h3>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
          Total In-Transit: {items.filter(i => i.status === 'Pending').length}
        </span>
      </div>
      
      <div className="p-4 overflow-x-auto flex-grow">
        <div className="rounded-sm border border-slate-200">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase w-12 text-center">SL</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase">Transfer No</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase w-24">Date</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-red-700">Transfer From</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-green-700">Transfer To</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase">Product</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-right w-24">Quantity</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-center w-24">Status</th>
                <th className="border-b border-slate-200 px-3 py-2 font-bold uppercase text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr 
                  key={item.id} 
                  className={`transition-colors ${item.status === 'Received' ? 'bg-slate-50 opacity-70' : 'hover:bg-slate-50/50'}`}
                >
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-center text-slate-500 font-medium">
                    {index + 1}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-800 font-bold whitespace-nowrap">
                    {item.transferNo}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-600 whitespace-nowrap">
                    {item.date}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-700 font-medium whitespace-nowrap">
                    {item.from}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-700 font-medium whitespace-nowrap">
                    {item.to}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-800 font-medium whitespace-nowrap">
                    {item.product}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-right font-bold text-slate-800">
                    {item.quantity.toFixed(2)}
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2">
                    <div className="flex justify-center">
                      <span className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                        item.status === 'Received' 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {item.status === 'Received' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {item.status}
                      </span>
                    </div>
                  </td>
                  <td className="border-b border-slate-200 px-3 py-2">
                    <div className="flex justify-center items-center gap-2">
                      <button 
                        className="text-slate-400 hover:text-blue-600 transition-colors"
                        onClick={() => onView(item)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      {item.status === 'Pending' && (
                        <button 
                          className="rounded bg-sap-primary px-3 py-1 text-[10px] font-bold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow"
                          onClick={() => onReceive(item.id)}
                          title="Confirm Receipt"
                        >
                          RECEIVE
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan="9" className="px-3 py-8 text-center text-slate-500 font-medium">
                    No active stock transfers found globally.
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

export default ReceiveList;
