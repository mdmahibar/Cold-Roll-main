import { useState, useEffect } from 'react';
import { Plus, Download, Info, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import { getAllProductionOrders, getProductionOrderById } from '../../../SAPB1/ProductionOrders/ProductionOrderServices.js';
import { sapErrorMessage } from '../../../SAPB1/auth/login.js';
import useLoginWiseHook from '../../../hooks/useLoginWiseHook.js';
import useLoginWiseStore from '../../../store/loginWiseDataStore.js';
import { useMemo } from 'react';
import RecordPicker from '../../CollectMilk/RecordPicker.jsx';

const ProductionReceive = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useLoginWiseHook();
  const loginWiseData = useLoginWiseStore((s) => s.loginWiseData);
  const loginUser = loginWiseData?.data?.[0] ?? null;

  const divisionOptions = useMemo(
    () => (loginUser?.objDivision ?? []).map((d) => ({ value: d.divisionCode, label: d.divisionName })),
    [loginUser]
  );
  const locationOptions = useMemo(
    () => (loginUser?.objLocation ?? []).map((l) => ({ value: l.locationCode, label: l.locationName })),
    [loginUser]
  );

  // Fetch all production orders on mount to populate the dropdown
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await getAllProductionOrders();
        setOrders(data || []);
      } catch (error) {
        toast.error(sapErrorMessage(error, "Failed to load Production Orders"));
      }
    };
    fetchOrders();
  }, []);

  // Fetch specific order lines when an order is selected
  useEffect(() => {
    const fetchOrderLines = async () => {
      if (!selectedOrder) {
        setItems([]);
        return;
      }
      setLoading(true);
      try {
        const orderDetails = await getProductionOrderById(selectedOrder);
        const lines = orderDetails.ProductionOrderLines || [];

        const mappedItems = lines.map((l, index) => ({
          id: index + 1,
          code: l.ItemNo || '—',
          desc: l.ItemDescription || '—',
          fromWH: l.Warehouse || '—',
          toWH: 'Production Floor A',
          qty: l.PlannedQuantity ? l.PlannedQuantity.toLocaleString('en-IN') : '0',
          unit: l.InventoryUOM || 'KG',
          receivedQty: l.IssuedQuantity || l.PlannedQuantity || 0,
          status: 'Pending'
        }));

        setItems(mappedItems);
      } catch (error) {
        toast.error(sapErrorMessage(error, "Failed to load order details"));
      } finally {
        setLoading(false);
      }
    };

    fetchOrderLines();
  }, [selectedOrder]);

  const selectedOrderObj = orders.find(o => o.AbsoluteEntry === selectedOrder);
  const selectedOrderDisplay = selectedOrderObj ? `PO-${selectedOrderObj.DocumentNumber} (${selectedOrderObj.ProductDescription})` : '';

  return (
    <div className="flex flex-col gap-4">

      <div className="card">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="text-[13px] font-bold text-gray-800 flex items-center gap-2">
            <span>📥</span> Production Receive Entry <span className="text-sap-primary"></span>
          </h3>
          <span className="text-[11px] font-medium text-gray-400">Draft</span>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-4 gap-4 mb-5">
            <div className="flex flex-col gap-1">
              <label className="text-[10.5px] font-bold text-gray-500 uppercase">Division <span className="text-red-500">*</span></label>
              <select className="form-select">
                {divisionOptions.map((div) => (
                  <option key={div.value} value={div.value}>{div.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10.5px] font-bold text-gray-500 uppercase">Location <span className="text-red-500">*</span></label>
              <select className="form-select">
                {locationOptions.map((loc) => (
                  <option key={loc.value} value={loc.value}>{loc.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10.5px] font-bold text-gray-500 uppercase">Production Order</label>
              <div className="relative">
                <input
                  type="text"
                  className="form-input bg-blue-50 text-sap-primary font-semibold w-full pr-8 cursor-pointer"
                  placeholder="Search Production Order"
                  value={selectedOrderDisplay}
                  readOnly
                  onClick={() => setPickerOpen(true)}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-sap-primary"
                  onClick={() => setPickerOpen(true)}
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10.5px] font-bold text-gray-500 uppercase">Receive Date</label>
              <input type="date" defaultValue="2026-03-24" className="form-input" />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-indigo-500 rounded-full" />
            <h3 className="text-[12px] font-bold text-indigo-700 uppercase tracking-wide">Materials Received at Production</h3>
          </div>

          <div className="overflow-x-auto mb-3">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ITEM CODE</th>
                  <th>DESCRIPTION</th>
                  <th>FROM</th>
                  <th>TO</th>
                  <th className="text-right">DISPATCHED</th>
                  <th className="text-right">RECEIVED QTY</th>
                  <th>UNIT</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4 text-gray-500">Loading order materials...</td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4 text-gray-500">Please select a Production Order to view materials</td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td className="text-gray-500">{item.id}</td>
                      <td className="font-medium text-sap-primary">{item.code}</td>
                      <td>{item.desc}</td>
                      <td className="text-gray-600 text-[11px]">{item.fromWH}</td>
                      <td className="text-gray-600 text-[11px]">{item.toWH}</td>
                      <td className="text-right font-medium">{item.qty}</td>
                      <td className="text-right">
                        <input type="number" defaultValue={item.receivedQty} className="form-input w-20 text-right py-1 text-xs inline-block" />
                      </td>
                      <td className="text-gray-600">{item.unit}</td>
                      <td>
                        {item.status === 'Verified' ? <span className="badge-posted">{item.status}</span> : <span className="badge-pending">{item.status}</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded px-3 py-2 max-w-lg">
              <Info className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
              <p className="text-[11px] text-gray-700">
                Verify all quantities match the dispatch before confirming receipt.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-outline">Cancel</button>
              <button className="btn-primary">✓ Confirm Receipt</button>
            </div>
          </div> */}
        </div>
      </div>

      <RecordPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        records={orders}
        codeKey="DocumentNumber"
        nameKey="ProductDescription"
        codeLabel="PO No"
        nameLabel="Product"
        title="Select Production Order"
        subtitle="Choose one Production Order to view its materials"
        emptyText="No production orders found."
        selectedCode={selectedOrderObj ? selectedOrderObj.DocumentNumber : ''}
        onSelect={(record) => {
          setSelectedOrder(record.AbsoluteEntry);
          setPickerOpen(false);
        }}
      />
    </div>
  );
};

export default ProductionReceive;
