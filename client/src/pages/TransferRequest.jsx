import React, { useState, useMemo } from 'react';

import { toast } from 'react-toastify';

import {
  getInventoryTransferRequestById,
  createInventoryTransferRequest,
  updateInventoryTransferRequest
} from '../SAPB1/Inventory/inventoryRequestServices.js';
import { sapErrorMessage } from '../SAPB1/auth/login.js';

import ListingPage from '../components/ListingTable/ListingPage';
import Modal, { TextField, SelectField, DateField, FieldGroup } from '../components/Modal/Modal';
import Loader from '../components/Loader/Loader.jsx';
import RecordPicker from './CollectMilk/RecordPicker.jsx';

//! Zustand
import useItemMasterHook from '../hooks/useItemMasterHook.js';

import useLoginWiseHook from '../hooks/useLoginWiseHook.js'
import useLoginWiseStore from '../store/loginWiseDataStore.js';

import useWarehouseHook from '../hooks/useWarehouseHook.js';
import useWarehouseStore from '../store/warehouseStore.js';

import useInventoryTransferRequestHook from '../hooks/useInventoryTransferRequestHook.js';

//! End Zustand

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Default branch (OBPL). The company runs multi-branch, so B1 rejects a doc without it.
const DEFAULT_BRANCH = 1;

// SAP expects a plain "YYYY-MM-DD"; the Service Layer hands back full ISO stamps.
const toSapDate = (value) => (value ? String(value).slice(0, 10) : undefined);

// Numeric UDFs reject "" — send a real number or omit the field entirely.
const toNumber = (value) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

// Drops keys whose value is undefined so we never POST an empty UDF.
const compact = (object) =>
  Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));

// Read-only display of a numeric cell — blank / non numeric reads as an em dash.
const fmtNum = (value) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed.toLocaleString('en-IN') : '—';
};

const EMPTY_LINE = {
  itemCode: '',
  itemName: '',
  available: '',
  transferQty: '',
  unit: 'KG',
};

const EMPTY_FORM = {
  docentry: '',
  fromDivision: '',
  fromLocation: '',
  toDivision: '',
  toLocation: '',
  fromWarehouse: '',
  fromWhsName: '',
  toWarehouse: '',
  toWhsName: '',
  requestDate: getTodayDate(),
  status: 'Open',
  lineItems: [{ ...EMPTY_LINE }],
};

const STATUS_OPTIONS = ['Open', 'Closed'];

// ── Search icon / button used by the item and warehouse pickers ─────────────
const searchButtonStyle = {
  pointerEvents: 'auto',
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  color: 'inherit',
};

const SearchIcon = ({ onClick, label }) => (
  <button type="button" onClick={onClick} aria-label={label} title={label} style={searchButtonStyle}>
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  </button>
);

