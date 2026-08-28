import { useState, useEffect, useMemo } from 'react';
import { Plus, Info, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import { getAllInventoryGenExits, getInventoryGenExitById } from '../../../SAPB1/InventoryGenExits/InventoryGenExitServices.js';
import { sapErrorMessage } from '../../../SAPB1/auth/login.js';
import useLoginWiseHook from '../../../hooks/useLoginWiseHook.js';
import useLoginWiseStore from '../../../store/loginWiseDataStore.js';
import RecordPicker from '../../CollectMilk/RecordPicker.jsx';

const ProductionIssue = () => {
  const [exits, setExits] = useState([]);
  const [selectedExit, setSelectedExit] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);

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

  // Fetch all exits on mount
  useEffect(() => {
    const fetchExits = async () => {
      try {
        const data = await getAllInventoryGenExits();
        setExits(data || []);
      } catch (error) {
        toast.error(sapErrorMessage(error, "Failed to load Inventory Gen Exits"));
      }
    };
    fetchExits();
  }, []);

  // Fetch lines when an exit is selected
  useEffect(() => {
    const fetchExitLines = async () => {
      if (!selectedExit) {
        setItems([]);
        return;
      }
      setLoading(true);
      try {
        const details = await getInventoryGenExitById(selectedExit);
        const lines = details.DocumentLines || [];

        const mappedItems = lines.map((l, index) => ({
          id: index + 1,
          code: l.ItemCode || '—',
          desc: l.ItemDescription || '—',
          warehouse: l.WarehouseCode || '—',
          reqQty: l.Quantity ? l.Quantity.toLocaleString('en-IN') : '0',
          issueQty: l.Quantity || 0,
          reqUnit: l.InventoryUOM || 'KG',
          unit: l.InventoryUOM || 'KG',
          batch: l.BatchNumbers?.length > 0 ? l.BatchNumbers[0].BatchNumber : '—'
        }));

        setItems(mappedItems);
      } catch (error) {
        toast.error(sapErrorMessage(error, "Failed to load exit details"));
      } finally {
        setLoading(false);
      }
    };

    fetchExitLines();
  }, [selectedExit]);

  useEffect(() => {
    if (selectedExit) {
      const exitObj = exits.find((e) => e.DocEntry === selectedExit);
      if (exitObj?.DocDate) {
        setIssueDate(exitObj.DocDate.split('T')[0]);
      }
    } else {
      setIssueDate(new Date().toISOString().split('T')[0]);
    }
  }, [selectedExit, exits]);

  const selectedExitObj = exits.find(e => e.DocEntry === selectedExit);
  const selectedExitDisplay = selectedExitObj ? `Doc-${selectedExitObj.DocNum} (${selectedExitObj.Comments || 'No Comments'})` : '';

  return (
    <div className="flex flex-col gap-4">
      {/* Blue Progress Bar */}
      {/* <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full w-[40%] bg-sap-primary rounded-full transition-all duration-500" />
      </div> */}

      {/* Card */}
      <div className="card">
        {/* Card Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="text-[13px] font-bold text-gray-800 flex items-center gap-2">
            <span>⚙️</span> Production Issue Entry <span className="text-sap-primary"></span>
          </h3>
          <span className="text-[11px] font-medium text-gray-400">Draft</span>
        </div>

        <div className="p-5">
          {/* Row 1 */}
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
              <label className="text-[10.5px] font-bold text-gray-500 uppercase">Issue Document</label>
              <div className="relative">
                <input
                  type="text"
                  className="form-input bg-blue-50 text-sap-primary font-semibold w-full pr-8 cursor-pointer"
                  placeholder="Search Issue Document"
                  value={selectedExitDisplay}
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
              <label className="text-[10.5px] font-bold text-gray-500 uppercase">Issue Date</label>
              <input 
                type="date" 
                value={issueDate} 
                onChange={(e) => setIssueDate(e.target.value)} 
                className="form-input" 
              />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="flex flex-col gap-1">
              <label className="text-[10.5px] font-bold text-gray-500 uppercase">Finish Product</label>
              <select className="form-select">
                <option>Vanilla Ice Cream 500ml</option>
                <option>Chocolate Ice Cream 500ml</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10.5px] font-bold text-gray-500 uppercase">Planned Qty</label>
              <input type="number" value={items.length > 0 ? items[0].issueQty : ''} readOnly className="form-input" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10.5px] font-bold text-gray-500 uppercase">Batch / Lot No.</label>
              <input type="text" defaultValue="" className="form-input" />
            </div>
          </div>

          {/* Section: RAW MATERIALS TO ISSUE */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-sap-primary rounded-full" />
            <h3 className="text-[12px] font-bold text-sap-primary uppercase tracking-wide">Raw Materials to Issue</h3>
          </div>

          {/* Materials Table */}
          <div className="overflow-x-auto mb-3">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ITEM CODE</th>
                  <th>ITEM DESCRIPTION</th>
                  <th>WAREHOUSE</th>
                  <th className="text-right">REQUIRED QTY</th>
                  <th className="text-right">ISSUE QTY</th>
                  <th>UNIT</th>
                  <th>BATCH</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-gray-500">Loading issue materials...</td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-gray-500">Please select an Issue Document to view materials</td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td className="text-gray-500">{item.id}</td>
                      <td className="font-medium text-sap-primary">{item.code}</td>
                      <td>{item.desc}</td>
                      <td className="text-gray-600 text-[11px]">{item.warehouse}</td>
                      <td className="text-right font-medium">{item.reqQty} <span className="text-gray-400 text-[10px]">{item.reqUnit}</span></td>
                      <td className="text-right">
                        <input type="number" defaultValue={item.issueQty} className="form-input w-20 text-right py-1 text-xs inline-block" />
                      </td>
                      <td className="text-gray-600">{item.unit}</td>
                      <td className="text-gray-600 text-[11px]">{item.batch}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Add Line */}
          <button className="text-[11px] font-semibold text-gray-500 hover:text-sap-primary transition-colors flex items-center gap-1 mb-5">
            <Plus className="h-3.5 w-3.5" /> Add Line
          </button>


        </div>
      </div>

      <RecordPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        records={exits}
        codeKey="DocNum"
        nameKey="Comments"
        codeLabel="Doc No"
        nameLabel="Comments"
        title="Select Issue Document"
        subtitle="Choose one Issue Document to view its materials"
        emptyText="No issue documents found."
        selectedCode={selectedExitObj ? selectedExitObj.DocNum : ''}
        onSelect={(record) => {
          setSelectedExit(record.DocEntry);
          setPickerOpen(false);
        }}
      />
    </div>
  );
};

export default ProductionIssue;
