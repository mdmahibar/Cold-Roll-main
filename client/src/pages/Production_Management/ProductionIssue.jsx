//! This is the Production Issue page — "Issue for Production" in SAP B1.
//!
//!   POST /InventoryGenExits   (oInventoryGenExit, ObjType 60)
//!
//! Components LEAVE stock and go into WIP. Its other half is ProductionReceipt.jsx,
//! where the finished good comes back out of WIP.
//!
//! ── The base reference is the whole point ─────────────────────────────────
//!
//! This is not a loose goods issue. Every DocumentLine points back at the
//! production order, and THAT reference is what makes SAP update the order:
//!
//!   BaseType  202                        SAP's object type for a Production Order
//!   BaseEntry ProductionOrder.AbsoluteEntry
//!   BaseLine  ProductionOrderLine.LineNumber   ← WHICH component this line consumes
//!
//!        → ProductionOrderLines[BaseLine].IssuedQuantity += Quantity
//!
//! Post the same lines WITHOUT them and SAP happily accepts it — the stock
//! moves, the order stays untouched, and the shop floor is left with a
//! production order that never closes.
//!
//! ── The three header quantities the shop floor reads ──────────────────────
//!
//!   Planned Qty   ProductionOrder.PlannedQuantity     what was ordered
//!   Produced Qty  ProductionOrder.CompletedQuantity   what receipts have booked
//!   Pending Qty   Planned − Produced − Rejected       what is still to make
//!
//! The user types ONE number, "Qty To Produce Now", and every component row is
//! derived from it — never hand-typed:
//!
//!   row Required = ProductionOrderLine.BaseQuantity × Qty To Produce Now
//!   row Open     = ProductionOrderLine.PlannedQuantity − IssuedQuantity
//!
//! BaseQuantity is the BOM ratio "component per ONE unit of product", which is
//! exactly how SAP itself exploded PlannedQuantity onto the lines when the order
//! was created. Re-using it here is what keeps a partial issue proportional.
//!
//! ── Batches ───────────────────────────────────────────────────────────────
//!
//! Stock LEAVES here, so the batches already exist: they are allocated FIFO out
//! of each line's own warehouse, exactly as Store Dispatch does it. There is
//! nothing to click — typing an Issue Qty re-spreads that row's batches, and the
//! Batch column shows the split it landed on. A short allocation is what SAP
//! answers -4014 to, so it is checked before posting.
//!
//! See PRODUCTION-ISSUE-RECEIPT-FLOW.md next to this file for the full flow.

import React, { useState, useMemo, useEffect } from 'react';

import { toast } from 'react-toastify';
import { useCookies } from 'react-cookie';

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
import useInventoryGenExitHook from '../../hooks/useInventoryGenExitHook.js';
// Answers "is this batch managed?" for items the cached master cannot — the
// cache holds purchase items only. Without it a produced component posts with
// no BatchNumbers and SAP answers -4014.
import useItemMasterInfoHook from '../../hooks/useItemMasterInfoHook.js';
//! End custom hooks

import {
  getAllProductionOrders,
  getProductionOrderById,
} from '../../SAPB1/ProductionOrders/ProductionOrderServices.js';
import {
  getInventoryGenExitById,
  createInventoryGenExit,
} from '../../SAPB1/InventoryGenExits/InventoryGenExitServices.js';
import { sapErrorMessage } from '../../SAPB1/auth/login.js';
import { uiToSapDate } from '../../common/Function.js';

//! Batch Handle
// Batch stock comes from the general API (not the Service Layer) — the same
// saved SQL query Store Dispatch reads, already sorted FIFO by InDate.
import { getWarehouseWiseBatchOfItem } from '../../services/Batch.js';
import { AUTH_COOKIE_LIST } from '../../constants/auth.js';
//! End Batch Handle

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

// Quantities are multiplied and subtracted all over this page — trim the float
// dust 0.1 + 0.2 leaves behind before any of it reaches a comparison or SAP.
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
const clip = (value, max) => String(value ?? '').slice(0, max);

// B1 assigns DocNum itself, so the field is display-only until the document exists.
const DOCNUM_PLACEHOLDER = 'Auto Generated From B1';

// SAP's object type for a Production Order — see the header comment.
const PRODUCTION_ORDER_OBJECT = 202;

