import React from 'react';

const MilkStockReceive = () => {
  // Sample mock data based on the required columns
  const tableData = [
    {
      id: 1,
      docketNo: 'DKT-RCV-2026-001',
      date: '2026-04-03',
      fromLocation: 'Ice Cream Division',
      toDivision: 'Milk Division',
      qty: '4,500',
      fatPer: '7.10',
      snfPer: '8.72',
      fatKg: '319.50',
      snfKg: '392.40',
      status: 'pending'
    },
    {
      id: 2,
      docketNo: 'DKT-RCV-2026-002',
      date: '2026-04-02',
      fromLocation: 'Rampurhat Plant',
      toDivision: 'Milk Division',
      qty: '12,000',
      fatPer: '6.50',
      snfPer: '8.50',
      fatKg: '780.00',
      snfKg: '1,020.00',
      status: 'posted'
    },
    {
      id: 3,
      docketNo: 'DKT-RCV-2026-003',
      date: '2026-04-01',
      fromLocation: 'Milk Division',
      toDivision: 'Ice Cream Division',
      qty: '2,500',
      fatPer: '8.10',
      snfPer: '9.00',
      fatKg: '202.50',
      snfKg: '225.00',
      status: 'active'
    }
  ];

  return (
    <div className="w-full flex-1 flex flex-col gap-4 p-4 lg:p-6 font-inter bg-[#F9FAFB]">
      
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Milk Stock Receive</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and receive milk stock transfers between divisions workflows / SAP B1</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-outline">Refresh</button>
          <button className="btn-primary">+ New Receipt</button>
        </div>
      </div>

      {/* 2. Card with Blue Banner Header */}
      <div className="card w-full shadow-sm bg-white border border-gray-200 rounded-md overflow-hidden">
        
        <div className="card-header-banner bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide uppercase">Milk Stock Receive In Division</h2>
          <span className="text-xs bg-blue-700 px-2 py-1 rounded-sm shadow-inner">LIVE</span>
        </div>

        {/* Filters / Form could go here, omitting for brevity to focus on the Table */}
        <div className="p-4 border-b border-gray-200 flex items-center gap-4 bg-gray-50/50">
          <input 
            type="text" 
            placeholder="Search Docket No..." 
            className="form-input max-w-xs"
          />
          <select className="form-select max-w-xs">
            <option value="">All Divisions</option>
            <option value="milk">Milk Division</option>
            <option value="ice-cream">Ice Cream Division</option>
          </select>
          <button className="btn-outline">Filter</button>
        </div>

        {/* 3. Table area */}
        <div className="overflow-x-auto">
          <table className="data-table w-full text-left border-collapse text-sm">
            <thead className="bg-gray-100/80 text-gray-600 text-xs uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="p-3 font-semibold text-left">Docket No</th>
                <th className="p-3 font-semibold text-left">Date</th>
                <th className="p-3 font-semibold text-left">From Location</th>
                <th className="p-3 font-semibold text-left">To Division</th>
                <th className="p-3 font-semibold text-right">Quantity (KG)</th>
                <th className="p-3 font-semibold text-right">FAT %</th>
                <th className="p-3 font-semibold text-right">SNF %</th>
                <th className="p-3 font-semibold text-right">FAT KG</th>
                <th className="p-3 font-semibold text-right">SNF KG</th>
                <th className="p-3 font-semibold text-left">Status</th>
                <th className="p-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tableData.map((row) => (
                <tr key={row.id} className="hover:bg-blue-50/50 transition-colors text-gray-800">
                  <td className="p-3 font-medium text-blue-700">{row.docketNo}</td>
                  <td className="p-3 text-gray-600">{row.date}</td>
                  <td className="p-3">{row.fromLocation}</td>
                  <td className="p-3">{row.toDivision}</td>
                  <td className="p-3 text-right font-medium">{row.qty}</td>
                  <td className="p-3 text-right text-gray-600">{row.fatPer}</td>
                  <td className="p-3 text-right text-gray-600">{row.snfPer}</td>
                  <td className="p-3 text-right font-medium text-blue-800">{row.fatKg}</td>
                  <td className="p-3 text-right font-medium text-blue-800">{row.snfKg}</td>
                  <td className="p-3">
                    {row.status === 'pending' && <span className="badge-pending">Pending</span>}
                    {row.status === 'posted' && <span className="badge-posted">Posted</span>}
                    {row.status === 'active' && <span className="badge-active">Active</span>}
                  </td>
                  <td className="p-3 text-right">
                    <button className="btn-outline text-xs px-3 py-1">View</button>
                  </td>
                </tr>
              ))}
              
              {tableData.length === 0 && (
                <tr>
                  <td colSpan="11" className="p-8 text-center text-gray-500 italic">
                    No records found
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

export default MilkStockReceive;
