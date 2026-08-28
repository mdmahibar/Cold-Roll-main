import React, { useState, useMemo } from 'react';

import { toast } from 'react-toastify';

import ListingPage from '../../components/ListingTable/ListingPage';
import Modal, { TextField, TextareaField, SelectField, DateField, FieldGroup } from '../../components/Modal/Modal';
import Loader from '../../components/Loader/Loader.jsx';
import RecordPicker from '../CollectMilk/RecordPicker.jsx';

//! Zustand
import useItemMasterHook from '../../hooks/useItemMasterHook.js';
import useWarehouseHook from '../../hooks/useWarehouseHook.js';
import useWarehouseStore from '../../store/warehouseStore.js';
import useLoginWiseHook from '../../hooks/useLoginWiseHook.js';
import useLoginWiseStore from '../../store/loginWiseDataStore.js';
//! End Zustand

import { sapErrorMessage } from '../../SAPB1/auth/login.js';
import { uiToSapDate } from '../../common/Function.js';

/* ── SAP B1 wiring (plug in later) ──────────────────────────────
   Create src/SAPB1/ProductionReceive/ProductionReceiveServices.js with
   getAllProductionReceives / getProductionReceiveById / createProductionReceive /
   updateProductionReceive, then a store + hook, and swap the four stubs below.
──────────────────────────────────────────────────────────────── */

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Numeric fields reject "" — send a real number or omit the field entirely.
const toNumber = (value) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

// Drops keys whose value is undefined so we never POST an empty field.
const compact = (object) =>
  Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));

// B1 assigns DocNum itself, so the field is display-only until the receipt exists.
const DOCNUM_PLACEHOLDER = 'Auto Generated From B1';

const UNIT_OPTIONS = ['KG', 'LTR', 'NOS', 'PCS', 'PAC', 'BOX'];

// B1 can return any UoM code (PCS, MT, ROLL…). A <select> drops a value that has
// no matching <option>, so always keep the incoming unit in the list.
const unitOptions = (unit) =>
  unit && !UNIT_OPTIONS.includes(unit) ? [unit, ...UNIT_OPTIONS] : UNIT_OPTIONS;

const SHIFT_OPTIONS = ['Shift A', 'Shift B', 'Shift C'];
const STATUS_OPTIONS = ['Draft', 'Received', 'Closed'];

// A receipt always carries at least one line, so the first row is created with
// the form and can never be removed.
//
// `lineNum` is both the React key and B1's line identity — 0,1,2… by position,
// which is exactly how the Service Layer numbers lines. Rows are renumbered on
// every add/remove so the array index and lineNum never drift apart.
const makeEmptyLine = (lineNum = 0) => ({
  lineNum,
  itemCode: '',
  description: '',
  unit: 'KG',
  orderQty: '',
  receiveQty: '',
  warehouse: '',
  batchNo: '',
  remarks: '',
});

const EMPTY_FORM = {
  docEntry: '',
  docNum: DOCNUM_PLACEHOLDER,
  status: 'Draft',
  docDate: getTodayDate(),
  division: '',
  location: '',
  productionOrder: '',
  productionItem: '',
  warehouse: '',
  shift: 'Shift A',
  remarks: '',
};

