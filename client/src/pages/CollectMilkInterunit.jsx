import React, { useState, useMemo, useEffect } from 'react';

import { toast } from 'react-toastify';

import {
  usePurchaseDeliveryNotes,
  getPurchaseDeliveryNoteById,
  createPurchaseDeliveryNote,
  updatePurchaseDeliveryNote
} from '../SAPB1/PurchaseDeliveryNotes/PurchaseDeliveryNotesServices.js';
import { sapErrorMessage } from '../SAPB1/auth/login.js';

import ListingPage from '../components/ListingTable/ListingPage';
import Modal, { TextField, SelectField, DateField, FieldGroup } from '../components/Modal/Modal';
import Loader from '../components/Loader/Loader.jsx';
import RecordPicker from './CollectMilk/RecordPicker.jsx';
import { useDivision } from '../context/DivisionContext';

//! Test

//! Test

//! Zustand
import useBusinessPartners from '../hooks/useBusinessPartners.js';
import useBusinessPartnerStore from '../store/businessPartnerStore.js';

import useItemMasterHook from '../hooks/useItemMasterHook.js';
import useItemMaster from '../store/itemMasterStore.js';

import useLoginWiseHook from '../hooks/useLoginWiseHook.js'
import useLoginWiseStore from '../store/loginWiseDataStore.js';

import useWarehouseHook from '../hooks/useWarehouseHook.js';
import useWarehouseStore from '../store/warehouseStore.js';

import useStockTransferStore from '../store/stockTransferStore.js';
import useStockTransferHook from '../hooks/useStockTransferHook.js';
import {
  getAllStockTransfers,
  getStockTransferById,
  createStockTransfer,
  updateStockTransfer,
} from '../SAPB1/StockTransfers/StockTransferServices.js';
import { getDocumentSeries } from '../SAPB1/Utils/documentSeries.js';
import { getWarehouseWiseBatchOfItem } from '../services/Batch.js';
import { useCookies } from 'react-cookie';
import { AUTH_COOKIE_LIST } from '../constants/auth.js';

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
// Receiving warehouse for milk collection. Must exist in OWHS.
const DEFAULT_WAREHOUSE = '0108';
// Branch (OBPL). The company runs multi-branch, so B1 rejects a doc without it.
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

const ST_DOCUMENT = '67'; // Stock Transfer document type

/* ── Batch allocation (matching StoreDispatch pattern) ──────────────
   Batch stock is preloaded when fromWarehouse + product changes.
   Typing a quantity auto-spreads FIFO over the available batches. */
const batchKey = (itemCode, warehouseCode) => JSON.stringify([itemCode, warehouseCode]);
const round6 = (value) => Math.round((Number(value) || 0) * 1e6) / 1e6;
const sumBatches = (batches) =>
  round6((batches ?? []).reduce((total, batch) => total + (Number(batch.Quantity) || 0), 0));

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

const EMPTY_FORM = {
  Series: '',
  docentry: '',
  division: '',
  location: '',
  supplier: '',
  date: '',
  vehicleNo: '',
  productCode: '',
  productName: '',
  fromWhsCode: '',
  fromWhsName: '',
  whsCode: '',
  whsName: '',
  shift: '01',
  quantity: '',
  clr: '',
  fat: '',
  snf: '',
  fatRate: '',
  snfRate: '',
  batchNumbers: [],
  totalAmount: '',
  snfKg: '',
  fatKg: '',
};

const PRODUCT_OPTIONS = ['BUFFALO MILK', 'COW MILK'];
const SHIFT_OPTIONS = [
  { value: '01', label: 'Morning' },
  { value: '02', label: 'Evening' },
];

