import React, { useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import ListingPage from '../components/ListingTable/ListingPage';
import Modal, { TextField, SelectField, DateField, FieldGroup } from '../components/Modal/Modal';
import Loader from '../components/Loader/Loader.jsx';
import RecordPicker from './CollectMilk/RecordPicker.jsx';

import {
  getAllInventoryGenExits,
  getInventoryGenExitById,
  createInventoryGenExit,
  updateInventoryGenExit
} from '../SAPB1/InventoryGenExits/InventoryGenExitServices.js';
import { sapErrorMessage } from '../SAPB1/auth/login.js';

import useInventoryGenExitStore from '../store/inventoryGenExitStore.js';
import useInventoryGenExitHook from '../hooks/useInventoryGenExitHook.js';
import useLoginWiseHook from '../hooks/useLoginWiseHook.js';
import useLoginWiseStore from '../store/loginWiseDataStore.js';
import useItemMasterHook from '../hooks/useItemMasterHook.js';
import useItemMaster from '../store/itemMasterStore.js';
import useWarehouseHook from '../hooks/useWarehouseHook.js';
import useWarehouseStore from '../store/warehouseStore.js';

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toSapDate = (value) => (value ? String(value).slice(0, 10) : undefined);

const fmtNum = (n) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const toNumber = (value) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

// Drops keys whose value is undefined so we never POST an empty UDF.
const compact = (object) =>
  Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));

// ── Mock Cost Centres (Until API is available) ────────────────────────────────
const mockCostCentres = [
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Production Loss', label: 'Production Loss' },
  { value: 'Sample / Testing', label: 'Sample / Testing' },
  { value: 'Wastage', label: 'Wastage' },
  { value: 'R&D', label: 'R&D' },
];

const EMPTY_LINE = {
  itemCode: '',
  itemName: '',
  availableQty: '',
  issueQty: '',
  uom: '',
  batch: '',
};

const EMPTY_FORM = {
  docentry: '',
  docnum: '',
  series: 'Primary',
  division: '',
  location: '',
  costCentre: '',
  postingDate: getTodayDate(),
  remarks: '',
  whsCode: '',
  whsName: '',
  lineItems: [{ ...EMPTY_LINE }],
};

