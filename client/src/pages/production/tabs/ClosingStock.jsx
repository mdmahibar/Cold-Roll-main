import { useState } from 'react';
import { Download } from 'lucide-react';

const ClosingStock = () => {
  const stockData = [
    { id: 1, code: 'MLK-BUF-001', desc: 'Buffalo Milk (Raw)', warehouse: 'Production Floor A', openQty: '5,000', issued: '4,200', received: '0', closing: '800', unit: 'KG' },
    { id: 2, code: 'SGR-001', desc: 'Sugar (White)', warehouse: 'Production Floor A', openQty: '500', issued: '420', received: '0', closing: '80', unit: 'KG' },
    { id: 3, code: 'IC-VAN-500', desc: 'Vanilla Ice Cream 500ml', warehouse: 'Finished Goods', openQty: '0', issued: '0', received: '980', closing: '980', unit: 'PCS' },
    { id: 4, code: 'IC-CHO-500', desc: 'Chocolate Ice Cream 500ml', warehouse: 'Finished Goods', openQty: '0', issued: '0', received: '495', closing: '495', unit: 'PCS' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="card">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="text-[13px] font-bold text-gray-800 flex items-center gap-2">
            <span>📊</span> Closing Stock Summary — <span className="text-sap-primary">24/03/2026</span>
          </h3>
          <div className="flex items-center gap-2">
            <input type="date" defaultValue="2026-03-24" className="form-input text-xs py-1" />
            <button className="btn-outline text-xs py-1 flex items-center gap-1">
              <Download className="h-3 w-3" /> Export
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>ITEM CODE</th>
                <th>DESCRIPTION</th>
                <th>WAREHOUSE</th>
                <th className="text-right">OPENING</th>
                <th className="text-right">ISSUED</th>
                <th className="text-right">RECEIVED</th>
                <th className="text-right">CLOSING</th>
                <th>UNIT</th>
              </tr>
            </thead>
            <tbody>
              {stockData.map((row) => (
                <tr key={row.id}>
                  <td className="text-gray-500">{row.id}</td>
                  <td className="font-medium text-sap-primary">{row.code}</td>
                  <td>{row.desc}</td>
                  <td className="text-gray-600 text-[11px]">{row.warehouse}</td>
                  <td className="text-right font-medium">{row.openQty}</td>
                  <td className="text-right text-red-600 font-medium">{row.issued}</td>
                  <td className="text-right text-green-600 font-medium">{row.received}</td>
                  <td className="text-right font-bold text-gray-900">{row.closing}</td>
                  <td className="text-gray-600">{row.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClosingStock;