/* ── Batch allocation ────────────────────────────────────────────
   A line's batch quantities must add up to its Issue Qty exactly, or the line
   must carry no BatchNumbers at all — B1 rejects anything in between with
   -4014. So quantity and allocation are one control: typing a qty re-spreads
   the batches. */

// Batch stock is cached per item + warehouse — a batch number only means
// something for one item in one warehouse. Unlike Store Dispatch (one header
// From Warehouse) every component line here carries its own warehouse, so the
// cache is keyed by the PAIR.
const batchKey = (itemNo, warehouseCode) => JSON.stringify([itemNo, warehouseCode]);

const sumBatches = (batches) =>
  round6((batches ?? []).reduce((total, batch) => total + (Number(batch.Quantity) || 0), 0));

// Spreads the quantity over the warehouse's batches FIFO — getWarehouseWiseBatchOfItem
// hands them over sorted by InDate, so the oldest stock is always consumed first
// and a newer batch is only touched once the older ones are empty.
// Asking for more than the warehouse holds falls short on purpose, so the save
// check can name the difference instead of capping quietly.
const allocateBatches = (stock, quantity) => {
  let remaining = round6(quantity);
  const allocated = [];
  (stock ?? []).forEach((batch) => {
    if (remaining <= 0) return;
    const take = Math.min(remaining, batch.Quantity);
    if (take > 0) {
      allocated.push({ BatchNumber: batch.BatchNum, Quantity: round6(take) });
      remaining = round6(remaining - take);
    }
  });
  return allocated;
};

/* The single warehouse every component row is on, or '' when they differ.
   The header field shows this, so a blank there honestly reads "mixed" — it
   never means "nothing set", which is what the per-line check on save tests. */
const commonWarehouse = (rows) => {
  const distinct = new Set(rows.map((row) => row.warehouse));
  return distinct.size === 1 ? [...distinct][0] : '';
};

const ORDER_STATUS_LABELS = {
  boposPlanned: 'Planned',
  boposReleased: 'Released',
  boposClosed: 'Closed',
  boposCancelled: 'Cancelled',
};

/* A component row. `lineNumber` is the production order line's OWN LineNumber —
   it is posted as BaseLine, so it must never be re-derived from the array index:
   dropping a backflush row would collapse the indexes and issue stock against
   the wrong component. */
const makeEmptyLine = (lineNumber = 0) => ({
  lineNumber,
  itemNo: '',
  itemName: '',
  warehouse: '',
  uomCode: '',
  // BaseQuantity = component needed for ONE unit of the product (the BOM ratio).
  baseQuantity: '',
  // What the whole order needs, and what has already gone out against it.
  plannedQuantity: '',
  issuedQuantity: '',
  // im_Backflush is consumed automatically by the receipt — never issued by hand.
  issueType: 'im_Manual',
  // What THIS document issues for the row.
  quantity: '',
  // [{ BatchNumber, Quantity }] — the current FIFO split of `quantity`.
  batches: [],
});

const EMPTY_FORM = {
  // ── the production order this issue is raised against
  absoluteEntry: '',
  orderNumber: '',
  orderStatus: '',
  itemNo: '',
  productDescription: '',
  inventoryUOM: '',
  // Bulk control, not a posted field: it stamps every component row's
  // warehouse. WarehouseCode is still taken from the ROW when posting.
  warehouse: '',
  // ── the three header quantities
  plannedQuantity: 0,
  producedQuantity: 0,
  rejectedQuantity: 0,
  // The one number the user types; every component row is derived from it.
  quantityNow: '',
  postingDate: getTodayDate(),
  remarks: '',
  // ── set only when an already-posted document is opened
  docEntry: '',
  documentNumber: DOCNUM_PLACEHOLDER,
};

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

