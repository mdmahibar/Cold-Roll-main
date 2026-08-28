import React, { useState, useMemo, useEffect } from 'react';

import { toast } from 'react-toastify';

import {
  // usePurchaseDeliveryNotes,
  getAllPurchaseDeliveryNotes,
  getPurchaseDeliveryNoteById,
  createPurchaseDeliveryNote,
  updatePurchaseDeliveryNote
} from '../../SAPB1/PurchaseDeliveryNotes/PurchaseDeliveryNotesServices.js';
import { getAllWarehouses } from '../../SAPB1/warehouse/warehouseServices.js';
import { getFarmerPriceListById } from '../../SAPB1/FarmerPriceList/FarmerPriceListServices.js';
import { sapErrorMessage } from '../../SAPB1/auth/login.js';

import ListingPage from '../../components/ListingTable/ListingPage';
import Modal, { TextField, SelectField, DateField, FieldGroup } from '../../components/Modal/Modal';
import Loader from '../../components/Loader/Loader.jsx';
import RecordPicker from './RecordPicker.jsx';
import { useDivision } from '../../context/DivisionContext';
import { generateBatchNumber2, generateSerialNumber2 } from '../../common/Function.js';

//! Test

//! Test

//! Zustand
import useBusinessPartners from '../../hooks/useBusinessPartners.js';
import useBusinessPartnerStore from '../../store/businessPartnerStore.js';

import useItemMasterHook from '../../hooks/useItemMasterHook.js';
import useItemMaster from '../../store/itemMasterStore.js';

import useLoginWiseHook from '../../hooks/useLoginWiseHook.js'
import useLoginWiseStore from '../../store/loginWiseDataStore.js';

import useWarehouseHook from '../../hooks/useWarehouseHook.js';
import useWarehouseStore from '../../store/warehouseStore.js';

import useInventoryTransferRequest from '../../store/useInventoryTransferRequestStore.js';
import useInventoryTransferRequestHook from '../../hooks/useInventoryTransferRequestHook.js';

import usePurchaseDeliveryNoteStore from '../../store/purchaseDeliveryNoteStore.js';
import usePurchaseDeliveryNoteHook from '../../hooks/usePurchaseDeliveryNoteHook.js';


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