const AdhocGoodsIssue = () => {

  // ── Hooks & Stores ────────────────────────────────────────────────────────
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

  useItemMasterHook();
  const items = useItemMaster((state) => state.itemMaster);

  useWarehouseHook();
  const warehouses = useWarehouseStore((wh) => wh.warehouses);

  useInventoryGenExitHook();
  const list = useInventoryGenExitStore((state) => state.inventoryGenExits);
  const setInventoryGenExits = useInventoryGenExitStore((state) => state.setInventoryGenExits);

  const [syncing, setSyncing] = useState(false);
  const handleSapSync = async () => {
    setSyncing(true);
    try {
      const rows = await getAllInventoryGenExits();
      setInventoryGenExits(rows);
      toast.success(`Synced ${rows.length} records from SAP B1`);
    } catch (err) {
      toast.error(sapErrorMessage(err, 'SAP B1 sync failed'));
    } finally {
      setSyncing(false);
    }
  };

  // Pending overlay state
  const [pending, setPending] = useState(0);
  const busy = pending > 0;

  // Modal states
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState('Add');
  const [form, setForm] = useState(EMPTY_FORM);

  // Pickers state
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [itemPickerIndex, setItemPickerIndex] = useState(null);

  const [whsPickerOpen, setWhsPickerOpen] = useState(false);

  const isView = action === 'View';

  const defaultDivision = divisionOptions.length === 1 ? divisionOptions[0].value : '';
  const defaultLocation = locationOptions.length === 1 ? locationOptions[0].value : '';

  const change = (event) => setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  // ── Line item handlers ──────────────────────────────────────────────────────

  const handleAddRow = () => {
    setForm((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, { ...EMPTY_LINE }],
    }));
  };

  const handleDeleteRow = (index) => {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index),
    }));
  };

  const handleLineItemChange = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  // ── Picker handlers ─────────────────────────────────────────────────────────

  const openItemPicker = (index) => {
    setItemPickerIndex(index);
    setItemPickerOpen(true);
  };

  const handleSelectItem = (item) => {
    if (itemPickerIndex !== null) {
      handleLineItemChange(itemPickerIndex, 'itemCode', item.ItemCode);
      handleLineItemChange(itemPickerIndex, 'itemName', item.ItemName);
      handleLineItemChange(itemPickerIndex, 'uom', item.UoMCode || 'KG');
      handleLineItemChange(itemPickerIndex, 'availableQty', Math.floor(Math.random() * 5000) + 100);
    }
  };

  const openWhsPicker = () => {
    setWhsPickerOpen(true);
  };

  const handleSelectWarehouse = (wh) => {
    setForm((prev) => ({
      ...prev,
      whsCode: wh.WarehouseCode,
      whsName: wh.WarehouseName,
    }));
  };

  // ── Modal open/close ────────────────────────────────────────────────────────

  const handleModal = async (act, docEntry = null) => {
    setAction(act);

    if (act === 'Add') {
      setForm({ ...EMPTY_FORM, postingDate: getTodayDate(), division: defaultDivision, location: defaultLocation, lineItems: [{ ...EMPTY_LINE }] });
      setOpen(true);
      return;
    }

    setPending((p) => p + 1);
    try {
      const record = await getInventoryGenExitById(docEntry);
      const lines = record.DocumentLines || [];

      setForm({
        ...EMPTY_FORM,
        docentry: record.DocEntry,
        docnum: record.DocNum ?? '',
        division: record.U_DIVISION ?? '',
        location: record.U_LOCATION ?? '',
        costCentre: record.U_COSTCENTRE ?? '',
        postingDate: toSapDate(record.DocDate) ?? getTodayDate(),
        remarks: record.Comments ?? '',
        whsCode: lines[0]?.WarehouseCode ?? '',
        whsName: warehouses.find(w => w.WarehouseCode === lines[0]?.WarehouseCode)?.WarehouseName ?? '',
        lineItems: lines.length > 0
          ? lines.map((l) => ({
            itemCode: l.ItemCode ?? '',
            itemName: l.ItemDescription ?? '',
            availableQty: Math.floor(Math.random() * 5000) + 100, // Still mock until real warehouse stock API exists
            issueQty: l.Quantity ?? '',
            uom: l.MeasureUnit ?? '',
            batch: l.BatchNumbers?.[0]?.BatchNumber ?? '',
          }))
          : [{ ...EMPTY_LINE }],
      });
      setOpen(true);
    } catch (err) {
      toast.error(sapErrorMessage(err, 'Failed to load record'));
    } finally {
      setPending((p) => p - 1);
    }
  };

  const closeModal = () => {
    setOpen(false);
    setForm(EMPTY_FORM);
  };

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.division) {
      toast.error('Please select a Division.');
      return;
    }
    if (!form.location) {
      toast.error('Please select a Location.');
      return;
    }
    if (!form.whsCode) {
      toast.error('Please select an Issue Warehouse.');
      return;
    }

    // Validate line items
    const validLines = form.lineItems.filter((l) => l.itemCode);
    if (validLines.length === 0) {
      toast.error('Please add at least one item.');
      return;
    }
    for (const line of validLines) {
      const qty = toNumber(line.issueQty);
      if (!qty || qty <= 0) {
        toast.error(`Issue Quantity must be greater than zero for item ${line.itemName || line.itemCode}.`);
        return;
      }
    }

    const lineItemsPayload = validLines.map((l, idx) => compact({
      LineNum: idx,
      ItemCode: l.itemCode,
      ItemDescription: l.itemName,
      Quantity: toNumber(l.issueQty),
      WarehouseCode: form.whsCode,
      BatchNumbers: l.batch ? [{ BatchNumber: l.batch, Quantity: toNumber(l.issueQty) }] : undefined,
    }));

    const payload = compact({
      DocDate: toSapDate(form.postingDate),
      Comments: form.remarks || undefined,
      U_DIVISION: form.division || undefined,
      U_LOCATION: form.location || undefined,
    });

    if (action === 'Add') {
      payload.DocumentLines = lineItemsPayload;
    }

    setPending((p) => p + 1);

    try {
      if (action === 'Add') {
        await createInventoryGenExit(payload);
      } else {
        await updateInventoryGenExit(form.docentry, payload);
      }
      toast.success(`Goods Issue ${action === 'Add' ? 'created' : 'updated'} successfully`);
      setOpen(false);
      setForm(EMPTY_FORM);
      handleSapSync();
    } catch (err) {
      toast.error(sapErrorMessage(err, `Failed to ${action === 'Add' ? 'create' : 'update'} goods issue`));
    } finally {
      setPending((p) => p - 1);
    }
  };

  // ── Stats ───────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    let totalItems = 0;
    (list || []).forEach((record) => {
      totalItems += 1; // Real backend doesn't return full document lines on GET usually, so we'll just count records
    });
    return [
      { label: 'Total Records', value: (list || []).length, icon: '📋', iconClass: 'blue' },
      { label: 'Total Goods Issues', value: totalItems, icon: '📦', iconClass: 'amber' },
    ];
  }, [list]);

  // ── Columns ─────────────────────────────────────────────────────────────────

  const columns = [
    { header: 'Doc Num', field: 'DocNum', type: 'badge', badgeFn: (value) => ({ variant: 'info', label: value || '—' }) },
    { header: 'Date', field: 'DocDate', type: 'date' },
    { header: 'Division', field: 'U_DIVISION', type: 'text' },
    { header: 'Location', field: 'U_LOCATION', type: 'text' },
    { header: 'Cost Centre', field: 'U_COSTCENTRE', type: 'text' },
    { header: 'Remarks', field: 'Comments', type: 'text' },
  ];

  // ── Computed footer totals ──────────────────────────────────────────────────
  
  const computed = useMemo(() => {
    let totalQty = 0;
    form.lineItems.forEach((l) => {
      totalQty += parseFloat(l.issueQty) || 0;
    });
    return {
      totalQty: totalQty > 0 ? fmtNum(totalQty) : '0',
    };
  }, [form.lineItems]);

  // ── Search icon SVG (reusable) ──────────────────────────────────────────────

  const SearchIcon = ({ onClick, label }) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        pointerEvents: 'auto',
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        color: 'inherit',
      }}
    >
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </button>
  );

  return (
    <>
      {!open && (
        <ListingPage
          title="Adhoc Goods Issue"
          subtitle="Adhoc Goods Issues bypass production workflow. Proper approval required. Reduces inventory for selected Division & Location."
          titleIcon="⚡"
          rowData={list || []}
          columns={columns}
          rowKey="DocEntry"
          stats={stats}
          searchPlaceholder="Search goods issues…"
          searchFields={['DocNum', 'U_DIVISION', 'U_LOCATION', 'U_COSTCENTRE']}
          toolbarActions={[
            {
              label: syncing ? 'Syncing…' : 'SAP B1 Sync',
              icon: syncing ? '⏳' : '🔄',
              onClick: handleSapSync,
              disabled: syncing,
            },
          ]}
          primaryAction={{ label: '+ New Issue', onClick: () => handleModal('Add') }}
          onView={(record) => handleModal('View', record.DocEntry)}
          onEdit={(record) => handleModal('Edit', record.DocEntry)}
        />
      )}

      <Modal
        open={open}
        onClose={closeModal}
        onSave={handleSave}
        onReset={() => setForm({ ...EMPTY_FORM, lineItems: [{ ...EMPTY_LINE }] })}
        mode={isView ? 'view' : action === 'Add' ? 'add' : 'edit'}
        title={`${action} Goods Issue`}
        subtitle="Fill in all required fields to create a goods issue"
        entity="Goods Issue"
        saveLoading={busy}
        saveDisabled={busy}
        width="1100px"
      >
        <FieldGroup title="General Details" columns={3}>
          <TextField label="Series" name="series" value={form.series} disabled />
          <SelectField label="Division" name="division" value={form.division} onChange={change} options={divisionOptions} placeholder="Select division" required disabled={isView || divisionOptions.length === 1} />
          <SelectField label="Location" name="location" value={form.location} onChange={change} options={locationOptions} placeholder="Select location" required disabled={isView || locationOptions.length === 1} />
          <SelectField label="Reason / Cost Centre" name="costCentre" value={form.costCentre} onChange={change} options={mockCostCentres} placeholder="Select reason" disabled={isView} />
        </FieldGroup>

        <FieldGroup title="Dates & Remarks" columns={3}>
          <DateField label="Posting Date" name="postingDate" value={form.postingDate} onChange={change} required disabled={isView} />
          <TextField label="Remarks" name="remarks" value={form.remarks} onChange={change} placeholder="Optional remarks" disabled={isView} />
          <TextField
            label="Warehouse"
            name="whsName"
            value={form.whsName}
            onChange={change}
            placeholder="Search or enter warehouse"
            required
            disabled={isView}
            suffix={!isView && <SearchIcon onClick={() => setWhsPickerOpen(true)} label="Search warehouses" />}
          />
        </FieldGroup>

        {/* ── Order Lines ──────────────────────────────────────────────────── */}
        <FieldGroup title="Goods Issue Items">
          <div style={{ width: '100%' }}>
            <table className="modal-tbl" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>#</th>
                  <th style={{ textAlign: 'left', width: 220 }}>Item</th>
                  <th style={{ textAlign: 'right', width: 100 }}>Avl. Qty</th>
                  <th style={{ textAlign: 'right', width: 100 }}>Issue Qty</th>
                  <th style={{ textAlign: 'left', width: 80 }}>UOM</th>
                  <th style={{ textAlign: 'left', width: 100 }}>Batch</th>
                  {!isView && <th style={{ width: 50, textAlign: 'center' }}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {form.lineItems.map((line, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                    <td>
                      {isView ? (
                        <span>{line.itemName || line.itemCode || '—'}</span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input
                            type="text"
                            className="modal-input"
                            value={line.itemName}
                            placeholder="Search item…"
                            readOnly
                            style={{ flex: 1, cursor: 'pointer' }}
                            onClick={() => openItemPicker(idx)}
                          />
                          <SearchIcon onClick={() => openItemPicker(idx)} label="Search items" />
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ display: 'block', textAlign: 'right', color: '#666' }}>
                        {line.availableQty ? fmtNum(line.availableQty) : '—'}
                      </span>
                    </td>
                    <td>
                      {isView ? (
                        <span style={{ display: 'block', textAlign: 'right' }}>
                          {line.issueQty ? fmtNum(line.issueQty) : '—'}
                        </span>
                      ) : (
                        <input
                          type="number"
                          className="modal-input"
                          value={line.issueQty}
                          onChange={(e) => handleLineItemChange(idx, 'issueQty', e.target.value)}
                          placeholder="0"
                          style={{ textAlign: 'right' }}
                        />
                      )}
                    </td>
                    <td>
                      <span style={{ display: 'block', textAlign: 'left', color: '#666' }}>
                        {line.uom || '—'}
                      </span>
                    </td>
                    <td>
                      {isView ? (
                        <span style={{ display: 'block', textAlign: 'left' }}>{line.batch || '—'}</span>
                      ) : (
                        <input
                          type="text"
                          className="modal-input"
                          value={line.batch}
                          onChange={(e) => handleLineItemChange(idx, 'batch', e.target.value)}
                          placeholder="Batch"
                          style={{ textAlign: 'left' }}
                        />
                      )}
                    </td>
                    {!isView && (
                      <td style={{ textAlign: 'center' }}>
                        {form.lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(idx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#ef4444',
                              fontSize: 16,
                            }}
                            title="Remove row"
                          >
                            🗑
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700, borderTop: '2px solid var(--modal-group-border, #e2e4e9)' }}>
                  <td colSpan={3} style={{ textAlign: 'right', paddingRight: 12 }}>Totals</td>
                  <td style={{ textAlign: 'right' }}>{computed.totalQty}</td>
                  <td colSpan={2} />
                  {!isView && <td />}
                </tr>
              </tfoot>
            </table>
            {!isView && (
              <button
                type="button"
                onClick={handleAddRow}
                style={{
                  marginTop: 10,
                  padding: '5px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: '1px dashed #0A6ED1',
                  borderRadius: 4,
                  background: 'transparent',
                  color: '#0A6ED1',
                  cursor: 'pointer',
                }}
              >
                + Add Row
              </button>
            )}
          </div>
        </FieldGroup>
      </Modal>

      <RecordPicker
        open={itemPickerOpen}
        onClose={() => setItemPickerOpen(false)}
        records={items}
        codeKey="ItemCode"
        nameKey="ItemName"
        codeLabel="Item Code"
        nameLabel="Item Name"
        title="Select Item"
        subtitle="Choose one item to add to the goods issue"
        emptyText="No items found."
        selectedCode={itemPickerIndex !== null ? form.lineItems[itemPickerIndex]?.itemCode : ''}
        onSelect={handleSelectItem}
      />

      <RecordPicker
        open={whsPickerOpen}
        onClose={() => setWhsPickerOpen(false)}
        records={warehouses}
        codeKey="WarehouseCode"
        nameKey="WarehouseName"
        codeLabel="Warehouse Code"
        nameLabel="Warehouse Name"
        title="Select Warehouse"
        subtitle="Choose the warehouse to issue goods from"
        emptyText="No warehouses found."
        selectedCode={form.whsCode}
        onSelect={handleSelectWarehouse}
      />

      <Loader fullscreen show={busy} label="Please wait…" />
    </>
  );
};

export default AdhocGoodsIssue;
