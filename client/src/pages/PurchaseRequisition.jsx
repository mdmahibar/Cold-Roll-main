import React, { useState, useMemo, useCallback } from 'react';

import { toast } from 'react-toastify';

import ListingPage from '../components/ListingTable/ListingPage';
import Modal, { TextField, TextareaField, SelectField, DateField, FieldGroup } from '../components/Modal/Modal';
import Loader from '../components/Loader/Loader.jsx';
import RecordPicker from './CollectMilk/RecordPicker.jsx';
import { useDivision } from '../context/DivisionContext';

//! Zustand
import useBusinessPartners from '../hooks/useBusinessPartners.js';
import useBusinessPartnerStore from '../store/businessPartnerStore.js';

import useItemMasterHook from '../hooks/useItemMasterHook.js';
import useItemMaster from '../store/itemMasterStore.js';

import useLoginWiseHook from '../hooks/useLoginWiseHook.js';
import useLoginWiseStore from '../store/loginWiseDataStore.js';
import usePurchaseRequestHook from '../hooks/usePurchaseRequestHook.js';
import useDepartmentHook from '../hooks/useDepartmentHook.js';
import useWarehouseHook from '../hooks/useWarehouseHook.js';
//! End Zustand
import { sapErrorMessage } from '../SAPB1/auth/login.js';
import { uiToSapDate } from '../common/Function.js';
import { sapconfig } from '../config/sapConfig.js';
import {
  getPurchaseRequestById,
  createPurchaseRequest,
  updatePurchaseRequest,
} from '../SAPB1/PurchaseRequests/PurchaseRequestServices.js';
import { getDocumentSeries } from '../SAPB1/Utils/documentSeries.js';

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

// Placeholder shown until a partner is picked — never a real B1 CardCode.
const CARDCODE_PLACEHOLDER = 'Auto Generated From B1';

// B1 assigns DocNum itself, so the field is display-only until the PR exists.
const DOCNUM_PLACEHOLDER = 'Auto Generated From B1';

// A PurchaseRequest header must say who raised it. ReqType 12 = B1 user
// (171 would be an employee), and Requester/ReqCode are that user's code.
const REQ_TYPE_USER = 12;
const REQUESTER = sapconfig.requester;

const DEFAULT_BRANCH = 1;
const PR_DOCUMENT = '1470000113'; // Purchase Request object type

const STATUS_OPTIONS = ['Draft', 'Pending Approval', 'Approved', 'Rejected'];

// A requisition always carries at least one line, so the first row is created
// with the form and can never be removed.
//
// `lineNum` is both the React key and B1's line identity — 0,1,2… by position,
// which is exactly how the Service Layer numbers lines. Rows are renumbered on
// every add/remove so the array index and lineNum never drift apart.
const makeEmptyLine = (lineNum = 0) => ({
  lineNum,
  itemCode: '',
  description: '',
  unit: '',
  qty: '',
  estPrice: '',
  remarks: '',
  requiredDate: '',
});

const EMPTY_FORM = {
  Series: '',
  docEntry: '',
  docNum: DOCNUM_PLACEHOLDER,
  status: 'Draft',
  division: '',
  location: '',
  department: 'Production',
  requiredDate: getTodayDate(),
  postingDate: getTodayDate(),
  deliveryDate: getTodayDate(),
  documentDate: getTodayDate(),
  cardCode: CARDCODE_PLACEHOLDER,
  cardName: '',
  whsCode: '',
  whsName: '',
  justification: '',
};

/* ── Search icon / button used by the vendor + item pickers ───── */

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

