import { useState, useEffect, useMemo } from 'react';
import { Plus, Info, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import { getAllInventoryGenEntries, getInventoryGenEntryById } from '../../../SAPB1/InventoryGenEntries/InventoryGenEntryServices.js';
import { sapErrorMessage } from '../../../SAPB1/auth/login.js';
import useLoginWiseHook from '../../../hooks/useLoginWiseHook.js';
import useLoginWiseStore from '../../../store/loginWiseDataStore.js';
import RecordPicker from '../../CollectMilk/RecordPicker.jsx';

const ProductionReceipt = () => {
  const [entries, setEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);

  // Bind Division and Location
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

  // Fetch all entries on mount
  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const data = await getAllInventoryGenEntries();
        setEntries(data || []);
      } catch (error) {
        toast.error(sapErrorMessage(error, "Failed to load Inventory Gen Entries"));
      }
    };
    fetchEntries();
  }, []);

  // Fetch lines when an entry is selected
  useEffect(() => {
    const fetchEntryLines = async () => {
      if (!selectedEntry) {
        setItems([]);
        return;
      }
      setLoading(true);
      try {
        const details = await getInventoryGenEntryById(selectedEntry);
        const lines = details.DocumentLines || [];

        const mappedItems = lines.map((l, index) => ({
          id: index + 1,
          code: l.ItemCode || '—',
          desc: l.ItemDescription || '—',
          warehouse: l.WarehouseCode || '—',
          plannedQty: l.Quantity ? l.Quantity.toLocaleString('en-IN') : '0',
          receivedQty: l.Quantity ? l.Quantity : 0,
          unit: l.InventoryUOM || 'KG',
          batch: l.BatchNumbers?.length > 0 ? l.BatchNumbers[0].BatchNumber : '—'
        }));

        setItems(mappedItems);
      } catch (error) {
        toast.error(sapErrorMessage(error, "Failed to load entry details"));
      } finally {
        setLoading(false);
      }
    };

    fetchEntryLines();
  }, [selectedEntry]);

  useEffect(() => {
    if (selectedEntry) {
      const entryObj = entries.find((e) => e.DocEntry === selectedEntry);
      if (entryObj?.DocDate) {
        setReceiptDate(entryObj.DocDate.split('T')[0]);
      }
    } else {
      setReceiptDate(new Date().toISOString().split('T')[0]);
    }
  }, [selectedEntry, entries]);

  const selectedEntryObj = entries.find((e) => e.DocEntry === selectedEntry);
  const selectedEntryDisplay = selectedEntryObj ? `Doc-${selectedEntryObj.DocNum}` : '';

  return (
    <div className="flex flex-col gap-4">
      {/* <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full w-[70%] bg-green-500 rounded-full transition-all duration-500" />
      </div> */}

      <div className="card">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="text-[13px] font-bold text-gray-800 flex items-center gap-2">
            <span>🏷️</span> Production Receipt Entry {selectedEntryDisplay ? `— ${selectedEntryDisplay}` : ''}
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
              <label className="text-[10.5px] font-bold text-gray-500 uppercase">Receipt Document</label>
              <div className="relative">
                <input
                  type="text"
                  className="form-input bg-blue-50 text-sap-primary font-semibold w-full pr-8 cursor-pointer"
                  placeholder="Search Receipt Document"
                  value={selectedEntryDisplay}
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
              <label className="text-[10.5px] font-bold text-gray-500 uppercase">Receipt Date</label>
              <input 
                type="date" 
                value={receiptDate} 
                onChange={(e) => setReceiptDate(e.target.value)} 
                className="form-input" 
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-green-500 rounded-full" />
            <h3 className="text-[12px] font-bold text-green-700 uppercase tracking-wide">Finished Goods Received</h3>
          </div>

          <div className="overflow-x-auto mb-3">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ITEM CODE</th>
                  <th>ITEM DESCRIPTION</th>
                  <th>WAREHOUSE</th>
                  <th className="text-right">PLANNED QTY</th>
                  <th className="text-right">RECEIVED QTY</th>
                  <th>UNIT</th>
                  <th>BATCH</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-gray-500">Loading receipt lines...</td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-gray-500">Please select a Receipt Document to view materials</td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td className="text-gray-500">{item.id}</td>
                      <td className="font-medium text-sap-primary">{item.code}</td>
                      <td>{item.desc}</td>
                      <td className="text-gray-600 text-[11px]">{item.warehouse}</td>
                      <td className="text-right font-medium">{item.plannedQty}</td>
                      <td className="text-right">
                        <input type="number" defaultValue={item.receivedQty} className="form-input w-20 text-right py-1 text-xs inline-block" />
                      </td>
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


        </div>
      </div>

      <RecordPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        records={entries}
        codeKey="DocNum"
        nameKey="Comments"
        codeLabel="Doc No"
        nameLabel="Comments"
        title="Select Receipt Document"
        subtitle="Choose one Receipt Document to view its materials"
        emptyText="No receipt documents found."
        selectedCode={selectedEntryObj ? selectedEntryObj.DocNum : ''}
        onSelect={(record) => {
          setSelectedEntry(record.DocEntry);
          setPickerOpen(false);
        }}
      />
    </div>
  );
};

export default ProductionReceipt;
