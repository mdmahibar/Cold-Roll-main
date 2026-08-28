import React, { useState } from 'react';
import { X } from 'lucide-react';

const ReceiveModal = ({ dispatch, onClose, onUpdate, receiveStatus, setReceiveStatus }) => {
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().split('T')[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="flex w-full max-w-2xl flex-col rounded-sm bg-white shadow-xl overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between bg-green-600 px-4 py-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Item Received by Production
          </h3>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white focus:outline-none"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-4">
          
          {/* Header Fields - SAP Style Compact Layout */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">Dispatch No</label>
              <input 
                type="text" 
                value={dispatch.dispatchNo} 
                disabled
                className="w-full rounded-sm border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-xs text-slate-800 outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">Dispatch Date</label>
              <input 
                type="text" 
                value={dispatch.date} 
                disabled
                className="w-full rounded-sm border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-xs text-slate-800 outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">Receive Date</label>
              <input 
                type="date" 
                value={receiveDate}
                onChange={(e) => setReceiveDate(e.target.value)}
                className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">Note</label>
              <input 
                type="text" 
                defaultValue={dispatch.note} 
                className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
              />
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Product Table */}
          <div className="flex flex-col gap-2">
            <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Product Details</h4>
            <div className="rounded-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase">Product Name</th>
                    <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase w-24 text-center">Unit</th>
                    <th className="border-b border-slate-200 px-3 py-2 font-bold uppercase w-32 text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatch.products?.map((prod, idx) => (
                    <tr key={prod.id || idx} className="hover:bg-slate-50/50">
                      <td className="border-b border-r border-slate-200 px-3 py-1.5 text-slate-800 font-medium">
                        {prod.name}
                      </td>
                      <td className="border-b border-r border-slate-200 px-3 py-1.5 text-slate-500 text-center">
                        {prod.unit}
                      </td>
                      <td className="border-b border-slate-200 px-3 py-1.5 text-slate-800 font-medium text-right bg-blue-50/30">
                        {prod.quantity}
                      </td>
                    </tr>
                  ))}
                  {(!dispatch.products || dispatch.products.length === 0) && (
                    <tr>
                      <td colSpan="3" className="px-3 py-4 text-center text-slate-500">
                        No products attached.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Status Dropdown */}
          <div className="flex flex-col gap-1 mt-2 w-1/3">
            <label className="text-[10px] font-bold uppercase text-slate-500">Received?</label>
            <select
              value={receiveStatus}
              onChange={(e) => setReceiveStatus(e.target.value)}
              className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button 
            onClick={onClose}
            className="rounded bg-red-600 px-4 py-1.5 text-[11px] font-bold tracking-wider text-white shadow-sm hover:bg-red-700 focus:outline-none"
          >
            CANCEL
          </button>
          <button 
            onClick={onUpdate}
            className="rounded bg-green-600 px-4 py-1.5 text-[11px] font-bold tracking-wider text-white shadow-sm hover:bg-green-700 focus:outline-none"
          >
            UPDATE
          </button>
        </div>

      </div>
    </div>
  );
};

export default ReceiveModal;
