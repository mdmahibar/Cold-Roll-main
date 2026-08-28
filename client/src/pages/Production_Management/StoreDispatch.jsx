//! This is Store Dispatch Page

import React, { useState, useMemo, useEffect } from 'react';

import { toast } from 'react-toastify';
import { useCookies } from 'react-cookie';

import ListingPage from '../../components/ListingTable/ListingPage';
import Modal, { TextField, TextareaField, SelectField, SearchableSelectField, DateField, FieldGroup } from '../../components/Modal/Modal';
import Loader from '../../components/Loader/Loader.jsx';
import RecordPicker from '../CollectMilk/RecordPicker.jsx';
import BatchPicker from '../../components/BatchPicker/BatchPicker.jsx';

//! Zustand
import useItemMasterHook from '../../hooks/useItemMasterHook.js';
import useWarehouseHook from '../../hooks/useWarehouseHook.js';
import useWarehouseStore from '../../store/warehouseStore.js';
import useBusinessPartners from '../../hooks/useBusinessPartners.js';
import useBusinessPartnerStore from '../../store/businessPartnerStore.js';
//! End Zustand

//! custom hooks
import useStockTransferHook from '../../hooks/useStockTransferHook.js'
import useProductTreeHook from '../../hooks/useProductTreeHook.js'

//! End custom hooks

import { getProductTreeById } from '../../SAPB1/ProductTrees/ProductTreeServices.js';
import {
  getAllProductionOrders,
  getProductionOrderById,
} from '../../SAPB1/ProductionOrders/ProductionOrderServices.js';
import {
  getStockTransferById,
  createStockTransfer,
  updateStockTransfer,
} from '../../SAPB1/StockTransfers/StockTransferServices.js'
import { sapErrorMessage } from '../../SAPB1/auth/login.js';
import { uiToSapDate } from '../../common/Function.js';

//! In-transit
// Which warehouse is the transit one is read from U_TYPE on the warehouse
// master, never hardcoded — a new destination is then a value in a field.
import {
  destinationWarehouses,
  findTransitWarehouse,
  toWarehouseOptions,
} from '../../common/warehouseTypes.js';

//! Batch Handle
// Batch stock comes from the general API (not the Service Layer) — the saved
// SQL query getBatchByItemWarehouse() stays in place for the older pages.
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

// B1 assigns DocumentNumber itself, so the field is display-only until the order exists.
const DOCNUM_PLACEHOLDER = 'Auto Generated From B1';

/* ── In-transit ──────────────────────────────────────────────────
   Stock does not jump from the store to production. It LEAVES the store into
   the transit warehouse (this page) and is RECEIVED out of transit into the
   destination on Production Receive — two documents, with the quantity visible
   on the balance sheet the whole time.

   So ToWarehouse on everything posted here is the TRANSIT warehouse, always.
   The real destination lives in U_DESTINATIONWHS, because one shared transit
   warehouse holds every destination's goods at once and B1 cannot say whose
   they are. U_TRFTYPE = 'D' marks this document a dispatch: a receipt is a
   stock transfer too, and without the marker it would come back in this list
   looking like another note still waiting to be received. */

// SAP field limits — a longer value is rejected outright, not truncated.
const COMMENTS_MAX = 254;
const JOURNAL_MEMO_MAX = 50;
const clip = (value, max) => String(value ?? '').slice(0, max);

// A receipt carries the note it settles. The type marker is the explicit
// answer, but the link field alone is enough — documents posted before the
// marker existed still sort correctly.
const isReceiptRow = (row) =>
  String(row?.U_TRFTYPE ?? '').trim().toUpperCase() === 'R' ||
  String(row?.U_TRFBASE ?? '').trim() !== '';

/* ── Batch allocation ───────────────────────────────────────────
   A line's batch quantities must add up to the Transfer Qty, or the line must
   carry no BatchNumbers at all — B1 rejects anything in between. So quantity
   and allocation are one control: typing a qty re-spreads the batches. */

// Batch stock is cached per item + issuing warehouse — a batch number only
// means something for one item in one warehouse.
const batchKey = (itemNo, warehouseCode) => JSON.stringify([itemNo, warehouseCode]);

// Kills the float noise 0.1 + 0.2 leaves behind before it reaches B1.
const round6 = (value) => Math.round((Number(value) || 0) * 1e6) / 1e6;

const sumBatches = (batches) =>
  round6((batches ?? []).reduce((total, batch) => total + (Number(batch.Quantity) || 0), 0));

// Spreads the quantity over the warehouse's batches FIFO — the service hands
// them over sorted by InDate, so the oldest stock is always consumed first and
// a newer batch is only touched once the older ones are empty.
// Asking for more than the store holds falls short on
// purpose, so the save check can name the difference instead of capping quietly.
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

// Open Qty = what is still to be issued against the line.
// const openQuantity = (line) => {
//   const planned = parseFloat(line.plannedQuantity);
//   if (!Number.isFinite(planned)) return '';
//   const issued = parseFloat(line.issuedQuantity);
//   return Number((planned - (Number.isFinite(issued) ? issued : 0)).toFixed(4));
// };

// Required Days = the line's own start → end span, like B1 shows it.
// const requiredDays = (startDate, endDate) => {
//   if (!startDate || !endDate) return '';
//   const days = (new Date(endDate) - new Date(startDate)) / 86400000;
//   return Number.isFinite(days) ? Math.max(0, Math.round(days)) : '';
// };

/* ── B1 enum values (exactly what the Service Layer accepts) ──── */

const ORDER_STATUS_OPTIONS = [
  { value: 'boposPlanned', label: 'Planned' },
  { value: 'boposReleased', label: 'Released' },
  { value: 'boposClosed', label: 'Closed' },
  { value: 'boposCancelled', label: 'Cancelled' },
];

const ORDER_TYPE_OPTIONS = [
  { value: 'bopotStandard', label: 'Standard' },
  { value: 'bopotSpecial', label: 'Special' },
  { value: 'bopotDisassembly', label: 'Disassembly' },
];

// im_Backflush consumes the component automatically on receipt,
// im_Manual waits for a Production Issue document.
// const ISSUE_TYPE_OPTIONS = [
//   { value: 'im_Manual', label: 'Manual' },
//   { value: 'im_Backflush', label: 'Backflush' },
// ];

// B1's "Type" column on the components grid.
// const LINE_TYPE_OPTIONS = [
//   { value: 'pit_Item', label: 'Item' },
//   { value: 'pit_Resource', label: 'Resource' },
// ];

const STATUS_LABELS = ORDER_STATUS_OPTIONS.reduce(
  (map, status) => ({ ...map, [status.value]: status.label }),
  {}
);

/* A store dispatch always carries at least one component line.
   `lineNumber` is both the React key and B1's line identity — 0,1,2… by
   position, which is how the Service Layer numbers ProductionOrderLines.
   Rows are renumbered on every add/remove so index and lineNumber never drift. */