const PurchaseRequisition = () => {
  const { selectedDivision } = useDivision();
  //! zustand
  useBusinessPartners();
  const { itemMaster: itemMasterData, refreshItemMaster } = useItemMasterHook();
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

  const businessPartners = useBusinessPartnerStore((state) => state.businessPartners);
  // const itemMasterData = useItemMaster((state) => state.itemMaster);

  // Read straight from the store — copying it into local state once would freeze
  // the table on the first fetch, so refreshPurchaseRequests() after a save
  // would never reach the listing.
  const { purchaseRequests: requisitions, refreshPurchaseRequests } = usePurchaseRequestHook();
  const { departments } = useDepartmentHook();
  const { warehouses } = useWarehouseHook();

  const departmentOptions = useMemo(
    () => departments.map((d) => ({ value: d.Code, label: d.Name })),
    [departments]
  );

  const apiUoms = useMemo(() => {
    const units = new Set();
    itemMasterData?.forEach((item) => {
      if (item.PurchaseUnit) units.add(item.PurchaseUnit);
    });
    return Array.from(units);
  }, [itemMasterData]);

  // B1 can return any UoM code. A <select> drops a value that has
  // no matching <option>, so always keep the incoming unit in the list.
  const getUnitOptions = useCallback((unit) => {
    return unit && !apiUoms.includes(unit) ? [unit, ...apiUoms] : apiUoms;
  }, [apiUoms]);

  //! zustand

  const [pending, setPending] = useState(0);
  const busy = pending > 0;

  const [syncing, setSyncing] = useState(false);
  const handleSapSync = async () => {
    setSyncing(true);
    try {
      await refreshPurchaseRequests();
      toast.success('Purchase requisitions synced with SAP B1.');
    } catch (err) {
      toast.error('Failed to sync purchase requisitions.');
    } finally {
      setSyncing(false);
    }
  };

  const [open, setOpen] = useState(false);
  const [action, setAction] = useState('Add');
  const [form, setForm] = useState(EMPTY_FORM);
  const [seriesOptions, setSeriesOptions] = useState([]);
  const [lines, setLines] = useState([makeEmptyLine()]);

  const [partnerPickerOpen, setPartnerPickerOpen] = useState(false);
  // Which line row asked for the item picker — null means the picker is idle.
  const [itemPickerLineId, setItemPickerLineId] = useState(null);
  const [warehousePickerOpen, setWarehousePickerOpen] = useState(false);

  const isView = action === 'View';

  // Default division / location: if only one option exists, bind it automatically.
  const defaultDivision = divisionOptions.length === 1 ? divisionOptions[0].value : '';
  const defaultLocation = locationOptions.length === 1 ? locationOptions[0].value : '';

  const change = (event) => setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  const filteredItems = useMemo(() => {
    return itemMasterData?.filter((item) => item.U_TYPE === 'OR') || [];
  }, [itemMasterData]);

  const filteredWarehouses = useMemo(() => {
    if (!form.location) return warehouses;
    return warehouses.filter((w) => w.U_LOCATION === form.location);
  }, [warehouses, form.location]);

  const handleSelectWarehouse = (warehouse) => {
    setForm((prev) => ({ ...prev, whsCode: warehouse.WarehouseCode, whsName: warehouse.WarehouseName }));
  };

  /* ── Line items ─────────────────────────────────────────────── */

  const addLine = () => setLines((prev) => [...prev, makeEmptyLine(prev.length)]);

  const removeLine = (lineNum) => {
    // The first row is the document itself — B1 rejects a PR with zero lines.
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
          ? { ...line, itemCode: first.ItemCode, description: first.ItemName, unit: first.PurchaseUnit }
          : line
      );
      const added = rest.map((item) => ({
        ...makeEmptyLine(),
        itemCode: item.ItemCode,
        description: item.ItemName,
        unit: item.PurchaseUnit,
      }));
      // Renumber so lineNum stays in step with the array index.
      return [...updated, ...added].map((line, index) => ({ ...line, lineNum: index }));
    });

    setItemPickerLineId(null);
  };

  const handleSelectPartner = (partner) => {
    setForm((prev) => ({ ...prev, cardCode: partner.CardCode, cardName: partner.CardName }));
  };

  // Pre-check the item already sitting on the row that opened the picker.
  const itemPickerSelectedCodes = useMemo(() => {
    const current = lines.find((line) => line.lineNum === itemPickerLineId)?.itemCode;
    return current ? [current] : [];
  }, [lines, itemPickerLineId]);

  const lineTotal = (line) => (parseFloat(line.qty) || 0) * (parseFloat(line.estPrice) || 0);

  const grandTotal = useMemo(
    () => lines.reduce((sum, line) => sum + lineTotal(line), 0),
    [lines]
  );

  /* ── Modal open / close / save ──────────────────────────────── */

  // Fetch Document Series
  React.useEffect(() => {
    const fetchSeries = async () => {
      try {
        const res = await getDocumentSeries(PR_DOCUMENT);
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

  const handleModal = async (act, docEntry = null) => {
    setAction(act);

    const defaultSeries = seriesOptions.length === 1 ? seriesOptions[0].value : '';

    if (act === 'Add') {
      setForm({
        ...EMPTY_FORM,
        Series: defaultSeries,
        requiredDate: getTodayDate(),
        postingDate: getTodayDate(),
        deliveryDate: getTodayDate(),
        documentDate: getTodayDate(),
        division: selectedDivision || defaultDivision,
        location: defaultLocation,
      });
      setLines([makeEmptyLine()]);
      setOpen(true);
      return;
    }

    setPending((p) => p + 1);
    try {
      const headers = await getPurchaseRequestById(docEntry);
      const lineItems = headers.DocumentLines ?? [];

      // A PurchaseRequest header has no CardCode — the vendor lives on each line
      // as LineVendor, so read it back from the first line.
      const lineVendor = lineItems[0]?.LineVendor || '';
      const partner = businessPartners.find((bp) => bp.CardCode === lineVendor);

      const lineWarehouse = lineItems[0]?.WarehouseCode || '';
      // We will map whsName later when we add useWarehouseHook

      setForm({
        ...EMPTY_FORM,
        docEntry: headers.DocEntry,
        Series: headers.Series != null ? String(headers.Series) : '',
        docNum: headers.DocNum ?? '',
        // B1 misspells the header field as "RequriedDate" — keep the typo.
        requiredDate: uiToSapDate(headers.RequriedDate) ?? getTodayDate(),
        postingDate: uiToSapDate(headers.DocDate) ?? getTodayDate(),
        deliveryDate: uiToSapDate(headers.DocDueDate) ?? getTodayDate(),
        documentDate: uiToSapDate(headers.TaxDate) ?? getTodayDate(),
        // DocumentStatus is B1-controlled (bost_Open / bost_Close) — display only.
        status: headers.DocumentStatus ?? 'Draft',
        division: headers.U_DIVISION ?? '',
        location: headers.U_LOCATION ?? '',
        department: headers.RequesterDepartment ?? '',
        justification: headers.Comments ?? '',
        cardCode: lineVendor || CARDCODE_PLACEHOLDER,
        cardName: partner?.CardName ?? '',
        whsCode: lineWarehouse,
        whsName: warehouses.find((w) => w.WarehouseCode === lineWarehouse)?.WarehouseName ?? '',
      });

      const mappedLines = lineItems.map((item, index) => ({
        // Carrying LineNum back is what makes the PATCH update this line
        // instead of inserting a duplicate.
        lineNum: item.LineNum ?? index,
        itemCode: item.ItemCode ?? '',
        description: item.ItemDescription ?? '',
        unit: item.MeasureUnit ?? '',
        qty: item.Quantity ?? '',
        estPrice: item.UnitPrice ?? item.Price ?? '',
        remarks: item.FreeText ?? '',
        // The line-level field is spelled correctly, unlike the header one.
        requiredDate: uiToSapDate(item.RequiredDate) ?? '',
      }));
      setLines(mappedLines.length ? mappedLines : [makeEmptyLine()]);

      setOpen(true);
    } catch (err) {
      toast.error(sapErrorMessage(err, 'Failed to load requisition'));
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
    setForm({ ...EMPTY_FORM, docNum: form.docNum, division: defaultDivision, location: defaultLocation });
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
    if (!form.cardCode || form.cardCode === CARDCODE_PLACEHOLDER) {
      toast.error('Please pick a vendor so the Card Code is bound from SAP.');
      return false;
    }


    const filledLines = lines.filter((line) => line.itemCode || line.description);
    if (filledLines.length === 0) {
      toast.error('Add at least one line item.');
      return false;
    }
    const badQty = filledLines.find((line) => !(parseFloat(line.qty) > 0));
    if (badQty) {
      toast.error('Every line item needs a quantity greater than zero.');
      return false;
    }

    const requiredDate = uiToSapDate(form.requiredDate);
    if (!requiredDate) {
      toast.error('Request Date is mandatory.');
      return false;
    }
    const postingDate = uiToSapDate(form.postingDate) || requiredDate;
    const deliveryDate = uiToSapDate(form.deliveryDate) || requiredDate;
    const documentDate = uiToSapDate(form.documentDate) || requiredDate;

    // Send the FULL line array every time — a line left out of a PATCH is
    // deleted by the Service Layer.
    const documentLines = filledLines.map((line, index) =>
      compact({
        // Number by position after the blank rows are dropped, so the array the
        // Service Layer receives is always a gapless 0,1,2… sequence.
        LineNum: index,
        ItemCode: line.itemCode || undefined,
        ItemDescription: line.description || undefined,
        Quantity: toNumber(line.qty),
        UnitPrice: toNumber(line.estPrice) ?? 0,
        MeasureUnit: line.unit || undefined,
        WarehouseCode: form.whsCode || undefined,
        FreeText: line.remarks || undefined,
        RequiredDate: uiToSapDate(line.requiredDate) ?? requiredDate,
        // A PR carries its vendor per line, not on the header.
        LineVendor: form.cardCode,
        CostingCode: form.division || undefined,
        CostingCode2: form.location || undefined,
      })
    );

    const payload = compact({
      // Header identity is fixed at creation — B1 rejects changing it later.
      // ...(action === 'Add'
      //   ? {
      //       ReqType: REQ_TYPE_USER,
      //       Requester: REQUESTER,
      //       ReqCode: REQUESTER,
      //       RequesterName: REQUESTER,
      //       DocDate: getTodayDate(),
      //       BPL_IDAssignedToInvoice: DEFAULT_BRANCH,
      //     }
      //   : {}),
      ...(form.Series ? { Series: Number(form.Series) } : {}),
      BPL_IDAssignedToInvoice: 1,
      DocDate: postingDate,
      DocDueDate: deliveryDate,
      RequriedDate: requiredDate,
      TaxDate: documentDate,
      Comments: form.justification || undefined,
      U_DIVISION: form.division || undefined,
      U_LOCATION: form.location || undefined,
      RequesterDepartment: form.department || undefined,
      DocumentLines: documentLines,
    });

    setPending((p) => p + 1);
    try {
      if (action === 'Add') {
        await createPurchaseRequest(payload);
      } else {
        await updatePurchaseRequest(form.docEntry, payload);
      }
      toast.success(`Requisition ${action === 'Add' ? 'created' : 'updated'} successfully`);
      refreshPurchaseRequests();
    } catch (err) {
      toast.error(sapErrorMessage(err, `Failed to ${action === 'Add' ? 'create' : 'update'} requisition`));
      return false;
    } finally {
      setPending((p) => p - 1);
    }
  };

  const handleDelete = () => {
    // TODO(SAP B1): cancel the PurchaseRequest via deletePurchaseRequest().
    toast.info('Deleting a requisition is not enabled yet.');
  };

  /* ── Listing config ─────────────────────────────────────────── */

  const columns = [
    { header: 'Doc Num', field: 'DocNum', type: 'code', isLink: true },
    { header: 'Division', field: 'U_DIVISION', render: (_, row) => divisionOptions.find(opt => opt.value == row.U_DIVISION)?.label || row.U_DIVISION || '—' },
    { header: 'Location', field: 'U_LOCATION', render: (_, row) => locationOptions.find(opt => opt.value == row.U_LOCATION)?.label || row.U_LOCATION || '—' },
    { header: 'Department', field: 'RequesterDepartment', render: (_, row) => departmentOptions.find(opt => opt.value == row.RequesterDepartment)?.label || row.RequesterDepartment || '—' },
    { header: 'Card Code', field: 'CardCode', render: (_, row) => row.DocumentLines?.[0]?.LineVendor || '—' },
    { header: 'Card Name', field: 'CardName', render: (_, row) => businessPartners.find(bp => bp.CardCode == row.DocumentLines?.[0]?.LineVendor)?.CardName || '—' },
    // { header: 'Item', field: 'ItemDescription', render: (_, row) => row.DocumentLines?.[0]?.ItemDescription || '—' },
    { header: 'Qty', field: 'Quantity', render: (_, row) => row.DocumentLines?.[0]?.Quantity || '—' },
    {
      header: 'Amount', field: 'DocTotal', render: (_, row) => {
        const sum = (row.DocumentLines || []).reduce((acc, line) => acc + (line.LineTotal || 0), 0);
        return `₹${sum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      }
    },
    // B1 itself spells this field "RequriedDate" — keep the typo or the cell reads undefined.
    { header: 'Required By', field: 'RequriedDate', type: 'date' },
    { header: 'Status', field: 'DocumentStatus', type: 'text', isLink: true },
  ];

  const stats = useMemo(
    () => [
      { label: 'Total PRs', value: requisitions.length, icon: '📋', iconClass: 'blue', filterKey: 'all' },
      {
        label: 'Draft',
        value: requisitions.filter((r) => r.Status === 'Draft').length,
        icon: '📝',
        iconClass: 'amber',
        filterKey: 'draft',
      },
      {
        label: 'Pending Approval',
        value: requisitions.filter((r) => r.Status === 'Pending Approval').length,
        icon: '⏳',
        iconClass: 'purple',
        filterKey: 'pending',
      },
      {
        label: 'Approved',
        value: requisitions.filter((r) => r.Status === 'Approved').length,
        icon: '✅',
        iconClass: 'green',
        filterKey: 'approved',
      },
    ],
    [requisitions]
  );

  const filterChips = [
    { key: 'all', label: 'All', chipClass: 'lp-chip-blue' },
    { key: 'draft', label: 'Draft', chipClass: 'lp-chip-amber', filterFn: (row) => row.Status === 'Draft' },
    {
      key: 'pending',
      label: 'Pending Approval',
      chipClass: 'lp-chip-purple',
      filterFn: (row) => row.Status === 'Pending Approval',
    },
    { key: 'approved', label: 'Approved', chipClass: 'lp-chip-green', filterFn: (row) => row.Status === 'Approved' },
  ];

  return (
    <>
      {!open && (
        <ListingPage
          title="Purchase Requisition"
          subtitle="Division + Location mandatory · Approved PRs flow to SAP B1 Purchase Order"
          titleIcon="📦"
          rowData={requisitions}
          columns={columns}
          rowKey="DocEntry"
          stats={stats}
          filterChips={filterChips}
          defaultFilter="all"
          searchPlaceholder="Search requisitions…"
          searchFields={['DocNum', 'CardCode', 'CardName', 'Division', 'Location', 'Department']}
          defaultSortCol="DocNum"
          toolbarActions={[
            {
              label: syncing ? 'Syncing…' : 'SAP B1 Sync',
              icon: syncing ? '⏳' : '🔄',
              onClick: handleSapSync,
              disabled: syncing,
            },
          ]}
          primaryAction={{ label: '+ New Requisition', onClick: () => handleModal('Add') }}
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
        title={`${action} Purchase Requisition`}
        subtitle="Division and Location are mandatory — approved PRs flow to a SAP B1 Purchase Order"
        entity="Purchase Requisition"
        saveLoading={busy}
        saveDisabled={busy}
      >
        <FieldGroup title="Document" columns={4}>
          <SelectField
            label="Series"
            name="Series"
            value={form.Series}
            onChange={change}
            options={seriesOptions}
            placeholder="Select series..."
            disabled={isView || seriesOptions.length <= 1}
          />
          <TextField label="Doc Num" name="docNum" value={form.docNum} onChange={change} disabled />
          {/* <SelectField
            label="Status"
            name="status"
            value={form.status}
            onChange={change}
            options={STATUS_OPTIONS}
            disabled={isView}
          /> */}
          <TextField label="Status" name="status" value={form.status} onChange={change} disabled />
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
                  onClick={() => setWarehousePickerOpen(true)}
                  aria-label="Search warehouses"
                  title="Search warehouses"
                  style={searchButtonStyle}
                >
                  <SearchIcon />
                </button>
              )
            }
          />
          <SelectField
            label="Department"
            name="department"
            value={form.department}
            onChange={change}
            options={departmentOptions}
            placeholder="Select department"
            disabled={isView}
          />
        </FieldGroup>

        <FieldGroup title="Requisition Details" columns={4}>
          <DateField label="Request Date" name="requiredDate" value={form.requiredDate} onChange={change} required disabled={isView} />
          <DateField label="Posting Date" name="postingDate" value={form.postingDate} onChange={change} disabled={isView} />
          <DateField label="Delivery Date" name="deliveryDate" value={form.deliveryDate} onChange={change} disabled={isView} />
          <DateField label="Document Date" name="documentDate" value={form.documentDate} onChange={change} disabled={isView} />
          <TextField label="Card Code" name="cardCode" value={form.cardCode} onChange={change} disabled />
          <TextField
            label="Card Name"
            name="cardName"
            value={form.cardName}
            onChange={change}
            placeholder="Search or enter vendor"
            required
            disabled={isView}
            suffix={
              !isView && (
                <button
                  type="button"
                  onClick={() => setPartnerPickerOpen(true)}
                  aria-label="Search vendors"
                  title="Search vendors"
                  style={searchButtonStyle}
                >
                  <SearchIcon />
                </button>
              )
            }
          />
          <TextField
            label="Justification"
            name="justification"
            value={form.justification}
            onChange={change}
            placeholder="Reason for requisition…"
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
                  <th style={{ minWidth: 260 }}>Description</th>
                  <th style={{ width: 90 }}>Unit</th>
                  <th style={{ width: 90, textAlign: 'right' }}>Qty</th>
                  <th style={{ width: 105, textAlign: 'right' }}>Est. Price</th>
                  <th style={{ width: 115, textAlign: 'right' }}>Line Total</th>
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
                        {getUnitOptions(line.unit).map((unit) => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className="modal-tbl-inp"
                        type="number"
                        value={line.qty}
                        onChange={(e) => updateLine(line.lineNum, 'qty', e.target.value)}
                        placeholder="0"
                        style={{ textAlign: 'right', minWidth: '60px' }}
                        disabled={isView}
                      />
                    </td>
                    <td>
                      <input
                        className="modal-tbl-inp"
                        type="number"
                        value={line.estPrice}
                        onChange={(e) => updateLine(line.lineNum, 'estPrice', e.target.value)}
                        placeholder="0.00"
                        style={{ textAlign: 'right' }}
                        disabled={isView}
                      />
                    </td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      ₹ {lineTotal(line).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  <td colSpan={6} style={{ textAlign: 'right', fontWeight: 600, padding: '9px 10px' }}>
                    Estimated Total
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#059669' }}>
                    ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2} />
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
        open={partnerPickerOpen}
        onClose={() => setPartnerPickerOpen(false)}
        records={businessPartners}
        codeKey="CardCode"
        nameKey="CardName"
        codeLabel="Card Code"
        nameLabel="Card Name"
        title="Select Vendor / Business Partner"
        subtitle="Choose one business partner to bind its Card Code & Card Name"
        emptyText="No business partners found."
        selectedCode={form.cardCode}
        onSelect={handleSelectPartner}
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

      <RecordPicker
        open={itemPickerLineId !== null}
        onClose={() => setItemPickerLineId(null)}
        records={filteredItems}
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

export default PurchaseRequisition;
