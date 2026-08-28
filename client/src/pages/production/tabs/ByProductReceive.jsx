import React, { useState } from 'react';
import ByProductReceiveTable from './ByProductReceiveTable';

const initialDummyData = [
  {
    id: 1,
    docketNo: 'DKT-O-2023-001',
    date: '2023-10-25',
    mixingDocNo: 'MIX-2023-501',
    product: 'Cream',
    quantity: 50.0,
    unit: 'KGS',
    user: 'Admin',
    status: 'Pending',
  },
  {
    id: 2,
    docketNo: 'DKT-O-2023-002',
    date: '2023-10-26',
    mixingDocNo: 'MIX-2023-502',
    product: 'Butter Milk',
    quantity: 200.0,
    unit: 'LTR',
    user: 'Manager',
    status: 'Received',
  },
  {
    id: 3,
    docketNo: 'DKT-O-2023-003',
    date: '2023-10-27',
    mixingDocNo: 'MIX-2023-506',
    product: 'SMP',
    quantity: 100.0,
    unit: 'KGS',
    user: 'Admin',
    status: 'Pending',
  },
];

const ByProductReceive = () => {
  const [items, setItems] = useState(initialDummyData);

  const handleReceive = (id) => {
    setItems((prevItems) => 
      prevItems.map((item) => 
        item.id === id ? { ...item, status: 'Received' } : item
      )
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <h2 className="text-sm font-bold tracking-tight text-slate-800 uppercase">
          Others Finished Product Received In Store
        </h2>
      </div>

      {/* Main Table Section */}
      <ByProductReceiveTable 
        items={items} 
        onReceive={handleReceive} 
      />
    </div>
  );
};

export default ByProductReceive;