const makeEmptyLine = (lineNumber = 0) => ({
  lineNumber,
  itemType: 'pit_Item',
  itemNo: '',
  itemName: '',
  warehouse: '',
  // BaseQuantity = component needed for ONE unit of the product (the BOM ratio).
  baseQuantity: '',
  // Display only — "component qty / product qty" as it reads on the BOM.
  baseRatio: '',
  // PlannedQuantity = BaseQuantity × header planned quantity.
  plannedQuantity: '',
  issuedQuantity: 0,
  // Transfer Qty = what the store actually dispatches for this line.
  transferQuantity: '',
  // [{ BatchNumber, Quantity }] — the current split of Transfer Qty.
  batches: [],
  uomCode: '',
  startDate: '',
  endDate: '',
  issueType: 'im_Manual',
  // B1 derives this from account determination — shown, never posted.
  wipAccount: '',
});

const EMPTY_FORM = {
  absoluteEntry: '',
  // DocEntry of the posted stock transfer — set only when an existing one is opened.
  docEntry: '',
  documentNumber: DOCNUM_PLACEHOLDER,
  // Order No of the released production order this dispatch is raised against.
  releasedOrder: '',
  status: 'boposPlanned',
  orderType: 'bopotStandard',
  priority: 100,
  itemNo: '',
  productDescription: '',
  plannedQuantity: '',
  inventoryUOM: '',
  // Destination = who the stock is FOR. It is NOT the document's ToWarehouse
  // (that is transit) — it is posted as U_DESTINATIONWHS.
  destinationWarehouse: '',
  // From Warehouse = the store the components are dispatched out of.
  fromWarehouse: '',
  // Display only: the transit warehouse a saved dispatch actually landed in.
  transitWarehouse: '',
  postingDate: getTodayDate(),
  startDate: getTodayDate(),
  dueDate: getTodayDate(),
  customerCode: '',
  distributionRule: '',
  project: '',
  remarks: '',
  completedQuantity: 0,
  rejectedQuantity: 0,
};

/* ── Search icon / button used by the item + customer pickers ── */

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

