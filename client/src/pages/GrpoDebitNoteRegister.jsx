import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useDivision } from '../context/DivisionContext.jsx';
import { toast } from 'react-toastify';

import {
  getPurchaseDeliveryNoteById,
  createPurchaseDeliveryNote,
  updatePurchaseDeliveryNote
} from '../SAPB1/PurchaseDeliveryNotes/PurchaseDeliveryNotesServices.js';
import { sapErrorMessage } from '../SAPB1/auth/login.js';
import { getSapAll } from '../SAPB1/auth/login.js';
import { getDocumentSeries } from '../SAPB1/Utils/documentSeries.js';
import { getPendingPurchaseOrdersForGRPO } from '../SAPB1/PurchaseOrders/PurchaseOrderRegisterService.js';

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

import usePurchaseDeliveryNoteHook from '../hooks/usePurchaseDeliveryNoteHook.js';

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

// Purchase Delivery Notes (GRPO) are document type "20" in SAP's series service.
const GRPO_DOCUMENT = '20';

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
  return Number.isFinite(parsed)
    ? parsed.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—';
};

const EMPTY_LINE = {
  itemCode: '',
  itemName: '',
  uom: '',
  quantity: '',
  unitPrice: '',
  discountPercent: '',
  taxCode: '',
  taxRate: 0,
  lineTax: '',
  warehouseCode: '',
  batchNumber: '',
  lineTotal: '',
};

const EMPTY_FORM = {
  docentry: '',
  docnum: '',
  Series: '',
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
  transactionType: '1', // 1: Stand Alone, 2: Copy From Purchase Order
  // Document Summary fields
  discountPercent: '',
  freightList: [],
  roundingOff: '',
  // Derived / read-only
  poValue: '',
  lineItems: [{ ...EMPTY_LINE }],
};

const STATUS_OPTIONS = ['Open', 'Partially Recv.', 'Closed'];
const TRANSACTION_TYPE_OPTIONS = [
  { value: '1', label: 'Stand Alone' },
  { value: '2', label: 'Copy From Purchase Order' }
];

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