/* ── Search icon / button used by the order + item pickers ───── */

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

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const ProductionReceive = () => {
  //! zustand
  const { itemMaster: itemMasterData, refreshItemMaster } = useItemMasterHook();
  useWarehouseHook();
  useLoginWiseHook();

  const warehouses = useWarehouseStore((state) => state.warehouses);
  const loginWiseData = useLoginWiseStore((state) => state.loginWiseData);
  const loginUser = loginWiseData?.data?.[0] ?? null;

  const divisionOptions = useMemo(
    () => (loginUser?.objDivision ?? []).map((division) => ({ value: division.divisionCode, label: division.divisionName })),
    [loginUser]
  );
  const locationOptions = useMemo(
    () => (loginUser?.objLocation ?? []).map((location) => ({ value: location.locationCode, label: location.locationName })),
    [loginUser]
  );
  const warehouseOptions = useMemo(
    () => warehouses.map((warehouse) => ({ value: warehouse.WarehouseCode, label: `${warehouse.WarehouseCode} — ${warehouse.WarehouseName}` })),
    [warehouses]
  );
  //! zustand

  // TODO(SAP B1): replace with useProductionReceiveHook() so the listing reads
  // straight from the store and refresh() after a save reaches the table.
  const [receives, setReceives] = useState([]);
  const refreshProductionReceives = async () => {
    try {
      // TODO(SAP B1): const list = await getAllProductionReceives();
      const list = [];
      setReceives(list);
    } catch (err) {
      toast.error(sapErrorMessage(err, 'Failed to load production receives'));
    }
  };

  const [pending, setPending] = useState(0);
  const busy = pending > 0;

  const [open, setOpen] = useState(false);
  const [action, setAction] = useState('Add');
  const [form, setForm] = useState(EMPTY_FORM);
  const [lines, setLines] = useState([makeEmptyLine()]);

  // Which line row asked for the item picker — null means the picker is idle.
  const [itemPickerLineId, setItemPickerLineId] = useState(null);
  const [orderPickerOpen, setOrderPickerOpen] = useState(false);

  const isView = action === 'View';

  // Default division / location / warehouse: if only one option exists, bind it.
  const defaultDivision = divisionOptions.length === 1 ? divisionOptions[0].value : '';
  const defaultLocation = locationOptions.length === 1 ? locationOptions[0].value : '';

  const change = (event) => setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  /* ── Line items ─────────────────────────────────────────────── */

  const addLine = () => setLines((prev) => [...prev, makeEmptyLine(prev.length)]);

  const removeLine = (lineNum) => {
    // The first row is the document itself — B1 rejects a receipt with zero lines.
    if (lines.length <= 1) {
      toast.info('At least one line item is required.');
      return;
    }
    setLines((prev) =>
      prev
        .filter((line) => line.lineNum !== lineNum)
        .map((line, index) => ({ ...line, lineNum: index }))
    );
  };

  const updateLine = (lineNum, field, value) =>
    setLines((prev) =>
      prev.map((line) => (line.lineNum === lineNum ? { ...line, [field]: value } : line))
    );

  // The picker is multi-select, so it hands back an array. The first pick binds
  // to the row that opened it and every other pick becomes a new row.
  const handleSelectItem = (selection) => {
    if (itemPickerLineId === null) return;
    const items = Array.isArray(selection) ? selection : [selection];
    if (items.length === 0) return;

    const [first, ...rest] = items;

    setLines((prev) => {
      const updated = prev.map((line) =>
        line.lineNum === itemPickerLineId
          ? { ...line, itemCode: first.ItemCode, description: first.ItemName, warehouse: line.warehouse || form.warehouse }
          : line
      );
      const added = rest.map((item) => ({
        ...makeEmptyLine(),
        itemCode: item.ItemCode,
        description: item.ItemName,
        warehouse: form.warehouse,
      }));
      // Renumber so lineNum stays in step with the array index.
      return [...updated, ...added].map((line, index) => ({ ...line, lineNum: index }));
    });

    setItemPickerLineId(null);
  };

  // Pre-check the item already sitting on the row that opened the picker.
  const itemPickerSelectedCodes = useMemo(() => {
    const current = lines.find((line) => line.lineNum === itemPickerLineId)?.itemCode;
    return current ? [current] : [];
  }, [lines, itemPickerLineId]);

  // TODO(SAP B1): feed this from GET /ProductionOrders and pull its lines in as
  // the receipt lines (BaseEntry / BaseLine) once the service file exists.
  const handleSelectOrder = (order) => {
    setForm((prev) => ({
      ...prev,
      productionOrder: order.DocNum ?? order.AbsoluteEntry ?? '',
      productionItem: order.ItemNo ?? order.ProductDescription ?? '',
    }));
    setOrderPickerOpen(false);
  };

  const totalReceived = useMemo(
    () => lines.reduce((sum, line) => sum + (parseFloat(line.receiveQty) || 0), 0),
    [lines]
  );

  /* ── Modal open / close / save ──────────────────────────────── */

  const handleModal = async (act, docEntry = null) => {
    setAction(act);

    if (act === 'Add') {
      setForm({
        ...EMPTY_FORM,
        docDate: getTodayDate(),
        division: defaultDivision,
        location: defaultLocation,
      });
      setLines([makeEmptyLine()]);
      setOpen(true);
      return;
    }

    setPending((p) => p + 1);
    try {
      // TODO(SAP B1): const headers = await getProductionReceiveById(docEntry);
      const headers = receives.find((record) => record.DocEntry === docEntry) ?? {};
      const lineItems = headers.DocumentLines ?? [];

      setForm({
        ...EMPTY_FORM,
        docEntry: headers.DocEntry ?? '',
        docNum: headers.DocNum ?? DOCNUM_PLACEHOLDER,
        status: headers.DocumentStatus ?? 'Draft',
        docDate: uiToSapDate(headers.DocDate) ?? getTodayDate(),
        division: headers.U_DIVISION ?? '',
        location: headers.U_LOCATION ?? '',
        productionOrder: headers.U_PRODORDER ?? '',
        productionItem: headers.U_PRODITEM ?? '',
        warehouse: headers.U_WHS ?? '',
        shift: headers.U_SHIFT ?? 'Shift A',
        remarks: headers.Comments ?? '',
      });

      const mappedLines = lineItems.map((item, index) => ({
        // Carrying LineNum back is what makes the PATCH update this line
        // instead of inserting a duplicate.
        lineNum: item.LineNum ?? index,
        itemCode: item.ItemCode ?? '',
        description: item.ItemDescription ?? '',
        unit: item.MeasureUnit ?? 'KG',
        orderQty: item.PlannedQuantity ?? '',
        receiveQty: item.Quantity ?? '',
        warehouse: item.WarehouseCode ?? '',
        batchNo: item.U_BATCHNO ?? '',
        remarks: item.FreeText ?? '',
      }));
      setLines(mappedLines.length ? mappedLines : [makeEmptyLine()]);

      setOpen(true);
    } catch (err) {
      toast.error(sapErrorMessage(err, 'Failed to load production receive'));
    } finally {
      setPending((p) => p - 1);
    }
  };

  const closeModal = () => {
    setOpen(false);
    setForm(EMPTY_FORM);
    setLines([makeEmptyLine()]);
  };

  const resetForm = () => {
    setForm({
      ...EMPTY_FORM,
      docNum: form.docNum,
      docDate: getTodayDate(),
      division: defaultDivision,
      location: defaultLocation,
    });
    setLines([makeEmptyLine()]);
  };

  const handleSave = async () => {
    // Returning false keeps the modal open so the user's input survives.
    if (!form.division) {
      toast.error('Division is mandatory.');
      return false;
    }
    if (!form.location) {
      toast.error('Location is mandatory.');
      return false;
    }
    if (!form.productionOrder) {
      toast.error('Please pick a production order.');
      return false;
    }

    const docDate = uiToSapDate(form.docDate);
    if (!docDate) {
      toast.error('Receive Date is mandatory.');
      return false;
    }

    const filledLines = lines.filter((line) => line.itemCode || line.description);
    if (filledLines.length === 0) {
      toast.error('Add at least one line item.');
      return false;
    }
    const badQty = filledLines.find((line) => !(parseFloat(line.receiveQty) > 0));
    if (badQty) {
      toast.error('Every line item needs a receive quantity greater than zero.');
      return false;
    }
    const missingWarehouse = filledLines.find((line) => !(line.warehouse || form.warehouse));
    if (missingWarehouse) {
      toast.error('Every line item needs a warehouse.');
      return false;
    }

    // Send the FULL line array every time — a line left out of a PATCH is
    // deleted by the Service Layer.
    const documentLines = filledLines.map((line, index) =>
      compact({
        // Number by position after the blank rows are dropped, so the array the
        // Service Layer receives is always a gapless 0,1,2… sequence.
        LineNum: index,
        ItemCode: line.itemCode || undefined,
        ItemDescription: line.description || undefined,
        MeasureUnit: line.unit || undefined,
        Quantity: toNumber(line.receiveQty),
        PlannedQuantity: toNumber(line.orderQty),
        WarehouseCode: line.warehouse || form.warehouse || undefined,
        U_BATCHNO: line.batchNo || undefined,
        FreeText: line.remarks || undefined,
      })
    );

    const payload = compact({
      DocDate: docDate,
      DueDate: docDate,
      Comments: form.remarks || undefined,
      U_DIVISION: form.division || undefined,
      U_LOCATION: form.location || undefined,
      U_PRODORDER: form.productionOrder || undefined,
      U_PRODITEM: form.productionItem || undefined,
      U_WHS: form.warehouse || undefined,
      U_SHIFT: form.shift || undefined,
      DocumentLines: documentLines,
    });

    setPending((p) => p + 1);
    try {
      if (action === 'Add') {
        // TODO(SAP B1): await createProductionReceive(payload);
        console.log('createProductionReceive payload', payload);
      } else {
        // TODO(SAP B1): await updateProductionReceive(form.docEntry, payload);
        console.log('updateProductionReceive payload', form.docEntry, payload);
      }
      toast.success(`Production receive ${action === 'Add' ? 'created' : 'updated'} successfully`);
      refreshProductionReceives();
    } catch (err) {
      toast.error(sapErrorMessage(err, `Failed to ${action === 'Add' ? 'create' : 'update'} production receive`));
      return false;
    } finally {
      setPending((p) => p - 1);
    }
  };

  const handleDelete = () => {
    // TODO(SAP B1): cancel the receipt via deleteProductionReceive().
    toast.info('Deleting a production receive is not enabled yet.');
  };

  /* ── Listing config ─────────────────────────────────────────── */

  const columns = [
    { header: 'Doc Num', field: 'DocNum', type: 'code', isLink: true },
    { header: 'Receive Date', field: 'DocDate', type: 'date' },
    { header: 'Prod. Order', field: 'U_PRODORDER', type: 'text' },
    { header: 'Division', field: 'U_DIVISION', type: 'text' },
    { header: 'Location', field: 'U_LOCATION', type: 'text' },
    { header: 'Shift', field: 'U_SHIFT', type: 'text' },
    { header: 'Qty', field: 'U_TOTALQTY', type: 'number' },
    { header: 'Status', field: 'DocumentStatus', type: 'text' },
  ];

  const stats = useMemo(
    () => [
      { label: 'Total Receives', value: receives.length, icon: '📥', iconClass: 'blue', filterKey: 'all' },
      {
        label: 'Draft',
        value: receives.filter((record) => record.DocumentStatus === 'Draft').length,
        icon: '📝',
        iconClass: 'amber',
        filterKey: 'draft',
      },
      {
        label: 'Received',
        value: receives.filter((record) => record.DocumentStatus === 'Received').length,
        icon: '✅',
        iconClass: 'green',
        filterKey: 'received',
      },
      {
        label: 'Closed',
        value: receives.filter((record) => record.DocumentStatus === 'Closed').length,
        icon: '🔒',
        iconClass: 'purple',
        filterKey: 'closed',
      },
    ],
    [receives]
  );

  const filterChips = [
    { key: 'all', label: 'All', chipClass: 'lp-chip-blue' },
    { key: 'draft', label: 'Draft', chipClass: 'lp-chip-amber', filterFn: (row) => row.DocumentStatus === 'Draft' },
    { key: 'received', label: 'Received', chipClass: 'lp-chip-green', filterFn: (row) => row.DocumentStatus === 'Received' },
    { key: 'closed', label: 'Closed', chipClass: 'lp-chip-purple', filterFn: (row) => row.DocumentStatus === 'Closed' },
  ];

  return (
    <>
      {/* The form REPLACES the listing while it is open — the Collect Milk
          pattern. Modal's default variant is "inline", so it renders as a card
          in normal page flow: leaving the table above it would push the form
          below a full screen of rows and read as "the modal opened at the
          bottom". */}
      {!open && (
        <ListingPage
          title="Production Receive"
          subtitle="Receive finished goods from a production order into stock"
          titleIcon="📥"
          rowData={receives}
          columns={columns}
          rowKey="DocEntry"
          stats={stats}
          filterChips={filterChips}
          defaultFilter="all"
          searchPlaceholder="Search production receives…"
          searchFields={['DocNum', 'U_PRODORDER', 'U_PRODITEM', 'U_DIVISION', 'U_LOCATION', 'U_WHS']}
          defaultSortCol="DocNum"
          primaryAction={{ label: '+ New Receive', onClick: () => handleModal('Add') }}
          onView={(record) => handleModal('View', record.DocEntry)}
          onEdit={(record) => handleModal('Edit', record.DocEntry)}
          onDelete={handleDelete}
        />
      )}

      <Modal
        open={open}
        onClose={closeModal}
        onSave={handleSave}
        onReset={resetForm}
        mode={isView ? 'view' : action === 'Add' ? 'add' : 'edit'}
        title={`${action} Production Receive`}
        subtitle="Division and Location are mandatory — receipts post finished goods into the selected warehouse"
        entity="Production Receive"
        saveLoading={busy}
        saveDisabled={busy}
      >
        <FieldGroup title="Document" columns={4}>
          <TextField label="Doc Num" name="docNum" value={form.docNum} onChange={change} disabled />
          <TextField label="Status" name="status" value={form.status} onChange={change} disabled />
          <DateField
            label="Receive Date"
            name="docDate"
            value={form.docDate}
            onChange={change}
            required
            disabled={isView}
          />
          <SelectField
            label="Shift"
            name="shift"
            value={form.shift}
            onChange={change}
            options={SHIFT_OPTIONS}
            placeholder="Select shift"
            disabled={isView}
          />
        </FieldGroup>

        <FieldGroup title="Production Details" columns={4}>
          <SelectField
            label="Division"
            name="division"
            value={form.division}
            onChange={change}
            options={divisionOptions}
            placeholder="Select division"
            required
            disabled={isView || divisionOptions.length === 1}
          />
          <SelectField
            label="Location"
            name="location"
            value={form.location}
            onChange={change}
            options={locationOptions}
            placeholder="Select location"
            required
            disabled={isView || locationOptions.length === 1}
          />
          <TextField
            label="Production Order"
            name="productionOrder"
            value={form.productionOrder}
            onChange={change}
            placeholder="Search or enter order no"
            required
            disabled={isView}
            suffix={
              !isView && (
                <button
                  type="button"
                  onClick={() => setOrderPickerOpen(true)}
                  aria-label="Search production orders"
                  title="Search production orders"
                  style={searchButtonStyle}
                >
                  <SearchIcon />
                </button>
              )
            }
          />
          <TextField
            label="Production Item"
            name="productionItem"
            value={form.productionItem}
            onChange={change}
            placeholder="Bound from the order"
            disabled
          />
        </FieldGroup>

        <FieldGroup title="Receiving" columns={2}>
          <SelectField
            label="Receiving Warehouse"
            name="warehouse"
            value={form.warehouse}
            onChange={change}
            options={warehouseOptions}
            placeholder="Select warehouse"
            hint="Used as the default for every line that has no warehouse of its own"
            disabled={isView}
          />
          <TextareaField
            label="Remarks"
            name="remarks"
            value={form.remarks}
            onChange={change}
            placeholder="Any note for this receipt…"
            rows={2}
            disabled={isView}
          />
        </FieldGroup>

        <div className="modal-field-group">
          <div className="modal-field-group-title">Line Items</div>

          <div className="modal-tbl-wrap">
            <table className="modal-tbl">
              <thead>
                <tr>
                  <th style={{ width: 46, textAlign: 'center' }}>#</th>
                  <th style={{ width: 170 }}>Item Code</th>
                  {/* No fixed width — description takes whatever the other columns leave. */}
                  <th style={{ minWidth: 240 }}>Description</th>
                  <th style={{ width: 90 }}>Unit</th>
                  <th style={{ width: 95, textAlign: 'right' }}>Order Qty</th>
                  <th style={{ width: 95, textAlign: 'right' }}>Receive Qty</th>
                  <th style={{ width: 150 }}>Warehouse</th>
                  <th style={{ width: 120 }}>Batch No</th>
                  <th style={{ width: 150 }}>Remarks</th>
                  <th style={{ width: 50, textAlign: 'center' }} />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={line.lineNum}>
                    <td className="modal-tbl-idx" style={{ textAlign: 'center' }}>{index + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          className="modal-tbl-inp"
                          value={line.itemCode}
                          onChange={(e) => updateLine(line.lineNum, 'itemCode', e.target.value)}
                          placeholder="Code"
                          disabled={isView}
                        />
                        {!isView && (
                          <button
                            type="button"
                            className="modal-tbl-del"
                            onClick={() => setItemPickerLineId(line.lineNum)}
                            aria-label={`Search item for line ${index + 1}`}
                            title="Search items"
                          >
                            <SearchIcon />
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      {/* Textarea, not input — B1 descriptions are long and must wrap. */}
                      <textarea
                        className="modal-tbl-inp modal-tbl-area"
                        value={line.description}
                        onChange={(e) => updateLine(line.lineNum, 'description', e.target.value)}
                        placeholder="Item description"
                        rows={2}
                        disabled={isView}
                      />
                    </td>
                    <td>
                      <select
                        className="modal-tbl-inp"
                        value={line.unit}
                        onChange={(e) => updateLine(line.lineNum, 'unit', e.target.value)}
                        disabled={isView}
                      >
                        {unitOptions(line.unit).map((unit) => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className="modal-tbl-inp"
                        type="number"
                        value={line.orderQty}
                        onChange={(e) => updateLine(line.lineNum, 'orderQty', e.target.value)}
                        placeholder="0"
                        style={{ textAlign: 'right', minWidth: '60px' }}
                        disabled={isView}
                      />
                    </td>
                    <td>
                      <input
                        className="modal-tbl-inp"
                        type="number"
                        value={line.receiveQty}
                        onChange={(e) => updateLine(line.lineNum, 'receiveQty', e.target.value)}
                        placeholder="0"
                        style={{ textAlign: 'right', minWidth: '60px' }}
                        disabled={isView}
                      />
                    </td>
                    <td>
                      <select
                        className="modal-tbl-inp"
                        value={line.warehouse}
                        onChange={(e) => updateLine(line.lineNum, 'warehouse', e.target.value)}
                        disabled={isView}
                      >
                        <option value="">Default</option>
                        {warehouses.map((warehouse) => (
                          <option key={warehouse.WarehouseCode} value={warehouse.WarehouseCode}>
                            {warehouse.WarehouseCode}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className="modal-tbl-inp"
                        value={line.batchNo}
                        onChange={(e) => updateLine(line.lineNum, 'batchNo', e.target.value)}
                        placeholder="Batch"
                        disabled={isView}
                      />
                    </td>
                    <td>
                      <input
                        className="modal-tbl-inp"
                        value={line.remarks}
                        onChange={(e) => updateLine(line.lineNum, 'remarks', e.target.value)}
                        disabled={isView}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {/* Row 1 is the mandatory line — never removable. */}
                      <button
                        type="button"
                        className="modal-tbl-del"
                        onClick={() => removeLine(line.lineNum)}
                        disabled={isView || lines.length <= 1}
                        aria-label={`Remove line ${index + 1}`}
                        title={lines.length <= 1 ? 'At least one line item is required' : 'Remove line'}
                        style={lines.length <= 1 || isView ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} style={{ textAlign: 'right', fontWeight: 600, padding: '9px 10px' }}>
                    Total Received
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {totalReceived.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                  </td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          </div>

          {!isView && (
            <button type="button" className="modal-tbl-add" onClick={addLine}>
              + Add Row
            </button>
          )}
        </div>
      </Modal>

      <RecordPicker
        open={orderPickerOpen}
        onClose={() => setOrderPickerOpen(false)}
        // TODO(SAP B1): feed from the ProductionOrders store once the hook exists.
        records={[]}
        codeKey="DocNum"
        nameKey="ItemNo"
        codeLabel="Order No"
        nameLabel="Item"
        title="Select Production Order"
        subtitle="Choose the order this receipt posts against"
        emptyText="No production orders loaded yet."
        selectedCode={form.productionOrder}
        onSelect={handleSelectOrder}
      />

      <RecordPicker
        open={itemPickerLineId !== null}
        onClose={() => setItemPickerLineId(null)}
        records={itemMasterData}
        codeKey="ItemCode"
        nameKey="ItemName"
        codeLabel="Item Code"
        nameLabel="Item Name"
        title="Select Item"
        subtitle="Pick one or more items — the first binds to this line, the rest are added as new rows"
        emptyText="No items found."
        isMulti
        selectedCodes={itemPickerSelectedCodes}
        onSelect={handleSelectItem}
        onSapSync={refreshItemMaster}
        sapSyncLabel="SAP Sync"
      />

      <Loader fullscreen show={busy} label="Please wait…" />
    </>
  );
};

export default ProductionReceive;
