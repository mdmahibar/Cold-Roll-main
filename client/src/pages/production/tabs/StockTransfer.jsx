import React, { useState } from 'react';
import { Eye, AlertCircle } from 'lucide-react';
import TransferForm from './TransferForm';
import TransferTable from './TransferTable';

// Dummy history data for the Transfer List Table
const dummyHistory = [
  { id: 1, docketNo: 'DKT-ST-2023-001', date: '2023-10-25', from: 'Main Plant Store', to: 'City Distribution Center', note: 'Daily stock replenishment', user: 'Admin' },
  { id: 2, docketNo: 'DKT-ST-2023-002', date: '2023-10-26', from: 'Paneer Production Unit', to: 'Cold Storage A', note: 'Transfer pending packaging', user: 'Manager' },
  { id: 3, docketNo: 'DKT-ST-2023-003', date: '2023-10-27', from: 'Ice Cream Plant 2', to: 'Main Plant Store', note: 'Excess stock return', user: 'Supervisor' },
];

const StockTransfer = () => {
  // Top Form State
  const [docketNo, setDocketNo] = useState('DKT-ST-2023-004');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [vehicleNo, setVehicleNo] = useState('MH-12-AB-3456');
  const [route, setRoute] = useState('North Route');
  const [transferFrom, setTransferFrom] = useState('Main Plant Store');
  const [transferTo, setTransferTo] = useState('City Distribution Center');
  const [note, setNote] = useState('');

  // Table Items State
  const [items, setItems] = useState([]);

  // Mock checking quantity logic 
  const hasItems = items.length > 0;
  const isSameLocation = transferFrom === transferTo;

  const handleAdd = (newItem) => {
    setItems([...items, newItem]);
  };

  const handleRemove = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleSave = () => {
    if (isSameLocation) {
      alert("Source and Destination locations cannot be the same!");
      return;
    }
    console.log('Saved Stock Transfer Document:', { 
      docketNo, date, vehicleNo, route, transferFrom, transferTo, note, items 
    });
    // Deduct stock from source and add to destination API logic here
  };

  const handleReset = () => {
    setItems([]);
    setDocketNo('');
    setNote('');
    setDate(new Date().toISOString().split('T')[0]);
    setVehicleNo('');
    setRoute('');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-800 uppercase">
            Stock Transfer
          </h2>
        </div>
        <button className="rounded bg-sap-primary px-4 py-1.5 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-blue-700">
          ADD NEW
        </button>
      </div>

      {/* Top Document Selection */}
      <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-blue-800 border-b border-blue-100 pb-2">
          Transfer Route Details
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end mb-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Transfer From</label>
            <select
              value={transferFrom}
              onChange={(e) => setTransferFrom(e.target.value)}
              className="w-full rounded-sm border border-slate-300 bg-red-50 text-red-900 px-2.5 py-1.5 text-xs font-bold outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            >
              <option value="Main Plant Store">Main Plant Store</option>
              <option value="Cold Storage A">Cold Storage A</option>
              <option value="Paneer Production Unit">Paneer Production Unit</option>
              <option value="Ice Cream Plant 2">Ice Cream Plant 2</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Transfer To</label>
            <select
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
              className="w-full rounded-sm border border-slate-300 bg-green-50 text-green-900 px-2.5 py-1.5 text-xs font-bold outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            >
              <option value="City Distribution Center">City Distribution Center</option>
              <option value="Main Plant Store">Main Plant Store</option>
              <option value="Cold Storage A">Cold Storage A</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Vehicle No</label>
            <input 
              type="text" 
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary uppercase"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Route</label>
            <input 
              type="text" 
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              className="w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Docket No</label>
            <input 
              type="text" 
              value={docketNo}
              onChange={(e) => setDocketNo(e.target.value)}
              className="w-full rounded-sm border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sap-primary focus:ring-1 focus:ring-sap-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Date</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
        </div>
      </div>

      {isSameLocation && (
         <div className="flex items-center gap-2 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-red-800 shadow-sm">
           <AlertCircle className="h-4 w-4" />
           <span className="text-xs font-medium">
             Invalid routing geometry: 'Transfer From' and 'Transfer To' cannot be identical.
           </span>
         </div>
      )}

      {/* Entry Component */}
      <TransferForm onAdd={handleAdd} />

      {/* Table Component */}
      <TransferTable items={items} onRemove={handleRemove} />

      {/* Bottom Buttons */}
      <div className="flex flex-row justify-end rounded-sm border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex gap-3">
          <button 
            onClick={handleReset}
            className="rounded border border-slate-300 bg-white px-6 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            RESET
          </button>
          <button 
            onClick={handleSave}
            disabled={!hasItems || isSameLocation}
            className={`rounded px-8 py-1.5 text-[11px] font-bold text-white shadow-sm transition-colors
              ${hasItems && !isSameLocation ? 'bg-green-600 hover:bg-green-700 hover:shadow-md' : 'bg-slate-300 cursor-not-allowed'}`}
          >
            SAVE
          </button>
        </div>
      </div>

      {/* Embedded History List Table */}
      <div className="flex flex-col rounded-sm border border-slate-200 bg-white shadow-sm mt-4">
        <div className="border-b border-blue-100 bg-blue-50/50 px-4 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800">
            All Stock Transfer List
          </h3>
        </div>
        <div className="p-4 overflow-x-auto">
          <div className="rounded-sm border border-slate-200">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase w-32">Docket No</th>
                  <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase w-24">Date</th>
                  <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-red-700">Transfer From</th>
                  <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase text-green-700">Transfer To</th>
                  <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase">Note</th>
                  <th className="border-b border-r border-slate-200 px-3 py-2 font-bold uppercase w-32">User</th>
                  <th className="border-b border-slate-200 px-3 py-2 font-bold uppercase text-center w-16">Action</th>
                </tr>
              </thead>
              <tbody>
                {dummyHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-800 font-medium whitespace-nowrap">{item.docketNo}</td>
                    <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-600 whitespace-nowrap">{item.date}</td>
                    <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-700 font-medium">{item.from}</td>
                    <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-700 font-medium">{item.to}</td>
                    <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-600 truncate max-w-[200px]">{item.note}</td>
                    <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-600">{item.user}</td>
                    <td className="border-b border-slate-200 px-3 py-2 flex justify-center items-center">
                      <button className="text-sap-primary hover:text-blue-800 transition-colors" title="View">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockTransfer;