const CollectMilk = () => {
  const { selectedDivision } = useDivision();

  //! zustand
  useBusinessPartners();
  useItemMasterHook();
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

  const itemMasterData = useItemMaster((state) => state.itemMaster)
  const businessPartners = useBusinessPartnerStore((state) => state.businessPartners);

  useWarehouseHook();
  const warehouses = useWarehouseStore((wh) => wh.warehouses);



  //! zustand

  //! Test
  const [cookies] = useCookies(AUTH_COOKIE_LIST);

  // Item master lookup for batch management check
  const itemByCode = useMemo(() => {
    const map = new Map();
    itemMasterData.forEach((item) => map.set(item.ItemCode, item));
    return map;
  }, [itemMasterData]);
  const isBatchManaged = (itemCode) => itemByCode.get(itemCode)?.ManageBatchNumbers === 'tYES';
  const { refreshStockTransfers } = useStockTransferHook();
  const inventories = useStockTransferStore((st) => st.stockTransfers);
  const setInventories = useStockTransferStore((st) => st.setStockTransfers);
  console.log("All inventories =>", inventories);

  // Force a fresh fetch on mount so stale localStorage data (which was fetched
  // before StockTransferLines / UDFs were added to the $select) gets replaced.
  useEffect(() => {
    refreshStockTransfers();
  }, []);

  // The store is persisted, so this button is how the user pulls rows created
  // in B1 since the first load.
  const [syncing, setSyncing] = useState(false);
  const handleSapSync = async () => {
    setSyncing(true);
    try {
      const rows = await getAllStockTransfers();
      setInventories(rows);
      toast.success(`Synced ${rows.length} records from SAP B1`);
    } catch (err) {
      toast.error(sapErrorMessage(err, 'SAP B1 sync failed'));
    } finally {
      setSyncing(false);
    }
  };

  //! Test


  // const { isPending, error, data, refetch } = usePurchaseDeliveryNotes();
  // const list = useMemo(() => data ?? [], [data]);
  const stockTransferRowData = inventories.filter((pdn) => pdn.U_GRPOTYPE === 'M');

  const [pending, setPending] = useState(0);
  const busy = pending > 0;

  const [open, setOpen] = useState(false);
  const [action, setAction] = useState('Add');
  const [form, setForm] = useState(EMPTY_FORM);
  const [seriesOptions, setSeriesOptions] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  const [warehousePickerOpen, setWarehousePickerOpen] = useState(false);
  const [fromWarehousePickerOpen, setFromWarehousePickerOpen] = useState(false);

  //! Batch state (auto-allocation, matching StoreDispatch pattern)
  const [batchStock, setBatchStock] = useState({});
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchReload, setBatchReload] = useState(0);

  const isView = action === 'View';

  // From and To warehouse can never be the same, so each picker hides the other's pick.
  const fromWarehouseOptions = useMemo(
    () => warehouses.filter((w) => w.WarehouseCode !== form.whsCode),
    [warehouses, form.whsCode]
  );
  const toWarehouseOptions = useMemo(
    () => warehouses.filter((w) => w.WarehouseCode !== form.fromWhsCode),
    [warehouses, form.fromWhsCode]
  );

  // Default division / location: if only one option exists, bind it automatically.
  const defaultDivision = divisionOptions.length === 1 ? divisionOptions[0].value : '';
  const defaultLocation = locationOptions.length === 1 ? locationOptions[0].value : '';

  const change = (event) => setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  const handleSelectPartner = (partner) => {
    setForm((prev) => ({
      ...prev,
      cardcode: partner.CardCode,
      cardname: partner.CardName,
      supplier: partner.CardName,
    }));
  };

  const openProductPicker = () => {
    setItems(itemMasterData);
    setProductPickerOpen(true);
  };

  const handleSelectProduct = (item) => {
    setForm((prev) => ({ ...prev, productCode: item.ItemCode, productName: item.ItemName }));
  };

  const handleSelectFromWarehouse = (warehouse) => {
    if (warehouse.WarehouseCode === form.whsCode) {
      toast.error('From and To warehouse cannot be the same.');
      return;
    }
    setForm((prev) => ({ ...prev, fromWhsCode: warehouse.WarehouseCode, fromWhsName: warehouse.WarehouseName }));
  };

  const handleSelectWarehouse = (warehouse) => {
    if (warehouse.WarehouseCode === form.fromWhsCode) {
      toast.error('From and To warehouse cannot be the same.');
      return;
    }
    setForm((prev) => ({ ...prev, whsCode: warehouse.WarehouseCode, whsName: warehouse.WarehouseName }));
  };

  const computed = useMemo(() => {
    const quantity = parseFloat(form.quantity) || 0;
    const fatPercent = parseFloat(form.fat) || 0;
    const snfPercent = parseFloat(form.snf) || 0;
    const fatRate = parseFloat(form.fatRate) || 0;
    const snfRate = parseFloat(form.snfRate) || 0;

    const fatKg = (quantity * fatPercent) / 100;
    const snfKg = (quantity * snfPercent) / 100;
    const totalAmount = fatKg * fatRate + snfKg * snfRate;

    return {
      fatKg: fatKg.toFixed(2),
      snfKg: snfKg.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
    };
  }, [form]);

  const handleModal = async (act, docEntry = null) => {
    setAction(act);

    const defaultSeries = seriesOptions.length === 1 ? seriesOptions[0].value : '';

    if (act === 'Add') {
      setForm({ ...EMPTY_FORM, date: getTodayDate(), division: selectedDivision || defaultDivision, location: defaultLocation });
      // setForm({
      // division: "",
      // location: "",
      // supplier: "",
      // date: "",
      // vehicleNo: "wb65tyh",
      // product: "",
      // shift: "",
      // quantity: "",
      // clr: "",
      // fat: "",
      // snf: "",
      // fatRate: "", 
      // snfRate: "",
      // })
      setOpen(true);
      return;
    }

    setPending((p) => p + 1);
    try {
      const headers = await getStockTransferById(docEntry);
      const line = headers.StockTransferLines?.[0];
      console.log("line", line)
      setForm({
        ...EMPTY_FORM,
        docentry: headers.DocEntry,
        Series: headers.Series != null ? String(headers.Series) : '',
        division: headers.U_DIVISION ?? '',
        location: headers.U_LOCATION ?? '',
        cardcode: headers.CardCode ?? '',
        cardname: headers.CardName ?? '',
        supplier: headers.CardName ?? '',
        date: toSapDate(headers.DocDate) ?? getTodayDate(),
        vehicleNo: headers.U_VECHNUMB ?? '',
        productCode: line?.ItemCode ?? '',
        productName: line?.ItemDescription ?? '',
        shift: headers.U_SHIFT ?? 'Morning',
        quantity: line?.U_QUANTITY ?? line?.Quantity ?? '',
        clr: line?.U_CLR ?? '',
        fat: line?.U_FAT ?? '',
        snf: line?.U_SNF ?? '',
        fatRate: line?.U_FATRATE ?? '',
        snfRate: line?.U_SNFRATE ?? '',
        fromWhsCode: line?.FromWarehouseCode ?? '',
        fromWhsName: warehouses.find((w) => w.WarehouseCode === line?.FromWarehouseCode)?.WarehouseName ?? '',
        whsCode: line?.WarehouseCode ?? '',
        whsName: warehouses.find((w) => w.WarehouseCode === line?.WarehouseCode)?.WarehouseName ?? '',
      });
      setOpen(true);
    } catch (err) {
      toast.error(sapErrorMessage(err, 'Failed to load collection'));
    } finally {
      setPending((p) => p - 1);
    }
  };

  const closeModal = () => {
    setOpen(false);
    setForm(EMPTY_FORM);
  };

  /* ── Batch stock preload (matching StoreDispatch pattern) ──────── */

  // Preload batch stock when fromWarehouse + productCode changes.
  useEffect(() => {
    const warehouseCode = form.fromWhsCode;
    const itemCode = form.productCode;
    if (!open || !warehouseCode || !itemCode) return undefined;
    // Only batch managed items need batch stock
    if (!isBatchManaged(itemCode)) return undefined;

    let cancelled = false;
    const loadBatchStock = async () => {
      setBatchLoading(true);
      try {
        const rows = await getWarehouseWiseBatchOfItem(itemCode, warehouseCode, cookies).catch(() => []);
        if (cancelled) return;

        const stock = {};
        stock[batchKey(itemCode, warehouseCode)] = rows;
        setBatchStock(stock);

        // Auto-allocate if quantity is already entered and not in View mode
        if (!isView && form.quantity) {
          setForm((prev) => ({
            ...prev,
            batchNumbers: allocateBatches(rows, prev.quantity),
          }));
        }
      } finally {
        if (!cancelled) setBatchLoading(false);
      }
    };
    loadBatchStock();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isView, form.fromWhsCode, form.productCode, batchReload]);

  // Auto-allocate batches when quantity changes
  const changeQuantity = (event) => {
    const value = event.target.value;
    setForm((prev) => {
      const next = { ...prev, quantity: value };
      const qty = Number(value) || 0;
      if (qty > 0 && prev.productCode && prev.fromWhsCode && isBatchManaged(prev.productCode)) {
        const stock = batchStock[batchKey(prev.productCode, prev.fromWhsCode)] ?? [];
        next.batchNumbers = allocateBatches(stock, qty);
      } else {
        next.batchNumbers = [];
      }
      return next;
    });
  };
  /* ── End batch stock preload ─────────────────────────────────── */

  const handleSave = async () => {
    if (!form.productCode) {
      toast.error('Please pick a product.');
      return false;
    }

    const quantity = toNumber(form.quantity);
    if (!quantity || quantity <= 0) {
      toast.error('Qty (KG) must be greater than zero.');
      return false;
    }

    if (!form.fromWhsCode || !form.whsCode) {
      toast.error('Please pick both From and To warehouse.');
      return false;
    }
    if (form.fromWhsCode === form.whsCode) {
      toast.error('From and To warehouse cannot be the same.');
      return false;
    }

    const totalAmount = Number.parseFloat(computed.totalAmount) || 0;

    // Batch validation — if the item is batch managed, the allocation must
    // cover the full quantity or B1 rejects with -4014.
    if (isBatchManaged(form.productCode)) {
      const allocated = sumBatches(form.batchNumbers);
      if (allocated < quantity) {
        toast.error(
          `Not enough batch stock for ${form.productCode} in ${form.fromWhsCode} — ` +
          `${allocated} of ${quantity} allocated.`
        );
        return false;
      }
    }

    setPending((p) => p + 1);
    try {
      const batchNumbers = isBatchManaged(form.productCode) && form.batchNumbers?.length
        ? form.batchNumbers
        : undefined;

      const totalAmount = Number.parseFloat(computed.totalAmount) || 0;

      const lineItems = [
        compact({
          LineNum: 0,
          ItemCode: form.productCode,
          ItemDescription: form.productName,
          Quantity: quantity,
          FromWarehouseCode: form.fromWhsCode,
          WarehouseCode: form.whsCode || DEFAULT_WAREHOUSE,
          BatchNumbers: batchNumbers,
          U_QUANTITY: quantity,
          U_FAT: toNumber(form.fat),
          U_SNF: toNumber(form.snf),
          U_CLR: toNumber(form.clr),
          U_TOTAL: toNumber(form.totalAmount),
          U_FATKG: toNumber(form.fatKg),
          U_SNFKG: toNumber(form.snfKg),
          U_CLRKG: toNumber(form.clrKg),
          U_FATRATE: toNumber(form.fatRate),
          U_SNFRATE: toNumber(form.snfRate),
        }),
      ];

      const payload = compact({
        ...(form.Series ? { Series: Number(form.Series) } : {}),
        DocDate: toSapDate(form.date),
        TaxDate: toSapDate(form.date),
        FromWarehouse: form.fromWhsCode,
        ToWarehouse: form.whsCode || DEFAULT_WAREHOUSE,
        U_DIVISION: form.division || undefined,
        U_LOCATION: form.location || undefined,
        U_VECHNUMB: form.vehicleNo || undefined,
        U_SHIFT: form.shift || undefined,
        StockTransferLines: lineItems,
        U_GRPOTYPE: 'M'
      });

      if (action === 'Add') {
        await createStockTransfer(payload);
      } else {
        await updateStockTransfer(form.docentry, payload);
      }
      toast.success(`Collection ${action === 'Add' ? 'created' : 'updated'} successfully`);
      closeModal();
      setPickerOpen(false);
      refreshStockTransfers();
    } catch (err) {
      toast.error(sapErrorMessage(err, `Failed to ${action === 'Add' ? 'create' : 'update'} collection`));
      return false;
    } finally {
      setPending((p) => Math.max(0, p - 1));
    }
  };

  // Fetch Document Series
  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const res = await getDocumentSeries(ST_DOCUMENT);
        const activeSeries = res?.value?.filter((s) => s.Locked === 'tNO') || [];
        const options = activeSeries.map((s) => ({ value: String(s.Series), label: s.Name }));
        setSeriesOptions(options);

        // Auto-select if only one active series
        if (options.length === 1 && !form.Series) {
          setForm((prev) => ({ ...prev, Series: options[0].value }));
        }
      } catch (err) {
        toast.error('Failed to load document series');
      }
    };
    fetchSeries();
  }, []);

  const stats = useMemo(() => {
    return [
      { label: 'Total Collections', value: stockTransferRowData.length, icon: '📋', iconClass: 'blue' },
    ];
  }, [stockTransferRowData]);

  const columns = [
    { header: 'Doc Num', field: 'DocNum', type: 'badge', badgeFn: (value) => ({ variant: 'info', label: value || '—' }) },
    { header: 'Location', field: 'U_LOCATION', render: (_, row) => locationOptions.find(opt => opt.value === row.U_LOCATION)?.label || row.U_LOCATION || '—' },
    { header: 'Date', field: 'DocDate', render: (val) => val ? new Date(val).toLocaleDateString('en-GB') : '—' },
    { header: 'From Whs', field: 'FromWarehouse', type: 'text' },
    { header: 'To Whs', field: 'ToWarehouse', type: 'text' },
    { header: 'Product', field: 'Product', render: (_, row) => row.StockTransferLines?.[0]?.ItemDescription || '—' },
    { header: 'Shift', field: 'U_SHIFT', render: (_, row) => SHIFT_OPTIONS.find(opt => opt.value === row.U_SHIFT)?.label || row.U_SHIFT || '—' },
    { header: 'Qty Kg', field: 'U_QUANTITY', render: (_, row) => row.StockTransferLines?.[0]?.U_QUANTITY || '—' },
    { header: 'Fat%', field: 'U_FAT', render: (_, row) => row.StockTransferLines?.[0]?.U_FAT || '—' },
    { header: 'Snf%', field: 'U_SNF', render: (_, row) => row.StockTransferLines?.[0]?.U_SNF || '—' },
    { header: 'Clr%', field: 'U_CLR', render: (_, row) => row.StockTransferLines?.[0]?.U_CLR || '—' },
    // {
    //   header: 'Total', field: 'U_TOTAL', render: (val, row) => {
    //     // Sometimes U_TOTAL is at header, sometimes line level depending on config. Try both.
    //     const total = row.U_TOTAL || row.StockTransferLines?.[0]?.U_TOTAL || row.StockTransferLines?.[0]?.LineTotal;
    //     return total ? `₹${parseFloat(total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';
    //   }
    // },
  ];

  //   return <Loader label="Loading…" size="sm" />;
  // }

  // if (error) {
  //   return <h1>{error.message}</h1>;
  // }

  return (
    <div style={{ marginTop: '-20px', padding: '0', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {open && (
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          overflow: 'hidden',
          border: '1px solid #e5e7eb'
        }}>
          {/* Blue Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '13px 20px',
            background: '#2563eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                padding: '2px 10px',
                borderRadius: '20px',
                fontSize: '10.5px',
                fontWeight: '700',
                letterSpacing: '.05em',
                textTransform: 'uppercase',
                background: '#ffffff',
                color: '#1d4ed8'
              }}>{isView ? 'VIEW' : action === 'Add' ? 'NEW' : 'EDIT'}</span>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#fff', lineHeight: 1.3 }}>
                {action} Collection Interunit Entry
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={closeModal}
                style={{
                  width: '28px', height: '28px', border: '1px solid rgba(255,255,255,.35)',
                  borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', background: 'transparent', cursor: 'pointer'
                }}
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Form Body */}
          <div style={{ padding: '20px' }}>

            {/* Row 1: Series, Division, Location, From Warehouse */}
            <FieldGroup columns={4}>
              <SelectField
                label="Series"
                name="Series"
                value={form.Series}
                onChange={change}
                options={seriesOptions}
                placeholder="Select series…"
                disabled={isView || action === 'Edit' || seriesOptions.length === 1}
              />
              <SelectField label="Division" name="division" value={form.division} onChange={change} options={divisionOptions} placeholder="Select division" required disabled={isView || divisionOptions.length === 1} />
              <SelectField label="Location" name="location" value={form.location} onChange={change} options={locationOptions} placeholder="Select location" required disabled={isView || locationOptions.length === 1} />
              <TextField
                label="From Warehouse"
                name="fromWhsName"
                value={form.fromWhsName}
                onChange={change}
                placeholder="Search or enter warehouse"
                required
                readOnly
                disabled={isView}
                suffix={
                  !isView && (
                    <button
                      type="button"
                      onClick={() => setFromWarehousePickerOpen(true)}
                      aria-label="Search from warehouse"
                      title="Search from warehouse"
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
                  )
                }
              />
            </FieldGroup>

            {/* Row 2: To Warehouse, Supply Date, Vehicle No, Product */}
            <FieldGroup columns={4}>
              <TextField
                label="To Warehouse"
                name="whsName"
                value={form.whsName}
                onChange={change}
                placeholder="Search or enter warehouse"
                required
                readOnly
                disabled={isView}
                suffix={
                  !isView && (
                    <button
                      type="button"
                      onClick={() => setWarehousePickerOpen(true)}
                      aria-label="Search to warehouse"
                      title="Search to warehouse"
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
                  )
                }
              />
              <DateField label="Supply Date" name="date" value={form.date} onChange={change} required disabled={isView} />
              <TextField label="Vehicle No" name="vehicleNo" value={form.vehicleNo} onChange={change} disabled={isView} />
              <TextField
                label="Product"
                name="productName"
                value={form.productName}
                onChange={change}
                placeholder="Search or enter product"
                required
                readOnly
                disabled={isView}
                suffix={
                  !isView && (
                    <button
                      type="button"
                      onClick={openProductPicker}
                      aria-label="Search products"
                      title="Search products"
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
                  )
                }
              />
            </FieldGroup>

            {/* Quality & Quantity (Shift moved here) */}
            <FieldGroup title="Quality & Quantity" columns={5}>
              <SelectField label="Shift" name="shift" value={form.shift} onChange={change} options={SHIFT_OPTIONS} disabled={isView} />
              <TextField label="Qty (KG)" name="quantity" type="number" value={form.quantity} onChange={changeQuantity} placeholder="0" required disabled={isView} />
              <TextField label="CLR (%)" name="clr" type="number" value={form.clr} onChange={change} placeholder="0.00" disabled={isView} />
              <TextField label="FAT (%)" name="fat" type="number" value={form.fat} onChange={change} placeholder="0.00" disabled={isView} />
              <TextField label="SNF (%)" name="snf" type="number" value={form.snf} onChange={change} placeholder="0.00" disabled={isView} />
            </FieldGroup>

            {/* Rates & Computed */}
            <FieldGroup title="Rates & Computed" columns={4}>
              <TextField label="FAT (KG)" name="fatKg" value={computed.fatKg} inputClass="highlight-blue-input" disabled />
              <TextField label="SNF (KG)" name="snfKg" value={computed.snfKg} inputClass="highlight-blue-input" disabled />
              <TextField label="FAT Rate (₹)" name="fatRate" type="number" value={form.fatRate} onChange={change} placeholder="0.00" disabled={isView} />
              <TextField label="SNF Rate (₹)" name="snfRate" type="number" value={form.snfRate} onChange={change} placeholder="0.00" disabled={isView} />
            </FieldGroup>

          </div>

          {/* Inline Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderTop: '1px solid #e5e7eb',
            background: '#f9fafb'
          }}>
            {/* Total Amount */}
            <div>
              <span style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' }}>Total Amount</span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', letterSpacing: '0.5px', marginTop: '2px' }}>
                ₹{Number(computed.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={closeModal}
                style={{ padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: '1px solid #d7dbe2', background: '#fff', color: '#374151', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={busy}
                style={{ padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: '1px solid #2563eb', background: '#2563eb', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', opacity: busy ? 0.7 : 1 }}
              >
                {busy ? 'Saving...' : '✓ Save & Post to SAP B1'}
              </button>
            </div>
          </div>
        </div>
      )}

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
        open={productPickerOpen}
        onClose={() => setProductPickerOpen(false)}
        records={items}
        codeKey="ItemCode"
        nameKey="ItemName"
        codeLabel="Item Code"
        nameLabel="Item Name"
        title="Select Product / Item"
        subtitle="Choose one item to bind as the product"
        emptyText="No items found."
        loading={itemsLoading}
        selectedCode={form.productCode}
        onSelect={handleSelectProduct}
      />

      {!open && (
        <ListingPage
          title="Collect Milk Inter Unit"
          subtitle="Daily collection · AP Invoice auto-generated per supplier in SAP B1"
          titleIcon="🚚"
          rowData={stockTransferRowData}
          columns={columns}
          rowKey="DocEntry"
          stats={stats}
          searchPlaceholder="Search collections…"
          searchFields={['DocNum', 'CardCode', 'CardName']}
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
        />
      )}

      <RecordPicker
        open={fromWarehousePickerOpen}
        onClose={() => setFromWarehousePickerOpen(false)}
        records={fromWarehouseOptions}
        codeKey="WarehouseCode"
        nameKey="WarehouseName"
        codeLabel="Warehouse Code"
        nameLabel="Warehouse Name"
        title="Select From Warehouse"
        subtitle="Choose the source warehouse to bind its code & name"
        emptyText="No warehouses found."
        selectedCode={form.fromWhsCode}
        onSelect={handleSelectFromWarehouse}
      />

      <RecordPicker
        open={warehousePickerOpen}
        onClose={() => setWarehousePickerOpen(false)}
        records={toWarehouseOptions}
        codeKey="WarehouseCode"
        nameKey="WarehouseName"
        codeLabel="Warehouse Code"
        nameLabel="Warehouse Name"
        title="Select To Warehouse"
        subtitle="Choose the destination warehouse to bind its code & name"
        emptyText="No warehouses found."
        selectedCode={form.whsCode}
        onSelect={handleSelectWarehouse}
      />

      <Loader fullscreen show={busy} label="Please wait…" />

    </div>
  );
};

export default CollectMilk;
