import React, { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import ReceiveList from './ReceiveList';

// Mock initial database payloads mapping "In Transit" status items
const initialTransfers = [
  { id: 1, transferNo: 'TR-2023-0801', date: '2023-10-25', from: 'Main Plant Store', to: 'City Distribution Center', product: 'Standardized Milk', quantity: 2000, status: 'Pending', note: 'Daily allocation' },
  { id: 2, transferNo: 'TR-2023-0802', date: '2023-10-26', from: 'Paneer Production Unit', to: 'Cold Storage A', product: 'Premium Paneer Block', quantity: 150, status: 'Pending', note: 'Batch #A44 transfer' },
  { id: 3, transferNo: 'TR-2023-0803', date: '2023-10-27', from: 'Ice Cream Plant 2', to: 'Main Plant Store', product: 'Ice Cream Mix Reserve', quantity: 500, status: 'Received', note: 'Overflow capacity redirection' },
];

const StockReceive = () => {
  const [items, setItems] = useState(initialTransfers);
  
  // Modal State
  const [selectedItem, setSelectedItem] = useState(null);

  // Mark Item as Received Payload logic
  const handleReceive = (id) => {
    // Basic confirmation guard
    if (!window.confirm("Confirm receiving this stock physically to destination? This updates global inventory.")) return;
    
    setItems(items.map(item => 
      item.id === id ? { ...item, status: 'Received' } : item
    ));
    console.log(`Stock successfully appended to destination mapping for Transfer ${id}.`);
  };

  // Popup Triggers
  const handleView = (item) => {
    setSelectedItem(item);
  };
  
  const closeModal = () => {
    setSelectedItem(null);
  };

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4 pb-10 h-screen p-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
            Item Stock Receive In Store
          </h1>
          <p className="mt-0.5 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Confirm and validate inward transfer ledgers
          </p>
        </div>
      </div>

      {/* Main Table Interface */}
      <div className="flex-grow">
        <ReceiveList items={items} onReceive={handleReceive} onView={handleView} />
      </div>

      {/* Detail Popup Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-sm bg-white shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-sap-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Transfer Details: {selectedItem.transferNo}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6">
              <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Date</span>
                  <span className="font-medium text-slate-800">{selectedItem.date}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Status</span>
                  <span className={`font-bold ${selectedItem.status === 'Received' ? 'text-green-600' : 'text-amber-600'}`}>
                    {selectedItem.status}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Transfer From</span>
                  <span className="font-bold text-red-700">{selectedItem.from}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Transfer To</span>
                  <span className="font-bold text-green-700">{selectedItem.to}</span>
                </div>
                <div className="flex flex-col gap-1 col-span-2 mt-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Product Specification</span>
                  <span className="font-medium text-slate-800 text-base">{selectedItem.product}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Payload Quantity</span>
                  <span className="font-bold text-sap-primary text-lg">{selectedItem.quantity.toFixed(2)} Units</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Notes / Remarks</span>
                  <span className="font-medium text-slate-600 italic">"{selectedItem.note}"</span>
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
              <button
                onClick={closeModal}
                className="rounded border border-slate-300 bg-white px-4 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                CLOSE
              </button>
              {selectedItem.status === 'Pending' && (
                <button
                  onClick={() => {
                    handleReceive(selectedItem.id);
                    closeModal();
                  }}
                  className="rounded bg-sap-primary px-6 py-1.5 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
                >
                  CONFIRM RECEIPT
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockReceive;