const TransferRequest = () => {

  //! zustand
  useWarehouseHook();
  useLoginWiseHook();

  const { itemMaster: itemMasterData, refreshItemMaster } = useItemMasterHook();
  const warehouses = useWarehouseStore((state) => state.warehouses);
  const loginWiseData = useLoginWiseStore((state) => state.loginWiseData);
  //! End zustand

  //! Custom Hook
  const { inventoryTransferRequests, refreshInventoryTransferRequests } = useInventoryTransferRequestHook();
  //! End Custom Hook

  const loginUser = loginWiseData?.data?.[0] ?? null;

  const divisionOptions = useMemo(
    () => (loginUser?.objDivision ?? []).map((division) => ({ value: division.divisionCode, label: division.divisionName })),
    [loginUser]
  );
  const locationOptions = useMemo(
    () => (loginUser?.objLocation ?? []).map((location) => ({ value: location.locationCode, label: location.locationName })),
    [loginUser]
  );

  // The store is persisted, so this button is how the user pulls rows created
  // in B1 since the first load.
  const [syncing, setSyncing] = useState(false);
  const handleSapSync = async () => {
    setSyncing(true);
    try {
      await refreshInventoryTransferRequests();
      toast.success('Synced transfer requests from SAP B1');
    } catch (err) {
      toast.error(sapErrorMessage(err, 'SAP B1 sync failed'));
    } finally {
      setSyncing(false);
    }
  };

  const [pending, setPending] = useState(0);
  const busy = pending > 0;

  const [open, setOpen] = useState(false);
  const [action, setAction] = useState('Add');
  const [form, setForm] = useState(EMPTY_FORM);

  // Which line row asked for the item picker — null means the picker is idle.
  const [itemPickerIndex, setItemPickerIndex] = useState(null);

  const [fromWhsPickerOpen, setFromWhsPickerOpen] = useState(false);
  const [toWhsPickerOpen, setToWhsPickerOpen] = useState(false);

  const isView = action === 'View';

  // Default division / location: if only one option exists, bind it automatically.
  const defaultFromDivision = divisionOptions.length === 1 ? divisionOptions[0].value : '';
  const defaultFromLocation = locationOptions.length === 1 ? locationOptions[0].value : '';

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
      lineItems: prev.lineItems.filter((line, lineIndex) => lineIndex !== index),
    }));
  };

  const handleLineItemChange = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: value } : line
      ),
    }));
  };

  // ── Picker handlers ─────────────────────────────────────────────────────────

  const handleSelectItem = (item) => {
    if (itemPickerIndex === null) return;
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((line, index) =>
        index === itemPickerIndex ? { ...line, itemCode: item.ItemCode, itemName: item.ItemName } : line
      ),
    }));
  };

  const handleSelectFromWarehouse = (warehouse) => {
    setForm((prev) => ({ ...prev, fromWarehouse: warehouse.WarehouseCode, fromWhsName: warehouse.WarehouseName }));
  };

  const handleSelectToWarehouse = (warehouse) => {
    setForm((prev) => ({ ...prev, toWarehouse: warehouse.WarehouseCode, toWhsName: warehouse.WarehouseName }));
  };

  // ── Modal open/close ────────────────────────────────────────────────────────

  const handleModal = async (act, docEntry = null) => {
    setAction(act);

    if (act === 'Add') {
      setForm({
        ...EMPTY_FORM,
        requestDate: getTodayDate(),
        fromDivision: defaultFromDivision,
        fromLocation: defaultFromLocation,
        lineItems: [{ ...EMPTY_LINE }],
      });
      setOpen(true);
      return;
    }

    setPending((p) => p + 1);
    try {
      const headers = await getInventoryTransferRequestById(docEntry);
      const lines = headers.StockTransferLines ?? [];
      // Every field below must match the Service Layer schema exactly; a typo
      // reads back as undefined and silently blanks the input.
      setForm({
        ...EMPTY_FORM,
        docentry: headers.DocEntry,
        fromDivision: headers.U_FROMDIVISION ?? '',
        fromLocation: headers.U_FROMLOCATION ?? '',
        toDivision: headers.U_TODIVISION ?? '',
        toLocation: headers.U_TOLOCATION ?? '',
        fromWarehouse: headers.FromWarehouse ?? '',
        fromWhsName: warehouses.find((warehouse) => warehouse.WarehouseCode === headers.FromWarehouse)?.WarehouseName ?? '',
        toWarehouse: headers.ToWarehouse ?? '',
        toWhsName: warehouses.find((warehouse) => warehouse.WarehouseCode === headers.ToWarehouse)?.WarehouseName ?? '',
        requestDate: toSapDate(headers.DocDate) ?? getTodayDate(),
        status: headers.DocumentStatus === 'bost_Open' ? 'Open' : 'Closed',
        lineItems: lines.length > 0
          ? lines.map((line) => ({
              itemCode: line.ItemCode ?? '',
              itemName: line.ItemDescription ?? '',
              available: '',
              transferQty: line.Quantity ?? '',
              unit: line.MeasureUnit ?? 'KG',
            }))
          : [{ ...EMPTY_LINE }],
      });
      setOpen(true);
    } catch (err) {
      toast.error(sapErrorMessage(err, 'Failed to load transfer request'));
    } finally {
      setPending((p) => p - 1);
    }
  };

  const closeModal = () => {
    setOpen(false);
    setForm({ ...EMPTY_FORM, lineItems: [{ ...EMPTY_LINE }] });
  };

  const resetForm = () => setForm({ ...EMPTY_FORM, lineItems: [{ ...EMPTY_LINE }] });

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    // Returning false keeps the modal open so the user's input survives.
    if (!form.fromDivision) {
      toast.error('Please select a From Division.');
      return false;
    }
    if (!form.toDivision) {
      toast.error('Please select a To Division.');
      return false;
    }
    if (!form.fromWarehouse) {
      toast.error('Please select a From Warehouse.');
      return false;
    }
    if (!form.toWarehouse) {
      toast.error('Please select a To Warehouse.');
      return false;
    }

    // Validate line items
    const validLines = form.lineItems.filter((line) => line.itemCode);
    if (validLines.length === 0) {
      toast.error('Please add at least one item.');
      return false;
    }
    for (const line of validLines) {
      const quantity = toNumber(line.transferQty);
      if (!quantity || quantity <= 0) {
        toast.error(`Transfer Quantity must be greater than zero for item ${line.itemName || line.itemCode}.`);
        return false;
      }
    }

    const lineItems = validLines.map((line, index) =>
      compact({
        LineNum: index,
        ItemCode: line.itemCode,
        ItemDescription: line.itemName,
        Quantity: toNumber(line.transferQty),
        WarehouseCode: form.fromWarehouse || undefined,
      })
    );

    const payload = compact({
      DocDate: toSapDate(form.requestDate),
      DueDate: toSapDate(form.requestDate),
      FromWarehouse: form.fromWarehouse || undefined,
      ToWarehouse: form.toWarehouse || undefined,
      U_FROMDIVISION: form.fromDivision || undefined,
      U_FROMLOCATION: form.fromLocation || undefined,
      U_TODIVISION: form.toDivision || undefined,
      U_TOLOCATION: form.toLocation || undefined,
      BPL_IDAssignedToInvoice: DEFAULT_BRANCH,
      StockTransferLines: lineItems,
    });
    setPending((p) => p + 1);
    try {
      if (action === 'Add') {
        await createInventoryTransferRequest(payload);
      } else {
        await updateInventoryTransferRequest(form.docentry, payload);
      }
      toast.success(`Transfer Request ${action === 'Add' ? 'created' : 'updated'} successfully`);
      // Refresh first so the closing modal reveals an up-to-date table.
      await refreshInventoryTransferRequests();
    } catch (err) {
      toast.error(sapErrorMessage(err, `Failed to ${action === 'Add' ? 'create' : 'update'} transfer request`));
      return false;
    } finally {
      setPending((p) => p - 1);
    }
  };

  // ── Stats ───────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    let openCount = 0;
    let closedCount = 0;
    inventoryTransferRequests.forEach((record) => {
      if (record.DocumentStatus === 'bost_Open') openCount++;
      else closedCount++;
    });
    return [
      { label: 'Total Requests', value: inventoryTransferRequests.length, icon: '🔄', iconClass: 'blue' },
      { label: 'Open', value: openCount, icon: '📂', iconClass: 'amber' },
      { label: 'Closed', value: closedCount, icon: '✅', iconClass: 'green' },
    ];
  }, [inventoryTransferRequests]);

  // ── Columns ─────────────────────────────────────────────────────────────────

  const columns = [
    { header: 'Doc Num', field: 'DocNum', type: 'badge', badgeFn: (value) => ({ variant: 'info', label: value || '—' }) },
    { header: 'Date', field: 'DocDate', type: 'date' },
    { header: 'From Warehouse', field: 'FromWarehouse', type: 'text' },
    { header: 'To Warehouse', field: 'ToWarehouse', type: 'text' },
    {
      header: 'Status',
      field: 'DocumentStatus',
      type: 'badge',
      badgeFn: (value) => {
        if (value === 'bost_Open') return { variant: 'warning', label: 'Open', dot: true };
        if (value === 'bost_Close') return { variant: 'success', label: 'Closed', dot: true };
        return { variant: 'neutral', label: value || '—' };
      },
    },
  ];

  return (
    <>
      {!open && (
        <ListingPage
          title="Inventory Transfer Request"
          subtitle="Milk Division → Ice Cream Division · Division mandatory"
          titleIcon="🔄"
          rowData={inventoryTransferRequests}
          columns={columns}
          rowKey="DocEntry"
          stats={stats}
          searchPlaceholder="Search transfer requests…"
          searchFields={['DocNum', 'FromWarehouse', 'ToWarehouse']}
          toolbarActions={[
            {
              label: syncing ? 'Syncing…' : 'SAP B1 Sync',
              icon: syncing ? '⏳' : '🔄',
              onClick: handleSapSync,
              disabled: syncing,
            },
          ]}
          primaryAction={{ label: '+ New Request', onClick: () => handleModal('Add') }}
          onView={(record) => handleModal('View', record.DocEntry)}
          onEdit={(record) => handleModal('Edit', record.DocEntry)}
        />
      )}

      <Modal
        open={open}
        onClose={closeModal}
        onSave={handleSave}
        onReset={resetForm}
        mode={isView ? 'view' : action === 'Add' ? 'add' : 'edit'}
        title={`${action} Transfer Request`}
        subtitle="Fill in all required fields to create an inventory transfer request"
        entity="Transfer Request"
        saveLoading={busy}
        saveDisabled={busy}
      >
        <FieldGroup title="General Details" columns={4}>
          <SelectField label="From Division" name="fromDivision" value={form.fromDivision} onChange={change} options={divisionOptions} placeholder="Select division" required disabled={isView} />
          <SelectField label="From Location" name="fromLocation" value={form.fromLocation} onChange={change} options={locationOptions} placeholder="Select location" disabled={isView} />
          <SelectField label="To Division" name="toDivision" value={form.toDivision} onChange={change} options={divisionOptions} placeholder="Select division" required disabled={isView} />
          <SelectField label="To Location" name="toLocation" value={form.toLocation} onChange={change} options={locationOptions} placeholder="Select location" disabled={isView} />
        </FieldGroup>

        <FieldGroup title="Warehouse Details" columns={2}>
          <TextField
            label="From Warehouse"
            name="fromWhsName"
            value={form.fromWhsName}
            onChange={change}
            placeholder="Search or enter warehouse"
            required
            disabled={isView}
            suffix={!isView && <SearchIcon onClick={() => setFromWhsPickerOpen(true)} label="Search warehouses" />}
          />
          <TextField
            label="To Warehouse"
            name="toWhsName"
            value={form.toWhsName}
            onChange={change}
            placeholder="Search or enter warehouse"
            required
            disabled={isView}
            suffix={!isView && <SearchIcon onClick={() => setToWhsPickerOpen(true)} label="Search warehouses" />}
          />
        </FieldGroup>

        <FieldGroup title="Transfer Details" columns={2}>
          <DateField label="Request Date" name="requestDate" value={form.requestDate} onChange={change} required disabled={isView} />
          <SelectField label="Status" name="status" value={form.status} onChange={change} options={STATUS_OPTIONS} disabled={isView} />
        </FieldGroup>

        {/* Line Items Section */}
        <FieldGroup title="Items">
          <div style={{ width: '100%' }}>
            <table className="modal-tbl" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>#</th>
                  <th style={{ textAlign: 'left' }}>Item</th>
                  <th style={{ textAlign: 'right', width: 120 }}>Transfer Qty</th>
                  <th style={{ textAlign: 'left', width: 80 }}>Unit</th>
                  {!isView && <th style={{ width: 60, textAlign: 'center' }}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {form.lineItems.map((line, index) => (
                  <tr key={index}>
                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
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
                            onClick={() => setItemPickerIndex(index)}
                          />
                          <SearchIcon onClick={() => setItemPickerIndex(index)} label="Search items" />
                        </div>
                      )}
                    </td>
                    <td>
                      {isView ? (
                        <span style={{ display: 'block', textAlign: 'right' }}>{fmtNum(line.transferQty)}</span>
                      ) : (
                        <input
                          type="number"
                          className="modal-input"
                          value={line.transferQty}
                          onChange={(e) => handleLineItemChange(index, 'transferQty', e.target.value)}
                          placeholder="0"
                          style={{ textAlign: 'right' }}
                        />
                      )}
                    </td>
                    <td>{line.unit || 'KG'}</td>
                    {!isView && (
                      <td style={{ textAlign: 'center' }}>
                        {form.lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(index)}
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
        open={itemPickerIndex !== null}
        onClose={() => setItemPickerIndex(null)}
        records={itemMasterData}
        codeKey="ItemCode"
        nameKey="ItemName"
        codeLabel="Item Code"
        nameLabel="Item Name"
        title="Select Item"
        subtitle="Choose one item to add to the transfer request"
        emptyText="No items found."
        selectedCode={itemPickerIndex !== null ? form.lineItems[itemPickerIndex]?.itemCode : ''}
        onSelect={handleSelectItem}
        onSapSync={refreshItemMaster}
        sapSyncLabel="SAP Sync"
      />

      <RecordPicker
        open={fromWhsPickerOpen}
        onClose={() => setFromWhsPickerOpen(false)}
        records={warehouses}
        codeKey="WarehouseCode"
        nameKey="WarehouseName"
        codeLabel="Warehouse Code"
        nameLabel="Warehouse Name"
        title="Select From Warehouse"
        subtitle="Choose the source warehouse"
        emptyText="No warehouses found."
        selectedCode={form.fromWarehouse}
        onSelect={handleSelectFromWarehouse}
      />

      <RecordPicker
        open={toWhsPickerOpen}
        onClose={() => setToWhsPickerOpen(false)}
        records={warehouses}
        codeKey="WarehouseCode"
        nameKey="WarehouseName"
        codeLabel="Warehouse Code"
        nameLabel="Warehouse Name"
        title="Select To Warehouse"
        subtitle="Choose the destination warehouse"
        emptyText="No warehouses found."
        selectedCode={form.toWarehouse}
        onSelect={handleSelectToWarehouse}
      />

      <Loader fullscreen show={busy} label="Please wait…" />
    </>
  );
};

export default TransferRequest;
