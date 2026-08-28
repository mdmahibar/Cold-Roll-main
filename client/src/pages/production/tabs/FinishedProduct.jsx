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

const FinishedProduct = () => {
  const [finishedItems, setFinishedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchFinishedItems = async () => {
    try {
      const data = await getSapAll(
        `/Items?$select=${SelectFields}&$filter=U_TYPE eq 'FP'`
      );
      setFinishedItems(data || []);
    } catch (error) {
      toast.error(sapErrorMessage(error, 'Failed to load Finished Product Items'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinishedItems();
  }, []);

  const handleSapSync = async () => {
    setSyncing(true);
    setLoading(true);
    try {
      await fetchFinishedItems();
      toast.success('Synced Finished Products from SAP B1');
    } catch (err) {
      toast.error(sapErrorMessage(err, 'SAP B1 sync failed'));
    } finally {
      setSyncing(false);
    }
  };

  const stats = useMemo(() => {
    return [
      { label: 'Total Finished Products', value: finishedItems.length, icon: '📋', iconClass: 'blue' },
    ];
  }, [finishedItems]);

  const columns = [
    { header: 'Item Code', field: 'ItemCode', type: 'text', cellClass: 'font-medium text-sap-primary' },
    { header: 'Item Name', field: 'ItemName', type: 'text' },
    {
      header: 'U_TYPE',
      field: 'U_TYPE',
      type: 'badge',
      badgeFn: (val) => ({ variant: 'success', label: val })
    },
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
        title="Finished Product Report"
        subtitle="List of all Finished Products (FP)"
        titleIcon="📦"
        rowData={finishedItems}
        columns={columns}
        rowKey="ItemCode"
        stats={stats}
        searchPlaceholder="Search Finished Products..."
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

export default FinishedProduct;
