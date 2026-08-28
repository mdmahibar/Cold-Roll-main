import React, { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import MilkReceiveTable from './MilkReceiveTable';

// Mock initial database payloads mapping "In Transit" milk stock
const initialTransfers = [
  { id: 1, docketNo: 'DKT-MTR-2023-001', date: '2023-10-25', from: 'Main Plant Silo 1', to: 'Processing Tank B', qty: 5000, fat: 6.5, snf: 9.0, fatKg: 325, snfKg: 450, status: 'Pending', note: 'Standard bulk transfer' },
  { id: 2, docketNo: 'DKT-MTR-2023-002', date: '2023-10-26', from: 'Cold Storage A', to: 'Curd Vat 1', qty: 3000, fat: 4.0, snf: 8.5, fatKg: 120, snfKg: 255, status: 'Pending', note: 'Morning curd batch isolation' },
  { id: 3, docketNo: 'DKT-MTR-2023-003', date: '2023-10-27', from: 'Receiving Dock', to: 'Main Plant Silo 1', qty: 12000, fat: 4.5, snf: 8.5, fatKg: 540, snfKg: 1020, status: 'Received', note: 'Night shift direct intake' },
];

const MilkStockReceive = () => {
  const [items, setItems] = useState(initialTransfers);
  
  // Modal State
  const [selectedItem, setSelectedItem] = useState(null);

  // Mark Item as Received Payload logic
  const handleReceive = (id) => {
    // Basic confirmation guard
    if (!window.confirm("Confirm receiving this raw volume physically into the target silo/tank? This updates real-time inventory mass.")) return;
    
    setItems(items.map(item => 
      item.id === id ? { ...item, status: 'Received' } : item
    ));
    console.log(`Milk Stock successfully allocated to destination Tank for Docket ${id}.`);
  };

  // Popup Triggers
  const handleView = (item) => {
    setSelectedItem(item);
  };
  
  const closeModal = () => {
    setSelectedItem(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-800 uppercase">
            Milk Stock Receive In Division
          </h2>
          <p className="mt-0.5 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
            Confirm and validate inward volume metrics
          </p>
        </div>
      </div>

      {/* Main Table Interface */}
      <div>
        <MilkReceiveTable items={items} onReceive={handleReceive} onView={handleView} />
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
                  Receive Details: {selectedItem.docketNo}
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
                
                {/* Volume & Metrics block */}
                <div className="flex flex-col gap-1 col-span-2 mt-2 pt-3 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-3 gap-y-3">
                    <div className="flex flex-col gap-1 col-span-2 lg:col-span-3 pb-2">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Volume (KG)</span>
                      <span className="font-bold text-sap-primary text-xl">{selectedItem.qty.toFixed(2)} KG</span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400">FAT %</span>
                      <span className="font-bold text-slate-800">{selectedItem.fat.toFixed(2)}%</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400">SNF %</span>
                      <span className="font-bold text-slate-800">{selectedItem.snf.toFixed(2)}%</span>
                    </div>
                </div>

                {/* Mass Details */}
                <div className="flex flex-col gap-1 col-span-2 grid grid-cols-2 gap-y-3 bg-slate-50 p-3 rounded border border-slate-200">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold uppercase text-blue-700">FAT Mass (KG)</span>
                      <span className="font-bold text-blue-900">{selectedItem.fatKg.toFixed(2)} KG</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold uppercase text-green-700">SNF Mass (KG)</span>
                      <span className="font-bold text-green-900">{selectedItem.snfKg.toFixed(2)} KG</span>
                    </div>
                </div>

                <div className="flex flex-col gap-1 col-span-2">
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

export default MilkStockReceive;
