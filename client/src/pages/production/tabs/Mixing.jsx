import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { getSapAll, sapErrorMessage } from '../../../SAPB1/auth/login.js';
import ListingPage from '../../../components/ListingTable/ListingPage';

const SelectFields = [
  'ItemCode',
  'ItemName',
  'InventoryUOM',
  'QuantityOnStock',
  'QuantityOrderedByCustomers',
  'QuantityOrderedFromVendors',
  'DefaultWarehouse',
  'U_TYPE',
].join(',');

const Mixing = () => {
  const [mixingItems, setMixingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchMixingItems = async () => {
    try {
      const data = await getSapAll(
        `/Items?$select=${SelectFields}&$filter=U_TYPE eq 'MX'`
      );
      setMixingItems(data || []);
    } catch (error) {
      toast.error(sapErrorMessage(error, 'Failed to load Mixing Items'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMixingItems();
  }, []);

  const handleSapSync = async () => {
    setSyncing(true);
    setLoading(true);
    try {
      await fetchMixingItems();
      toast.success('Synced Mixing Items from SAP B1');
    } catch (err) {
      toast.error(sapErrorMessage(err, 'SAP B1 sync failed'));
    } finally {
      setSyncing(false);
    }
  };

  const stats = useMemo(() => {
    return [
      { label: 'Total Mixing Items', value: mixingItems.length, icon: '📋', iconClass: 'blue' },
    ];
  }, [mixingItems]);

  const columns = [
    { header: 'Item Code', field: 'ItemCode', type: 'text', cellClass: 'font-medium text-sap-primary' },
    { header: 'Item Name', field: 'ItemName', type: 'text' },
    { header: 'Inventory UOM', field: 'InventoryUOM', type: 'text' },
    { 
      header: 'In Stock', 
      field: 'QuantityOnStock', 
      type: 'number',
    },
    { header: 'Default Whs', field: 'DefaultWarehouse', type: 'text', cellClass: 'text-gray-600' },
  ];

  return (
    <div className="flex flex-col h-full bg-white rounded shadow-sm border border-slate-200">
      <ListingPage
        title="Production Mixing Report"
        subtitle="List of all Mixing (MX) items"
        titleIcon="🥣"
        rowData={mixingItems}
        columns={columns}
        rowKey="ItemCode"
        stats={stats}
        searchPlaceholder="Search Mixing Items..."
        searchFields={['ItemCode', 'ItemName', 'InventoryUOM', 'DefaultWarehouse']}
        loading={loading}
        toolbarActions={[
          {
            label: syncing ? 'Syncing…' : 'SAP B1 Sync',
            icon: syncing ? '⏳' : '🔄',
            onClick: handleSapSync,
            disabled: syncing,
          },
        ]}
      />
    </div>
  );
};

export default Mixing;
