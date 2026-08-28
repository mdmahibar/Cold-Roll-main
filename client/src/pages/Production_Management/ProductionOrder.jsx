//! This is Production Order Page

import React, { useState, useMemo, useEffect } from 'react';

import { toast } from 'react-toastify';

import ListingPage from '../../components/ListingTable/ListingPage';
import Modal, { TextField, TextareaField, SelectField, DateField, FieldGroup } from '../../components/Modal/Modal';
import Loader from '../../components/Loader/Loader.jsx';
import RecordPicker from '../CollectMilk/RecordPicker.jsx';

//! Zustand
import useItemMasterHook from '../../hooks/useItemMasterHook.js';
import useWarehouseHook from '../../hooks/useWarehouseHook.js';
import useWarehouseStore from '../../store/warehouseStore.js';
import useBusinessPartners from '../../hooks/useBusinessPartners.js';
import useBusinessPartnerStore from '../../store/businessPartnerStore.js';
//! End Zustand

//! custom hooks
import useProductionOrderHook from '../../hooks/useProductionOrderHook.js'
import useProductTreeHook from '../../hooks/useProductTreeHook.js'

//! End custom hooks

import { getProductTreeById } from '../../SAPB1/ProductTrees/ProductTreeServices.js';
import { getItemsByType, getItemWarehouseStock } from '../../SAPB1/Items/ItemServices.js';
import {
  getProductionOrderById,
  createProductionOrder,
  updateProductionOrder,
} from '../../SAPB1/ProductionOrders/ProductionOrderServices.js';
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

// B1 assigns DocumentNumber itself, so the field is display-only until the order exists.
const DOCNUM_PLACEHOLDER = 'Auto Generated From B1';

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