const ProductionIssue = () => {
  // Cookie jar the general API reads its auth headers from.
  const [cookies] = useCookies(AUTH_COOKIE_LIST);

  //! zustand
  const { itemMaster: itemMasterData } = useItemMasterHook();
  useWarehouseHook();
  const warehouses = useWarehouseStore((state) => state.warehouses);
  //! zustand

  //! Custom Hook — the listing IS the posted goods issues.
  const { inventoryGenExits, refreshInventoryGenExits } = useInventoryGenExitHook();
  //! End Custom Hook

  // ProductionOrderLines carry only ItemNo — name and UoM come from the master.
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
  // The production order's component lines while adding; the posted document's
  // own lines while viewing.
  const [lines, setLines] = useState([]);

  const [orderPickerOpen, setOrderPickerOpen] = useState(false);
  const [releasedOrders, setReleasedOrders] = useState([]);

  // Batch / serial flags, resolved from the cache OR read one item at a time.
  const documentItemCodes = useMemo(() => lines.map((line) => line.itemNo), [lines]);
  const { itemMasterOf, isBatchManaged, isSerialManaged } = useItemMasterInfoHook(
    documentItemCodes,
    itemByCode
  );

  //! Batch state
  // Batch stock of every batch managed component in ITS OWN warehouse, keyed by
  // item+warehouse. Read up front so typing a quantity allocates without
  // waiting on the network — there is no popup to pick from.
  const [batchStock, setBatchStock] = useState({});
  const [batchLoading, setBatchLoading] = useState(false);

  const isView = action === 'View';

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

  /* ── The derived quantities ─────────────────────────────────────
     Pending is what is still to make. Rejected is subtracted because those
     units were made and scrapped — the order will never produce them again. */
  const pendingQuantity = useMemo(
    () =>
      round6(
        Math.max(num(form.plannedQuantity) - num(form.producedQuantity) - num(form.rejectedQuantity), 0)
      ),
    [form.plannedQuantity, form.producedQuantity, form.rejectedQuantity]
  );

  // im_Backflush components are consumed by the RECEIPT, automatically. Issuing
  // them by hand consumes the same stock twice.
  const isBackflush = (line) => line.issueType === 'im_Backflush';

  // Required for THIS document = the BOM ratio × the quantity being produced.
  const requiredQuantity = (line, quantityNow) => {
    const base = num(line.baseQuantity);
    const header = num(quantityNow);
    if (!(base > 0) || !(header > 0)) return '';
    return round6(base * header);
  };

  // Open = what the whole order still owes on this component.
  const openQuantity = (line) => {
    if (line.plannedQuantity === '' || line.plannedQuantity === null) return '';
    return round6(Math.max(num(line.plannedQuantity) - num(line.issuedQuantity), 0));
  };

  /* ── Batch stock ────────────────────────────────────────────── */

  // A string, not an array, so the fetch below only re-runs when the set of
  // item+warehouse PAIRS really changes — not on every Issue Qty keystroke, and
  // not when the allocation it writes back lands in state.
  const batchPairKey = useMemo(
    () =>
      [
        ...new Set(
          lines
            .filter((line) => line.itemNo && line.warehouse && isBatchManaged(line.itemNo))
            .map((line) => `${line.itemNo}@@${line.warehouse}`)
        ),
      ]
        .sort()
        .join('|'),
    [lines, isBatchManaged]
  );

  // Read every component's batch stock, then spread whatever quantity is
  // already on the row over it. A View shows what was actually posted, so its
  // allocation is left alone.
  useEffect(() => {
    const pairs = batchPairKey ? batchPairKey.split('|') : [];
    if (!open || isView || pairs.length === 0) return undefined;

    let cancelled = false;
    const loadBatchStock = async () => {
      setBatchLoading(true);
      try {
        const parsed = pairs.map((pair) => pair.split('@@'));
        const results = await Promise.all(
          // One bad item must not blank the whole table — it just gets no batches.
          parsed.map(([itemCode, warehouseCode]) =>
            getWarehouseWiseBatchOfItem(itemCode, warehouseCode, cookies).catch(() => [])
          )
        );
        if (cancelled) return;

        const stock = {};
        parsed.forEach(([itemCode, warehouseCode], index) => {
          stock[batchKey(itemCode, warehouseCode)] = results[index];
        });
        setBatchStock(stock);

        setLines((prev) =>
          prev.map((line) => ({
            ...line,
            batches: allocateBatches(stock[batchKey(line.itemNo, line.warehouse)], line.quantity),
          }))
        );
      } finally {
        if (!cancelled) setBatchLoading(false);
      }
    };
    loadBatchStock();

    return () => {
      cancelled = true;
    };
    // `cookies` only carries the auth headers — re-reading on a cookie touch is noise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isView, batchPairKey]);

  const lineBatchStock = (line) => batchStock[batchKey(line.itemNo, line.warehouse)] ?? [];

  // In Stock = what the line's own warehouse actually holds, summed straight
  // from the batch API. Blank for a non-batch item — that figure is not read here.
  const availableQuantity = (line) => {
    const stock = lineBatchStock(line);
    return stock.length ? sumBatches(stock) : '';
  };

  /* ── Editing ────────────────────────────────────────────────── */

  // One number drives the whole table — typing it re-explodes AND re-allocates
  // every row, because quantity and batch split are a single control.
  const changeQuantityNow = (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, quantityNow: value }));
    setLines((prev) =>
      prev.map((line) => {
        if (isBackflush(line)) return { ...line, quantity: '', batches: [] };
        const quantity = requiredQuantity(line, value);
        return {
          ...line,
          quantity,
          batches: allocateBatches(batchStock[batchKey(line.itemNo, line.warehouse)], quantity),
        };
      })
    );
  };

  // Typing a row's own quantity re-spreads that row's batches.
  const updateIssueQuantity = (lineNumber, value) =>
    setLines((prev) =>
      prev.map((line) =>
        line.lineNumber === lineNumber
          ? {
              ...line,
              quantity: value,
              batches: allocateBatches(batchStock[batchKey(line.itemNo, line.warehouse)], value),
            }
          : line
      )
    );

  // A batch number only means something in ONE warehouse — switching the row's
  // warehouse drops its allocation until that warehouse's stock has been read
  // (the effect above refetches and re-allocates).
  const updateLineWarehouse = (lineNumber, value) => {
    const next = lines.map((line) =>
      line.lineNumber === lineNumber ? { ...line, warehouse: value, batches: [] } : line
    );
    setLines(next);
    // The header speaks for the rows only while they still all agree.
    setForm((prev) => ({ ...prev, warehouse: commonWarehouse(next) }));
  };

  // The header warehouse is a bulk control — one store issues the whole BOM in
  // the normal case, so picking it here stamps every row instead of making the
  // user set the same warehouse line by line. A row can still be changed after.
  // Batches are dropped for the same reason a per-row change drops them: a
  // batch number only means something in ONE warehouse.
  const changeIssueWarehouse = (event) => {
    const warehouse = event.target.value;
    setForm((prev) => ({ ...prev, warehouse }));
    // Clearing the field is not "put every row on no warehouse" — it only stops
    // the header claiming to speak for them.
    if (!warehouse) return;
    setLines((prev) => prev.map((line) => ({ ...line, warehouse, batches: [] })));
  };

  //! SAP B1 Sync
  const [syncing, setSyncing] = useState(false);
  const handleSapSync = async () => {
    setSyncing(true);
    try {
      await refreshInventoryGenExits();
      toast.success('Synced production issues from SAP B1');
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
      // Only a RELEASED order consumes. B1 rejects an issue against a planned
      // order, and a closed one owes nothing.
      setReleasedOrders(orders.filter((order) => order.ProductionOrderStatus === 'boposReleased'));
      setOrderPickerOpen(true);
    } catch (err) {
      toast.error(sapErrorMessage(err, 'Failed to load production orders'));
    } finally {
      setPending((p) => p - 1);
    }
  };

  // The picker row carries no lines — re-fetch the order so components come with it.
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
    const orderLines = headers.ProductionOrderLines ?? [];

    const planned = num(headers.PlannedQuantity);
    const produced = num(headers.CompletedQuantity);
    const rejected = num(headers.RejectedQuantity);
    // Default to covering the rest of the order — the common case is one click.
    const stillToMake = round6(Math.max(planned - produced - rejected, 0));

    // Batches are left empty here: the effect above reads the warehouse stock
    // and allocates FIFO as soon as these lines land in state.
    const componentLines = orderLines.map((item, index) => {
      const master = itemByCode.get(item.ItemNo);
      const line = {
        ...makeEmptyLine(item.LineNumber ?? index),
        itemNo: item.ItemNo ?? '',
        itemName: item.ItemName || master?.ItemName || '',
        warehouse: item.Warehouse || master?.DefaultWarehouse || '',
        uomCode: item.UoMCode ?? '',
        baseQuantity: num(item.BaseQuantity),
        plannedQuantity: num(item.PlannedQuantity),
        issuedQuantity: num(item.IssuedQuantity),
        issueType: item.ProductionOrderIssueType ?? 'im_Manual',
      };
      return { ...line, quantity: isBackflush(line) ? '' : requiredQuantity(line, stillToMake) };
    });

    setForm((prev) => ({
      ...prev,
      absoluteEntry: headers.AbsoluteEntry ?? '',
      orderNumber: headers.DocumentNumber ?? '',
      orderStatus: headers.ProductionOrderStatus ?? '',
      itemNo: headers.ItemNo ?? '',
      productDescription: headers.ProductDescription ?? '',
      inventoryUOM: headers.InventoryUOM ?? '',
      plannedQuantity: planned,
      producedQuantity: produced,
      rejectedQuantity: rejected,
      quantityNow: stillToMake > 0 ? stillToMake : '',
      // Open showing what the BOM already agrees on, so the field describes the
      // rows from the start rather than sitting empty next to filled-in rows.
      warehouse: commonWarehouse(componentLines),
    }));

    setLines(componentLines);

    if (orderLines.length === 0) toast.info('This production order has no component lines.');
  };

  // A posted goods issue, read back. Only a single-document GET carries
  // DocumentLines and their BatchNumbers — the listing $select leaves them out.
  const applyPostedDocument = (headers) => {
    const documentLines = headers.DocumentLines ?? [];
    const first = documentLines[0] ?? {};

    const postedLines = documentLines.map((item, index) => ({
      ...makeEmptyLine(item.LineNum ?? index),
      itemNo: item.ItemCode ?? '',
      itemName: item.ItemDescription ?? '',
      warehouse: item.WarehouseCode ?? '',
      uomCode: item.UoMCode ?? '',
      quantity: num(item.Quantity),
      batches: (item.BatchNumbers ?? []).map((batch) => ({
        BatchNumber: batch.BatchNumber,
        Quantity: Number(batch.Quantity) || 0,
      })),
    }));

    setForm({
      ...EMPTY_FORM,
      docEntry: headers.DocEntry ?? '',
      documentNumber: headers.DocNum ?? DOCNUM_PLACEHOLDER,
      // Every line was raised against the same order, so the first one names it.
      // This is BaseEntry (AbsoluteEntry), not the order's human DocumentNumber.
      absoluteEntry: first.BaseEntry ?? '',
      orderNumber: first.BaseEntry != null ? String(first.BaseEntry) : '',
      postingDate: uiToSapDate(headers.DocDate) ?? getTodayDate(),
      remarks: headers.Comments ?? '',
      // What was actually posted — blank when the issue spanned warehouses.
      warehouse: commonWarehouse(postedLines),
    });

    setLines(postedLines);
  };

  /* ── Modal open / close ─────────────────────────────────────── */

  const openAdd = () => {
    setAction('Add');
    setForm({ ...EMPTY_FORM, postingDate: getTodayDate() });
    setLines([]);
    setBatchStock({});
    setOpen(true);
  };

  const openView = async (row) => {
    setAction('View');
    setPending((p) => p + 1);
    try {
      const headers = await getInventoryGenExitById(row.DocEntry);
      applyPostedDocument(headers);
      setOpen(true);
    } catch (err) {
      toast.error(sapErrorMessage(err, 'Failed to load the production issue'));
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
  const resetForm = () => {
    const stillToMake = pendingQuantity;
    setForm((prev) => ({ ...prev, quantityNow: stillToMake > 0 ? stillToMake : '', remarks: '' }));
    setLines((prev) =>
      prev.map((line) => {
        if (isBackflush(line)) return { ...line, quantity: '', batches: [] };
        const quantity = requiredQuantity(line, stillToMake);
        return {
          ...line,
          quantity,
          batches: allocateBatches(batchStock[batchKey(line.itemNo, line.warehouse)], quantity),
        };
      })
    );
  };

  /* ── Save ───────────────────────────────────────────────────── */

  const handleSave = async () => {
    // Returning false keeps the modal open so the user's work survives.
    if (!form.absoluteEntry) {
      toast.error('Pick the released production order first.');
      return false;
    }

    // ONE line per component actually being consumed. BaseLine is the production
    // order line's own LineNumber, never the array index — the backflush and
    // zero rows dropped here would otherwise shift it.
    const issuable = lines.filter((line) => !isBackflush(line) && round6(num(line.quantity)) > 0);
    if (issuable.length === 0) {
      toast.error('Enter an Issue Qty on at least one component line.');
      return false;
    }
    const missingWarehouse = issuable.find((line) => !line.warehouse);
    if (missingWarehouse) {
      toast.error(`Pick the issue warehouse for ${missingWarehouse.itemNo}.`);
      return false;
    }
    const serialLine = issuable.find((line) => isSerialManaged(line.itemNo));
    if (serialLine) {
      toast.error(
        `${serialLine.itemNo} is serial managed — serial numbers are not built on this page yet.`
      );
      return false;
    }
    //! On a batch managed item the allocation must cover the Issue Qty EXACTLY,
    //! or B1 answers -4014 "Cannot add row without complete selection of
    //! batch/serial numbers". A non-managed item is never checked.
    const shortLine = issuable.find(
      (line) => isBatchManaged(line.itemNo) && sumBatches(line.batches) !== round6(num(line.quantity))
    );
    if (shortLine) {
      toast.error(
        `Not enough batch stock for ${shortLine.itemNo} in ${shortLine.warehouse} — ` +
          `${sumBatches(shortLine.batches)} of ${round6(num(shortLine.quantity))} allocated. ` +
          `Lower the Issue Qty or pick a warehouse that holds it.`
      );
      return false;
    }
    // SAP allows over-issue, so this is said out loud rather than blocked.
    const over = issuable.filter(
      (line) => openQuantity(line) !== '' && round6(num(line.quantity)) > openQuantity(line)
    );
    if (over.length > 0) {
      toast.info(
        `${over.length} line(s) issue more than the order still owes — ${over
          .map((line) => line.itemNo)
          .join(', ')}.`
      );
    }

    const orderLabel = form.orderNumber || form.absoluteEntry;
    const payload = compact({
      DocDate: uiToSapDate(form.postingDate) ?? getTodayDate(),
      JournalMemo: clip(`Issue for PO ${orderLabel}`, JOURNAL_MEMO_MAX),
      Comments: clip(
        `Issue for production order ${orderLabel} · ${form.itemNo}` +
          (form.remarks ? ` · ${form.remarks.trim()}` : ''),
        COMMENTS_MAX
      ),
      DocumentLines: issuable.map((line, index) =>
        compact({
          BaseType: PRODUCTION_ORDER_OBJECT,
          BaseEntry: toNumber(form.absoluteEntry),
          BaseLine: line.lineNumber,
          Quantity: round6(num(line.quantity)),
          WarehouseCode: line.warehouse,
          // Omitted entirely for an item that is not batch managed — an empty
          // collection makes B1 complain about the batch setup instead.
          // BaseLineNumber is the index in THIS payload, not the order's line.
          BatchNumbers:
            isBatchManaged(line.itemNo) && line.batches?.length
              ? line.batches.map((batch) => ({
                  BatchNumber: batch.BatchNumber,
                  Quantity: batch.Quantity,
                  BaseLineNumber: index,
                }))
              : undefined,
        })
      ),
    });

    setPending((p) => p + 1);
    try {
      await createInventoryGenExit(payload);
      toast.success(`Issue posted — ${payload.DocumentLines.length} component(s) consumed.`);
      await refreshInventoryGenExits();
    } catch (err) {
      toast.error(sapErrorMessage(err, 'Failed to post the production issue'));
      return false;
    } finally {
      setPending((p) => p - 1);
    }
  };

  const handleDelete = () => {
    // A posted goods issue is a stock movement that already happened — SAP
    // reverses it with a cancellation document, it never deletes it.
    toast.info('A posted production issue is cancelled in SAP, not deleted here.');
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
      { label: 'Total Issues', value: inventoryGenExits.length, icon: '📤', iconClass: 'blue', filterKey: 'all' },
      {
        label: 'Today',
        value: inventoryGenExits.filter(isToday).length,
        icon: '📅',
        iconClass: 'amber',
        filterKey: 'today',
      },
      {
        label: 'This Month',
        value: inventoryGenExits.filter(isThisMonth).length,
        icon: '📦',
        iconClass: 'purple',
        filterKey: 'month',
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inventoryGenExits]
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
          title="Production Issue"
          subtitle="Components consumed from stock against a released production order"
          titleIcon="📤"
          rowData={inventoryGenExits}
          columns={columns}
          rowKey="DocEntry"
          stats={stats}
          filterChips={filterChips}
          defaultFilter="all"
          searchPlaceholder="Search production issues…"
          searchFields={['DocNum', 'JournalMemo', 'Comments']}
          defaultSortCol="DocDate"
          primaryAction={{ label: '+ New Production Issue', onClick: openAdd }}
          // A posted goods issue is viewed, never edited: SAP refuses a PATCH
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
        title={isView ? 'View Production Issue' : 'Issue for Production'}
        subtitle={
          form.orderNumber
            ? `Production order ${form.orderNumber}${form.itemNo ? ` · ${form.itemNo}` : ''}` +
              (form.orderStatus ? ` · ${ORDER_STATUS_LABELS[form.orderStatus] ?? form.orderStatus}` : '')
            : 'Pick the released production order'
        }
        entity="Production Issue"
        saveLabel={
          !isView ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <TickIcon /> Post Issue
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
            hint={isView ? 'BaseEntry this issue was raised against' : 'Picking an order fills everything below'}
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
          <TextField label="Product" name="itemNo" value={form.itemNo} onChange={change} disabled />
          <DateField
            label="Posting Date"
            name="postingDate"
            value={form.postingDate}
            onChange={change}
            disabled={isView}
          />
          {/* Header warehouse — sets every component row at once, the way
              Store Dispatch and Production Receive set theirs. */}
          <SearchableSelectField
            label="Issue Warehouse"
            name="warehouse"
            value={form.warehouse}
            onChange={changeIssueWarehouse}
            options={warehouseOptions}
            placeholder="Search warehouse…"
            hint={
              isView
                ? 'Blank when the issue spanned more than one warehouse'
                : 'Sets every component row — a row can still be changed on its own'
            }
            disabled={isView || lines.length === 0}
          />
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
              label="Qty To Produce Now"
              name="quantityNow"
              type="number"
              value={form.quantityNow}
              onChange={changeQuantityNow}
              placeholder="0"
              hint="Component rows re-explode from this"
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
              Consumed Components {lines.length > 0 && `(${lines.length})`}
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
            <div className="modal-field-group-title">
              Components (from the production order)
              {/* In Stock and the batch allocation both wait on this read. */}
              {batchLoading && <span className="bp-loading">Reading batch stock…</span>}
            </div>
            <div className="modal-tbl-wrap">
              {/* minWidth is the sum of the column widths below — keep it in step. */}
              <table className="modal-tbl" style={{ minWidth: 1439, tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={{ width: 44, textAlign: 'center' }}>#</th>
                    <th style={{ width: 150 }}>Item No</th>
                    <th style={{ width: 220 }}>Description</th>
                    <th style={{ width: 95, textAlign: 'right' }} title="Component per ONE unit of product">
                      Base Qty
                    </th>
                    <th style={{ width: 105, textAlign: 'right' }} title="Base Qty × Qty To Produce Now">
                      Required
                    </th>
                    <th style={{ width: 105, textAlign: 'right' }} title="Already issued against the whole order">
                      Issued
                    </th>
                    <th style={{ width: 95, textAlign: 'right' }} title="Planned − Issued on the order">
                      Open
                    </th>
                    <th style={{ width: 115, textAlign: 'right' }}>Issue Qty</th>
                    <th style={{ width: 150 }} title="Allocated FIFO from this line's warehouse — oldest batch first">
                      Batch
                    </th>
                    <th style={{ width: 105, textAlign: 'right' }} title="Batch stock in this line's warehouse">
                      In Stock
                    </th>
                    <th style={{ width: 85 }}>UoM</th>
                    <th style={{ width: 170 }}>Warehouse</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 && (
                    <tr>
                      <td colSpan={12} style={{ textAlign: 'center', padding: '18px 0', opacity: 0.7 }}>
                        Pick a released production order to load its components.
                      </td>
                    </tr>
                  )}
                  {lines.map((line, index) => {
                    const backflush = isBackflush(line);
                    const open = openQuantity(line);
                    const overIssued = open !== '' && round6(num(line.quantity)) > open;
                    const batched = isBatchManaged(line.itemNo);
                    // A batch managed row whose allocation does not cover the
                    // quantity is exactly what SAP answers -4014 to.
                    const shortBatches =
                      batched &&
                      !backflush &&
                      round6(num(line.quantity)) > 0 &&
                      sumBatches(line.batches) !== round6(num(line.quantity));
                    return (
                      <tr key={line.lineNumber}>
                        <td className="modal-tbl-idx" style={{ textAlign: 'center' }}>{index + 1}</td>
                        <td><input className="modal-tbl-inp" value={line.itemNo} disabled /></td>
                        <td>
                          {/* Textarea, not input — B1 item names are long and must wrap. */}
                          <textarea
                            className="modal-tbl-inp modal-tbl-area"
                            value={line.itemName}
                            rows={2}
                            disabled
                          />
                          {backflush && (
                            <div style={{ fontSize: 11, opacity: 0.7 }}>
                              Backflush — consumed by the receipt
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {show(line.baseQuantity)}
                        </td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {show(requiredQuantity(line, form.quantityNow))}
                        </td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {show(line.issuedQuantity)}
                          {line.plannedQuantity !== '' && (
                            <div style={{ fontSize: 11, opacity: 0.65 }}>
                              of {show(line.plannedQuantity)}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {show(open)}
                        </td>
                        {/* The one input the store edits. Typing here re-spreads
                            this row's batches FIFO. */}
                        <td>
                          <input
                            className="modal-tbl-inp"
                            type="number"
                            value={line.quantity}
                            onChange={(e) => updateIssueQuantity(line.lineNumber, e.target.value)}
                            placeholder="0"
                            style={{
                              textAlign: 'right',
                              // Over-issue is allowed by SAP, so it is flagged, not blocked.
                              color: overIssued ? 'var(--lp-danger, #dc2626)' : undefined,
                            }}
                            title={
                              backflush
                                ? 'Backflush components are consumed automatically by the receipt'
                                : overIssued
                                  ? `More than the ${open} still open on the order`
                                  : undefined
                            }
                            disabled={backflush}
                          />
                        </td>
                        {/* Read-only: the split the FIFO allocation landed on.
                            Nothing to click — the quantity above drives it. */}
                        <td>
                          <input
                            className="modal-tbl-inp"
                            value={
                              !batched || backflush
                                ? '—'
                                : line.batches?.length
                                  ? line.batches.map((batch) => batch.BatchNumber).join(', ')
                                  : ''
                            }
                            placeholder={batched && !backflush ? 'Not allocated' : ''}
                            style={shortBatches ? { color: 'var(--lp-danger, #dc2626)' } : undefined}
                            title={
                              !batched || backflush
                                ? 'Not batch managed'
                                : shortBatches
                                  ? `Only ${sumBatches(line.batches)} of ${round6(num(line.quantity))} allocated — this warehouse is short`
                                  : line.batches?.length
                                    ? line.batches
                                        .map((batch) => `${batch.BatchNumber} × ${batch.Quantity}`)
                                        .join('\n')
                                    : 'Nothing allocated yet'
                            }
                            disabled
                          />
                        </td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {batchLoading ? (
                            <span className="bp-skeleton" aria-label="Reading batch stock" />
                          ) : (
                            show(availableQuantity(line))
                          )}
                        </td>
                        <td><input className="modal-tbl-inp" value={lineUom(line)} disabled /></td>
                        <td>
                          <select
                            className="modal-tbl-inp"
                            value={line.warehouse}
                            onChange={(e) => updateLineWarehouse(line.lineNumber, e.target.value)}
                            disabled={backflush}
                          >
                            <option value="">Select</option>
                            {warehouseOptions.map((warehouse) => (
                              <option key={warehouse.value} value={warehouse.value}>{warehouse.label}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
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
        subtitle="Only released orders — a planned order cannot consume stock"
        emptyText="No released production orders found."
        selectedCode={form.absoluteEntry}
        onSelect={handleSelectOrder}
      />

      <Loader fullscreen show={busy} label="Please wait…" />
    </>
  );
};

export default ProductionIssue;
