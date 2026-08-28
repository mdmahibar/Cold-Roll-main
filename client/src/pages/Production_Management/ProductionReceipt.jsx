//! This is the Production Receipt page — "Receipt from Production" in SAP B1.
//!
//!   POST /InventoryGenEntries   (oInventoryGenEntry, ObjType 59)
//!
//! The finished good comes OUT of WIP and INTO stock. Its other half is
//! ProductionIssue.jsx, where the components went into WIP.
//!
//! ── The base reference is the whole point ─────────────────────────────────
//!
//! This is not a loose goods receipt. The line points back at the production
//! order, and THAT reference is what makes SAP update the order:
//!
//!   BaseType  202                          SAP's object type for a Production Order
//!   BaseEntry ProductionOrder.AbsoluteEntry
//!   (no BaseLine — see below)
//!
//!        → ProductionOrder.CompletedQuantity += Quantity
//!        → every im_Backflush component is consumed automatically, now
//!
//! Post it WITHOUT them and SAP happily accepts it — the stock arrives, the
//! order stays untouched, and the shop floor is left with a production order
//! that never closes.
//!
//! ── Why there is NO BaseLine, and only ONE line ───────────────────────────
//!
//! ProductionOrderLines holds the order's COMPONENTS. The finished good lives
//! on the order HEADER (ItemNo), so there is nothing for BaseLine to point at —
//! BaseEntry alone means "the product of this order". Sending BaseLine: 0 aims
//! the receipt at the first COMPONENT and SAP receives the wrong item.
//!
//! ── The three header quantities the shop floor reads ──────────────────────
//!
//!   Planned Qty   ProductionOrder.PlannedQuantity     what was ordered
//!   Produced Qty  ProductionOrder.CompletedQuantity   what receipts have booked
//!   Pending Qty   Planned − Produced − Rejected       what is still to make
//!
//! ── Batches ───────────────────────────────────────────────────────────────
//!
//! Stock ARRIVES here, so — unlike the issue — there is nothing to allocate
//! FIFO: the batch does not exist yet, THIS document creates it. So it needs a
//! batch NUMBER, and the page generates a unique one per receipt —
//! `Batch-<order>-<YYMMDD>-<HHMMSS>` — rather than letting two runs share one.
//! Without it a batch managed product answers -4014.
//!
//! See PRODUCTION-ISSUE-RECEIPT-FLOW.md next to this file for the full flow.

import React, { useState, useMemo } from 'react';

import { toast } from 'react-toastify';

import ListingPage from '../../components/ListingTable/ListingPage';
import Modal, { TextField, TextareaField, SearchableSelectField, DateField, FieldGroup } from '../../components/Modal/Modal';
import Loader from '../../components/Loader/Loader.jsx';
import RecordPicker from '../CollectMilk/RecordPicker.jsx';

//! Zustand
import useItemMasterHook from '../../hooks/useItemMasterHook.js';
import useWarehouseHook from '../../hooks/useWarehouseHook.js';
import useWarehouseStore from '../../store/warehouseStore.js';
//! End Zustand

//! custom hooks
import useInventoryGenEntryHook from '../../hooks/useInventoryGenEntryHook.js';
// Answers "is this batch managed?" for items the cached master cannot. It holds
// purchase items only, so a finished good produced in-house is NOT in it — and
// reading the flag off a missing row says "no", which is how a batch managed
// product reaches SAP with no BatchNumbers and comes back as -4014.
import useItemMasterInfoHook from '../../hooks/useItemMasterInfoHook.js';
//! End custom hooks

import {
  getAllProductionOrders,
  getProductionOrderById,
} from '../../SAPB1/ProductionOrders/ProductionOrderServices.js';
import {
  getInventoryGenEntryById,
  createInventoryGenEntry,
} from '../../SAPB1/InventoryGenEntries/InventoryGenEntryServices.js';
import { sapErrorMessage } from '../../SAPB1/auth/login.js';
import { uiToSapDate } from '../../common/Function.js';

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

