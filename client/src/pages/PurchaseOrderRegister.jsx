import React, { useState, useMemo, useCallback } from 'react';

import { toast } from 'react-toastify';

import {
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder
} from '../SAPB1/PurchaseOrders/PurchaseOrderRegisterService.js';
import { sapErrorMessage } from '../SAPB1/auth/login.js';

import ListingPage from '../components/ListingTable/ListingPage';
import Modal, { TextField, SelectField, DateField, FieldGroup } from '../components/Modal/Modal';
import Loader from '../components/Loader/Loader.jsx';
import RecordPicker from './CollectMilk/RecordPicker.jsx';

//! Zustand
import useBusinessPartners from '../hooks/useBusinessPartners.js';
import useBusinessPartnerStore from '../store/businessPartnerStore.js';

import useItemMasterHook from '../hooks/useItemMasterHook.js';

import useLoginWiseHook from '../hooks/useLoginWiseHook.js'
import useLoginWiseStore from '../store/loginWiseDataStore.js';

import useWarehouseHook from '../hooks/useWarehouseHook.js';
import useWarehouseStore from '../store/warehouseStore.js';

import usePurchaseOrderRegisterHook from '../hooks/usePurchaseOrderRegisterHook.js';

//! End Zustand

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Placeholder shown until a partner is picked — never a real B1 CardCode.
const CARDCODE_PLACEHOLDER = 'Auto Generated From B1';
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

// ── Empty line item template ──────────────────────────────────────────────────
const EMPTY_LINE = {
  itemCode: '',
  itemName: '',
  unit: '',
  quantity: '',
  unitPrice: '',
  discountPercent: '',
  taxCode: '',
  warehouseCode: '',
  lineTotal: '',
};

const EMPTY_FORM = {
  docentry: '',
  docnum: '',
  division: '',
  location: '',
  cardcode: CARDCODE_PLACEHOLDER,
  cardname: '',
  supplier: '',
  postingDate: getTodayDate(),
  deliveryDate: getTodayDate(),
  documentDate: getTodayDate(),
  whsCode: '',
  whsName: '',
  status: '',
  remarks: '',
  // Derived / read-only
  rcvdQty: '',
  pendQty: '',
  poValue: '',
  receivedAmt: '',
  pendingAmt: '',
  lineItems: [{ ...EMPTY_LINE }],
};

const STATUS_OPTIONS = ['Open', 'Partially Recv.', 'Closed'];

// ── Search icon / button used by the supplier, item and warehouse pickers ────
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

