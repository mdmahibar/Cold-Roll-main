import React, { useState } from 'react';
import ReprocessSearch from './ReprocessSearch';
import ReprocessTable from './ReprocessTable';
import ReprocessSummary from './ReprocessSummary';

const Reprocess = () => {
  // Search State
  const [processNo, setProcessNo] = useState('');
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  // Table State
  const [items, setItems] = useState([]);

  const handleSearch = () => {
    // Generate dummy items on search
    if (processNo.trim() === '') {
       // Just prefill a dummy one if empty for demo purposes
       setProcessNo('REP-2023-900');
    }
    
    setItems([
      {
        id: 1,
        product: 'Raw Cow Milk',
        unit: 'LTR',
        quantity: 500,
        fat: 4.5,
        snf: 8.5
      },
      {
        id: 2,
        product: 'Raw Buffalo Milk',
        unit: 'LTR',
        quantity: 300,
        fat: 6.5,
        snf: 9.0
      },
      {
        id: 3,
        product: 'SMP',
        unit: 'KGS',
        quantity: 50,
        fat: 1.0,
        snf: 96.0
      }
    ]);
  };

  const handleQuantityChange = (id, newQuantity) => {
    // Parse value, allowing empty string representation for UX while typing
    const parsedQty = newQuantity === '' ? '' : parseFloat(newQuantity);
    
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === id ? { ...item, quantity: parsedQty } : item
      )
    );
  };

  const handleReset = () => {
    setProcessNo('');
    setToDate(new Date().toISOString().split('T')[0]);
    setNote('');
    setItems([]);
  };

  const handleProcess = () => {
    console.log('Processing payload:', {
      processNo,
      toDate,
      note,
      items: items.map(item => ({...item, quantity: parseFloat(item.quantity) || 0}))
    });
    // Add success popup/API logic here
    alert('Reprocessing payload submitted successfully!');
    handleReset();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-800 uppercase">
            Milk Re-Process
          </h2>
        </div>
      </div>

      {/* Search Section */}
      <ReprocessSearch 
        processNo={processNo} setProcessNo={setProcessNo}
        toDate={toDate} setToDate={setToDate}
        note={note} setNote={setNote}
        onSearch={handleSearch}
      />

      {/* Main Content Area: Table and Summary */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-grow lg:w-3/4">
          <ReprocessTable 
            items={items} 
            onQuantityChange={handleQuantityChange} 
          />
        </div>
        <div className="w-full lg:w-1/4">
          <ReprocessSummary items={items} />
        </div>
      </div>

      {/* Bottom Action Area */}
      {items.length > 0 && (
        <div className="flex justify-end gap-3 rounded-sm border border-slate-200 bg-white p-4 shadow-sm">
          <button 
            onClick={handleReset}
            className="rounded border border-slate-300 bg-white px-6 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            RESET
          </button>
          <button 
            onClick={handleProcess}
            className="rounded bg-green-600 px-8 py-1.5 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-green-700"
          >
            PROCESS
          </button>
        </div>
      )}
    </div>
  );
};

export default Reprocess;