// Quantities are subtracted all over this page — trim the float dust
// 0.1 + 0.2 leaves behind before any of it reaches a comparison or SAP.
const round6 = (value) => Math.round((Number(value) || 0) * 1e6) / 1e6;
const num = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

// Display: '' / null read as "not known here", not as zero.
const show = (value) =>
  value === '' || value === null || value === undefined ? '—' : Number(value).toLocaleString('en-IN');

// SAP field limits — a longer value is rejected outright, not truncated.
const COMMENTS_MAX = 254;
const JOURNAL_MEMO_MAX = 50;
const BATCH_NUMBER_MAX = 36;
const clip = (value, max) => String(value ?? '').slice(0, max);

// B1 assigns DocNum itself, so the field is display-only until the document exists.
const DOCNUM_PLACEHOLDER = 'Auto Generated From B1';

// SAP's object type for a Production Order — see the header comment.
const PRODUCTION_ORDER_OBJECT = 202;

// Every batch this page creates is tagged, so a production batch is obvious
// wherever SAP lists it next to bought-in stock.
const BATCH_PREFIX = 'Batch-';

/**
 * The batch number this receipt creates: `Batch-<order>-<YYMMDD>-<HHMMSS>`.
 *
 * Unique per posting, and still reads back to the order and the moment of the
 * run. B1 exposes no "next batch number" service, so the sequence is built
 * here — and it has to be a SEQUENCE, not just the order number: two receipts
 * against one order would otherwise share a batch, the second silently merging
 * into the first, and the traceability of that production run is gone.
 *
 * Generated once when the order is picked, never at save time, so the number
 * on screen is exactly the number that posts.
 */