// U_TYPE on the item master — decides which items can be produced here.
const PRODUCT_TYPE_OPTIONS = [
  { value: 'FP', label: 'Finished Product' },
  { value: 'MX', label: 'Mix Product' },
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

const STATUS_BADGES = {
  boposPlanned: { variant: 'warning', label: 'Planned' },
  boposReleased: { variant: 'info', label: 'Released' },
  boposClosed: { variant: 'success', label: 'Closed' },
  boposCancelled: { variant: 'error', label: 'Cancelled' },
};

/* A production order always carries at least one component line.
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
  uomCode: '',
  startDate: '',
  endDate: '',
  issueType: 'im_Manual',
  // B1 derives this from account determination — shown, never posted.
  wipAccount: '',
});

const EMPTY_FORM = {
  absoluteEntry: '',
  documentNumber: DOCNUM_PLACEHOLDER,
  status: 'boposPlanned',
  orderType: 'bopotStandard',
  type: '',
  priority: 100,
  itemNo: '',
  productDescription: '',
  plannedQuantity: '',
  inventoryUOM: '',
  warehouse: '',
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

const ProductionOrder = () => {
  //! zustand
  const { itemMaster: itemMasterData, refreshItemMaster } = useItemMasterHook();
  useWarehouseHook();
  useBusinessPartners();

  const warehouses = useWarehouseStore((state) => state.warehouses);
  const businessPartners = useBusinessPartnerStore((state) => state.businessPartners);
  //! zustand

  //! Custom Hook
  const { productionOrders: productionOrdersData, refreshProductionOrders} = useProductionOrderHook();
  const { productTrees: productTreeData, refreshProductTrees } = useProductTreeHook();

  //! End Custom Hook

  // ProductTreeLines carry only ItemCode — name + stock come from the item master.
  const itemByCode = useMemo(() => {
    const map = new Map();
    itemMasterData.forEach((item) => map.set(item.ItemCode, item));
    return map;
  }, [itemMasterData]);

  // Same formula B1 shows: In Stock − Committed + On Order.
  // const availableQuantity = (itemNo) => {
  //   const item = itemByCode.get(itemNo);
  //   if (!item) return '';
  //   const onStock = Number(item.QuantityOnStock ?? 0);
  //   const committed = Number(item.QuantityOrderedByCustomers ?? 0);
  //   const ordered = Number(item.QuantityOrderedFromVendors ?? 0);
  //   return Number((onStock - committed + ordered).toFixed(4));
  // };

  // B1 sends UoMCode as -1 on a line whose item has no UoM group, so that is
  // "nothing set", not a code — anything else the line carries is used as is.
  const sapUom = (uomCode) => (!uomCode || Number(uomCode) === -1 ? '' : String(uomCode));

  // The line keeps whatever B1 sent; otherwise fall back to the item's own UoM.
  const lineUom = (line) => sapUom(line.uomCode) || itemByCode.get(line.itemNo)?.InventoryUOM || '';

  const warehouseOptions = useMemo(
    () =>
      warehouses.map((warehouse) => ({
        value: warehouse.WarehouseCode,
        label: `${warehouse.WarehouseCode} — ${warehouse.WarehouseName}`,
      })),
    [warehouses]
  );

  const [pending, setPending] = useState(0);
  const busy = pending > 0;

  const [open, setOpen] = useState(false);
  const [action, setAction] = useState('Add');
  const [form, setForm] = useState(EMPTY_FORM);
  const [lines, setLines] = useState([makeEmptyLine()]);

  // In Stock is per warehouse: { itemCode: { warehouseCode: InStock } }.
  const [warehouseStock, setWarehouseStock] = useState({});

  // Fetch ItemWarehouseInfoCollection once per item used on the lines.
  useEffect(() => {
    const missing = [...new Set(lines.map((line) => line.itemNo).filter(Boolean))]
      .filter((itemCode) => !(itemCode in warehouseStock));
    if (missing.length === 0) return;

    missing.forEach(async (itemCode) => {
      let stockByWarehouse = {};
      try {
        const item = await getItemWarehouseStock(itemCode);
        (item?.ItemWarehouseInfoCollection ?? []).forEach((row) => {
          stockByWarehouse[row.WarehouseCode] = Number(row.InStock ?? 0);
        });
      } catch {
        // Cache the miss too, otherwise the effect refetches on every render.
        stockByWarehouse = {};
      }
      setWarehouseStock((prev) => ({ ...prev, [itemCode]: stockByWarehouse }));
    });
  }, [lines, warehouseStock]);

  // Stock of the line's item in the warehouse that line issues from.
  const stockQuantity = (line) => {
    const stockByWarehouse = warehouseStock[line.itemNo];
    if (!stockByWarehouse || !line.warehouse) return '';
    return Number(stockByWarehouse[line.warehouse] ?? 0);
  };

  // Item codes carrying the selected U_TYPE — null means "no type picked yet".
  const [typeItemCodes, setTypeItemCodes] = useState(null);

  // A BOM's TreeCode IS the parent ItemCode, so the type filter applies straight to it.
  const filteredProductTrees = useMemo(() => {
    if (!typeItemCodes) return productTreeData;
    return productTreeData.filter((tree) => typeItemCodes.has(tree.TreeCode));
  }, [productTreeData, typeItemCodes]);

  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  // Which line row asked for the item picker — null means the picker is idle.
  const [componentPickerLineId, setComponentPickerLineId] = useState(null);

  const isView = action === 'View';

  const change = (event) => setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  // Which items the picked type allows — no type means no filter.
  const loadTypeItemCodes = async (type) => {
    if (!type) {
      setTypeItemCodes(null);
      return;
    }
    setPending((p) => p + 1);
    try {
      const items = await getItemsByType(type);
      setTypeItemCodes(new Set(items.map((item) => item.ItemCode)));
    } catch (err) {
      setTypeItemCodes(null);
      toast.error(sapErrorMessage(err, 'Failed to load items for this type'));
    } finally {
      setPending((p) => p - 1);
    }
  };

  // Changing the type drops the old product — that BOM may not belong to the new type.
  const changeType = async (event) => {
    const type = event.target.value;
    setForm((prev) => ({ ...prev, type, itemNo: '', productDescription: '' }));
    setLines([makeEmptyLine()]);
    await loadTypeItemCodes(type);
  };

  /* ── Component lines ────────────────────────────────────────── */

  // A fresh row inherits the header's warehouse and schedule — B1 does the same.
  const addLine = () =>
    setLines((prev) => [
      ...prev,
      { ...makeEmptyLine(prev.length), startDate: form.startDate, endDate: form.dueDate },
    ]);

  const removeLine = (lineNumber) => {
    // B1 rejects a production order with no components.
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
      await refreshProductionOrders();
      toast.success('Synced Production orders from SAP B1');
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
        warehouse: item.DefaultWarehouse || form.warehouse,
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

  /* ── Modal open / close / save ──────────────────────────────── */

  const handleModal = async (act, absoluteEntry = null) => {
    setAction(act);

    if (act === 'Add') {
      setForm({
        ...EMPTY_FORM,
        postingDate: getTodayDate(),
        startDate: getTodayDate(),
        dueDate: getTodayDate(),
      });
      setLines([{ ...makeEmptyLine(), startDate: getTodayDate(), endDate: getTodayDate() }]);
      setTypeItemCodes(null);
      setOpen(true);
      return;
    }

    setPending((p) => p + 1);
    try {
      // Single-entity GET — this is the only call that returns ProductionOrderLines.
      const headers = await getProductionOrderById(absoluteEntry);
      const lineItems = headers.ProductionOrderLines ?? [];

      setForm({
        ...EMPTY_FORM,
        absoluteEntry: headers.AbsoluteEntry ?? '',
        documentNumber: headers.DocumentNumber ?? DOCNUM_PLACEHOLDER,
        status: headers.ProductionOrderStatus ?? 'boposPlanned',
        orderType: headers.ProductionOrderType ?? 'bopotStandard',
        type: headers.U_TYPE ?? '',
        priority: headers.Priority ?? 100,
        itemNo: headers.ItemNo ?? '',
        productDescription: headers.ProductDescription ?? '',
        plannedQuantity: headers.PlannedQuantity ?? '',
        inventoryUOM: headers.InventoryUOM ?? '',
        warehouse: headers.Warehouse ?? '',
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
        uomCode: item.UoMCode ?? '',
        startDate: uiToSapDate(item.StartDate) ?? '',
        endDate: uiToSapDate(item.EndDate) ?? '',
        issueType: item.ProductionOrderIssueType ?? 'im_Manual',
        wipAccount: item.WipAccount ?? '',
      }));
      setLines(mappedLines.length ? mappedLines : [makeEmptyLine()]);
      await loadTypeItemCodes(headers.U_TYPE ?? '');

      setOpen(true);
    } catch (err) {
      toast.error(sapErrorMessage(err, 'Failed to load production order'));
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
    setForm({ ...EMPTY_FORM, documentNumber: form.documentNumber });
    setLines([makeEmptyLine()]);
  };

  const handleSave = async () => {
    // Returning false keeps the modal open so the user's input survives.
    if (!form.itemNo) {
      toast.error('Pick the product (Item No) to be produced.');
      return false;
    }
    if (!(parseFloat(form.plannedQuantity) > 0)) {
      toast.error('Planned Quantity must be greater than zero.');
      return false;
    }
    if (!form.warehouse) {
      toast.error('Warehouse is mandatory — it receives the finished goods.');
      return false;
    }

    const dueDate = uiToSapDate(form.dueDate);
    if (!dueDate) {
      toast.error('Due Date is mandatory.');
      return false;
    }

    // Resolved up front so PostingDate is ALWAYS in the payload — left out,
    // `compact` drops it and B1 silently stamps the document with today.
    const postingDate = uiToSapDate(form.postingDate) ?? getTodayDate();

    const filledLines = lines.filter((line) => line.itemNo);
    if (filledLines.length === 0) {
      toast.error('Add at least one component line.');
      return false;
    }
    const badQuantity = filledLines.find((line) => !(parseFloat(line.plannedQuantity) > 0));
    if (badQuantity) {
      toast.error(`Planned qty for ${badQuantity.itemNo} must be greater than zero.`);
      return false;
    }
    const missingWarehouse = filledLines.find((line) => !line.warehouse);
    if (missingWarehouse) {
      toast.error(`Pick the issue warehouse for ${missingWarehouse.itemNo}.`);
      return false;
    }

    // Send the FULL line array every time — a line left out of a PATCH is
    // deleted by the Service Layer.
    const productionOrderLines = filledLines.map((line, index) =>
      compact({
        // Number by position after the blank rows are dropped, so the array the
        // Service Layer receives is always a gapless 0,1,2… sequence.
        LineNumber: index,
        ItemNo: line.itemNo,
        ItemType: line.itemType || 'pit_Item',
        Warehouse: line.warehouse || undefined,
        BaseQuantity: toNumber(line.baseQuantity) ?? 0,
        PlannedQuantity: toNumber(line.plannedQuantity),
        ProductionOrderIssueType: line.issueType || undefined,
        // Line dates fall back to the header when the row is left blank.
        StartDate: uiToSapDate(line.startDate) ?? uiToSapDate(form.startDate),
        EndDate: uiToSapDate(line.endDate) ?? dueDate,
        // UoM, Open Qty, Required Days and WIP Account are display only —
        // B1 derives them, so posting them back is rejected.
      })
    );

    const payload = compact({
      ItemNo: form.itemNo,
      PlannedQuantity: toNumber(form.plannedQuantity),
      Warehouse: form.warehouse,
      ProductionOrderType: form.orderType || undefined,
      // FP = Finished Product, MX = Mix Product.
      U_TYPE: form.type || undefined,
      // B1 owns the status transitions (Planned → Released → Closed); it rejects
      // an illegal jump, so this is sent as-is and the error surfaces to the user.
      ProductionOrderStatus: form.status || undefined,
      PostingDate: postingDate,
      StartDate: uiToSapDate(form.startDate),
      DueDate: dueDate,
      // Priority: toNumber(form.priority),
      CustomerCode: form.customerCode || undefined,
      DistributionRule: form.distributionRule || undefined,
      Project: form.project || undefined,
      Remarks: form.remarks || undefined,
      JournalRemarks: `Production Order - ${form.itemNo}`,
      ProductionOrderLines: productionOrderLines,
    });

    setPending((p) => p + 1);
    try {
      if (action === 'Add') {
        await createProductionOrder(payload);
      } else {
        await updateProductionOrder(form.absoluteEntry, payload);
      }
      toast.success(`Production order ${action === 'Add' ? 'created' : 'updated'} successfully`);
      // Refresh first so the closing modal reveals an up-to-date table.
      await refreshProductionOrders();
    } catch (err) {
      toast.error(sapErrorMessage(err, `Failed to ${action === 'Add' ? 'create' : 'update'} production order`));
      return false;
    } finally {
      setPending((p) => p - 1);
    }
  };

  /* ── Release (Planned → Released) ────────────────────────────── */

  // The rows waiting for a yes/no — empty means the confirm popup is closed.
  // One array covers both the row action and the toolbar's multi-select.
  const [releaseTargets, setReleaseTargets] = useState([]);

  const askRelease = (record) => {
    if (record.ProductionOrderStatus !== 'boposPlanned') {
      toast.info('Only a planned production order can be released.');
      return;
    }
    setReleaseTargets([record]);
  };

  // Toolbar action — ListingPage hands back the AbsoluteEntry of every ticked row.
  const askReleaseSelected = (selectedKeys) => {
    if (!selectedKeys.length) {
      toast.info('Tick the production orders you want to release.');
      return;
    }
    const picked = productionOrdersData.filter((order) => selectedKeys.includes(order.AbsoluteEntry));
    // Anything already released / closed / cancelled is dropped, not sent to B1.
    const planned = picked.filter((order) => order.ProductionOrderStatus === 'boposPlanned');
    const skipped = picked.length - planned.length;

    if (planned.length === 0) {
      toast.info('Only a planned production order can be released.');
      return;
    }
    if (skipped > 0) toast.info(`${skipped} order(s) skipped — they are not in Planned status.`);
    setReleaseTargets(planned);
  };

  const handleRelease = async () => {
    setPending((p) => p + 1);
    // Sequential, not Promise.all — the Service Layer session handles one
    // document write at a time.
    const failed = [];
    try {
      for (const target of releaseTargets) {
        try {
          await updateProductionOrder(target.AbsoluteEntry, {
            ProductionOrderStatus: 'boposReleased',
          });
        } catch (err) {
          failed.push(target);
          toast.error(sapErrorMessage(err, `Failed to release ${target.DocumentNumber}`));
        }
      }

      const released = releaseTargets.length - failed.length;
      if (released > 0) toast.success(`${released} production order${released > 1 ? 's' : ''} released`);
      await refreshProductionOrders();

      if (failed.length > 0) {
        // Returning false keeps the popup open, narrowed to what still needs retrying.
        setReleaseTargets(failed);
        return false;
      }
    } finally {
      setPending((p) => p - 1);
    }
  };

  const handleDelete = () => {
    // TODO(SAP B1): a production order is cancelled (status boposCancelled),
    // not deleted, once it has been released.
    toast.info('Cancelling a production order is not enabled yet.');
  };

  /* ── Listing config ─────────────────────────────────────────── */

  const columns = [
    { header: 'Order No', field: 'DocumentNumber', type: 'code', isLink: true },
    { header: 'Product', field: 'ItemNo', type: 'text' },
    { header: 'Description', field: 'ProductDescription', type: 'text' },
    { header: 'Planned Qty', field: 'PlannedQuantity', type: 'number' },
    { header: 'Completed Qty', field: 'CompletedQuantity', type: 'number' },
    { header: 'Warehouse', field: 'Warehouse', type: 'text' },
    { header: 'Due Date', field: 'DueDate', type: 'date' },
    { header: 'Status', field: 'ProductionOrderStatus', type: 'badge', badgeMap: STATUS_BADGES },
  ];

  const stats = useMemo(
    () => [
      { label: 'Total Orders', value: productionOrdersData.length, icon: '🏭', iconClass: 'blue', filterKey: 'all' },
      {
        label: 'Planned',
        value: productionOrdersData.filter((order) => order.ProductionOrderStatus === 'boposPlanned').length,
        icon: '📝',
        iconClass: 'amber',
        filterKey: 'planned',
      },
      {
        label: 'Released',
        value: productionOrdersData.filter((order) => order.ProductionOrderStatus === 'boposReleased').length,
        icon: '⚙️',
        iconClass: 'purple',
        filterKey: 'released',
      },
      {
        label: 'Closed',
        value: productionOrdersData.filter((order) => order.ProductionOrderStatus === 'boposClosed').length,
        icon: '✅',
        iconClass: 'green',
        filterKey: 'closed',
      },
    ],
    [productionOrdersData]
  );

  const filterChips = [
    { key: 'all', label: 'All', chipClass: 'lp-chip-blue' },
    { key: 'planned', label: 'Planned', chipClass: 'lp-chip-amber', filterFn: (row) => row.ProductionOrderStatus === 'boposPlanned' },
    { key: 'released', label: 'Released', chipClass: 'lp-chip-purple', filterFn: (row) => row.ProductionOrderStatus === 'boposReleased' },
    { key: 'closed', label: 'Closed', chipClass: 'lp-chip-green', filterFn: (row) => row.ProductionOrderStatus === 'boposClosed' },
    { key: 'cancelled', label: 'Cancelled', chipClass: 'lp-chip-red', filterFn: (row) => row.ProductionOrderStatus === 'boposCancelled' },
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
          title="Production Order"
          subtitle="Plan a finished good and the components its BOM consumes"
          titleIcon="🏭"
          rowData={productionOrdersData}
          columns={columns}
          rowKey="AbsoluteEntry"
          stats={stats}
          filterChips={filterChips}
          defaultFilter="all"
          searchPlaceholder="Search production orders…"
          searchFields={['DocumentNumber', 'ItemNo', 'ProductDescription', 'Warehouse']}
          defaultSortCol="DocumentNumber"
          primaryAction={{ label: '+ New Production Order', onClick: () => handleModal('Add') }}
          onView={(record) => handleModal('View', record.AbsoluteEntry)}
          onEdit={(record) => handleModal('Edit', record.AbsoluteEntry)}
          onDelete={handleDelete}
          rowActions={[
            { icon: '🚀', title: 'Release', label: 'Release', onClick: askRelease },
          ]}
          toolbarActions={[
            {
              label: syncing ? 'Syncing…' : 'SAP B1 Sync',
              icon: syncing ? '⏳' : '🔄',
              onClick: handleSapSync,
              disabled: syncing,
            },
            {
              label: 'Release',
              icon: '🚀',
              onClick: askReleaseSelected,
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
        title={`${action} Production Order`}
        subtitle={`Status: ${STATUS_LABELS[form.status] ?? form.status}`}
        entity="Production Order"
        saveLoading={busy}
        saveDisabled={busy}
      >
        <FieldGroup title="Document" columns={4}>
          <TextField label="Order No" name="documentNumber" value={form.documentNumber} onChange={change} disabled />
          <SelectField
            label="Status"
            name="status"
            value={form.status}
            onChange={change}
            options={ORDER_STATUS_OPTIONS}
            disabled={isView}
          />
          <SelectField
            label="Order Type"
            name="orderType"
            value={form.orderType}
            onChange={change}
            options={ORDER_TYPE_OPTIONS}
            disabled={isView}
          />
          {/* <TextField
            label="Priority"
            name="priority"
            type="number"
            value={form.priority}
            onChange={change}
            hint="1 = highest, 100 = default"
            disabled={isView}
          /> */}
        </FieldGroup>

        <FieldGroup title="Product" columns={4}>
          <SelectField
            label="Type"
            name="type"
            value={form.type}
            onChange={changeType}
            options={PRODUCT_TYPE_OPTIONS}
            placeholder="Select type"
            hint="Filters the items you can produce"
            disabled={isView}
          />
          <TextField
            label="Item No"
            name="itemNo"
            value={form.itemNo}
            onChange={change}
            placeholder="Search BOM"
            hint="Picking a BOM fills the components below"
            required
            disabled={isView}
            suffix={
              !isView && (
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
            disabled={isView}
          />
          <SelectField
            label="Warehouse (FG)"
            name="warehouse"
            value={form.warehouse}
            onChange={change}
            options={warehouseOptions}
            placeholder="Select warehouse"
            required
            disabled={isView}
          />
        </FieldGroup>

        <FieldGroup title="Scheduling" columns={4}>
          <DateField label="Posting Date" name="postingDate" value={form.postingDate} onChange={change} disabled={isView} />
          <DateField label="Start Date" name="startDate" value={form.startDate} onChange={change} disabled={isView} />
          <DateField label="Due Date" name="dueDate" value={form.dueDate} onChange={change} required disabled={isView} />
          {/* <TextField
            label="Customer Code"
            name="customerCode"
            value={form.customerCode}
            onChange={change}
            placeholder="Optional — make to order"
            disabled={isView}
            suffix={
              !isView && (
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
          <TextField label="Distribution Rule" name="distributionRule" value={form.distributionRule} onChange={change} disabled={isView} />
          <TextField label="Project" name="project" value={form.project} onChange={change} disabled={isView} />
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
            disabled={isView}
          />
        </FieldGroup>

        <div className="modal-field-group">
          <div className="modal-field-group-title">Components (BOM)</div>

          <div className="modal-tbl-wrap">
            {/* 14 columns — the table keeps its own width and the wrap scrolls,
                otherwise every input is squeezed to a few characters. */}
            <table className="modal-tbl" style={{ minWidth: 1150, tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: 44, textAlign: 'center' }}>#</th>
                  {/* <th style={{ width: 110 }}>Type</th> */}
                  <th style={{ width: 165 }}>Item No</th>
                  <th style={{ width: 260 }}>Description</th>
                  <th style={{ width: 110, textAlign: 'right' }}>Base Qty</th>
                  {/* <th style={{ width: 100, textAlign: 'right' }}>Base Ratio</th> */}
                  <th style={{ width: 120, textAlign: 'right' }}>Planned Qty</th>
                  {/* <th style={{ width: 110, textAlign: 'right' }}>Available</th> */}
                  <th style={{ width: 105, textAlign: 'right' }}>In Stock</th>
                  {/* <th style={{ width: 105, textAlign: 'right' }}>Issued Qty</th> */}
                  {/* <th style={{ width: 105, textAlign: 'right' }}>Open Qty</th> */}
                  <th style={{ width: 190 }}>Warehouse</th>
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
                        disabled={isView}
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
                          disabled={isView}
                        />
                        {!isView && (
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
                        disabled={isView}
                      />
                    </td>
                    <td>
                      <input
                        className="modal-tbl-inp"
                        type="number"
                        value={line.baseQuantity}
                        onChange={(e) => updateBaseQuantity(line.lineNumber, e.target.value)}
                        placeholder="0"
                        style={{ textAlign: 'right' }}
                        disabled={isView}
                      />
                    </td>
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
                        disabled={isView}
                      />
                    </td>
                    {/* Available / In Stock come from the item master — display only. */}
                    {/* <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {availableQuantity(line.itemNo) === ''
                        ? '—'
                        : availableQuantity(line.itemNo).toLocaleString('en-IN')}
                    </td> */}
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {stockQuantity(line) === ''
                        ? '—'
                        : stockQuantity(line).toLocaleString('en-IN')}
                    </td>
                    {/* <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {Number(line.issuedQuantity || 0).toLocaleString('en-IN')}
                    </td> */}
                    {/* <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {openQuantity(line) === '' ? '—' : Number(openQuantity(line)).toLocaleString('en-IN')}
                    </td> */}
                    <td>
                      <select
                        className="modal-tbl-inp"
                        value={line.warehouse}
                        onChange={(e) => updateLine(line.lineNumber, 'warehouse', e.target.value)}
                        disabled={isView}
                      >
                        <option value="">Select</option>
                        {warehouseOptions.map((warehouse) => (
                          <option key={warehouse.value} value={warehouse.value}>{warehouse.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input className="modal-tbl-inp" value={lineUom(line)} placeholder="UoM" disabled />
                    </td>
                    {/* Line dates are not edited here — they fall back to the header on save. */}
                    {/* <td>
                      <input
                        className="modal-tbl-inp"
                        type="date"
                        value={line.startDate}
                        onChange={(e) => updateLine(line.lineNumber, 'startDate', e.target.value)}
                        disabled={isView}
                      />
                    </td>
                    <td>
                      <input
                        className="modal-tbl-inp"
                        type="date"
                        value={line.endDate}
                        onChange={(e) => updateLine(line.lineNumber, 'endDate', e.target.value)}
                        disabled={isView}
                      />
                    </td> */}
                    {/* <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {requiredDays(line.startDate, line.endDate) === '' ? '—' : requiredDays(line.startDate, line.endDate)}
                    </td> */}
                    {/* Issue Method stays at the line's default (im_Manual / BOM value). */}
                    {/* <td>
                      <select
                        className="modal-tbl-inp"
                        value={line.issueType}
                        onChange={(e) => updateLine(line.lineNumber, 'issueType', e.target.value)}
                        disabled={isView}
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
                        disabled={isView || lines.length <= 1}
                        aria-label={`Remove line ${index + 1}`}
                        title={lines.length <= 1 ? 'At least one component is required' : 'Remove line'}
                        style={lines.length <= 1 || isView ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!isView && (
            <button type="button" className="modal-tbl-add" onClick={addLine}>
              + Add Row
            </button>
          )}
        </div>
      </Modal>

      {/* Small yes/no popup — releases the order the user clicked. */}
      <Modal
        open={releaseTargets.length > 0}
        onClose={() => setReleaseTargets([])}
        onSave={handleRelease}
        // A centered popup, not an inline card: the listing stays visible
        // behind it so the ticked rows are still in view.
        variant="overlay"
        size="sm"
        title={`Release Production Order${releaseTargets.length > 1 ? 's' : ''}`}
        subtitle={`${releaseTargets.length} order${releaseTargets.length > 1 ? 's' : ''} will move Planned → Released`}
        showReset={false}
        saveLabel="Yes, Release"
        cancelLabel="No"
        saveLoading={busy}
        saveDisabled={busy}
      >
        <p style={{ margin: '0 0 8px', lineHeight: 1.6 }}>
          Release the production order{releaseTargets.length > 1 ? 's' : ''} below?
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8, maxHeight: 220, overflowY: 'auto' }}>
          {releaseTargets.map((target) => (
            <li key={target.AbsoluteEntry}>
              <strong>{target.DocumentNumber}</strong> — {target.ItemNo}
            </li>
          ))}
        </ul>
      </Modal>

      <RecordPicker
        open={productPickerOpen}
        onClose={() => setProductPickerOpen(false)}
        records={filteredProductTrees}
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
        subtitle="Only for a make-to-order production order"
        emptyText="No business partners found."
        selectedCode={form.customerCode}
        onSelect={handleSelectCustomer}
      />

      <Loader fullscreen show={busy} label="Please wait…" />
    </>
  );
};

export default ProductionOrder;