const PurchaseOrderRegister = () => {

  //! zustand
  useBusinessPartners();
  useWarehouseHook();
  useLoginWiseHook();

  const { itemMaster: itemMasterData, refreshItemMaster } = useItemMasterHook();
  const businessPartners = useBusinessPartnerStore((state) => state.businessPartners);
  const warehouses = useWarehouseStore((state) => state.warehouses);
  const loginWiseData = useLoginWiseStore((state) => state.loginWiseData);
  //! End zustand

  //! Custom Hook
  const { purchaseOrders, refreshPurchaseOrders } = usePurchaseOrderRegisterHook();
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

  const apiUoms = useMemo(() => {
    const units = new Set();
    itemMasterData?.forEach((item) => {
      if (item.PurchaseUnit) units.add(item.PurchaseUnit);
    });
    return Array.from(units);
  }, [itemMasterData]);

  const getUnitOptions = useCallback((unit) => {
    return unit && !apiUoms.includes(unit) ? [unit, ...apiUoms] : apiUoms;
  }, [apiUoms]);

  // The store is persisted, so this button is how the user pulls rows created
  // in B1 since the first load.
  const [syncing, setSyncing] = useState(false);
  const handleSapSync = async () => {
    setSyncing(true);
    try {
      await refreshPurchaseOrders();
      toast.success('Synced purchase orders from SAP B1');
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
  const [pickerOpen, setPickerOpen] = useState(false);

  // Which line row asked for the item picker — null means the picker is idle.
  const [itemPickerIndex, setItemPickerIndex] = useState(null);

  const [warehousePickerOpen, setWarehousePickerOpen] = useState(false);

  const isView = action === 'View';

  // Default division / location: if only one option exists, bind it automatically.
  const defaultDivision = divisionOptions.length === 1 ? divisionOptions[0].value : '';
  const defaultLocation = locationOptions.length === 1 ? locationOptions[0].value : '';

  const change = (event) => setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  // ── Supplier picker ─────────────────────────────────────────────────────────
  const handleSelectPartner = (partner) => {
    setForm((prev) => ({
      ...prev,
      cardcode: partner.CardCode,
      cardname: partner.CardName,
      supplier: partner.CardName,
    }));
  };

  // ── Warehouse picker ────────────────────────────────────────────────────────
  const handleSelectWarehouse = (warehouse) => {
    setForm((prev) => ({ ...prev, whsCode: warehouse.WarehouseCode, whsName: warehouse.WarehouseName }));
  };

  // ── Line item handlers

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
      lineItems: prev.lineItems.map((line, lineIndex) => {
        if (lineIndex !== index) return line;
        const updated = { ...line, [field]: value };
        // Line Total always follows qty / price / discount — never hand-typed.
        const quantity = parseFloat(updated.quantity) || 0;
        const unitPrice = parseFloat(updated.unitPrice) || 0;
        const discount = parseFloat(updated.discountPercent) || 0;
        updated.lineTotal = (quantity * unitPrice * (1 - discount / 100)).toFixed(2);
        return updated;
      }),
    }));
  };

  // ── Item picker for line items ──────────────────────────────────────────────

  const handleSelectItem = (item) => {
    if (itemPickerIndex === null) return;
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((line, index) =>
        index === itemPickerIndex ? { ...line, itemCode: item.ItemCode, itemName: item.ItemName, unit: item.PurchaseUnit } : line
      ),
    }));
  };

  // ── Computed totals ─────────────────────────────────────────────────────────

  const computed = useMemo(() => {
    let totalQty = 0;
    let grandTotal = 0;
    form.lineItems.forEach((line) => {
      totalQty += parseFloat(line.quantity) || 0;
      grandTotal += parseFloat(line.lineTotal) || 0;
    });
    return {
      totalQty: totalQty.toLocaleString('en-IN'),
      grandTotal: grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    };
  }, [form.lineItems]);

  // ── Modal open/close ────────────────────────────────────────────────────────

  const handleModal = async (act, docEntry = null) => {
    setAction(act);

    if (act === 'Add') {
      setForm({
        ...EMPTY_FORM,
        postingDate: getTodayDate(),
        deliveryDate: getTodayDate(),
        documentDate: getTodayDate(),
        division: defaultDivision,
        location: defaultLocation,
        lineItems: [{ ...EMPTY_LINE }],
      });
      setOpen(true);
      return;
    }

    setPending((p) => p + 1);
    try {
      const headers = await getPurchaseOrderById(docEntry);
      const allLines = headers.DocumentLines ?? [];

      // Received = ordered − still open, so the whole block falls out of the lines.
      const totalRcvdQty = allLines.reduce((sum, line) => sum + (line.Quantity - (line.RemainingOpenQuantity ?? 0)), 0);
      const totalPendQty = allLines.reduce((sum, line) => sum + (line.RemainingOpenQuantity ?? 0), 0);
      const poValue = headers.DocTotal ?? 0;
      const receivedAmt = allLines.reduce((sum, line) => {
        const received = line.Quantity - (line.RemainingOpenQuantity ?? 0);
        return sum + (received * (line.UnitPrice ?? 0));
      }, 0);
      const pendingAmt = poValue - receivedAmt;

      // Every field below must match the Service Layer schema exactly; a typo
      // reads back as undefined and silently blanks the input.
      setForm({
        ...EMPTY_FORM,
        docentry: headers.DocEntry,
        docnum: headers.DocNum ?? '',
        division: headers.U_DIVISION ?? '',
        location: headers.U_LOCATION ?? '',
        cardcode: headers.CardCode ?? '',
        cardname: headers.CardName ?? '',
        supplier: headers.CardName ?? '',
        postingDate: toSapDate(headers.DocDate) ?? getTodayDate(),
        deliveryDate: toSapDate(headers.DocDueDate) ?? getTodayDate(),
        documentDate: toSapDate(headers.TaxDate) ?? getTodayDate(),
        whsCode: allLines[0]?.WarehouseCode ?? '',
        whsName: warehouses.find((warehouse) => warehouse.WarehouseCode === allLines[0]?.WarehouseCode)?.WarehouseName ?? '',
        status: headers.DocumentStatus === 'bost_Open' ? 'Open' : 'Closed',
        remarks: headers.Comments ?? '',
        rcvdQty: totalRcvdQty,
        pendQty: totalPendQty,
        poValue: poValue,
        receivedAmt: receivedAmt,
        pendingAmt: pendingAmt,
        // Map SAP DocumentLines → our lineItems array
        lineItems: allLines.length > 0
          ? allLines.map((line) => ({
            itemCode: line.ItemCode ?? '',
            itemName: line.ItemDescription ?? '',
            unit: line.MeasureUnit ?? '',
            quantity: line.Quantity ?? '',
            unitPrice: line.UnitPrice ?? '',
            discountPercent: line.DiscountPercent ?? '',
            taxCode: line.TaxCode ?? '',
            warehouseCode: line.WarehouseCode ?? '',
            lineTotal: line.LineTotal ?? '',
          }))
          : [{ ...EMPTY_LINE }],
      });
      setOpen(true);
    } catch (err) {
      toast.error(sapErrorMessage(err, 'Failed to load purchase order'));
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
    if (!form.cardcode || form.cardcode === CARDCODE_PLACEHOLDER) {
      toast.error('Please pick a supplier so the Card Code is bound from SAP.');
      return false;
    }

    // Validate line items — at least one item with valid quantity
    const validLines = form.lineItems.filter((line) => line.itemCode);
    if (validLines.length === 0) {
      toast.error('Please add at least one item.');
      return false;
    }
    for (const line of validLines) {
      const quantity = toNumber(line.quantity);
      if (!quantity || quantity <= 0) {
        toast.error(`Quantity must be greater than zero for item ${line.itemName || line.itemCode}.`);
        return false;
      }
    }

    // Build DocumentLines array
    const lineItems = validLines.map((line, index) =>
      compact({
        LineNum: index,
        ItemCode: line.itemCode,
        ItemDescription: line.itemName,
        MeasureUnit: line.unit || undefined,
        Quantity: toNumber(line.quantity),
        UnitPrice: toNumber(line.unitPrice),
        DiscountPercent: toNumber(line.discountPercent),
        TaxCode: line.taxCode || undefined,
        WarehouseCode: line.warehouseCode || form.whsCode || undefined,
      })
    );

    // Build header payload
    const payload = compact({
      CardCode: form.cardcode,
      DocDate: toSapDate(form.postingDate),
      DocDueDate: toSapDate(form.deliveryDate),
      TaxDate: toSapDate(form.documentDate),
      BPL_IDAssignedToInvoice: DEFAULT_BRANCH,
      U_DIVISION: form.division || undefined,
      U_LOCATION: form.location || undefined,
      Comments: form.remarks || undefined,
      DocumentLines: lineItems,
    });
    setPending((p) => p + 1);
    try {
      if (action === 'Add') {
        await createPurchaseOrder(payload);
      } else {
        await updatePurchaseOrder(form.docentry, payload);
      }
      toast.success(`Purchase Order ${action === 'Add' ? 'created' : 'updated'} successfully`);
      // Refresh first so the closing modal reveals an up-to-date table.
      await refreshPurchaseOrders();
    } catch (err) {
      toast.error(sapErrorMessage(err, `Failed to ${action === 'Add' ? 'create' : 'update'} purchase order`));
      return false;
    } finally {
      setPending((p) => p - 1);
    }
  };

  // ── Stats ───────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    let totalAmount = 0;
    purchaseOrders.forEach((record) => {
      totalAmount += parseFloat(record.DocTotal) || 0;
    });
    return [
      { label: 'Total Purchase Orders', value: purchaseOrders.length, icon: '📋', iconClass: 'blue' },
      {
        label: 'Total Amount',
        value: `₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        icon: '₹',
        iconClass: 'amber',
      },
    ];
  }, [purchaseOrders]);


  // ── Columns ─────────────────────────────────────────────────────────────────

  const columns = [
    { header: 'PO No.', field: 'DocNum', type: 'badge', badgeFn: (value) => ({ variant: 'info', label: value || '—' }) },
    { header: 'Date', field: 'DocDate', type: 'date' },
    { header: 'Division', field: 'U_DIVISION', type: 'text' },
    { header: 'Location', field: 'U_LOCATION', type: 'text' },
    { header: 'Card Code', field: 'CardCode', type: 'text' },
    { header: 'Supplier', field: 'CardName', type: 'text' },
    {
      header: 'PO Value',
      field: 'DocTotal',
      type: 'currency',
    },
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
          title="Purchase Order Register"
          subtitle="Periodic PO / Pending PO — Division + Location filters"
          titleIcon="📋"
          rowData={purchaseOrders}
          columns={columns}
          rowKey="DocEntry"
          stats={stats}
          searchPlaceholder="Search purchase orders…"
          searchFields={['DocNum', 'CardCode', 'CardName', 'U_DIVISION', 'U_LOCATION']}
          toolbarActions={[
            {
              label: syncing ? 'Syncing…' : 'SAP B1 Sync',
              icon: syncing ? '⏳' : '🔄',
              onClick: handleSapSync,
              disabled: syncing,
            },
          ]}
          primaryAction={{ label: '+ Add New', onClick: () => handleModal('Add') }}
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
        title={`${action} Purchase Order`}
        subtitle="Fill in all required fields to record a purchase order"
        entity="Purchase Order"
        saveLoading={busy}
        saveDisabled={busy}
      >
        <FieldGroup title="General Details" columns={3}>
          <SelectField label="Division" name="division" value={form.division} onChange={change} options={divisionOptions} placeholder="Select division" required disabled={isView || divisionOptions.length === 1} />
          <SelectField label="Location" name="location" value={form.location} onChange={change} options={locationOptions} placeholder="Select location" required disabled={isView || locationOptions.length === 1} />
          <TextField
            label="Supplier / Creditor"
            name="supplier"
            value={form.supplier}
            onChange={change}
            placeholder="Search or enter supplier"
            required
            disabled={isView}
            suffix={!isView && <SearchIcon onClick={() => setPickerOpen(true)} label="Search suppliers" />}
          />
        </FieldGroup>

        <FieldGroup title="Main Details" columns={3}>
          <TextField label="CardCode" name="cardcode" value={form.cardcode} onChange={change} disabled />
          <TextField label="CardName" name="cardname" value={form.cardname} onChange={change} required disabled />
          <TextField
            label="Warehouse"
            name="whsName"
            value={form.whsName}
            onChange={change}
            placeholder="Search or enter warehouse"
            required
            disabled={isView}
            suffix={!isView && <SearchIcon onClick={() => setWarehousePickerOpen(true)} label="Search warehouses" />}
          />
        </FieldGroup>

        <FieldGroup title="Dates" columns={3}>
          <DateField label="Posting Date" name="postingDate" value={form.postingDate} onChange={change} required disabled={isView} />
          <DateField label="Delivery Date" name="deliveryDate" value={form.deliveryDate} onChange={change} required disabled={isView} />
          <DateField label="Document Date" name="documentDate" value={form.documentDate} onChange={change} disabled={isView} />
        </FieldGroup>

        <FieldGroup columns={2}>
          <SelectField label="Status" name="status" value={form.status} onChange={change} options={STATUS_OPTIONS} disabled={isView} />
          <TextField label="Remarks" name="remarks" value={form.remarks} onChange={change} placeholder="Optional remarks" disabled={isView} />
        </FieldGroup>

        {/* ── Order Lines ──────────────────────────────────────────────────── */}
        <FieldGroup title="Order Lines">
          <div style={{ width: '100%' }}>
            <table className="modal-tbl" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>#</th>
                  <th style={{ textAlign: 'left' }}>Item</th>
                  <th style={{ textAlign: 'left', width: 90 }}>UOM</th>
                  <th style={{ textAlign: 'right', width: 100 }}>Qty</th>
                  <th style={{ textAlign: 'right', width: 110 }}>Unit Price</th>
                  <th style={{ textAlign: 'right', width: 80 }}>Disc %</th>
                  <th style={{ textAlign: 'right', width: 120 }}>Line Total</th>
                  {!isView && <th style={{ width: 50, textAlign: 'center' }}>Action</th>}
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
                        <span>{line.unit || '—'}</span>
                      ) : (
                        <select
                          className="modal-input"
                          value={line.unit}
                          onChange={(e) => handleLineItemChange(index, 'unit', e.target.value)}
                          style={{ minWidth: 80 }}
                        >
                          <option value="">Select</option>
                          {getUnitOptions(line.unit).map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      {isView ? (
                        <span style={{ display: 'block', textAlign: 'right' }}>{fmtNum(line.quantity)}</span>
                      ) : (
                        <input
                          type="number"
                          className="modal-input"
                          value={line.quantity}
                          onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                          placeholder="0"
                          style={{ textAlign: 'right' }}
                        />
                      )}
                    </td>
                    <td>
                      {isView ? (
                        <span style={{ display: 'block', textAlign: 'right' }}>{fmtNum(line.unitPrice)}</span>
                      ) : (
                        <input
                          type="number"
                          className="modal-input"
                          value={line.unitPrice}
                          onChange={(e) => handleLineItemChange(index, 'unitPrice', e.target.value)}
                          placeholder="0.00"
                          style={{ textAlign: 'right' }}
                        />
                      )}
                    </td>
                    <td>
                      {isView ? (
                        <span style={{ display: 'block', textAlign: 'right' }}>{line.discountPercent || '—'}</span>
                      ) : (
                        <input
                          type="number"
                          className="modal-input"
                          value={line.discountPercent}
                          onChange={(e) => handleLineItemChange(index, 'discountPercent', e.target.value)}
                          placeholder="0"
                          style={{ textAlign: 'right' }}
                        />
                      )}
                    </td>
                    <td>
                      <span style={{ display: 'block', textAlign: 'right', fontWeight: 600 }}>
                        {line.lineTotal ? `₹ ${Number(line.lineTotal).toLocaleString('en-IN')}` : '—'}
                      </span>
                    </td>
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
              <tfoot>
                <tr style={{ fontWeight: 700, borderTop: '2px solid var(--modal-group-border, #e2e4e9)' }}>
                  <td colSpan={3} style={{ textAlign: 'right', paddingRight: 12 }}>Totals</td>
                  <td style={{ textAlign: 'right' }}>{computed.totalQty}</td>
                  <td colSpan={2} />
                  <td style={{ textAlign: 'right' }}>₹ {computed.grandTotal}</td>
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

        {/* Show received/pending details only when viewing or editing an existing PO */}
        {(action === 'View' || action === 'Edit') && (
          <FieldGroup title="Received & Pending" columns={3}>
            <TextField label="Received Qty" name="rcvdQty" value={form.rcvdQty !== '' ? Number(form.rcvdQty).toLocaleString('en-IN') : '—'} disabled />
            <TextField label="Pending Qty" name="pendQty" value={form.pendQty !== '' ? Number(form.pendQty).toLocaleString('en-IN') : '—'} disabled />
            <TextField label="Received Amount (₹)" name="receivedAmt" value={form.receivedAmt !== '' ? `₹ ${Number(form.receivedAmt).toLocaleString('en-IN')}` : '—'} disabled />
            <TextField label="Pending Amount (₹)" name="pendingAmt" value={form.pendingAmt !== '' ? `₹ ${Number(form.pendingAmt).toLocaleString('en-IN')}` : '—'} disabled />
          </FieldGroup>
        )}
      </Modal>

      <RecordPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        records={businessPartners}
        codeKey="CardCode"
        nameKey="CardName"
        codeLabel="Card Code"
        nameLabel="Card Name"
        title="Select Supplier / Business Partner"
        subtitle="Choose one business partner to bind its Card Code & Card Name"
        emptyText="No business partners found."
        selectedCode={form.cardcode}
        onSelect={handleSelectPartner}
      />

      <RecordPicker
        open={itemPickerIndex !== null}
        onClose={() => setItemPickerIndex(null)}
        records={itemMasterData}
        codeKey="ItemCode"
        nameKey="ItemName"
        codeLabel="Item Code"
        nameLabel="Item Name"
        title="Select Product / Item"
        subtitle="Choose one item to add to the order line"
        emptyText="No items found."
        selectedCode={itemPickerIndex !== null ? form.lineItems[itemPickerIndex]?.itemCode : ''}
        onSelect={handleSelectItem}
        onSapSync={refreshItemMaster}
        sapSyncLabel="SAP Sync"
      />

      <RecordPicker
        open={warehousePickerOpen}
        onClose={() => setWarehousePickerOpen(false)}
        records={warehouses}
        codeKey="WarehouseCode"
        nameKey="WarehouseName"
        codeLabel="Warehouse Code"
        nameLabel="Warehouse Name"
        title="Select Warehouse"
        subtitle="Choose one warehouse to bind its code & name"
        emptyText="No warehouses found."
        selectedCode={form.whsCode}
        onSelect={handleSelectWarehouse}
      />

      <Loader fullscreen show={busy} label="Please wait…" />
    </>
  );
};

export default PurchaseOrderRegister;