const makeBatchNumber = (orderLabel) => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  const stamp =
    `${String(now.getFullYear()).slice(-2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  // The stamp is what makes the number unique, so an over-long order number is
  // what gets trimmed to fit BATCH_NUMBER_MAX — never the stamp itself.
  const room = BATCH_NUMBER_MAX - BATCH_PREFIX.length - stamp.length - 1;
  return `${BATCH_PREFIX}${clip(orderLabel || 'PR', room)}-${stamp}`;
};

const ORDER_STATUS_LABELS = {
  boposPlanned: 'Planned',
  boposReleased: 'Released',
  boposClosed: 'Closed',
  boposCancelled: 'Cancelled',
};

const EMPTY_FORM = {
  // ── the production order this receipt is raised against
  absoluteEntry: '',
  orderNumber: '',
  orderStatus: '',
  itemNo: '',
  productDescription: '',
  inventoryUOM: '',
  // Where the finished good is booked — defaults to the order's own warehouse.
  warehouse: '',
  // ── the three header quantities
  plannedQuantity: 0,
  producedQuantity: 0,
  rejectedQuantity: 0,
  // What this receipt books.
  quantityNow: '',
  // The batch this document CREATES for the finished good.
  receiptBatch: '',
  postingDate: getTodayDate(),
  remarks: '',
  // ── set only when an already-posted receipt is opened
  docEntry: '',
  documentNumber: DOCNUM_PLACEHOLDER,
};

// A posted receipt's own lines, for the View. A new receipt has no line state —
// it is the one finished good in `form`.
const makePostedLine = (lineNumber = 0) => ({
  lineNumber,
  itemNo: '',
  itemName: '',
  warehouse: '',
  uomCode: '',
  quantity: '',
  batches: [],
});

/* ── Icons ──────────────────────────────────────────────────────── */

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

const TickIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8.5l3.2 3.3L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ProductionReceipt = () => {
  //! zustand
  const { itemMaster: itemMasterData } = useItemMasterHook();
  useWarehouseHook();
  const warehouses = useWarehouseStore((state) => state.warehouses);
  //! zustand

  //! Custom Hook — the listing IS the posted goods receipts.
  const { inventoryGenEntries, refreshInventoryGenEntries } = useInventoryGenEntryHook();
  //! End Custom Hook

  const itemByCode = useMemo(() => {
    const map = new Map();
    itemMasterData.forEach((item) => map.set(item.ItemCode, item));
    return map;
  }, [itemMasterData]);

  const [pending, setPending] = useState(0);
  const busy = pending > 0;

  const [open, setOpen] = useState(false);
  const [action, setAction] = useState('Add');
  const [form, setForm] = useState(EMPTY_FORM);
  // Only ever the posted document's lines — a new receipt has none.
  const [lines, setLines] = useState([]);

  const [orderPickerOpen, setOrderPickerOpen] = useState(false);
  const [releasedOrders, setReleasedOrders] = useState([]);

  // Batch / serial flags for the finished good, resolved from the cache OR read
  // on demand. The product is the ONE item this page posts.
  const documentItemCodes = useMemo(
    () => [form.itemNo, ...lines.map((line) => line.itemNo)],
    [form.itemNo, lines]
  );
  const { itemMasterOf, isBatchManaged, isSerialManaged } = useItemMasterInfoHook(
    documentItemCodes,
    itemByCode
  );

  const isView = action === 'View';
  const productIsBatchManaged = isBatchManaged(form.itemNo);

  const change = (event) => setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  // B1 sends UoMCode as -1 on a line whose item has no UoM group, so that is
  // "nothing set", not a code — anything else the line carries is used as is.
  const sapUom = (uomCode) => (!uomCode || Number(uomCode) === -1 ? '' : String(uomCode));
  const lineUom = (line) => sapUom(line.uomCode) || itemMasterOf(line.itemNo)?.InventoryUOM || '';

  const warehouseOptions = useMemo(
    () =>
      warehouses.map((warehouse) => ({
        value: warehouse.WarehouseCode,
        label: `${warehouse.WarehouseCode} — ${warehouse.WarehouseName}`,
      })),
    [warehouses]
  );

  /* ── The derived quantity ───────────────────────────────────────
     Pending is what is still to make. Rejected is subtracted because those
     units were made and scrapped — the order will never produce them again. */
  const pendingQuantity = useMemo(
    () =>
      round6(
        Math.max(num(form.plannedQuantity) - num(form.producedQuantity) - num(form.rejectedQuantity), 0)
      ),
    [form.plannedQuantity, form.producedQuantity, form.rejectedQuantity]
  );

  //! SAP B1 Sync
  const [syncing, setSyncing] = useState(false);
  const handleSapSync = async () => {
    setSyncing(true);
    try {
      await refreshInventoryGenEntries();
      toast.success('Synced production receipts from SAP B1');
    } catch (err) {
      toast.error(sapErrorMessage(err, 'SAP B1 sync failed'));
    } finally {
      setSyncing(false);
    }
  };

  /* ── Released production order picker ───────────────────────── */

  const openOrderPicker = async () => {
    setPending((p) => p + 1);
    try {
      const orders = await getAllProductionOrders();
      // Only a RELEASED order produces. B1 rejects a receipt against a planned
      // order, and a closed one owes nothing.
      setReleasedOrders(orders.filter((order) => order.ProductionOrderStatus === 'boposReleased'));
      setOrderPickerOpen(true);
    } catch (err) {
      toast.error(sapErrorMessage(err, 'Failed to load production orders'));
    } finally {
      setPending((p) => p - 1);
    }
  };

  // The picker row is a listing row — re-fetch so the header carries everything.
  const handleSelectOrder = async (order) => {
    setPending((p) => p + 1);
    try {
      const headers = await getProductionOrderById(order.AbsoluteEntry);
      applyProductionOrder(headers);
    } catch (err) {
      toast.error(sapErrorMessage(err, 'Failed to load production order'));
    } finally {
      setPending((p) => p - 1);
    }
  };

  /* ── Binding ────────────────────────────────────────────────── */

  const applyProductionOrder = (headers) => {
    const planned = num(headers.PlannedQuantity);
    const produced = num(headers.CompletedQuantity);
    const rejected = num(headers.RejectedQuantity);
    // Default to finishing the order — the common case is one click.
    const stillToMake = round6(Math.max(planned - produced - rejected, 0));

    setForm((prev) => ({
      ...prev,
      absoluteEntry: headers.AbsoluteEntry ?? '',
      orderNumber: headers.DocumentNumber ?? '',
      orderStatus: headers.ProductionOrderStatus ?? '',
      itemNo: headers.ItemNo ?? '',
      productDescription: headers.ProductDescription ?? '',
      inventoryUOM: headers.InventoryUOM ?? '',
      warehouse: headers.Warehouse ?? '',
      plannedQuantity: planned,
      producedQuantity: produced,
      rejectedQuantity: rejected,
      quantityNow: stillToMake > 0 ? stillToMake : '',
      // Auto generated, unique to this receipt — see makeBatchNumber().
      receiptBatch: makeBatchNumber(headers.DocumentNumber ?? ''),
    }));
    setLines([]);

    if (stillToMake <= 0) {
      toast.info('This order has nothing pending — receiving more will over-complete it.');
    }
  };

  // A posted receipt, read back. Only a single-document GET carries
  // DocumentLines and their BatchNumbers — the listing $select leaves them out.
  const applyPostedDocument = (headers) => {
    const documentLines = headers.DocumentLines ?? [];
    const first = documentLines[0] ?? {};

    setForm({
      ...EMPTY_FORM,
      docEntry: headers.DocEntry ?? '',
      documentNumber: headers.DocNum ?? DOCNUM_PLACEHOLDER,
      // This is BaseEntry (AbsoluteEntry), not the order's human DocumentNumber.
      absoluteEntry: first.BaseEntry ?? '',
      orderNumber: first.BaseEntry != null ? String(first.BaseEntry) : '',
      itemNo: first.ItemCode ?? '',
      productDescription: first.ItemDescription ?? '',
      warehouse: first.WarehouseCode ?? '',
      quantityNow: num(first.Quantity),
      receiptBatch: (first.BatchNumbers ?? []).map((batch) => batch.BatchNumber).join(', '),
      postingDate: uiToSapDate(headers.DocDate) ?? getTodayDate(),
      remarks: headers.Comments ?? '',
    });

    setLines(
      documentLines.map((item, index) => ({
        ...makePostedLine(item.LineNum ?? index),
        itemNo: item.ItemCode ?? '',
        itemName: item.ItemDescription ?? '',
        warehouse: item.WarehouseCode ?? '',
        uomCode: item.UoMCode ?? '',
        quantity: num(item.Quantity),
        batches: (item.BatchNumbers ?? []).map((batch) => ({
          BatchNumber: batch.BatchNumber,
          Quantity: Number(batch.Quantity) || 0,
        })),
      }))
    );
  };

  /* ── Modal open / close ─────────────────────────────────────── */

  const openAdd = () => {
    setAction('Add');
    setForm({ ...EMPTY_FORM, postingDate: getTodayDate() });
    setLines([]);
    setOpen(true);
  };

  const openView = async (row) => {
    setAction('View');
    setPending((p) => p + 1);
    try {
      const headers = await getInventoryGenEntryById(row.DocEntry);
      applyPostedDocument(headers);
      setOpen(true);
    } catch (err) {
      toast.error(sapErrorMessage(err, 'Failed to load the production receipt'));
    } finally {
      setPending((p) => p - 1);
    }
  };

  const closeModal = () => {
    setOpen(false);
    setForm(EMPTY_FORM);
    setLines([]);
  };

  // Back to what the order itself says — the user's typing is what gets reset,
  // never the order.
  const resetForm = () =>
    setForm((prev) => ({
      ...prev,
      quantityNow: pendingQuantity > 0 ? pendingQuantity : '',
      receiptBatch: makeBatchNumber(prev.orderNumber),
      remarks: '',
    }));

  /* ── Save ───────────────────────────────────────────────────── */

  const handleSave = async () => {
    // Returning false keeps the modal open so the user's work survives.
    if (!form.absoluteEntry) {
      toast.error('Pick the released production order first.');
      return false;
    }
    const quantity = round6(num(form.quantityNow));
    if (!(quantity > 0)) {
      toast.error('Enter the quantity being received from production.');
      return false;
    }
    if (!form.warehouse) {
      toast.error('Receipt Warehouse is mandatory — it takes delivery of the finished goods.');
      return false;
    }
    if (isSerialManaged(form.itemNo)) {
      toast.error(
        `${form.itemNo} is serial managed — serial numbers are not built on this page yet.`
      );
      return false;
    }
    // The product's batch does NOT exist yet — this document creates it, so
    // there is nothing to allocate FIFO. It needs a NUMBER, and without one SAP
    // answers -4014 exactly like a short allocation would.
    const batchNumber = form.receiptBatch?.trim();
    if (productIsBatchManaged && !batchNumber) {
      toast.error(`${form.itemNo} is batch managed — give the batch this receipt creates a number.`);
      return false;
    }
    // SAP allows over-completion, so this is said out loud rather than blocked.
    if (quantity > pendingQuantity) {
      toast.info(
        `Receiving ${quantity} against a pending ${pendingQuantity} — the order will be over-completed.`
      );
    }

    const orderLabel = form.orderNumber || form.absoluteEntry;
    const payload = compact({
      DocDate: uiToSapDate(form.postingDate) ?? getTodayDate(),
      JournalMemo: clip(`Receipt from PO ${orderLabel}`, JOURNAL_MEMO_MAX),
      Comments: clip(
        `Receipt from production order ${orderLabel} · ${form.itemNo}` +
          (batchNumber ? ` · Batch ${batchNumber}` : '') +
          (form.remarks ? ` · ${form.remarks.trim()}` : ''),
        COMMENTS_MAX
      ),
      // ONE line: the finished good. No BaseLine — see the header comment.
      DocumentLines: [
        compact({
          BaseType: PRODUCTION_ORDER_OBJECT,
          BaseEntry: toNumber(form.absoluteEntry),
          Quantity: quantity,
          WarehouseCode: form.warehouse,
          // Omitted entirely for an item that is not batch managed — an empty
          // collection makes B1 complain about the batch setup instead.
          // BaseLineNumber is the index in THIS payload; there is one line.
          BatchNumbers: productIsBatchManaged
            ? [
                {
                  BatchNumber: clip(batchNumber, BATCH_NUMBER_MAX),
                  Quantity: quantity,
                  BaseLineNumber: 0,
                },
              ]
            : undefined,
        }),
      ],
    });

    setPending((p) => p + 1);
    try {
      await createInventoryGenEntry(payload);
      toast.success(`Receipt posted — ${quantity} ${form.itemNo} booked into ${form.warehouse}.`);
      await refreshInventoryGenEntries();
    } catch (err) {
      toast.error(sapErrorMessage(err, 'Failed to post the production receipt'));
      return false;
    } finally {
      setPending((p) => p - 1);
    }
  };

  const handleDelete = () => {
    // A posted goods receipt is a stock movement that already happened — SAP
    // reverses it with a cancellation document, it never deletes it.
    toast.info('A posted production receipt is cancelled in SAP, not deleted here.');
  };

  /* ── Listing config ─────────────────────────────────────────── */

  const columns = [
    { header: 'Doc No', field: 'DocNum', type: 'code', isLink: true },
    { header: 'Doc Date', field: 'DocDate', type: 'date' },
    { header: 'Series', field: 'Series', type: 'text' },
    { header: 'Journal Memo', field: 'JournalMemo', type: 'text' },
    { header: 'Remarks', field: 'Comments', type: 'text' },
  ];

  const today = getTodayDate();
  const thisMonth = today.slice(0, 7);
  // SAP sends DocDate as "YYYY-MM-DD", so a string compare is enough.
  const isToday = (row) => String(row.DocDate ?? '').startsWith(today);
  const isThisMonth = (row) => String(row.DocDate ?? '').startsWith(thisMonth);

  const stats = useMemo(
    () => [
      { label: 'Total Receipts', value: inventoryGenEntries.length, icon: '📥', iconClass: 'blue', filterKey: 'all' },
      {
        label: 'Today',
        value: inventoryGenEntries.filter(isToday).length,
        icon: '📅',
        iconClass: 'amber',
        filterKey: 'today',
      },
      {
        label: 'This Month',
        value: inventoryGenEntries.filter(isThisMonth).length,
        icon: '📦',
        iconClass: 'purple',
        filterKey: 'month',
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inventoryGenEntries]
  );

  const filterChips = [
    { key: 'all', label: 'All', chipClass: 'lp-chip-blue' },
    { key: 'today', label: 'Today', chipClass: 'lp-chip-amber', filterFn: isToday },
    { key: 'month', label: 'This Month', chipClass: 'lp-chip-purple', filterFn: isThisMonth },
  ];

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <>
      {/* The form REPLACES the listing while it is open — the Collect Milk
          pattern. Modal's default variant is "inline", so it renders as a card
          in normal page flow: leaving the table above it would push the form
          below a full screen of rows and read as "the modal opened at the
          bottom". */}
      {!open && (
        <ListingPage
          title="Production Receipt"
          subtitle="Finished goods received into stock against a released production order"
          titleIcon="📥"
          rowData={inventoryGenEntries}
          columns={columns}
          rowKey="DocEntry"
          stats={stats}
          filterChips={filterChips}
          defaultFilter="all"
          searchPlaceholder="Search production receipts…"
          searchFields={['DocNum', 'JournalMemo', 'Comments']}
          defaultSortCol="DocDate"
          primaryAction={{ label: '+ New Production Receipt', onClick: openAdd }}
          // A posted goods receipt is viewed, never edited: SAP refuses a PATCH
          // once inventory has moved.
          onView={openView}
          onDelete={handleDelete}
          toolbarActions={[
            {
              label: syncing ? 'Syncing…' : 'SAP B1 Sync',
              icon: syncing ? '⏳' : '🔄',
              onClick: handleSapSync,
              disabled: syncing,
            },
          ]}
        />
      )}

      <Modal
        open={open}
        onClose={closeModal}
        onSave={handleSave}
        onReset={resetForm}
        mode={isView ? 'view' : 'add'}
        title={isView ? 'View Production Receipt' : 'Receipt from Production'}
        subtitle={
          form.orderNumber
            ? `Production order ${form.orderNumber}${form.itemNo ? ` · ${form.itemNo}` : ''}` +
              (form.orderStatus ? ` · ${ORDER_STATUS_LABELS[form.orderStatus] ?? form.orderStatus}` : '')
            : 'Pick the released production order'
        }
        entity="Production Receipt"
        saveLabel={
          !isView ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <TickIcon /> Post Receipt
            </span>
          ) : undefined
        }
        saveLoading={busy}
        saveDisabled={busy}
      >
        <FieldGroup title="Document" columns={4}>
          <TextField
            label="Production Order"
            name="orderNumber"
            value={form.orderNumber}
            onChange={change}
            placeholder="Search released order"
            hint={isView ? 'BaseEntry this receipt was raised against' : 'Picking an order fills everything below'}
            required
            disabled
            suffix={
              !isView && (
                <button
                  type="button"
                  onClick={openOrderPicker}
                  aria-label="Search released production orders"
                  title="Search released production orders"
                  style={searchButtonStyle}
                >
                  <SearchIcon />
                </button>
              )
            }
          />
          <TextField label="Doc No" name="documentNumber" value={form.documentNumber} onChange={change} disabled />
          <TextField label="Item No" name="itemNo" value={form.itemNo} onChange={change} disabled />
          <TextField
            label="Product Description"
            name="productDescription"
            value={form.productDescription}
            onChange={change}
            disabled
          />
        </FieldGroup>

        <FieldGroup title="Receipt" columns={4}>
          <SearchableSelectField
            label="Receipt Warehouse"
            name="warehouse"
            value={form.warehouse}
            onChange={change}
            options={warehouseOptions}
            placeholder="Search warehouse…"
            hint="Takes delivery — defaults to the order's warehouse"
            required
            disabled={isView}
          />
          <DateField
            label="Posting Date"
            name="postingDate"
            value={form.postingDate}
            onChange={change}
            disabled={isView}
          />
          {/* This receipt CREATES the batch — there is no existing stock to pick
              from, so it is a generated number, not an allocation. */}
          {Boolean(isView ? form.receiptBatch : productIsBatchManaged) && (
            <TextField
              label="Batch Auto Generated"
              name="receiptBatch"
              value={form.receiptBatch}
              onChange={change}
              placeholder="Generated when the order is picked"
              hint={isView ? 'The batch this receipt created' : 'Unique per receipt — order · date · time'}
              disabled
            />
          )}
          <TextField label="UoM" name="inventoryUOM" value={form.inventoryUOM} onChange={change} disabled />
        </FieldGroup>

        {/* The three quantities the shop floor reads, plus the one it types. */}
        {!isView && (
          <FieldGroup title="Quantities" columns={4}>
            <TextField
              label="Planned Qty"
              name="plannedQuantity"
              value={form.plannedQuantity}
              onChange={change}
              hint="What the order asked for"
              disabled
            />
            <TextField
              label="Produced Qty"
              name="producedQuantity"
              value={form.producedQuantity}
              onChange={change}
              hint="Already received from production"
              disabled
            />
            <TextField
              label="Pending Qty"
              name="pendingQuantity"
              value={pendingQuantity}
              onChange={() => {}}
              hint="Planned − Produced − Rejected"
              disabled
            />
            <TextField
              label="Qty To Receive Now"
              name="quantityNow"
              type="number"
              value={form.quantityNow}
              onChange={change}
              placeholder="0"
              hint={
                round6(num(form.quantityNow)) > pendingQuantity
                  ? `⚠️ More than the ${pendingQuantity} still pending`
                  : 'What this receipt books into stock'
              }
              required
            />
          </FieldGroup>
        )}

        <FieldGroup columns={1}>
          <TextareaField
            label="Remarks"
            name="remarks"
            value={form.remarks}
            onChange={change}
            placeholder="Notes for the shop floor…"
            rows={2}
            disabled={isView}
          />
        </FieldGroup>

        {isView ? (
          <div className="modal-field-group">
            <div className="modal-field-group-title">
              Received Lines {lines.length > 0 && `(${lines.length})`}
            </div>
            <div className="modal-tbl-wrap">
              <table className="modal-tbl" style={{ minWidth: 1029, tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={{ width: 44, textAlign: 'center' }}>#</th>
                    <th style={{ width: 165 }}>Item No</th>
                    <th style={{ width: 280 }}>Description</th>
                    <th style={{ width: 120, textAlign: 'right' }}>Quantity</th>
                    <th style={{ width: 180 }}>Batch</th>
                    <th style={{ width: 150 }}>Warehouse</th>
                    <th style={{ width: 90 }}>UoM</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '18px 0', opacity: 0.7 }}>
                        This document has no lines.
                      </td>
                    </tr>
                  )}
                  {lines.map((line, index) => (
                    <tr key={line.lineNumber}>
                      <td className="modal-tbl-idx" style={{ textAlign: 'center' }}>{index + 1}</td>
                      <td><input className="modal-tbl-inp" value={line.itemNo} disabled /></td>
                      <td>
                        <textarea className="modal-tbl-inp modal-tbl-area" value={line.itemName} rows={2} disabled />
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {show(line.quantity)}
                      </td>
                      <td>
                        <input
                          className="modal-tbl-inp"
                          value={
                            line.batches?.length
                              ? line.batches.map((batch) => batch.BatchNumber).join(', ')
                              : '—'
                          }
                          title={
                            line.batches?.length
                              ? line.batches
                                  .map((batch) => `${batch.BatchNumber} × ${batch.Quantity}`)
                                  .join('\n')
                              : 'Not batch managed'
                          }
                          disabled
                        />
                      </td>
                      <td><input className="modal-tbl-inp" value={line.warehouse} disabled /></td>
                      <td><input className="modal-tbl-inp" value={lineUom(line)} disabled /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="modal-field-group">
            <div className="modal-field-group-title">Finished Good</div>
            <div className="modal-tbl-wrap">
              <table className="modal-tbl" style={{ minWidth: 1019, tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={{ width: 44, textAlign: 'center' }}>#</th>
                    <th style={{ width: 165 }}>Item No</th>
                    <th style={{ width: 260 }}>Description</th>
                    <th style={{ width: 110, textAlign: 'right' }}>Planned</th>
                    <th style={{ width: 110, textAlign: 'right' }}>Produced</th>
                    <th style={{ width: 110, textAlign: 'right' }}>Pending</th>
                    <th style={{ width: 130, textAlign: 'right' }}>Receipt Qty</th>
                    <th style={{ width: 90 }}>UoM</th>
                  </tr>
                </thead>
                <tbody>
                  {!form.itemNo ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '18px 0', opacity: 0.7 }}>
                        Pick a released production order to load its product.
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td className="modal-tbl-idx" style={{ textAlign: 'center' }}>1</td>
                      <td><input className="modal-tbl-inp" value={form.itemNo} disabled /></td>
                      <td>
                        <textarea
                          className="modal-tbl-inp modal-tbl-area"
                          value={form.productDescription}
                          rows={2}
                          disabled
                        />
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {show(form.plannedQuantity)}
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {show(form.producedQuantity)}
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {show(pendingQuantity)}
                      </td>
                      {/* Mirrors the header input — one number, two places to type it. */}
                      <td>
                        <input
                          className="modal-tbl-inp"
                          type="number"
                          name="quantityNow"
                          value={form.quantityNow}
                          onChange={change}
                          placeholder="0"
                          style={{
                            textAlign: 'right',
                            // Over-completion is allowed by SAP, so it is flagged, not blocked.
                            color:
                              round6(num(form.quantityNow)) > pendingQuantity
                                ? 'var(--lp-danger, #dc2626)'
                                : undefined,
                          }}
                          title={
                            round6(num(form.quantityNow)) > pendingQuantity
                              ? `More than the ${pendingQuantity} still pending on the order`
                              : undefined
                          }
                        />
                      </td>
                      <td><input className="modal-tbl-inp" value={form.inventoryUOM} disabled /></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      <RecordPicker
        open={orderPickerOpen}
        onClose={() => setOrderPickerOpen(false)}
        records={releasedOrders}
        codeKey="DocumentNumber"
        // Order No repeats across series — AbsoluteEntry is the real identity,
        // and it is what BaseEntry has to carry.
        idKey="AbsoluteEntry"
        nameKey="ProductDescription"
        codeLabel="Order No"
        nameLabel="Description"
        extraColumns={[
          { header: 'Product', field: 'ItemNo' },
          { header: 'Planned', field: 'PlannedQuantity' },
          { header: 'Produced', field: 'CompletedQuantity' },
          { header: 'Warehouse', field: 'Warehouse' },
        ]}
        showSerial
        title="Select Released Production Order"
        subtitle="Only released orders — a planned order cannot produce"
        emptyText="No released production orders found."
        selectedCode={form.absoluteEntry}
        onSelect={handleSelectOrder}
      />

      <Loader fullscreen show={busy} label="Please wait…" />
    </>
  );
};

export default ProductionReceipt;