const FreightModal = ({ open, onClose, expenseOptions, taxOptions, initialFreightList, onSave }) => {
  const [freightList, setFreightList] = useState([]);

  useEffect(() => {
    if (open) {
      setFreightList([...initialFreightList]);
    }
  }, [open, initialFreightList]);

  const handleAddRow = () => {
    setFreightList([...freightList, { ExpenseCode: '', LineTotal: 0, TaxCode: '', TaxSum: 0 }]);
  };

  const handleRemoveRow = (index) => {
    const nextList = [...freightList];
    nextList.splice(index, 1);
    setFreightList(nextList);
  };

  const handleChange = (index, field, value) => {
    const nextList = [...freightList];
    const row = { ...nextList[index], [field]: value };

    // Auto-calculate TaxSum when LineTotal or TaxCode changes
    if (field === 'LineTotal' || field === 'TaxCode') {
      const amount = parseFloat(row.LineTotal) || 0;
      const taxRate = taxOptions.find(t => t.value === row.TaxCode)?.rate || 0;
      row.TaxSum = amount * (taxRate / 100);
    }

    nextList[index] = row;
    setFreightList(nextList);
  };

  return (
    <Modal open={open} onClose={onClose} title="Freight List" size="lg" variant="overlay" saveLabel="Save" onSave={() => { onSave(freightList); onClose(); }}>
      <div style={{ padding: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e2e4e9' }}>
              <th style={{ padding: '10px' }}>No.</th>
              <th style={{ padding: '10px' }}>Expense Code</th>
              <th style={{ padding: '10px' }}>Amount</th>
              <th style={{ padding: '10px' }}>Tax</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Tax Value</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Gross Amount</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {freightList.map((row, i) => {
              const amount = parseFloat(row.LineTotal) || 0;
              const tax = parseFloat(row.TaxSum) || 0;
              return (
                <tr key={i} style={{ borderBottom: '1px solid #e2e4e9' }}>
                  <td style={{ padding: '10px' }}>{i + 1}</td>
                  <td style={{ padding: '10px' }}>
                    <select
                      value={row.ExpenseCode}
                      onChange={(e) => handleChange(i, 'ExpenseCode', Number(e.target.value))}
                      style={{ width: '100%', padding: '6px', border: '1px solid #dfe3e8', borderRadius: 4 }}
                    >
                      <option value="">Select Expense...</option>
                      {expenseOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.value} - {opt.label}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <input
                      type="number"
                      value={row.LineTotal}
                      onChange={(e) => handleChange(i, 'LineTotal', e.target.value)}
                      style={{ width: '100%', padding: '6px', border: '1px solid #dfe3e8', borderRadius: 4 }}
                    />
                  </td>
                  <td style={{ padding: '10px' }}>
                    <select
                      value={row.TaxCode}
                      onChange={(e) => handleChange(i, 'TaxCode', e.target.value)}
                      style={{ width: '100%', padding: '6px', border: '1px solid #dfe3e8', borderRadius: 4 }}
                    >
                      <option value="">Select Tax...</option>
                      {taxOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label} ({opt.rate}%)</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>{tax.toFixed(2)}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>{(amount + tax).toFixed(2)}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <button type="button" onClick={() => handleRemoveRow(i)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>✖</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ marginTop: 12 }}>
          <button type="button" onClick={handleAddRow} style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>+ Add Row</button>
        </div>
      </div>
    </Modal>
  );
};


const GrpoDebitNoteRegister = () => {

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
  const { purchaseDeliveryNotes, refreshPurchaseDeliveryNotes } = usePurchaseDeliveryNoteHook();
  const { selectedDivision } = useDivision();
  //! End Custom Hook

  const loginUser = loginWiseData?.data?.[0] ?? null;

  const filteredItemMasterData = useMemo(() => {
    return itemMasterData?.filter((item) => item.U_TYPE === 'OR') || [];
  }, [itemMasterData]);

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
      await refreshPurchaseDeliveryNotes();
      toast.success('Synced GRPO records from SAP B1');
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

  // ── Document Series ──────────────────────────────────────────────────────
  const [seriesOptions, setSeriesOptions] = useState([]);

  const fetchSeries = async () => {
    setPending((p) => p + 1);
    try {
      const res = await getDocumentSeries(GRPO_DOCUMENT);
      const list = Array.isArray(res) ? res : res?.value ?? [];
      setSeriesOptions(list.map((s) => ({ value: String(s.Series), label: s.Name })));
    } catch (err) {
      toast.error(err.message || 'Failed to load document series');
    } finally {
      setPending((p) => p - 1);
    }
  };

  const defaultSeries = seriesOptions.length === 1 ? seriesOptions[0].value : '';

  // ── Tax Codes ───────────────────────────────────────────────────────────
  const [taxOptions, setTaxOptions] = useState([]);

  const fetchTaxCodes = async () => {
    try {
      const res = await getSapAll("/SalesTaxCodes?$select=Code,Name,Rate");
      const list = Array.isArray(res) ? res : res?.value ?? [];
      setTaxOptions(list.map((t) => ({ value: t.Code, label: `${t.Code}`, rate: t.Rate ?? 0 })));
    } catch (err) {
      // Non-critical — the user can still type a tax code manually.
      console.warn('Failed to load tax codes', err);
    }
  };

  // ── Expense Codes (Freight) ─────────────────────────────────────────────
  const [expenseOptions, setExpenseOptions] = useState([]);
  const [isFreightModalOpen, setIsFreightModalOpen] = useState(false);

  const fetchExpenseCodes = async () => {
    try {
      const res = await getSapAll("/AdditionalExpenses?$select=ExpensCode,Name");
      const list = Array.isArray(res) ? res : res?.value ?? [];
      setExpenseOptions(list.map((e) => ({ value: e.ExpensCode, label: e.Name })));
    } catch (err) {
      console.warn('Failed to load expense codes', err);
    }
  };

  useEffect(() => {
    fetchSeries();
    fetchTaxCodes();
    fetchExpenseCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Which line row asked for the item picker — null means the picker is idle.
  const [itemPickerIndex, setItemPickerIndex] = useState(null);

  const [warehousePickerOpen, setWarehousePickerOpen] = useState(false);

  // ── Copy From Purchase Order state ──────────────────────────────────────
  const [poPickerOpen, setPoPickerOpen] = useState(false);
  const [pendingPOs, setPendingPOs] = useState([]);
  const [pendingPOsLoading, setPendingPOsLoading] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);      // the PO object the user clicked
  const [selectedPOLines, setSelectedPOLines] = useState([]); // checkboxes for PO line items

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
        const priceAfterDisc = unitPrice * (1 - discount / 100);
        updated.lineTotal = (quantity * priceAfterDisc).toFixed(2);
        // Recalculate line tax when qty/price/discount changes.
        const taxRate = parseFloat(updated.taxRate) || 0;
        updated.lineTax = taxRate > 0 ? Number((priceAfterDisc * quantity * taxRate / 100).toFixed(2)) : updated.lineTax;
        return updated;
      }),
    }));
  };

  // ── Item picker for line items ──────────────────────────────────────────────

  const handleSelectItem = (selection) => {
    if (itemPickerIndex === null) return;
    const items = Array.isArray(selection) ? selection : [selection];
    if (items.length === 0) return;

    const [first, ...rest] = items;

    setForm((prev) => {
      const updated = prev.lineItems.map((line, index) =>
        index === itemPickerIndex
          ? { ...line, itemCode: first.ItemCode, itemName: first.ItemName, uom: first.PurchaseUnit ?? first.MeasureUnit ?? '' }
          : line
      );
      const added = rest.map((item) => ({
        ...EMPTY_LINE,
        itemCode: item.ItemCode,
        itemName: item.ItemName,
        uom: item.PurchaseUnit ?? item.MeasureUnit ?? '',
      }));
      return {
        ...prev,
        lineItems: [...updated, ...added],
      };
    });

    setItemPickerIndex(null);
  };

  const itemPickerSelectedCodes = useMemo(() => {
    const current = form.lineItems[itemPickerIndex]?.itemCode;
    return current ? [current] : [];
  }, [form.lineItems, itemPickerIndex]);

  // ── Conditional item picker (Stand Alone vs Copy From PO) ──────────────────

  const handleItemSearch = async (index) => {
    if (form.transactionType === '2') {
      // Copy From Purchase Order — open PO picker instead
      if (!form.cardcode || form.cardcode === CARDCODE_PLACEHOLDER) {
        toast.warning('Please select a Supplier first before copying from Purchase Order.');
        return;
      }
      setPendingPOsLoading(true);
      setPoPickerOpen(true);
      setSelectedPO(null);
      setSelectedPOLines([]);
      try {
        const pos = await getPendingPurchaseOrdersForGRPO(form.cardcode);
        setPendingPOs(pos);
      } catch (err) {
        toast.error(sapErrorMessage(err, 'Failed to fetch pending Purchase Orders'));
        setPendingPOs([]);
      } finally {
        setPendingPOsLoading(false);
      }
    } else {
      // Stand Alone — open normal item picker
      setItemPickerIndex(index);
    }
  };

  // When the user clicks a PO in the picker, show its lines
  const handlePOSelect = (po) => {
    setSelectedPO(po);
    setSelectedPOLines([]); // reset line selection when switching PO
  };

  // Toggle a PO line item checkbox
  const togglePOLine = (lineNum) => {
    setSelectedPOLines((prev) =>
      prev.includes(lineNum) ? prev.filter((n) => n !== lineNum) : [...prev, lineNum]
    );
  };

  // Toggle all PO line items
  const toggleAllPOLines = () => {
    if (!selectedPO) return;
    const allLineNums = (selectedPO.DocumentLines || []).map((l) => l.LineNum);
    const allSelected = allLineNums.every((n) => selectedPOLines.includes(n));
    setSelectedPOLines(allSelected ? [] : allLineNums);
  };

  // Confirm the PO line selection — copy them into the GRPO form
  const handleConfirmPOLines = () => {
    if (!selectedPO || selectedPOLines.length === 0) {
      toast.warning('Please select at least one line item from the Purchase Order.');
      return;
    }
    const poLines = (selectedPO.DocumentLines || []).filter((l) =>
      selectedPOLines.includes(l.LineNum)
    );
    const newLines = poLines.map((line) => ({
      itemCode: line.ItemCode ?? '',
      itemName: line.ItemDescription ?? '',
      uom: line.MeasureUnit ?? '',
      quantity: line.RemainingOpenQuantity ?? line.Quantity ?? '',
      unitPrice: line.UnitPrice ?? '',
      discountPercent: line.DiscountPercent ?? '',
      taxCode: line.TaxCode ?? '',
      taxRate: line.TaxPercentagePerRow ?? 0,
      lineTax: line.GrossTaxTotal ?? '',
      warehouseCode: line.WarehouseCode ?? form.whsCode ?? '',
      batchNumber: '',
      lineTotal: line.LineTotal ?? '',
      // SAP "Copy From" linking fields
      baseEntry: selectedPO.DocEntry,
      baseLine: line.LineNum,
      baseType: 22, // 22 = PurchaseOrders in SAP B1
    }));

    setForm((prev) => ({
      ...prev,
      lineItems: [
        // Keep existing lines that already have items, drop empty placeholder rows
        ...prev.lineItems.filter((l) => l.itemCode),
        ...newLines,
      ],
    }));
    setPoPickerOpen(false);
    toast.success(`Copied ${newLines.length} line(s) from PO ${selectedPO.DocNum}`);
  };

  // ── Computed totals ─────────────────────────────────────────────────────────

  const computed = useMemo(() => {
    let totalQty = 0;
    let totalBeforeDiscount = 0;
    let totalTaxAmt = 0;
    form.lineItems.forEach((line) => {
      totalQty += parseFloat(line.quantity) || 0;
      totalBeforeDiscount += parseFloat(line.lineTotal) || 0;
      totalTaxAmt += parseFloat(line.lineTax) || 0;
    });

    const discPercent = parseFloat(form.discountPercent) || 0;
    const discountAmount = totalBeforeDiscount * (discPercent / 100);
    const freightAmount = form.freightList?.reduce((sum, f) => sum + (parseFloat(f.LineTotal) || 0), 0) || 0;
    const freightTaxAmount = form.freightList?.reduce((sum, f) => sum + (parseFloat(f.TaxSum) || 0), 0) || 0;

    totalTaxAmt += freightTaxAmount;

    const roundingAmount = parseFloat(form.roundingOff) || 0;
    const totalPaymentDue = totalBeforeDiscount - discountAmount + freightAmount + totalTaxAmt + roundingAmount;

    return {
      totalQty: totalQty.toLocaleString('en-IN'),
      grandTotal: totalBeforeDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      totalTax: totalTaxAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      totalBeforeDiscount: totalBeforeDiscount,
      discountAmount: discountAmount,
      freightAmount: freightAmount,
      freightTaxAmount: freightTaxAmount,
      totalPaymentDue: totalPaymentDue,
    };
  }, [form.lineItems, form.discountPercent, form.freightList, form.roundingOff]);

  // ── Modal open/close ────────────────────────────────────────────────────────

  const handleModal = async (act, docEntry = null) => {
    setAction(act);

    if (act === 'Add') {
      setForm({
        ...EMPTY_FORM,
        Series: defaultSeries,
        postingDate: getTodayDate(),
        deliveryDate: getTodayDate(),
        documentDate: getTodayDate(),
        division: selectedDivision || defaultDivision,
        location: defaultLocation,
        transactionType: '1',
        lineItems: [{ ...EMPTY_LINE }],
      });
      setOpen(true);
      return;
    }

    setPending((p) => p + 1);
    try {
      const headers = await getPurchaseDeliveryNoteById(docEntry);
      const allLines = headers.DocumentLines ?? [];

      const poValue = headers.DocTotal ?? 0;

      // Every field below must match the Service Layer schema exactly; a typo
      // reads back as undefined and silently blanks the input.
      setForm({
        ...EMPTY_FORM,
        docentry: headers.DocEntry,
        docnum: headers.DocNum ?? '',
        Series: headers.Series != null ? String(headers.Series) : '',
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
        transactionType: '1',
        discountPercent: headers.DiscountPercent ?? '',
        freightList: headers.DocumentAdditionalExpenses?.length > 0
          ? headers.DocumentAdditionalExpenses.map(exp => ({
            ExpenseCode: exp.ExpenseCode,
            LineTotal: exp.LineTotal || 0,
            TaxCode: exp.TaxCode || '',
            TaxSum: exp.TaxSum || 0
          }))
          : [],
        roundingOff: headers.RoundingDiffAmount ?? '',
        rounding: 'Y',
        poValue: poValue,
        // Map SAP DocumentLines → our lineItems array
        lineItems: allLines.length > 0
          ? allLines.map((line) => ({
            itemCode: line.ItemCode ?? '',
            itemName: line.ItemDescription ?? '',
            uom: line.MeasureUnit ?? line.UoMEntry ?? '',
            quantity: line.Quantity ?? '',
            unitPrice: line.UnitPrice ?? '',
            discountPercent: line.DiscountPercent ?? '',
            taxCode: line.TaxCode ?? '',
            taxRate: line.TaxPercentagePerRow ?? 0,
            lineTax: line.GrossTaxTotal ?? '',
            warehouseCode: line.WarehouseCode ?? '',
            batchNumber: line.BatchNumbers?.[0]?.BatchNumber ?? '',
            lineTotal: line.LineTotal ?? '',
          }))
          : [{ ...EMPTY_LINE }],
      });
      setOpen(true);
    } catch (err) {
      toast.error(sapErrorMessage(err, 'Failed to load purchase delivery note'));
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

    // ── Auto-generate ONE batch number per GRPO ──────────────────────────
    // SAP requires BatchNumbers for batch-managed items.  The format is
    // DD-MM-YYYY@<unique-6-char> derived from the header Posting Date.
    // The same batch belongs to the entire GRPO, not one per line.
    // On Edit, the existing batch from SAP is reused — never regenerated.
    const generateGrpoBatch = () => {
      const [y, m, d] = (form.postingDate || getTodayDate()).split('-');
      const suffix = Date.now().toString(36).slice(-6).toUpperCase();
      return `${d}-${m}-${y}@${suffix}`;
    };

    const grpoBatchNumber = action === 'Add'
      ? generateGrpoBatch()
      : (validLines[0]?.batchNumber || generateGrpoBatch());

    // Build DocumentLines array
    const lineItems = validLines.map((line, index) =>
      compact({
        LineNum: index,
        ItemCode: line.itemCode,
        ItemDescription: line.itemName,
        Quantity: toNumber(line.quantity),
        UnitPrice: toNumber(line.unitPrice),
        DiscountPercent: toNumber(line.discountPercent),
        TaxCode: line.taxCode || undefined,
        MeasureUnit: line.uom || undefined,
        UoMEntry: line.uom || undefined,
        CostingCode: form.division || undefined,
        CostingCode2: form.location || undefined,
        WarehouseCode: line.warehouseCode || form.whsCode || undefined,
        BatchNumbers: [{ BatchNumber: grpoBatchNumber, Quantity: toNumber(line.quantity) }],
        // Copy From PO linking — SAP requires these to tie the GRPO back to its source PO
        ...(line.baseEntry != null ? { BaseEntry: line.baseEntry } : {}),
        ...(line.baseLine != null ? { BaseLine: line.baseLine } : {}),
        ...(line.baseType != null ? { BaseType: line.baseType } : {}),
      })
    );

    // Build header payload
    const payload = compact({
      CardCode: form.cardcode,
      ...(form.Series ? { Series: Number(form.Series) } : {}),
      DocDate: toSapDate(form.postingDate),
      DocDueDate: toSapDate(form.deliveryDate),
      TaxDate: toSapDate(form.documentDate),
      BPL_IDAssignedToInvoice: DEFAULT_BRANCH,
      U_DIVISION: form.division || undefined,
      U_LOCATION: form.location || undefined,
      Comments: form.remarks || undefined,
      DiscountPercent: toNumber(form.discountPercent),
      RoundingDiffAmount: toNumber(form.roundingOff),
      Rounding: 'Y',
      DocumentLines: lineItems,
      ...(form.freightList?.length > 0 ? { 
        DocumentAdditionalExpenses: form.freightList.map(exp => compact({
          ...exp,
          DistributionRule: form.division || undefined,
          DistributionRule2: form.location || undefined,
        }))
      } : {}),
    });
    setPending((p) => p + 1);
    try {
      if (action === 'Add') {
        await createPurchaseDeliveryNote(payload);
      } else {
        await updatePurchaseDeliveryNote(form.docentry, payload);
      }
      toast.success(`Purchase Delivery Note ${action === 'Add' ? 'created' : 'updated'} successfully`);
      // Refresh first so the closing modal reveals an up-to-date table.
      await refreshPurchaseDeliveryNotes();
    } catch (err) {
      toast.error(sapErrorMessage(err, `Failed to ${action === 'Add' ? 'create' : 'update'} purchase delivery note`));
      return false;
    } finally {
      setPending((p) => p - 1);
    }
  };

  // ── Stats ───────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    let totalAmount = 0;
    purchaseDeliveryNotes.forEach((record) => {
      totalAmount += parseFloat(record.DocTotal) || 0;
    });
    return [
      { label: 'Total Records', value: purchaseDeliveryNotes.length, icon: '📋', iconClass: 'blue' },
      {
        label: 'Grand Total Amount',
        value: `₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        icon: '₹',
        iconClass: 'amber',
      },
    ];
  }, [purchaseDeliveryNotes]);


  // ── Columns ─────────────────────────────────────────────────────────────────

  const columns = [
    { header: 'GRPO No.', field: 'DocNum', type: 'badge', badgeFn: (value) => ({ variant: 'info', label: value || '—' }) },
    { header: 'Date', field: 'DocDate', type: 'date' },
    {
      header: 'Division',
      field: 'U_DIVISION',
      type: 'text',
      render: (val) => {
        const div = divisionOptions.find(d => d.value === val);
        return div ? div.label : (val || '—');
      }
    },
    {
      header: 'Location',
      field: 'U_LOCATION',
      type: 'text',
      render: (val) => {
        const loc = locationOptions.find(l => l.value === val);
        return loc ? loc.label : (val || '—');
      }
    },
    { header: 'Card Code', field: 'CardCode', type: 'text' },
    { header: 'Supplier', field: 'CardName', type: 'text' },
    {
      header: 'GRPO Value',
      field: 'DocTotal',
      type: 'currency',
      align: 'right',
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
          title="GRPO Register"
          subtitle="Periodic GRPO Register — Division, Location, Supplier filters"
          titleIcon="📋"
          rowData={purchaseDeliveryNotes}
          columns={columns}
          rowKey="DocEntry"
          stats={stats}
          searchPlaceholder="Search GRPO records…"
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
        title={`${action} GRPO Entry`}
        subtitle="Goods Receipt Purchase Order Entry"
        entity="GRPO Entry"
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
          <SelectField
            label="Series"
            name="Series"
            value={form.Series}
            onChange={change}
            options={seriesOptions}
            placeholder="Select series…"
            disabled={isView || action === 'Edit' || seriesOptions.length === 1}
          />
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

        <FieldGroup title="Source Details" columns={3}>
          <SelectField label="Transaction Type" name="transactionType" value={form.transactionType} onChange={change}
            options={TRANSACTION_TYPE_OPTIONS} required disabled={isView} />
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
                  <th style={{ textAlign: 'left', width: 100 }}>UoM</th>
                  <th style={{ textAlign: 'left', width: 120 }}>Batch No.</th>
                  <th style={{ textAlign: 'right', width: 100 }}>Qty</th>
                  <th style={{ textAlign: 'right', width: 110 }}>Unit Price</th>
                  <th style={{ textAlign: 'right', width: 80 }}>Disc %</th>
                  <th style={{ textAlign: 'right', width: 120 }}>Line Total</th>
                  <th style={{ textAlign: 'left', width: 150 }}>Tax</th>
                  <th style={{ textAlign: 'right', width: 100 }}>Line Tax</th>
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
                            onClick={() => handleItemSearch(index)}
                          />
                          <SearchIcon onClick={() => handleItemSearch(index)} label="Search items" />
                        </div>
                      )}
                    </td>
                    <td>
                      {isView ? (
                        <span style={{ display: 'block', textAlign: 'left' }}>{line.uom || '—'}</span>
                      ) : (
                        <select
                          className="modal-input"
                          value={line.uom}
                          onChange={(e) => handleLineChange(index, 'uom', e.target.value)}
                          style={{ minWidth: 80 }}
                        >
                          <option value="">Select</option>
                          {getUnitOptions(line.uom).map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      {/* Batch Number is generated by the backend — always read-only */}
                      <input
                        type="text"
                        className="modal-input"
                        value={line.batchNumber || ''}
                        readOnly
                        disabled
                        placeholder="Auto generated"
                        title={line.batchNumber || 'Auto generated'}
                        style={{
                          textAlign: 'left',
                          backgroundColor: '#f5f5f5',
                          color: '#888',
                          cursor: 'not-allowed',
                          fontStyle: line.batchNumber ? 'normal' : 'italic',
                        }}
                      />
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
                        {line.lineTotal ? `₹ ${fmtNum(line.lineTotal)}` : '—'}
                      </span>
                    </td>
                    <td>
                      {isView ? (
                        <span style={{ display: 'block', textAlign: 'left' }}>{line.taxCode || '—'}</span>
                      ) : (
                        <select
                          className="modal-input"
                          value={line.taxCode}
                          onChange={(e) => {
                            const selected = taxOptions.find((t) => t.value === e.target.value);
                            const taxRate = selected?.rate ?? 0;
                            const price = parseFloat(line.unitPrice) || 0;
                            const disc = parseFloat(line.discountPercent) || 0;
                            const qty = parseFloat(line.quantity) || 0;
                            const priceAfterDisc = price * (1 - disc / 100);
                            const lineTax = (priceAfterDisc * qty * taxRate / 100).toFixed(2);
                            setForm((prev) => ({
                              ...prev,
                              lineItems: prev.lineItems.map((l, i) =>
                                i === index
                                  ? { ...l, taxCode: e.target.value, taxRate, lineTax: Number(lineTax) }
                                  : l
                              ),
                            }));
                          }}
                          style={{ textAlign: 'left', minWidth: 120 }}
                        >
                          <option value="">Select Tax</option>
                          {taxOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      <span style={{ display: 'block', textAlign: 'right' }}>
                        {line.lineTax ? fmtNum(line.lineTax) : '0.00'}
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
                  <td />
                  <td style={{ textAlign: 'right' }}>{computed.totalTax}</td>
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

        {/* ── Document Summary ─────────────────────────────────────────────── */}
        <FieldGroup title="Document Summary">
          <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginTop: -10 }}>
            <div style={{ width: 360, maxWidth: '100%', border: '1px solid var(--modal-group-border, #e2e4e9)', borderRadius: 10, padding: '14px 18px', background: 'var(--modal-body-bg, #fff)' }}>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0' }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--modal-label-color, #6b7280)' }}>Total Before Discount</span>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--modal-text-color, #111827)' }}>
                  ₹ {computed.totalBeforeDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0' }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--modal-label-color, #6b7280)' }}>Discount</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    name="discountPercent"
                    value={form.discountPercent}
                    onChange={change}
                    disabled={isView}
                    type="number"
                    placeholder="0"
                    style={{ width: 60, textAlign: 'right', padding: '5px 8px', border: '1px solid var(--modal-input-border, #dfe3e8)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', color: 'var(--modal-text-color, #111827)', background: isView ? 'var(--modal-input-bg-disabled, #f9fafb)' : 'transparent' }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--modal-label-color, #9ca3af)' }}>%</span>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--modal-text-color, #111827)', minWidth: 96, textAlign: 'right' }}>
                    − ₹ {computed.discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0' }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--modal-label-color, #6b7280)' }}>Freight</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {!isView && (
                    <SearchIcon onClick={() => setIsFreightModalOpen(true)} label="Manage Freight" />
                  )}
                  <div style={{
                    width: 100,
                    textAlign: 'right',
                    padding: '7px 12px',
                    border: '1px solid var(--modal-input-border, #dfe3e8)',
                    borderRadius: 8,
                    fontSize: 13.5,
                    color: 'var(--modal-text-color, #111827)',
                    background: 'var(--modal-input-bg-disabled, #f9fafb)'
                  }}>
                    {computed.freightAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0' }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--modal-label-color, #6b7280)' }}>Tax</span>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--modal-text-color, #111827)' }}>
                  ₹ {computed.totalTax}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0' }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--modal-label-color, #6b7280)' }}>Rounding Off</span>
                <input
                  name="roundingOff"
                  value={form.roundingOff}
                  onChange={change}
                  disabled={isView}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  style={{ width: 130, textAlign: 'right', padding: '7px 12px', border: '1px solid var(--modal-input-border, #dfe3e8)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', color: 'var(--modal-text-color, #111827)', background: isView ? 'var(--modal-input-bg-disabled, #f9fafb)' : 'transparent' }}
                />
              </div>

              <div style={{ borderTop: '1px solid var(--modal-input-border, #dfe3e8)', margin: '10px 0' }}></div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--modal-text-color, #111827)' }}>Total Payment Due</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>
                  ₹ {computed.totalPaymentDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

            </div>
          </div>
        </FieldGroup>
      </Modal>

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
      />

      <RecordPicker
        open={itemPickerIndex !== null}
        onClose={() => setItemPickerIndex(null)}
        records={filteredItemMasterData}
        codeKey="ItemCode"
        nameKey="ItemName"
        codeLabel="Item Code"
        nameLabel="Item Name"
        title="Select Product / Item"
        subtitle="Choose one or more items — the first binds to this line, the rest are added as new rows"
        emptyText="No items found."
        isMulti={true}
        selectedCodes={itemPickerSelectedCodes}
        onSelect={handleSelectItem}
        onSapSync={refreshItemMaster}
        sapSyncLabel="SAP Sync"
      />

      {/* ── Copy From Purchase Order Picker ─────────────────────────────────── */}
      <Modal
        open={poPickerOpen}
        onClose={() => setPoPickerOpen(false)}
        onSave={handleConfirmPOLines}
        mode="add"
        title={`Copy from Purchase Order${selectedPO ? ` — PO #${selectedPO.DocNum}` : ''}`}
        subtitle={`Supplier: ${form.cardname || form.cardcode}`}
        variant="overlay"
        size="xl"
        resizable
        saveLabel={selectedPOLines.length > 0 ? `Copy ${selectedPOLines.length} Line(s)` : 'Copy Lines'}
        saveDisabled={selectedPOLines.length === 0}
        showReset={false}
      >
        {pendingPOsLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading pending Purchase Orders…</div>
        ) : pendingPOs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>No open Purchase Orders found for this supplier.</div>
        ) : (
          <>
            {/* ── PO Cards (horizontal scroll) ──────────────────────────── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Select a Purchase Order:</div>
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
                {pendingPOs.map((po) => {
                  const isActive = selectedPO?.DocEntry === po.DocEntry;
                  return (
                    <div
                      key={po.DocEntry}
                      onClick={() => handlePOSelect(po)}
                      style={{
                        minWidth: 220,
                        padding: '12px 16px',
                        borderRadius: 10,
                        border: isActive ? '2px solid #3b82f6' : '1px solid var(--modal-group-border, #e2e4e9)',
                        background: isActive ? 'rgba(59,130,246,0.08)' : 'var(--modal-body-bg, #fff)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>PO #{po.DocNum}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>Date: {po.DocDate ? String(po.DocDate).slice(0, 10) : '—'}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>Due: {po.DocDueDate ? String(po.DocDueDate).slice(0, 10) : '—'}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>Total: ₹{(po.DocTotal ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>Lines: {(po.DocumentLines || []).length}</div>
                      {isActive && <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600, marginTop: 4 }}>✓ Selected</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── PO Line Items table ────────────────────────────────────── */}
            {selectedPO ? (
              <div
                style={{
                  border: '1px solid var(--modal-group-border, #e2e4e9)',
                  borderRadius: 8,
                  overflowY: 'auto',
                  maxHeight: 320,
                }}
              >
                <table className="modal-tbl" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--modal-body-bg, #fff)' }}>
                    <tr>
                      <th style={{ width: 48, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={
                            (selectedPO.DocumentLines || []).length > 0 &&
                            (selectedPO.DocumentLines || []).every((l) => selectedPOLines.includes(l.LineNum))
                          }
                          onChange={toggleAllPOLines}
                          aria-label="Select all lines"
                        />
                      </th>
                      <th style={{ textAlign: 'left' }}>Item Code</th>
                      <th style={{ textAlign: 'left' }}>Item Name</th>
                      <th style={{ textAlign: 'right' }}>Quantity</th>
                      <th style={{ textAlign: 'right' }}>Open Qty</th>
                      <th style={{ textAlign: 'left' }}>UOM</th>
                      <th style={{ textAlign: 'right' }}>Unit Price</th>
                      <th style={{ textAlign: 'right' }}>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedPO.DocumentLines || []).map((line) => {
                      const isPicked = selectedPOLines.includes(line.LineNum);
                      return (
                        <tr
                          key={line.LineNum}
                          onClick={() => togglePOLine(line.LineNum)}
                          style={{ cursor: 'pointer', background: isPicked ? 'rgba(59,130,246,0.08)' : undefined }}
                        >
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isPicked}
                              onChange={() => togglePOLine(line.LineNum)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td>{line.ItemCode}</td>
                          <td>{line.ItemDescription}</td>
                          <td style={{ textAlign: 'right' }}>{line.Quantity}</td>
                          <td style={{ textAlign: 'right' }}>{line.RemainingOpenQuantity ?? line.Quantity}</td>
                          <td>{line.MeasureUnit || '—'}</td>
                          <td style={{ textAlign: 'right' }}>{fmtNum(line.UnitPrice)}</td>
                          <td style={{ textAlign: 'right' }}>{fmtNum(line.LineTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 30, color: '#aaa', fontSize: 13 }}>
                Click a Purchase Order card above to see its line items.
              </div>
            )}
          </>
        )}
      </Modal>

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

      <FreightModal
        open={isFreightModalOpen}
        onClose={() => setIsFreightModalOpen(false)}
        expenseOptions={expenseOptions}
        taxOptions={taxOptions}
        initialFreightList={form.freightList}
        onSave={(list) => setForm(prev => ({ ...prev, freightList: list }))}
      />

      <Loader fullscreen show={busy} label="Please wait…" />
    </>
  );
};

export default GrpoDebitNoteRegister;
