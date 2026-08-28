import React from 'react';

const ReprocessSearch = ({ 
  processNo, setProcessNo, 
  toDate, setToDate, 
  note, setNote, 
  onSearch 
}) => {
  return (
    <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-blue-800 border-b border-blue-100 pb-2">
        Search Criteria
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-slate-500">Process No</label>
          <input 
            type="text" 
            value={processNo}
            onChange={(e) => setProcessNo(e.target.value)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-slate-500">To Date</label>
          <input 
            type="date" 
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
          />
        </div>
        <div className="flex flex-col gap-1 lg:col-span-2">
          <label className="text-[10px] font-bold uppercase text-slate-500">Note</label>
          <input 
            type="text" 
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
          />
        </div>
        <div className="flex shrink-0">
          <button 
            onClick={onSearch}
            className="w-full md:w-auto rounded bg-blue-600 px-6 py-1.5 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            SEARCH
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReprocessSearch;
