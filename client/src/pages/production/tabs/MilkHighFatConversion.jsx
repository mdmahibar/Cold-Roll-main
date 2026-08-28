import React, { useState } from 'react';
import HighFatForm from './HighFatForm';
import HighFatList from './HighFatList';

const MilkHighFatConversion = () => {
  // State for Form (Centralized to handle passing down)
  const [formData, setFormData] = useState({
    docketNo: 'DKT-HF-2023-004',
    date: new Date().toISOString().split('T')[0],
    note: '',
    quantity: 0,
    fatKg: 0,
    snfKg: 0,
  });

  // Example mode toggle logic for showing "Delete" button
  const isEditMode = false;

  const handleSave = () => {
    console.log('Saved High FAT Conversion:', formData);
    // Submit logic here
  };

  const handleReset = () => {
    setFormData({
      docketNo: '',
      date: new Date().toISOString().split('T')[0],
      note: '',
      quantity: 0,
      fatKg: 0,
      snfKg: 0,
    });
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      console.log('Document deleted');
      handleReset();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-800 uppercase">
            Milk Convert To High FAT
          </h2>
        </div>
        <button className="rounded bg-sap-primary px-4 py-1.5 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-blue-700">
          ADD NEW / MODIFY
        </button>
      </div>

      {/* Main Single Form Component */}
      <HighFatForm data={formData} setData={setFormData} />

      {/* Bottom Buttons */}
      <div className="flex flex-row justify-between rounded-sm border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          {isEditMode && (
            <button 
              onClick={handleDelete}
              className="rounded border border-red-300 bg-white px-6 py-1.5 text-[11px] font-bold text-red-600 shadow-sm transition-colors hover:bg-red-50"
            >
              DELETE
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleReset}
            className="rounded border border-slate-300 bg-white px-6 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            RESET
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
      <HighFatList />
    </div>
  );
};

export default MilkHighFatConversion;
