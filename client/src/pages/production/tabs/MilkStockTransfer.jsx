import React, { useState } from 'react';
import MilkTransferForm from './MilkTransferForm';
import MilkTransferTable from './MilkTransferTable';

const MilkStockTransfer = () => {
  // State for Form (Centralized to handle passing down)
  const [formData, setFormData] = useState({
    transferDate: new Date().toISOString().split('T')[0],
    vehicleNo: '',
    transferFrom: 'Main Plant Silo 1',
    transferTo: 'Processing Tank B',
    product: 'Buffalo Milk',
    quantity: 0,
    clr: 0,
    fat: 0,
    snf: 0,
  });

  const handleSave = () => {
    // Validate routing rules
    if (formData.transferFrom === formData.transferTo) {
      alert("Source and Destination silos/tanks cannot be the same!");
      return;
    }
    
    console.log('Saved Milk Stock Transfer:', formData);
    // Submit logic here
  };

  const handleCancel = () => {
    setFormData({
      transferDate: new Date().toISOString().split('T')[0],
      vehicleNo: '',
      transferFrom: 'Main Plant Silo 1',
      transferTo: 'Processing Tank B',
      product: 'Buffalo Milk',
      quantity: 0,
      clr: 0,
      fat: 0,
      snf: 0,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-800 uppercase">
            Milk Stock Transfer
          </h2>
        </div>
        <button className="rounded bg-sap-primary px-4 py-1.5 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-blue-700">
          ADD NEW
        </button>
      </div>

      {/* Main Form Component */}
      <MilkTransferForm data={formData} setData={setFormData} />

      {/* Bottom Buttons */}
      <div className="flex flex-row justify-end rounded-sm border border-slate-200 bg-white p-4 shadow-sm mt-2">
        <div className="flex gap-3">
          <button 
            onClick={handleCancel}
            className="rounded border border-slate-300 bg-white px-6 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            CANCEL
          </button>
          <button 
            onClick={handleSave}
            className="rounded bg-green-600 px-8 py-1.5 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-green-700"
          >
            SAVE
          </button>
        </div>
      </div>

      {/* List Component */}
      <MilkTransferTable />
    </div>
  );
};

export default MilkStockTransfer;