const StoreDispatch = () => {
  // Cookie jar the general API reads its auth headers from.
  const [cookies] = useCookies(AUTH_COOKIE_LIST);

  //! zustand
  const { itemMaster: itemMasterData, refreshItemMaster } = useItemMasterHook();
  useWarehouseHook();
  useBusinessPartners();

  const warehouses = useWarehouseStore((state) => state.warehouses);
  const businessPartners = useBusinessPartnerStore((state) => state.businessPartners);
  //! zustand

  //! Custom Hook
  // The listing is the posted stock transfers — a store dispatch IS a stock transfer.
  const { stockTransfers, refreshStockTransfers } = useStockTransferHook();
  const { productTrees: productTreeData, refreshProductTrees } = useProductTreeHook();
  //! End Custom Hook

  // ProductTreeLines carry only ItemCode — name + stock come from the item master.
  const itemByCode = useMemo(() => {
    const map = new Map();
    itemMasterData.forEach((item) => map.set(item.ItemCode, item));
    return map;
  }, [itemMasterData]);

  const stockQuantity = (itemNo) => {
    const item = itemByCode.get(itemNo);
    if (!item) return '';
    return Number(item.QuantityOnStock ?? 0);
  };

  // Only a batch managed item may carry BatchNumbers — B1 rejects the line
  // outright if a non-managed item is sent with a batch collection.
  const isBatchManaged = (itemNo) => itemByCode.get(itemNo)?.ManageBatchNumbers === 'tYES';

  // B1 sends UoMCode as -1 on a line whose item has no UoM group, so that is
  // "nothing set", not a code — anything else the line carries is used as is.
  const sapUom = (uomCode) => (!uomCode || Number(uomCode) === -1 ? '' : String(uomCode));

  // The line keeps whatever B1 sent; otherwise fall back to the item's own UoM.
  const lineUom = (line) => sapUom(line.uomCode) || itemByCode.get(line.itemNo)?.InventoryUOM || '';

  //! In-transit warehouses
  // The one warehouse tagged U_TYPE = 'IN'. Everything dispatched here lands
  // in it, so a dispatch cannot be posted until it is known — see handleSave.
  const transitWarehouse = useMemo(() => findTransitWarehouse(warehouses), [warehouses]);
  const transitCode = transitWarehouse?.WarehouseCode ?? '';

  // Transit and damaged are never a source or a destination: a note addressed
  // to transit is a note addressed to nowhere. On a company that serves no
  // U_TYPE at all this falls back to every warehouse.
  const movableWarehouseOptions = useMemo(
    () => toWarehouseOptions(destinationWarehouses(warehouses)),
    [warehouses]
  );

  const [pending, setPending] = useState(0);
  const busy = pending > 0;

  const [open, setOpen] = useState(false);
  const [action, setAction] = useState('Add');
  const [form, setForm] = useState(EMPTY_FORM);
  const [lines, setLines] = useState([makeEmptyLine()]);

  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [orderPickerOpen, setOrderPickerOpen] = useState(false);
  const [releasedOrders, setReleasedOrders] = useState([]);
  // Which line row asked for the item picker — null means the picker is idle.
  const [componentPickerLineId, setComponentPickerLineId] = useState(null);

  //! Batch state
  // Batch stock of every component in the issuing store, keyed by item+warehouse.
  // Read up front so typing a Transfer Qty allocates without waiting on the network.
  const [batchStock, setBatchStock] = useState({});
  const [batchLoading, setBatchLoading] = useState(false);
  // Bumped by the picker's Refresh — batch stock moves every time anyone posts.
  const [batchReload, setBatchReload] = useState(0);
  // Which line row has the batch popup open — null means it is closed.
  const [batchLineNumber, setBatchLineNumber] = useState(null);

  const isView = action === 'View';
  // Everything on the order is owned by production — in Add mode too, since the
  // whole form is filled from the picked released order. The only inputs the
  // store touches are From / To Warehouse and the per-line Transfer Qty.
  const locked = true;
  const dispatchLocked = isView;

  const change = (event) => setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  /* ── Component lines ────────────────────────────────────────── */

  // A fresh row inherits the header's warehouse and schedule — B1 does the same.
  const addLine = () =>
    setLines((prev) => [
      ...prev,
      { ...makeEmptyLine(prev.length), startDate: form.startDate, endDate: form.dueDate },
    ]);

  const removeLine = (lineNumber) => {
    // B1 rejects a store dispatch with no components.
    if (lines.length <= 1) {
      toast.info('At least one component line is required.');
      return;
    }
    setLines((prev) =>
      prev
        .filter((line) => line.lineNumber !== lineNumber)
        .map((line, index) => ({ ...line, lineNumber: index }))
    );
  };

  const updateLine = (lineNumber, field, value) =>
    setLines((prev) =>
      prev.map((line) => (line.lineNumber === lineNumber ? { ...line, [field]: value } : line))
    );

  // Base qty is the per-unit BOM ratio, so the line requirement is always
  //! Planned QTY Calculation BaseQuantity × header planned quantity — recompute instead of hand-typing.
  const explodeQuantity = (baseQuantity, headerQuantity) => {
    const base = parseFloat(baseQuantity);
    const header = parseFloat(headerQuantity);
    if (!(base > 0) || !(header > 0)) return '';
    return Number((base * header).toFixed(4));
  };

  const updateBaseQuantity = (lineNumber, value) =>
    setLines((prev) =>
      prev.map((line) =>
        line.lineNumber === lineNumber
          ? {
              ...line,
              baseQuantity: value,
              plannedQuantity: explodeQuantity(value, form.plannedQuantity) || line.plannedQuantity,
            }
          : line
      )
    );

  const changePlannedQuantity = (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, plannedQuantity: value }));
    setLines((prev) =>
      prev.map((line) => {
        const exploded = explodeQuantity(line.baseQuantity, value);
        return exploded === '' ? line : { ...line, plannedQuantity: exploded };
      })
    );
  };

  //! SAP B1 Sync
  const [syncing, setSyncing] = useState(false);
  const handleSapSync = async () => {
    setSyncing(true);
    try {
      await refreshStockTransfers();
      toast.success('Synced Store dispatches from SAP B1');
    } catch (err) {
      toast.error(sapErrorMessage(err, 'SAP B1 sync failed'));
    } finally {
      setSyncing(false);
    }
  };

  /* ── Picker handlers ────────────────────────────────────────── */

  // The finished good is picked as a BOM (ProductTree). TreeCode IS the parent
  // ItemCode, so it fills the header and its lines fill the components table.
  const handleSelectProduct = async (tree) => {
    setForm((prev) => ({
      ...prev,
      itemNo: tree.TreeCode,
      productDescription: tree.ProductDescription ?? '',
    }));

    setPending((p) => p + 1);
    try {
      const bom = await getProductTreeById(tree.TreeCode);
      const bomLines = bom?.ProductTreeLines ?? [];
      // BOM line qty is for the tree's own Quantity (e.g. per 100 pcs) —
      // divide it down so baseQuantity is always "per one unit".
      const treeQuantity = parseFloat(bom?.Quantity) > 0 ? parseFloat(bom.Quantity) : 1;

      const bomComponents = bomLines.map((line, index) => {
        const baseQuantity = Number((Number(line.Quantity || 0) / treeQuantity).toFixed(6));
        const master = itemByCode.get(line.ItemCode);
        return {
          ...makeEmptyLine(index),
          itemType: line.ItemType ?? 'pit_Item',
          itemNo: line.ItemCode ?? '',
          itemName: master?.ItemName ?? '',
          // BOM warehouse first, else the item's own default warehouse.
          warehouse: line.Warehouse || master?.DefaultWarehouse || '',
          baseQuantity,
          baseRatio: `${line.Quantity ?? 0}/${treeQuantity}`,
          plannedQuantity: explodeQuantity(baseQuantity, form.plannedQuantity),
          uomCode: master?.InventoryUOM ?? '',
          startDate: form.startDate,
          endDate: form.dueDate,
          issueType: line.IssueMethod ?? 'im_Manual',
        };
      });

      setLines(bomComponents.length ? bomComponents : [makeEmptyLine()]);
      if (bomComponents.length === 0) toast.info('This BOM has no component lines.');
    } catch (err) {
      toast.error(sapErrorMessage(err, 'Failed to load BOM components'));
    } finally {
      setPending((p) => p - 1);
    }
  };

  const handleSelectCustomer = (partner) => {
    setForm((prev) => ({ ...prev, customerCode: partner.CardCode }));
  };

  // The picker is multi-select, so it hands back an array. The first pick binds
  // to the row that opened it and every other pick becomes a new row.
  const handleSelectComponent = (selection) => {
    if (componentPickerLineId === null) return;
    const items = Array.isArray(selection) ? selection : [selection];
    if (items.length === 0) return;

    const [first, ...rest] = items;

    setLines((prev) => {
      const updated = prev.map((line) =>
        line.lineNumber === componentPickerLineId
          ? {
              ...line,
              itemNo: first.ItemCode,
              itemName: first.ItemName ?? '',
              uomCode: first.InventoryUOM ?? '',
              warehouse: line.warehouse || first.DefaultWarehouse || '',
            }
          : line
      );
      const added = rest.map((item) => ({
        ...makeEmptyLine(),
        itemNo: item.ItemCode,
        itemName: item.ItemName ?? '',
        uomCode: item.InventoryUOM ?? '',
        warehouse: item.DefaultWarehouse || form.fromWarehouse,
        startDate: form.startDate,
        endDate: form.dueDate,
      }));
      // Renumber so lineNumber stays in step with the array index.
      return [...updated, ...added].map((line, index) => ({ ...line, lineNumber: index }));
    });

    setComponentPickerLineId(null);
  };

  // Pre-check the component already sitting on the row that opened the picker.
  const componentPickerSelectedCodes = useMemo(() => {
    const current = lines.find((line) => line.lineNumber === componentPickerLineId)?.itemNo;
    return current ? [current] : [];
  }, [lines, componentPickerLineId]);

  /* ── Released production order picker ───────────────────────── */

  const openOrderPicker = async () => {
    setPending((p) => p + 1);
    try {
      const orders = await getAllProductionOrders();
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

  /* ── Modal open / close / save ──────────────────────────────── */

  // Binds a single-entity GET response onto the form + component lines.
  const applyProductionOrder = (headers) => {
    const lineItems = headers.ProductionOrderLines ?? [];

    setForm({
      ...EMPTY_FORM,
      absoluteEntry: headers.AbsoluteEntry ?? '',
      documentNumber: headers.DocumentNumber ?? DOCNUM_PLACEHOLDER,
      releasedOrder: headers.DocumentNumber ?? '',
      status: headers.ProductionOrderStatus ?? 'boposPlanned',
      orderType: headers.ProductionOrderType ?? 'bopotStandard',
      priority: headers.Priority ?? 100,
      itemNo: headers.ItemNo ?? '',
      productDescription: headers.ProductDescription ?? '',
      plannedQuantity: headers.PlannedQuantity ?? '',
      inventoryUOM: headers.InventoryUOM ?? '',
      // The production order's own Warehouse is where the FINISHED GOOD is
      // booked, which is exactly the destination this dispatch is addressed to.
      destinationWarehouse: headers.Warehouse ?? '',
      fromWarehouse: '',
      postingDate: uiToSapDate(headers.PostingDate) ?? getTodayDate(),
      startDate: uiToSapDate(headers.StartDate) ?? getTodayDate(),
      dueDate: uiToSapDate(headers.DueDate) ?? getTodayDate(),
      customerCode: headers.CustomerCode ?? '',
      distributionRule: headers.DistributionRule ?? '',
      project: headers.Project ?? '',
      remarks: headers.Remarks ?? '',
      completedQuantity: headers.CompletedQuantity ?? 0,
      rejectedQuantity: headers.RejectedQuantity ?? 0,
    });

    const mappedLines = lineItems.map((item, index) => ({
      // Carrying LineNumber back is what makes the PATCH update this line
      // instead of inserting a duplicate.
      lineNumber: item.LineNumber ?? index,
      itemType: item.ItemType ?? 'pit_Item',
      itemNo: item.ItemNo ?? '',
      itemName: item.ItemName ?? '',
      warehouse: item.Warehouse ?? '',
      baseQuantity: item.BaseQuantity ?? '',
      baseRatio: '',
      plannedQuantity: item.PlannedQuantity ?? '',
      issuedQuantity: item.IssuedQuantity ?? 0,
      // Starts on the planned qty — the store dispatches that much unless it
      // types something else over it.
      transferQuantity: item.PlannedQuantity ?? '',
      uomCode: item.UoMCode ?? '',
      startDate: uiToSapDate(item.StartDate) ?? '',
      endDate: uiToSapDate(item.EndDate) ?? '',
      issueType: item.ProductionOrderIssueType ?? 'im_Manual',
      wipAccount: item.WipAccount ?? '',
    }));
    setLines(mappedLines.length ? mappedLines : [makeEmptyLine()]);
  };

  // Binds a posted stock transfer onto the form + dispatched lines.
  const applyStockTransfer = (headers) => {
    const lineItems = headers.StockTransferLines ?? [];

    setForm({
      ...EMPTY_FORM,
      docEntry: headers.DocEntry ?? '',
      documentNumber: headers.DocNum ?? DOCNUM_PLACEHOLDER,
      fromWarehouse: headers.FromWarehouse ?? '',
      // ToWarehouse on a dispatch is the transit warehouse — identical on every
      // note — so the destination can only come from the UDF. A legacy direct
      // transfer has no UDF, and there ToWarehouse really was the destination.
      destinationWarehouse: headers.U_DESTINATIONWHS || headers.ToWarehouse || '',
      transitWarehouse: headers.U_DESTINATIONWHS ? headers.ToWarehouse ?? '' : '',
      postingDate: uiToSapDate(headers.DocDate) ?? getTodayDate(),
      remarks: headers.Comments ?? '',
    });

    const mappedLines = lineItems.map((item, index) => ({
      ...makeEmptyLine(item.LineNum ?? index),
      itemNo: item.ItemCode ?? '',
      itemName: item.ItemDescription ?? '',
      warehouse: item.WarehouseCode ?? '',
      // A stock transfer only carries what was actually moved.
      transferQuantity: item.Quantity ?? '',
      batches: (item.BatchNumbers ?? []).map((batch) => ({
        BatchNumber: batch.BatchNumber,
        Quantity: Number(batch.Quantity) || 0,
      })),
      uomCode: item.UoMCode ?? '',
    }));
    setLines(mappedLines.length ? mappedLines : [makeEmptyLine()]);
  };

  const handleModal = async (act, docEntry = null) => {
    setAction(act);

    if (act === 'Add') {
      setForm({
        ...EMPTY_FORM,
        postingDate: getTodayDate(),
        startDate: getTodayDate(),
        dueDate: getTodayDate(),
      });
      setLines([{ ...makeEmptyLine(), startDate: getTodayDate(), endDate: getTodayDate() }]);
      setOpen(true);
      return;
    }

    setPending((p) => p + 1);
    try {
      // Single-entity GET — this is the only call that returns StockTransferLines.
      const headers = await getStockTransferById(docEntry);
      applyStockTransfer(headers);
      setOpen(true);
    } catch (err) {
      toast.error(sapErrorMessage(err, 'Failed to load store dispatch'));
    } finally {
      setPending((p) => p - 1);
    }
  };

  const closeModal = () => {
    setOpen(false);
    setForm(EMPTY_FORM);
    setLines([makeEmptyLine()]);
    setBatchLineNumber(null);
  };

  const resetForm = () => {
    setForm({ ...EMPTY_FORM, documentNumber: form.documentNumber });
    setLines([makeEmptyLine()]);
  };


  /* ── Batch stock ────────────────────────────────────────────── */

  // A string, not an array, so the fetch below only re-runs when the set of
  // components really changes — not on every Transfer Qty keystroke.
  // Only batch managed components are read — the rest have no batch stock at all.
  const componentItemKey = useMemo(
    () =>
      [
        ...new Set(
          lines
            .map((line) => line.itemNo)
            .filter((itemNo) => itemNo && itemByCode.get(itemNo)?.ManageBatchNumbers === 'tYES')
        ),
      ]
        .sort()
        .join('|'),
    [lines, itemByCode]
  );

  // Read every component's batch stock once the issuing store is known, then
  // spread whatever Transfer Qty is already typed over it. A View shows what
  // was actually posted, so its allocation is left alone.
  useEffect(() => {
    const warehouseCode = form.fromWarehouse;
    const itemCodes = componentItemKey ? componentItemKey.split('|') : [];
    // Stock stays keyed by warehouse, so a stale entry simply never matches.
    if (!open || !warehouseCode || itemCodes.length === 0) return undefined;

    let cancelled = false;
    const loadBatchStock = async () => {
      setBatchLoading(true);
      try {
        const results = await Promise.all(
          // One bad item must not blank the whole table — it just gets no batches.
          itemCodes.map((itemCode) =>
            getWarehouseWiseBatchOfItem(itemCode, warehouseCode, cookies).catch(() => [])
          )
        );
        if (cancelled) return;

        const stock = {};
        itemCodes.forEach((itemCode, index) => {
          stock[batchKey(itemCode, warehouseCode)] = results[index];
        });
        setBatchStock(stock);

        if (isView) return;
        setLines((prev) =>
          prev.map((line) => ({
            ...line,
            batches: allocateBatches(
              stock[batchKey(line.itemNo, warehouseCode)],
              line.transferQuantity
            ),
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
  }, [open, isView, componentItemKey, form.fromWarehouse, batchReload]);

  const lineBatchStock = (line) => batchStock[batchKey(line.itemNo, form.fromWarehouse)] ?? [];

  // Available = what the issuing store actually holds, summed straight from the
  // batch API — not the item master's company-wide figure. Blank until From
  // Warehouse is picked and its batches have been read.
  const availableQuantity = (line) => {
    const stock = lineBatchStock(line);
    return stock.length ? sumBatches(stock) : '';
  };

  // A batch number only means something in one warehouse — switching the store
  // drops every allocation until that store's stock has been read.
  const changeFromWarehouse = (event) => {
    setForm((prev) => ({ ...prev, fromWarehouse: event.target.value }));
    setLines((prev) => prev.map((line) => ({ ...line, batches: [] })));
  };

  // Quantity and allocation are one control — typing a qty re-spreads the batches.
  const updateTransferQuantity = (lineNumber, value) =>
    setLines((prev) =>
      prev.map((line) =>
        line.lineNumber === lineNumber
          ? {
              ...line,
              transferQuantity: value,
              batches: allocateBatches(
                batchStock[batchKey(line.itemNo, form.fromWarehouse)],
                value
              ),
            }
          : line
      )
    );

  // …and the other way round: picking batches by hand sets the Transfer Qty.
  const applyBatches = (lineNumber, batches) => {
    setLines((prev) =>
      prev.map((line) =>
        line.lineNumber === lineNumber
          ? { ...line, batches, transferQuantity: sumBatches(batches) }
          : line
      )
    );
    setBatchLineNumber(null);
  };

  const batchLine = lines.find((line) => line.lineNumber === batchLineNumber) ?? null;

  const handleSave = async () => {
    // Returning false keeps the modal open so the user's input survives.
    // Add pulls the header from a released production order, so it must be picked first.
    if (action === 'Add' && !form.itemNo) {
      toast.error('Pick the released production order first.');
      return false;
    }
    if (!form.fromWarehouse) {
      toast.error('From Warehouse is mandatory — the components are issued from it.');
      return false;
    }
    if (!form.destinationWarehouse) {
      toast.error('Destination Warehouse is mandatory — it is who the stock is for.');
      return false;
    }
    // A note addressed to transit is a note addressed to nowhere: the receipt
    // side groups by U_DESTINATIONWHS, so nothing would ever be able to claim it.
    if (form.destinationWarehouse === transitCode) {
      toast.error('The transit warehouse cannot be the destination — pick the store that receives the stock.');
      return false;
    }
    if (form.destinationWarehouse === form.fromWarehouse) {
      toast.error('Source and destination are the same warehouse — nothing would move.');
      return false;
    }
    // Refuse rather than post into `undefined`: with no transit warehouse the
    // stock would land somewhere the receipt page can never find it.
    if (!transitCode) {
      toast.error(
        'No in-transit warehouse found. Tag one warehouse with U_TYPE = "IN" in SAP (Warehouse master) and sync again.'
      );
      return false;
    }

    const filledLines = lines.filter((line) => line.itemNo);
    if (filledLines.length === 0) {
      toast.error('Add at least one component line.');
      return false;
    }

    //! Stock Transfer Logic => From Store to In-transit phase

    //! Without Batch and Serial Number
    // Only lines the store actually dispatches — B1 rejects a zero-qty line.
    // const transferLines = filledLines
    //   .filter((line) => toNumber(line.transferQuantity) > 0)
    //   .map((line, index) =>
    //     compact({
    //       LineNum: index,
    //       ItemCode: line.itemNo,
    //       Quantity: toNumber(line.transferQuantity),
    //       FromWarehouseCode: form.fromWarehouse,
    //       WarehouseCode: transitCode,
    //       BatchNumbers: [],
    //       SerialNumbers: [],
    //     })
    //   );

    const dispatchLines = filledLines.filter((line) => toNumber(line.transferQuantity) > 0);
    if (dispatchLines.length === 0) {
      toast.error('Enter Transfer Qty on at least one component line.');
      return false;
    }
    //! with batch — on a batch managed item the allocation must cover the
    //! Transfer Qty exactly, or B1 answers with -4014 "Cannot add row without
    //! complete selection of batches". A non-managed item is never checked.
    const shortLine = dispatchLines.find(
      (line) =>
        isBatchManaged(line.itemNo) &&
        sumBatches(line.batches) !== toNumber(line.transferQuantity)
    );
    if (shortLine) {
      toast.error(
        `Not enough batch stock for ${shortLine.itemNo} in ${form.fromWarehouse} — ` +
          `${sumBatches(shortLine.batches)} of ${shortLine.transferQuantity} allocated. Check 🔖 on that line.`
      );
      return false;
    }

    const transferLines = dispatchLines.map((line, index) =>
      compact({
        LineNum: index,
        ItemCode: line.itemNo,
        Quantity: toNumber(line.transferQuantity),
        FromWarehouseCode: form.fromWarehouse,
        // The line lands in TRANSIT, not at the destination — that second leg
        // is Production Receive's document, posted when the goods arrive.
        WarehouseCode: transitCode,
        // Omitted entirely for an item that is not batch managed (ManageBatchNumbers
        // is tNO) — an empty collection makes B1 complain about the batch setup instead.
        // BaseLineNumber is the index in THIS payload, not the BOM line number.
        BatchNumbers: isBatchManaged(line.itemNo) && line.batches?.length
          ? line.batches.map((batch) => ({
              BatchNumber: batch.BatchNumber,
              Quantity: batch.Quantity,
              BaseLineNumber: index,
            }))
          : undefined,
      })
    );

    // StockTransfer has no PostingDate/StartDate — B1 calls the posting date DocDate.
    // Resolved with a fallback so the key is ALWAYS sent: left undefined,
    // `compact` drops it and B1 silently stamps the document with its own today.
    const docDate = uiToSapDate(form.postingDate) ?? getTodayDate();

    const payloadStockTransfer = compact({
      DocDate: docDate,
      // TaxDate: uiToSapDate(form.postingDate),
      // DueDate: dueDate,
      FromWarehouse: form.fromWarehouse,
      // ALWAYS the transit warehouse. The destination is the UDF below.
      ToWarehouse: transitCode,
      JournalMemo: clip(`Dispatch to ${form.destinationWarehouse}`, JOURNAL_MEMO_MAX),
      Comments: clip(
        `Store dispatch for ${form.destinationWarehouse} against production order ` +
          `${form.releasedOrder || form.documentNumber}`,
        COMMENTS_MAX
      ),
      //! The three fields the whole in-transit flow hangs on.
      U_DESTINATIONWHS: form.destinationWarehouse,
      U_TRFTYPE: 'D',
      StockTransferLines: transferLines,
    });

    setPending((p) => p + 1);
    try {
      if (action === 'Add') {
        await createStockTransfer(payloadStockTransfer);
      } else {
        await updateStockTransfer(form.docEntry, payloadStockTransfer);
      }
      toast.success(
        `Store dispatch ${action === 'Add' ? 'posted' : 'updated'} — stock is in ${transitCode} ` +
          `for ${form.destinationWarehouse}. Receive it on Production Receive.`
      );
      // Refresh first so the closing modal reveals an up-to-date table.
      await refreshStockTransfers();
    } catch (err) {
      toast.error(sapErrorMessage(err, `Failed to ${action === 'Add' ? 'create' : 'update'} store dispatch`));
      return false;
    } finally {
      setPending((p) => p - 1);
    }
  };

  const handleDelete = () => {
    // TODO(SAP B1): a store dispatch is cancelled (status boposCancelled),
    // not deleted, once it has been released.
    toast.info('Cancelling a store dispatch is not enabled yet.');
  };

  /* ── Listing config ─────────────────────────────────────────── */

  const columns = [
    { header: 'Doc No', field: 'DocNum', type: 'code', isLink: true },
    { header: 'Doc Date', field: 'DocDate', type: 'date' },
    { header: 'From Warehouse', field: 'FromWarehouse', type: 'text' },
    // ToWarehouse is the transit warehouse on every row here, so the column
    // that actually tells the rows apart is the destination UDF.
    { header: 'In-Transit', field: 'ToWarehouse', type: 'text' },
    { header: 'Destination', field: 'U_DESTINATIONWHS', type: 'text' },
    { header: 'Remarks', field: 'Comments', type: 'text' },
  ];

  // A receipt is a stock transfer too — without this filter it would sit in
  // this list looking like another note still waiting to be dispatched.
  // Untagged legacy rows stay visible: they are nobody's receipt.
  const dispatchRows = useMemo(
    () => stockTransfers.filter((row) => !isReceiptRow(row)),
    [stockTransfers]
  );

  const today = getTodayDate();
  const thisMonth = today.slice(0, 7);
  // SAP sends DocDate as "YYYY-MM-DD", so a string compare is enough.
  const isToday = (row) => String(row.DocDate ?? '').startsWith(today);
  const isThisMonth = (row) => String(row.DocDate ?? '').startsWith(thisMonth);

  const stats = useMemo(
    () => [
      { label: 'Total Dispatches', value: dispatchRows.length, icon: '🏭', iconClass: 'blue', filterKey: 'all' },
      {
        label: 'Today',
        value: dispatchRows.filter(isToday).length,
        icon: '📅',
        iconClass: 'amber',
        filterKey: 'today',
      },
      {
        label: 'This Month',
        value: dispatchRows.filter(isThisMonth).length,
        icon: '📦',
        iconClass: 'purple',
        filterKey: 'month',
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatchRows]
  );

  const filterChips = [
    { key: 'all', label: 'All', chipClass: 'lp-chip-blue' },
    { key: 'today', label: 'Today', chipClass: 'lp-chip-amber', filterFn: isToday },
    { key: 'month', label: 'This Month', chipClass: 'lp-chip-purple', filterFn: isThisMonth },
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
          title="Store Dispatch"
          subtitle="Components issued from the store into transit against a released production order"
          titleIcon="🏭"
          rowData={dispatchRows}
          columns={columns}
          rowKey="DocEntry"
          stats={stats}
          filterChips={filterChips}
          defaultFilter="all"
          searchPlaceholder="Search store dispatches…"
          searchFields={['DocNum', 'FromWarehouse', 'ToWarehouse', 'U_DESTINATIONWHS', 'Comments']}
          defaultSortCol="DocNum"
          primaryAction={{ label: '+ New Store Dispatch', onClick: () => handleModal('Add') }}
          onView={(record) => handleModal('View', record.DocEntry)}
          onEdit={(record) => handleModal('Edit', record.DocEntry)}
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
        mode={isView ? 'view' : action === 'Add' ? 'add' : 'edit'}
        title={`${action} Store Dispatch`}
        subtitle={`Status: ${STATUS_LABELS[form.status] ?? form.status}`}
        entity="Store Dispatch"
        // Add and Edit both post the store's dispatch — never a plain create/update.
        saveLabel={
          !isView ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <TickIcon /> Post Dispatch
            </span>
          ) : undefined
        }
        saveLoading={busy}
        saveDisabled={busy}
      >
        <FieldGroup title="Document" columns={4}>
          <TextField
            label="Released Production Order"
            name="releasedOrder"
            value={form.releasedOrder}
            onChange={change}
            placeholder="Search released order"
            hint="Picking an order fills this dispatch"
            disabled
            suffix={
              action === 'Add' && (
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
          <TextField label="Order No" name="documentNumber" value={form.documentNumber} onChange={change} disabled />
          <SelectField
            label="Status"
            name="status"
            value={form.status}
            onChange={change}
            options={ORDER_STATUS_OPTIONS}
            disabled={locked}
          />
          <SelectField
            label="Order Type"
            name="orderType"
            value={form.orderType}
            onChange={change}
            options={ORDER_TYPE_OPTIONS}
            disabled={locked}
          />
          {/* <TextField
            label="Priority"
            name="priority"
            type="number"
            value={form.priority}
            onChange={change}
            hint="1 = highest, 100 = default"
            disabled={locked}
          /> */}
        </FieldGroup>

        <FieldGroup title="Product" columns={4}>
          <TextField
            label="Item No"
            name="itemNo"
            value={form.itemNo}
            onChange={change}
            placeholder="Search BOM"
            hint="Picking a BOM fills the components below"
            required
            disabled={locked}
            suffix={
              !locked && (
                <button
                  type="button"
                  onClick={() => setProductPickerOpen(true)}
                  aria-label="Search BOMs"
                  title="Search BOMs"
                  style={searchButtonStyle}
                >
                  <SearchIcon />
                </button>
              )
            }
          />
          <TextField
            label="Product Description"
            name="productDescription"
            value={form.productDescription}
            onChange={change}
            disabled
          />
          <TextField
            label="Planned Quantity"
            name="plannedQuantity"
            type="number"
            value={form.plannedQuantity}
            onChange={changePlannedQuantity}
            placeholder="0"
            hint="Component quantities re-explode from this"
            required
            disabled={locked}
          />
        </FieldGroup>

        {/* All three stay open in Edit mode — this is what the store fills in.
            To Warehouse is NOT here: a dispatch always posts into the transit
            warehouse, so it is shown, never chosen. */}
        <FieldGroup title="Dispatch" columns={4}>
          <SearchableSelectField
            label="From Warehouse"
            name="fromWarehouse"
            value={form.fromWarehouse}
            onChange={changeFromWarehouse}
            options={movableWarehouseOptions}
            placeholder="Search warehouse…"
            hint={batchLoading ? '⏳ Reading batch stock…' : 'Store the components are issued from'}
            required
            disabled={dispatchLocked}
          />
          <SearchableSelectField
            label="Destination Warehouse"
            name="destinationWarehouse"
            value={form.destinationWarehouse}
            onChange={change}
            options={movableWarehouseOptions}
            placeholder="Search warehouse…"
            hint="Who the stock is for — receives it out of transit"
            required
            disabled={dispatchLocked}
          />
          <TextField
            label="In-Transit Warehouse"
            name="transitWarehouse"
            value={form.transitWarehouse || transitCode}
            onChange={change}
            placeholder="Not configured"
            hint={
              transitCode
                ? 'Where the stock sits until it is received'
                : '⚠️ Tag one warehouse U_TYPE = "IN" in SAP'
            }
            disabled
          />
        </FieldGroup>

        <FieldGroup title="Scheduling" columns={4}>
          <DateField label="Posting Date" name="postingDate" value={form.postingDate} onChange={change} disabled={locked} />
          <DateField label="Start Date" name="startDate" value={form.startDate} onChange={change} disabled={locked} />
          <DateField label="Due Date" name="dueDate" value={form.dueDate} onChange={change} required disabled={locked} />
          {/* <TextField
            label="Customer Code"
            name="customerCode"
            value={form.customerCode}
            onChange={change}
            placeholder="Optional — make to order"
            disabled={locked}
            suffix={
              !locked && (
                <button
                  type="button"
                  onClick={() => setCustomerPickerOpen(true)}
                  aria-label="Search customers"
                  title="Search customers"
                  style={searchButtonStyle}
                >
                  <SearchIcon />
                </button>
              )
            }
          /> */}
        </FieldGroup>

        {/* <FieldGroup title="Additional" columns={4}>
          <TextField label="Distribution Rule" name="distributionRule" value={form.distributionRule} onChange={change} disabled={locked} />
          <TextField label="Project" name="project" value={form.project} onChange={change} disabled={locked} />
          B1 posts these from Production Receipt / Issue — never from this page.
          <TextField label="Completed Qty" name="completedQuantity" value={form.completedQuantity} onChange={change} disabled />
          <TextField label="Rejected Qty" name="rejectedQuantity" value={form.rejectedQuantity} onChange={change} disabled />
        </FieldGroup> */}

        <FieldGroup columns={1}>
          <TextareaField
            label="Remarks"
            name="remarks"
            value={form.remarks}
            onChange={change}
            placeholder="Notes for the shop floor…"
            rows={2}
            disabled={locked}
          />
        </FieldGroup>

        <div className="modal-field-group">
          <div className="modal-field-group-title">
            Components (BOM)
            {/* Available and the batch allocation both wait on this read. */}
            {batchLoading && <span className="bp-loading">Reading batch stock…</span>}
          </div>

          <div className="modal-tbl-wrap">
            {/* The table keeps its own width and the wrap scrolls, otherwise every
                input is squeezed to a few characters. minWidth is the sum of the
                column widths below — keep it in step when a column is hidden. */}
            <table className="modal-tbl" style={{ minWidth: 1185, tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: 44, textAlign: 'center' }}>#</th>
                  {/* <th style={{ width: 110 }}>Type</th> */}
                  <th style={{ width: 165 }}>Item No</th>
                  <th style={{ width: 260 }}>Description</th>
                  {/* <th style={{ width: 110, textAlign: 'right' }}>Base Qty</th> */}
                  {/* <th style={{ width: 100, textAlign: 'right' }}>Base Ratio</th> */}
                  <th style={{ width: 120, textAlign: 'right' }}>Planned Qty</th>
                  <th style={{ width: 120, textAlign: 'right' }}>Transfer Qty</th>
                  {/* <th style={{ width: 80, textAlign: 'center' }}>Batch</th> */}
                  <th style={{ width: 110, textAlign: 'right' }} title="Batch stock in the From Warehouse">
                    In Stock
                  </th>
                  {/* <th style={{ width: 105, textAlign: 'right' }}>In Stock</th> Replace by Available qtu on 22-08-2026 */}
                  <th style={{ width: 105, textAlign: 'right' }}>Issued Qty</th>
                  {/* <th style={{ width: 105, textAlign: 'right' }}>Open Qty</th> */}
                  {/* <th style={{ width: 190 }}>Warehouse</th> */}
                  <th style={{ width: 100 }}>UoM</th>
                  {/* <th style={{ width: 160 }}>Start Date</th> */}
                  {/* <th style={{ width: 160 }}>End Date</th> */}
                  {/* <th style={{ width: 110, textAlign: 'right' }}>Required Days</th> */}
                  {/* <th style={{ width: 140 }}>Issue Method</th> */}
                  {/* <th style={{ width: 140 }}>WIP Account</th> */}
                  <th style={{ width: 56, textAlign: 'center' }} />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={line.lineNumber}>
                    <td className="modal-tbl-idx" style={{ textAlign: 'center' }}>{index + 1}</td>
                    {/* <td>
                      <select
                        className="modal-tbl-inp"
                        value={line.itemType}
                        onChange={(e) => updateLine(line.lineNumber, 'itemType', e.target.value)}
                        disabled={locked}
                      >
                        {LINE_TYPE_OPTIONS.map((lineType) => (
                          <option key={lineType.value} value={lineType.value}>{lineType.label}</option>
                        ))}
                      </select>
                    </td> */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          className="modal-tbl-inp"
                          value={line.itemNo}
                          onChange={(e) => updateLine(line.lineNumber, 'itemNo', e.target.value)}
                          placeholder="Code"
                          disabled={locked}
                        />
                        {!locked && (
                          <button
                            type="button"
                            className="modal-tbl-del"
                            onClick={() => setComponentPickerLineId(line.lineNumber)}
                            aria-label={`Search component for line ${index + 1}`}
                            title="Search items"
                          >
                            <SearchIcon />
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      {/* Textarea, not input — B1 item names are long and must wrap. */}
                      <textarea
                        className="modal-tbl-inp modal-tbl-area"
                        value={line.itemName}
                        onChange={(e) => updateLine(line.lineNumber, 'itemName', e.target.value)}
                        placeholder="Item name"
                        rows={2}
                        disabled={locked}
                      />
                    </td>
                    {/* <td>
                      <input
                        className="modal-tbl-inp"
                        type="number"
                        value={line.baseQuantity}
                        onChange={(e) => updateBaseQuantity(line.lineNumber, e.target.value)}
                        placeholder="0"
                        style={{ textAlign: 'right' }}
                        disabled={locked}
                      />
                    </td> */}
                    {/* Ratio as the BOM stores it — component qty per tree qty. */}
                    {/* <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {line.baseRatio || '—'}
                    </td> */}
                    <td>
                      <input
                        className="modal-tbl-inp"
                        type="number"
                        value={line.plannedQuantity}
                        onChange={(e) => updateLine(line.lineNumber, 'plannedQuantity', e.target.value)}
                        placeholder="0"
                        style={{ textAlign: 'right' }}
                        disabled={locked}
                      />
                    </td>
                    {/* The one line input the store edits — how much is dispatched
                        now. Typing here allocates the batches for that quantity. */}
                    <td>
                      <input
                        className="modal-tbl-inp"
                        type="number"
                        value={line.transferQuantity}
                        onChange={(e) => updateTransferQuantity(line.lineNumber, e.target.value)}
                        placeholder="0"
                        style={{ textAlign: 'right' }}
                        disabled={dispatchLocked}
                      />
                    </td>
                    {/* Opening this is optional — the batches are already picked.
                        It is there to show what the store actually holds. */}
                    {/* <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className={`bp-trigger${line.batches?.length ? ' bp-trigger--set' : ''}`}
                        onClick={() => setBatchLineNumber(line.lineNumber)}
                        disabled={!line.itemNo || !form.fromWarehouse}
                        aria-label={`Batch details for line ${index + 1}`}
                        title={
                          !form.fromWarehouse
                            ? 'Pick the From Warehouse first'
                            : line.batches?.length
                              ? line.batches.map((batch) => `${batch.BatchNumber} × ${batch.Quantity}`).join('\n')
                              : 'View batch stock'
                        }
                      >
                        🔖
                        {line.batches?.length ? (
                          <span className="bp-trigger-count">{line.batches.length}</span>
                        ) : null}
                      </button>
                    </td> */}
                    {/* Available is the batch stock in From Warehouse; In Stock is
                        the item master's company-wide figure. Display only. */}
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {batchLoading ? (
                        <span className="bp-skeleton" aria-label="Reading batch stock" />
                      ) : availableQuantity(line) === '' ? (
                        '—'
                      ) : (
                        availableQuantity(line).toLocaleString('en-IN')
                      )}
                    </td>
                    {/* <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {stockQuantity(line.itemNo) === ''
                        ? '—'
                        : stockQuantity(line.itemNo).toLocaleString('en-IN')}
                    </td> */}
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {Number(line.issuedQuantity || 0).toLocaleString('en-IN')}
                    </td>
                    {/* <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {openQuantity(line) === '' ? '—' : Number(openQuantity(line)).toLocaleString('en-IN')}
                    </td> */}
                    {/* Line warehouse is driven by the header now — kept in state, hidden here. */}
                    {/* <td>
                      <select
                        className="modal-tbl-inp"
                        value={line.warehouse}
                        onChange={(e) => updateLine(line.lineNumber, 'warehouse', e.target.value)}
                        disabled={locked}
                      >
                        <option value="">Select</option>
                        {movableWarehouseOptions.map((warehouse) => (
                          <option key={warehouse.value} value={warehouse.value}>{warehouse.label}</option>
                        ))}
                      </select>
                    </td> */}
                    <td>
                      <input className="modal-tbl-inp" value={lineUom(line)} placeholder="UoM" disabled />
                    </td>
                    {/* Schedule is the production order's, not the store's — hidden here. */}
                    {/* <td>
                      <input
                        className="modal-tbl-inp"
                        type="date"
                        value={line.startDate}
                        onChange={(e) => updateLine(line.lineNumber, 'startDate', e.target.value)}
                        disabled={locked}
                      />
                    </td>
                    <td>
                      <input
                        className="modal-tbl-inp"
                        type="date"
                        value={line.endDate}
                        onChange={(e) => updateLine(line.lineNumber, 'endDate', e.target.value)}
                        disabled={locked}
                      />
                    </td> */}
                    {/* <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {requiredDays(line.startDate, line.endDate) === '' ? '—' : requiredDays(line.startDate, line.endDate)}
                    </td> */}
                    {/* <td>
                      <select
                        className="modal-tbl-inp"
                        value={line.issueType}
                        onChange={(e) => updateLine(line.lineNumber, 'issueType', e.target.value)}
                        disabled={locked}
                      >
                        {ISSUE_TYPE_OPTIONS.map((issueType) => (
                          <option key={issueType.value} value={issueType.value}>{issueType.label}</option>
                        ))}
                      </select>
                    </td> */}
                    {/* B1 derives the WIP account — read only here. */}
                    {/* <td>
                      <input className="modal-tbl-inp" value={line.wipAccount} placeholder="—" disabled />
                    </td> */}
                    <td style={{ textAlign: 'center' }}>
                      {/* Row 1 is the mandatory component — never removable. */}
                      <button
                        type="button"
                        className="modal-tbl-del"
                        onClick={() => removeLine(line.lineNumber)}
                        disabled={locked || lines.length <= 1}
                        aria-label={`Remove line ${index + 1}`}
                        title={lines.length <= 1 ? 'At least one component is required' : 'Remove line'}
                        style={lines.length <= 1 || locked ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!locked && (
            <button type="button" className="modal-tbl-add" onClick={addLine}>
              + Add Row
            </button>
          )}
        </div>
      </Modal>

      {/* Keyed by the row so reopening always reseeds from that line's batches. */}
      {batchLine && (
        <BatchPicker
          key={batchLine.lineNumber}
          open
          itemCode={batchLine.itemNo}
          itemDescription={batchLine.itemName}
          warehouseCode={form.fromWarehouse}
          quantity={batchLine.transferQuantity}
          value={batchLine.batches}
          batches={lineBatchStock(batchLine)}
          loading={batchLoading}
          readOnly={dispatchLocked}
          onRefresh={() => setBatchReload((count) => count + 1)}
          onApply={(batches) => applyBatches(batchLine.lineNumber, batches)}
          onClose={() => setBatchLineNumber(null)}
        />
      )}

      <RecordPicker
        open={orderPickerOpen}
        onClose={() => setOrderPickerOpen(false)}
        records={releasedOrders}
        codeKey="DocumentNumber"
        // Order No repeats across series — AbsoluteEntry is the real identity.
        idKey="AbsoluteEntry"
        nameKey="ProductDescription"
        codeLabel="Order No"
        nameLabel="Description"
        extraColumns={[
          {
            header: 'Status',
            field: 'ProductionOrderStatus',
            render: (order) => STATUS_LABELS[order.ProductionOrderStatus] ?? order.ProductionOrderStatus,
          },
        ]}
        showSerial
        title="Select Released Production Order"
        subtitle="Only released orders — the selected order fills this dispatch"
        emptyText="No released production orders found."
        selectedCode={form.absoluteEntry}
        onSelect={handleSelectOrder}
      />

      <RecordPicker
        open={productPickerOpen}
        onClose={() => setProductPickerOpen(false)}
        records={productTreeData}
        codeKey="TreeCode"
        nameKey="ProductDescription"
        codeLabel="Item Code"
        nameLabel="Product Description"
        title="Select BOM"
        subtitle="Choose the BOM — its components load into the table below"
        emptyText="No BOMs found."
        selectedCode={form.itemNo}
        onSelect={handleSelectProduct}
        onSapSync={refreshProductTrees}
        sapSyncLabel="SAP Sync"
      />

      <RecordPicker
        open={componentPickerLineId !== null}
        onClose={() => setComponentPickerLineId(null)}
        records={itemMasterData}
        codeKey="ItemCode"
        nameKey="ItemName"
        codeLabel="Item Code"
        nameLabel="Item Name"
        title="Select Component"
        subtitle="Pick one or more items — the first binds to this line, the rest are added as new rows"
        emptyText="No items found."
        isMulti
        selectedCodes={componentPickerSelectedCodes}
        onSelect={handleSelectComponent}
        onSapSync={refreshItemMaster}
        sapSyncLabel="SAP Sync"
      />

      <RecordPicker
        open={customerPickerOpen}
        onClose={() => setCustomerPickerOpen(false)}
        records={businessPartners}
        codeKey="CardCode"
        nameKey="CardName"
        codeLabel="Card Code"
        nameLabel="Card Name"
        title="Select Customer"
        subtitle="Only for a make-to-order store dispatch"
        emptyText="No business partners found."
        selectedCode={form.customerCode}
        onSelect={handleSelectCustomer}
      />

      <Loader fullscreen show={busy} label="Please wait…" />
    </>
  );
};

export default StoreDispatch;