const EMPTY_FORM = {
  docentry: '',
  division: '',
  location: '',
  cardcode: CARDCODE_PLACEHOLDER,
  cardname: "",
  supplier: '',
  contactPerson: '',
  date: getTodayDate(),
  vehicleNo: '',
  productCode: '',
  productName: '',
  shift: '01',
  quantity: '',
  clr: '',
  fat: '',
  snf: '',
  fatRate: '',
  snfRate: '',
  totalAmount: '',
  whsCode: '',
  whsName: '',
  whsLocation: '',
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
  const setWarehouses = useWarehouseStore((wh) => wh.setWarehouses);



  //! zustand

  //! Test
  useInventoryTransferRequestHook();
  const inventories = useInventoryTransferRequest((itr) => itr.inventoryTransferRequests);
  console.log("All inventories =>", inventories);

  //! Test

  usePurchaseDeliveryNoteHook();
  const purchaseDeliveryNotes = usePurchaseDeliveryNoteStore((pdn) => pdn.purchaseDeliveryNotes);
  const setPurchaseDeliveryNotes = usePurchaseDeliveryNoteStore((pdn) => pdn.setPurchaseDeliveryNotes);
  console.log("All purchase delivery notes =>", purchaseDeliveryNotes);

  // The store is persisted, so this button is how the user pulls rows created
  // in B1 since the first load.
  const [syncing, setSyncing] = useState(false);
  const handleSapSync = async () => {
    setSyncing(true);
    try {
      const rows = await getAllPurchaseDeliveryNotes();
      setPurchaseDeliveryNotes(rows);
      toast.success(`Synced ${rows.length} records from SAP B1`);
    } catch (err) {
      toast.error(sapErrorMessage(err, 'SAP B1 sync failed'));
    } finally {
      setSyncing(false);
    }
  };

  // const { isPending, error, data, refetch } = usePurchaseDeliveryNotes();
  // const list = useMemo(() => data ?? [], [data]);
  const list = purchaseDeliveryNotes.filter((pdn) => pdn.U_GRPOTYPE === 'M');

  const [pending, setPending] = useState(0);
  const busy = pending > 0;

  const [open, setOpen] = useState(false);
  const [action, setAction] = useState('Add');
  const [form, setForm] = useState(EMPTY_FORM);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [farmerPriceList, setFarmerPriceList] = useState(null);

  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  const [warehousePickerOpen, setWarehousePickerOpen] = useState(false);

  const isView = action === 'View';

  // Default division / location: if only one option exists, bind it automatically.
  const defaultDivision = divisionOptions.length === 1 ? divisionOptions[0].value : '';
  const defaultLocation = locationOptions.length === 1 ? locationOptions[0].value : '';

  const change = (event) => setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  const handleSelectPartner = async (partner) => {
    setForm((prev) => ({
      ...prev,
      cardcode: partner.CardCode,
      cardname: partner.CardName,
      supplier: partner.CardName,
      contactPerson: partner.ContactPerson ?? '',
    }));
    try {
      const priceList = await getFarmerPriceListById(partner.CardCode);
      setFarmerPriceList(priceList);
      console.log('Farmer Price List =>', priceList);
    } catch (err) {
      console.error('Failed to fetch farmer price list:', err);
      setFarmerPriceList(null);
    }
  };

  const openProductPicker = () => {
    setItems(itemMasterData.filter(item => item.U_TYPE === 'BM' || item.U_TYPE === 'CM'));
    setProductPickerOpen(true);
  };

  const handleSelectProduct = (item) => {
    setForm((prev) => ({ ...prev, productCode: item.ItemCode, productName: item.ItemName }));
  };

  const handleSelectWarehouse = (warehouse) => {
    setForm((prev) => ({ ...prev, whsCode: warehouse.WarehouseCode, whsName: warehouse.WarehouseName, whsLocation: warehouse.Location ?? '' }));
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

  const filteredWarehouses = useMemo(() => {
    if (!form.location) return warehouses;
    return warehouses.filter((w) => w.U_LOCATION === form.location);
  }, [warehouses, form.location]);

  const filteredBusinessPartners = useMemo(() => {
    if (!form.location) return businessPartners;
    return businessPartners.filter((bp) => {
      return bp.ContactEmployees?.some(contact => contact.Remarks1 === form.location);
    });
  }, [businessPartners, form.location]);

  const handleModal = async (act, docEntry = null) => {
    setAction(act);

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
      const headers = await getPurchaseDeliveryNoteById(docEntry);
      const line = headers.DocumentLines?.[0];
      // Every field below must match the Service Layer schema exactly; a typo
      // reads back as undefined and silently blanks the input.
      const loadedClr = line?.U_CLR ?? '';
      const loadedFat = line?.U_FAT ?? '';
      const computedSnf = (loadedClr !== '' && loadedFat !== '')
        ? ((Number(loadedClr) / 4) + (0.25 * Number(loadedFat)) + 0.44).toFixed(2)
        : '';

      setForm({
        ...EMPTY_FORM,
        docentry: headers.DocEntry,
        division: headers.U_DIVISION ?? '',
        location: headers.U_LOCATION ?? '',
        cardcode: headers.CardCode ?? '',
        cardname: headers.CardName ?? '',
        supplier: headers.CardName ?? '',
        date: toSapDate(headers.DocDate) ?? getTodayDate(),
        vehicleNo: headers.U_VECHNUMB ?? '',
        productCode: line?.ItemCode ?? '',
        productName: line?.ItemDescription ?? '',
        shift: headers.U_SHIFT ?? '01',
        quantity: line?.U_QUANTITY ?? line?.Quantity ?? '',
        clr: loadedClr,
        fat: loadedFat,
        snf: computedSnf,
        fatRate: line?.U_FATRATE ?? '',
        snfRate: line?.U_SNFRATE ?? '',
        whsCode: line?.WarehouseCode ?? '',
        whsName: warehouses.find((w) => w.WarehouseCode === line?.WarehouseCode)?.WarehouseName ?? '',
        whsLocation: warehouses.find((w) => w.WarehouseCode === line?.WarehouseCode)?.Location ?? '',
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

  const handleSave = async () => {
    // if (!form.supplier || !form.quantity) {
    //   toast.error('Please fill in Supplier and Qty (KG).');
    //   return;
    // }
    if (!form.cardcode || form.cardcode === CARDCODE_PLACEHOLDER) {
      toast.error('Please pick a supplier so the Card Code is bound from SAP.');
      return;
    }
    if (!form.productCode) {
      toast.error('Please pick a product.');
      return;
    }

    const quantity = toNumber(form.quantity);
    if (!quantity || quantity <= 0) {
      toast.error('Qty (KG) must be greater than zero.');
      return;
    }

    // Amount is derived from FAT/SNF, so the per-KG price is amount / quantity.
    const totalAmount = Number.parseFloat(computed.totalAmount) || 0;
    const unitPrice = quantity > 0 ? totalAmount / quantity : 0;

    const lineItems = [
      compact({
        LineNum: 0,
        ItemCode: form.productCode,
        ItemDescription: form.productName,
        Quantity: quantity,
        UnitPrice: unitPrice,
        WarehouseCode: form.whsCode || DEFAULT_WAREHOUSE,
        WarehouseName: form.whsName,
        U_QUANTITY: quantity,
        U_CLR: toNumber(form.clr),
        U_FAT: toNumber(form.fat),
        U_SNF: toNumber(form.snf),
        U_FATRATE: toNumber(form.fatRate),
        U_SNFRATE: toNumber(form.snfRate),
        U_TOTAL: totalAmount,
        LineTotal: totalAmount,
        U_FATKG: toNumber(computed.fatKg),
        U_SNFKG: toNumber(computed.snfKg),
        LocationCode: form.whsLocation || 1,
        CostingCode: form.division || undefined,
        CostingCode2: form.location || undefined,
        // TaxCode: 'IGST@0',
        // BatchNumbers: generateBatchNumber2(1),
        // SerialNumbers: generateSerialNumber2(1),
        BatchNumbers: [
          {
            "BatchNumber": generateBatchNumber2(1)[0],
            "Quantity": quantity,
          },
        ]
      })
    ];

    const payload = compact({
      CardCode: form.cardcode,
      DocDate: toSapDate(form.date),
      DocDueDate: toSapDate(form.date),
      TaxDate: toSapDate(form.date),
      BPL_IDAssignedToInvoice: DEFAULT_BRANCH,
      U_DIVISION: form.division || undefined,
      U_LOCATION: form.location || undefined,
      U_VECHNUMB: form.vehicleNo || undefined,
      U_SHIFT: form.shift || undefined,
      DocumentLines: lineItems,

    });
    setPending((p) => p + 1);
    try {
      if (action === 'Add') {
        await createPurchaseDeliveryNote(payload);
      } else {
        // await updateBusinessPartner(form.CardCode, payload);
        await updatePurchaseDeliveryNote(form.docentry, payload);
      }
      toast.success(`Collection ${action === 'Add' ? 'created' : 'updated'} successfully`);
      setOpen(false);
      setForm(EMPTY_FORM);
      handleSapSync();
    } catch (err) {
      toast.error(sapErrorMessage(err, `Failed to ${action === 'Add' ? 'create' : 'update'} collection`));
      return false;
    } finally {
      setPending((p) => p - 1);
    }
  };

  const stats = useMemo(() => {
    let totalAmount = 0;
    list.forEach((record) => {
      totalAmount += parseFloat(record.DocTotal) || 0;
    });
    return [
      { label: 'Total Collections', value: list.length, icon: '📋', iconClass: 'blue' },
      {
        label: 'Total Amount',
        value: `₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        icon: '₹',
        iconClass: 'amber',
      },
    ];
  }, [list]);

  const columns = [
    { header: 'Doc Num', field: 'DocNum', type: 'badge', badgeFn: (value) => ({ variant: 'info', label: value || '—' }) },
    { header: 'Location', field: 'U_LOCATION', render: (_, row) => locationOptions.find(opt => opt.value === row.U_LOCATION)?.label || row.U_LOCATION || '—' },
    { header: 'Date', field: 'DocDate', render: (val) => val ? new Date(val).toLocaleDateString('en-GB') : '—' },
    { header: 'Card Code', field: 'CardCode', type: 'text' },
    { header: 'Card Name', field: 'CardName', type: 'text' },
    { header: 'Product', field: 'Product', render: (_, row) => row.DocumentLines?.[0]?.ItemDescription || '—' },
    { header: 'Shift', field: 'U_SHIFT', render: (_, row) => SHIFT_OPTIONS.find(opt => opt.value === row.U_SHIFT)?.label || row.U_SHIFT || '—' },
    { header: 'Qty Kg', field: 'U_QUANTITY', render: (_, row) => row.DocumentLines?.[0]?.U_QUANTITY || '—' },
    { header: 'Fat%', field: 'U_FAT', render: (_, row) => row.DocumentLines?.[0]?.U_FAT || '—' },
    {
      header: 'SNF%', field: 'U_SNF', render: (_, row) => {
        const line = row.DocumentLines?.[0];
        const clr = line?.U_CLR;
        const fat = line?.U_FAT;
        return (clr != null && fat != null)
          ? ((Number(clr) / 4) + (0.25 * Number(fat)) + 0.44).toFixed(2)
          : '—';
      }
    },
    { header: 'Amount', field: 'DocTotal', type: 'currency', align: 'right' },
  ];

  // if (isPending) {
  //   return <Loader label="Loading…" size="sm" />;
  // }

  // if (error) {
  //   return <h1>{error.message}</h1>;
  // }

  //! Milk Calculation Function
  // const milkCalculation = () => {
  //   const snfpercent = (form.clr / 4) + (0.25 * form.fat) + 0.44;
  //   const fatRate = (form.fat >= farmerPriceList?.U_CWSPRT) ? farmerPriceList?.SAS_MR_FRMPRCLCollection?.[0]?.U_FATRATE : farmerPriceList?.SAS_MR_FRMPRCLCollection?.[0]?.U_FATBRATE;
  //   const snfRate = (form.fat >= farmerPriceList?.U_CWSPRT)? farmerPriceList?.SAS_MR_FRMPRCLCollection?.[0]?.U_SNFRATE : farmerPriceList?.SAS_MR_FRMPRCLCollection?.[0]?.U_SNFBRATE;
  //   setForm((prev) => ({ ...prev, snf: snfpercent.toFixed(2), fatRate: fatRate?.toFixed(2) ?? '0.00', snfRate: snfRate?.toFixed(2) ?? '0.00' }));
  // }

  const milkCalculation = (event) => {
    const fieldName = event.target.name;
    const fieldValue = event.target.value;

    const clr = fieldName === 'clr'
      ? parseFloat(fieldValue) || 0
      : parseFloat(form.clr) || 0;

    const fat = fieldName === 'fat'
      ? parseFloat(fieldValue) || 0
      : parseFloat(form.fat) || 0;

    const snfPercent = (clr / 4) + (0.25 * fat) + 0.44;

    const priceList = farmerPriceList?.SAS_MR_FRMPRCLCollection?.[0];

    const fatRate = fat >= Number(farmerPriceList?.U_CWSPRT)
      ? priceList?.U_FATRATE
      : priceList?.U_FATBRATE;

    const snfRate = fat >= Number(farmerPriceList?.U_CWSPRT)
      ? priceList?.U_SNFRATE
      : priceList?.U_SNFBRATE;

    setForm((prev) => ({
      ...prev,
      [fieldName]: fieldValue,
      snf: snfPercent.toFixed(2),
      fatRate: fatRate != null ? Number(fatRate).toFixed(2) : '0.00',
      snfRate: snfRate != null ? Number(snfRate).toFixed(2) : '0.00',
    }));
  };

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
                {action} Collection Entry
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

            {/* Row 1: Division, Location, Supplier */}
            <FieldGroup columns={4}>
              <SelectField label="Division" name="division" value={form.division} onChange={change} options={divisionOptions} placeholder="Select division" required disabled={isView || divisionOptions.length === 1} />
              <SelectField label="Location" name="location" value={form.location} onChange={change} options={locationOptions} placeholder="Select location" required disabled={isView || locationOptions.length === 1} />
              <TextField
                label="Warehouse"
                name="whsName"
                value={form.whsName}
                onChange={change}
                placeholder="Search or enter warehouse"
                required
                disabled={isView}
                suffix={
                  !isView && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const data = await getAllWarehouses();
                          setWarehouses(data);
                        } catch (e) {
                          console.error('Failed to refresh warehouses', e);
                        }
                        setWarehousePickerOpen(true);
                      }}
                      aria-label="Search warehouses"
                      title="Search warehouses"
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
              <TextField
                label="Supplier / Creditor"
                name="supplier"
                value={form.supplier}
                onChange={change}
                placeholder="Search or enter supplier"
                required
                disabled={isView}
                suffix={
                  !isView && (
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      aria-label="Search suppliers"
                      title="Search suppliers"
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

            <FieldGroup columns={5}>
              <TextField label="Farmer Aggregate Threshold" name="farmerPP" value={farmerPriceList?.U_CWSPRT ?? ''} onChange={change} disabled />
              <TextField label="Farmer Aggregate Rate" name="farmerPP" value={farmerPriceList?.SAS_MR_FRMPRCLCollection?.[0]?.U_FATRATE ?? 0} onChange={change} disabled />
              <TextField label="Farmer Below Rate" name="farmerPP" value={farmerPriceList?.SAS_MR_FRMPRCLCollection?.[0]?.U_FATBRATE ?? 0} onChange={change} disabled />
              <TextField label="CardCode" name="cardcode" value={form.cardcode} onChange={change} disabled />
              <TextField label="Contact Person" name="contactPerson" value={form.contactPerson} onChange={change} disabled />
            </FieldGroup>

            {/* Row 2: Supply Date, Vehicle No, Product, Shift */}
            <FieldGroup columns={4}>
              <DateField label="Supply Date" name="date" value={form.date} onChange={change} required disabled={isView} />
              <TextField label="Vehicle No" name="vehicleNo" value={form.vehicleNo} onChange={change} disabled={isView} />
              <TextField
                label="Product"
                name="productName"
                value={form.productName}
                onChange={change}
                placeholder="Search or enter product"
                required
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
              <SelectField label="Shift" name="shift" value={form.shift} onChange={change} options={SHIFT_OPTIONS} disabled={isView} />
            </FieldGroup>

            {/* Quality & Quantity */}
            <FieldGroup title="Quality & Quantity" columns={4}>
              <TextField label="Qty (KG)" name="quantity" type="number" value={form.quantity} onChange={change} placeholder="0" required disabled={isView} />
              <TextField label="CLR (%)" name="clr" type="number" value={form.clr} onChange={(e) => { milkCalculation(e) }} placeholder="0.00" disabled={isView} />
              <TextField label="FAT (%)" name="fat" type="number" value={form.fat} onChange={(e) => { milkCalculation(e) }} placeholder="0.00" disabled={isView} />
              <TextField label="SNF (%)" name="snf" type="number" value={form.snf} onChange={change} placeholder="0.00" disabled />
            </FieldGroup>

            {/* Rates & Computed */}
            <FieldGroup title="Rates & Computed" columns={4}>
              <TextField label="FAT (KG)" name="fatKg" value={computed.fatKg} inputClass="highlight-blue-input" disabled />
              <TextField label="SNF (KG)" name="snfKg" value={computed.snfKg} inputClass="highlight-blue-input" disabled />
              <TextField label="FAT Rate (₹)" name="fatRate" type="number" value={form.fatRate} onChange={change} placeholder="0.00" disabled />
              <TextField label="SNF Rate (₹)" name="snfRate" type="number" value={form.snfRate} onChange={change} placeholder="0.00" disabled />
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

      {!open && (
        <ListingPage
          title="Collection Records"
          subtitle="View and manage previous milk collection entries"
          titleIcon="📄"
          rowData={list}
          columns={columns}
          rowKey="DocEntry"
          stats={stats}
          searchPlaceholder="Search records…"
          searchFields={['DocNum', 'CardCode', 'CardName']}
          defaultSortCol="DocNum"
          defaultSortDir="desc"
          defaultSortDiv=""
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
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        records={filteredBusinessPartners}
        codeKey="CardCode"
        nameKey="CardName"
        codeLabel="Card Code"
        nameLabel="Card Name"
        title="Select Supplier / Business Partner"
        subtitle="Choose one business partner to bind its Card Code & Card Name"
        emptyText="No business partners found."
        selectedCode={form.cardcode}
        onSelect={handleSelectPartner}
        extraColumns={[
          { header: 'Contact Person', field: 'ContactPerson' },
          { header: 'Phone No', field: 'Phone1' }
        ]}
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

      <RecordPicker
        open={warehousePickerOpen}
        onClose={() => setWarehousePickerOpen(false)}
        records={filteredWarehouses}
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
    </div>
  );
};

export default CollectMilk;
