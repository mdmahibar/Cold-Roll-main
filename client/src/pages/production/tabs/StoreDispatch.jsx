import { useState, useEffect } from 'react';
import { Plus, Download, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import { getAllStockTransfers, getStockTransferById } from '../../../SAPB1/StockTransfers/StockTransferServices.js';
import { sapErrorMessage } from '../../../SAPB1/auth/login.js';
import useLoginWiseHook from '../../../hooks/useLoginWiseHook.js';
import useLoginWiseStore from '../../../store/loginWiseDataStore.js';
import RecordPicker from '../../CollectMilk/RecordPicker.jsx';

const StoreDispatch = () => {
  useLoginWiseHook();
  const loginWiseData = useLoginWiseStore((s) => s.loginWiseData);
  const loginUser = loginWiseData?.data?.[0] ?? null;

  const divisionOptions = (loginUser?.objDivision ?? []).map((d) => ({
    label: d.divisionName,
    value: d.divisionCode
  }));

  const locationOptions = (loginUser?.objLocation ?? []).map((l) => ({
    label: l.locationName,
    value: l.locationCode
  }));

  const [items, setItems] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [selectedDispatch, setSelectedDispatch] = useState('');
  const [selectedDispatchDetails, setSelectedDispatchDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Fetch all dispatches (StockTransfers) on mount
  useEffect(() => {
    const fetchDispatches = async () => {
      try {
        const data = await getAllStockTransfers();
        setDispatches(data || []);
      } catch (error) {
        toast.error(sapErrorMessage(error, "Failed to load Stock Transfers"));
      }
    };
    fetchDispatches();
  }, []);

  // Fetch specific lines when a dispatch is selected
  useEffect(() => {
    const fetchLines = async () => {
      if (!selectedDispatch) {
        setItems([]);
        setSelectedDispatchDetails(null);
        return;
      }
      setLoading(true);
      try {
        const details = await getStockTransferById(selectedDispatch);
        setSelectedDispatchDetails(details);

        const lines = details.StockTransferLines || [];

        const mappedItems = lines.map((l, index) => ({
          id: index + 1,
          code: l.ItemCode || '—',
          desc: l.ItemDescription || '—',
          fromWH: l.FromWarehouseCode || '—',
          toWH: l.WarehouseCode || '—',
          qty: l.Quantity ? l.Quantity.toLocaleString('en-IN') : '0',
          unit: l.InventoryUOM || l.MeasureUnit || 'KG',
          batch: l.BatchNumbers?.length > 0 ? l.BatchNumbers[0].BatchNumber : '—'
        }));

        setItems(mappedItems);
      } catch (error) {
        toast.error(sapErrorMessage(error, "Failed to load dispatch details"));
      } finally {
        setLoading(false);
      }
    };

    fetchLines();
  }, [selectedDispatch]);

  const dispatchHistory = [
    { id: 'DISP-8342', date: '01/04/26', items: 5, status: 'Posted', user: 'Admin' },
    { id: 'DISP-8341', date: '31/03/26', items: 3, status: 'Posted', user: 'Superuser' },
    { id: 'DISP-8340', date: '30/03/26', items: 8, status: 'Pending', user: 'Admin' },
  ];

  const selectedDispatchDisplay = selectedDispatchDetails
    ? `SD-${selectedDispatchDetails.DocNum}`
    : '';

  return (
    <div className="flex flex-col gap-4">

      {/* Entry Card */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="text-[13px] font-bold text-gray-800 flex items-center gap-2">
            <span>📦</span> Store Dispatch Entry <span className="text-sap-primary">{selectedDispatchDisplay ? `— ${selectedDispatchDisplay}` : ''}</span>
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
              <label className="text-[10.5px] font-bold text-gray-500 uppercase">Dispatch Document</label>
              <div className="relative">
                <input 
                  type="text" 
                  className="form-input bg-blue-50 text-sap-primary font-semibold w-full pr-8 cursor-pointer" 
                  placeholder="Select Dispatch..."
                  value={selectedDispatchDisplay}
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
              <label className="text-[10.5px] font-bold text-gray-500 uppercase">Dispatch Date</label>
              <input type="date" value={selectedDispatchDetails?.DocDate ? selectedDispatchDetails.DocDate.split('T')[0] : ''} readOnly className="form-input bg-gray-50" />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-amber-500 rounded-full" />
            <h3 className="text-[12px] font-bold text-amber-700 uppercase tracking-wide">Materials to Dispatch</h3>
          </div>

          <div className="overflow-x-auto mb-3">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ITEM CODE</th>
                  <th>DESCRIPTION</th>
                  <th>FROM WAREHOUSE</th>
                  <th>TO WAREHOUSE</th>
                  <th className="text-right">QTY</th>
                  <th>UNIT</th>
                  <th>BATCH</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-gray-500">Loading materials...</td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-gray-500">Please select a Dispatch Document to view materials</td>
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
                      <td className="text-gray-600">{item.unit}</td>
                      <td className="text-gray-600 text-[11px]">{item.batch}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <button className="text-[11px] font-semibold text-gray-500 hover:text-sap-primary transition-colors flex items-center gap-1 mb-5">
            <Plus className="h-3.5 w-3.5" /> Add Line
          </button>

          {/* <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
            <button className="btn-outline">Cancel</button>
            <button className="btn-outline border-sap-primary text-sap-primary hover:bg-blue-50">Save Draft</button>
            <button className="btn-primary">✓ Post Dispatch</button>
          </div> */}
        </div>
      </div>

      {/* History Table */}
      {/* 
      <div className="card">
        <div className="px-5 py-3 flex items-center justify-between border-b border-gray-200">
          <h3 className="text-[13px] font-bold text-gray-800 flex items-center gap-1.5">
            <span>📋</span> Recent Dispatches
          </h3>
          <div className="flex items-center gap-2">
            <input type="text" placeholder="Search..." className="form-input text-xs py-1 w-36" />
            <button className="btn-outline text-xs py-1 flex items-center gap-1">
              <Download className="h-3 w-3" /> Export
            </button>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>DISPATCH NO</th>
              <th>DATE</th>
              <th className="text-right">ITEMS</th>
              <th>STATUS</th>
              <th>USER</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {dispatchHistory.map((row) => (
              <tr key={row.id}>
                <td className="font-medium text-sap-primary">{row.id}</td>
                <td className="text-gray-600">{row.date}</td>
                <td className="text-right font-medium">{row.items}</td>
                <td>{row.status === 'Posted' ? <span className="badge-posted">{row.status}</span> : <span className="badge-pending">{row.status}</span>}</td>
                <td className="text-gray-600">{row.user}</td>
                <td><button className="btn-outline text-xs py-0.5 px-2">View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      */}
    </div>
  );
};

export default StoreDispatch;
