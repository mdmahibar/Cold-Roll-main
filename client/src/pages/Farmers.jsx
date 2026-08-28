import { useState, useEffect, useRef } from 'react';

import {
  getAllBusinessPartners,
  getBusinessPartnerById,
  createBusinessPartner,
  updateBusinessPartner,
  deleteBusinessPartner,
} from '../SAPB1/BP/BpServices.js';
import { sapErrorMessage } from '../SAPB1/auth/login.js';
import {
  createFarmerPriceList,
  getFarmerPriceListById,
  updateFarmerPriceList,
  FARMER_PRICE_ROWS,
} from '../SAPB1/FarmerPriceList/FarmerPriceListServices.js';
import { getDocumentSeries } from '../SAPB1/Utils/documentSeries.js';
import { getAllStates } from '../SAPB1/Utils/states.js';
import { uiToSapDate } from '../common/Function.js';

import { toast } from 'react-toastify';

import ListingPage from '../components/ListingTable/ListingPage';
import Modal, { TextField, SelectField, FieldGroup } from '../components/Modal/Modal';
import Loader from '../components/Loader/Loader';

import useBusinessPartners from '../hooks/useBusinessPartners.js';
import useBusinessPartnerStore from '../store/businessPartnerStore.js';
import useStateMaster from '../hooks/useStateMaster.js';
import useStateMasterStore from '../store/stateMasterStore.js';

// Business Partners are document type "2", sub type "S" in SAP's series service.
const BP_DOCUMENT = '2';
const BP_DOCUMENT_SUBTYPE = 'S';

const ADDRESS_TYPE_OPTIONS = [
  { value: 'bo_BillTo', label: 'Bill To' },
  { value: 'bo_ShipTo', label: 'Ship From' },
];

const GST_TYPE_OPTIONS = [
  { value: 'gstRegular', label: 'Regular' },
  { value: 'gstComposition', label: 'Composition' },
  { value: 'gstUnregistered', label: 'Unregistered' },
  { value: 'gstConsumer', label: 'Consumer' },
  { value: 'gstRegularTDSISD', label: 'Regular (TDS/ISD)' },
  { value: 'gstSpecialEconomicZone', label: 'SEZ' },
  { value: 'gstOverseas', label: 'Overseas' },
];

const emptyAddress = () => ({
  AddressType: 'bo_BillTo',
  Street: '', Block: '', City: '', State: '', ZipCode: '',
  ShipCode: '', GstType: '', GSTIN: '', PAN: '', isDefault: false,
});

const emptyContact = () => ({
  FirstName: '', MiddleName: '', LastName: '', Phone: '', isDefault: false,
});

// Milk rate tabs — each tab has its own rate columns, first column is always
// "Effective From" (defaults to today).
const MILK_RATE_TABS = [
  {
    key: 'cow',
    label: 'Cow Milk',
    milkType: 'Milk',
    fields: [
      { key: 'FatRate', label: '(FAT Rate) COW MILK' },
      { key: 'SnfRate', label: '(SNF Rate) COW MILK' },
      { key: 'FatRateBelow', label: '(FAT Rate Below) COW' },
      { key: 'SnfRateBelow', label: '(SNF Rate Below) COW' },
    ],
  },
  {
    key: 'buffalo',
    label: 'Buffalo Milk',
    milkType: 'Buffalo',
    fields: [
      { key: 'FatRate', label: '(FAT Rate) Buffalo Milk' },
      { key: 'SnfRate', label: '(SNF Rate) Buffalo Milk' },
    ],
  },
  {
    key: 'special',
    label: 'Special Milk',
    milkType: 'Special',
    fields: [
      { key: 'FatRate', label: '(FAT Rate) Special Cow Milk' },
      { key: 'SnfRate', label: '(SNF Rate) Special Cow Milk' },
    ],
  },
];

const today = () => new Date().toISOString().slice(0, 10);

// Numeric fields reject "" — send a real number or omit the field entirely.
const toNumber = (value) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

// Drops keys whose value is undefined so we never POST an empty field.
const compact = (object) =>
  Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));

// Valid values of the MILKTYPE UDF (SAS_MR_FRMPRCL).
const MILK_TYPE_OPTIONS = [
  { value: 'Cow', label: 'Cow' },
  { value: 'Buffalo', label: 'Buffalo' },
];

const emptyRateRow = (tab) =>
  tab.fields.reduce((row, field) => ({ ...row, [field.key]: '' }), {
    EffectiveFrom: today(),
    EffectiveTo: '',
  });

// Every tab starts with one blank row so the user can type straight away.
const emptyMilkRates = () =>
  MILK_RATE_TABS.reduce((rates, tab) => ({ ...rates, [tab.key]: [emptyRateRow(tab)] }), {});

// SAP rows -> the per-tab shape the Milk Rates table uses. U_MILKTYPE decides
// which tab a row belongs to; LineId is carried so an update edits the line in
// place instead of inserting a new one.
const priceListToMilkRates = (rows = []) =>
  MILK_RATE_TABS.reduce((rates, tab) => {
    const tabRows = rows
      .filter((row) => row.U_MILKTYPE === tab.milkType)
      .map((row) => ({
        LineId: row.LineId,
        EffectiveFrom: uiToSapDate(row.U_EFCTDTF) ?? '',
        EffectiveTo: uiToSapDate(row.U_EFCTDTT) ?? '',
        FatRate: row.U_FATRATE ?? '',
        SnfRate: row.U_SNFRATE ?? '',
        FatRateBelow: row.U_FATBRATE ?? '',
        SnfRateBelow: row.U_SNFBRATE ?? '',
      }));
    return { ...rates, [tab.key]: tabRows.length ? tabRows : [emptyRateRow(tab)] };
  }, {});

// A function, not a const object — each section starts with one blank row and
// those rows must be fresh on every reset.
const emptyForm = () => ({
  CardCode: '',
  CardName: '',
  Phone1: '',
  Series: '',
  U_COWTHRESHOLD: '',
  U_BUFTHRESHOLD: '',
  U_BUFDEDRATE: '',
  U_MILKTYPE: '',
  addresses: [emptyAddress()],
  contacts: [emptyContact()],
  milkRates: emptyMilkRates(),
});

// A contact's SAP `Name` must be unique per BP; build it from its name parts.
const contactName = (c, i) =>
  [c.FirstName, c.MiddleName, c.LastName].filter(Boolean).join(' ').trim() || `Contact ${i + 1}`;

export default function Farmers() {
  useBusinessPartners();
  const businessPartners = useBusinessPartnerStore((state) => state.businessPartners);
  useStateMaster();
  const statesMasterData = useStateMasterStore((state) => state.stateMasters);

  const [rowData, setRowData] = useState([]);

  // Loader counter — every API call does +1 before and -1 after, so `busy`
  // is true whenever at least one request is in flight.
  const [pending, setPending] = useState(0);
  const busy = pending > 0;

  const [open, setOpen] = useState(false);
  const [action, setAction] = useState('Add'); // 'Add' | 'Edit' | 'View'
  const [form, setForm] = useState(emptyForm());

  const [seriesOptions, setSeriesOptions] = useState([]);
  const [stateOptions, setStateOptions] = useState([]);
  const [activeRateTab, setActiveRateTab] = useState(MILK_RATE_TABS[0].key);
  // What the SAS_UDO_MD_FRMPRCL UDO returned on the last successful save.
  const priceListRef = useRef(null);

  // The store is persisted, so this button is how the user pulls rows created
  // in B1 since the first load.
  const setBusinessPartners = useBusinessPartnerStore((state) => state.setBusinessPartners);
  const [syncing, setSyncing] = useState(false);
  const handleSapSync = async () => {
    setSyncing(true);
    try {
      const rows = await getAllBusinessPartners();
      setBusinessPartners(rows);
      toast.success(`Synced ${rows.length} records from SAP B1`);
    } catch (err) {
      toast.error(err.message || 'SAP B1 sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  // Address rows
  const addAddress = () => setForm((f) => ({ ...f, addresses: [...f.addresses, emptyAddress()] }));

  const removeAddress = (i) =>
    setForm((f) => ({ ...f, addresses: f.addresses.filter((_, idx) => idx !== i) }));

  const changeAddress = (i, field, value) =>
    setForm((f) => ({
      ...f,
      addresses: f.addresses.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)),
    }));

  // Only one default per address type (one default Bill-To, one default Ship-To).
  const toggleAddressDefault = (i) =>
    setForm((f) => {
      const target = f.addresses[i];
      const next = !target.isDefault;
      return {
        ...f,
        addresses: f.addresses.map((a, idx) => {
          if (idx === i) return { ...a, isDefault: next };
          if (next && a.AddressType === target.AddressType) return { ...a, isDefault: false };
          return a;
        }),
      };
    });

  // Contact rows
  const addContact = () => setForm((f) => ({ ...f, contacts: [...f.contacts, emptyContact()] }));

  const removeContact = (i) =>
    setForm((f) => ({ ...f, contacts: f.contacts.filter((_, idx) => idx !== i) }));

  const changeContact = (i, field, value) =>
    setForm((f) => ({
      ...f,
      contacts: f.contacts.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)),
    }));

  // Only one default contact overall (becomes the header ContactPerson).
  const toggleContactDefault = (i) =>
    setForm((f) => {
      const next = !f.contacts[i].isDefault;
      return {
        ...f,
        contacts: f.contacts.map((c, idx) =>
          idx === i ? { ...c, isDefault: next } : next ? { ...c, isDefault: false } : c
        ),
      };
    });

  // Milk rate rows (per active tab)
  const currentRateTab = MILK_RATE_TABS.find((tab) => tab.key === activeRateTab);

  const setRateRows = (rows) =>
    setForm((f) => ({ ...f, milkRates: { ...f.milkRates, [activeRateTab]: rows } }));

  const addRateRow = () =>
    setForm((f) => ({
      ...f,
      milkRates: {
        ...f.milkRates,
        [activeRateTab]: [...f.milkRates[activeRateTab], emptyRateRow(currentRateTab)],
      },
    }));

  const removeRateRow = (i) =>
    setRateRows(form.milkRates[activeRateTab].filter((_, idx) => idx !== i));

  const changeRateRow = (i, field, value) => {
    if (field === 'EffectiveFrom') {
      const isDuplicate = form.milkRates[activeRateTab].some(
        (row, idx) => idx !== i && row.EffectiveFrom === value
      );
      if (isDuplicate) {
        toast.error('This Effective From date already exists for another row in this tab.');
        return;
      }
    }

    setRateRows(
      form.milkRates[activeRateTab].map((row, idx) => (idx === i ? { ...row, [field]: value } : row))
    );
  };

  const fetchFarmers = async () => {
    setPending((p) => p + 1);
    try {
      const data = await getAllBusinessPartners();
      setRowData(data ?? []);
    } catch (err) {
      toast.error(err.message || 'Failed to load farmers');
    } finally {
      setPending((p) => p - 1);
    }
  };

  const fetchSeries = async () => {
    setPending((p) => p + 1);
    try {
      const res = await getDocumentSeries(BP_DOCUMENT, BP_DOCUMENT_SUBTYPE);
      const list = Array.isArray(res) ? res : res?.value ?? [];
      const filtered = list.filter((s) => s.Remarks === 'F' || s.Remarks === 'f');
      setSeriesOptions(filtered.map((s) => ({ value: String(s.Series), label: s.Name })));
    } catch (err) {
      toast.error(err.message || 'Failed to load document series');
    } finally {
      setPending((p) => p - 1);
    }
  };

  // deafult Series
  const defaultSeries = seriesOptions.length === 1 ? seriesOptions[0].value : '';

  const fetchStates = async () => {
    setPending((p) => p + 1);
    try {
      // const res = await getAllStates();
      const res = statesMasterData;
      const list = Array.isArray(res) ? res : res?.value ?? [];
      // Restrict to Indian states when the country is provided; else show all.
      const indian = list.filter((s) => !s.Country || s.Country === 'IN');
      const source = indian.length ? indian : list;
      setStateOptions(source.map((s) => ({ value: s.Code, label: s.Name })));
    } catch (err) {
      toast.error(err.message || 'Failed to load states');
    } finally {
      setPending((p) => p - 1);
    }
  };

  useEffect(() => {
    // fetchFarmers();
    fetchSeries();
    fetchStates();
  }, []);

  const columns = [
    { header: 'Card Code', field: 'CardCode', type: 'text' },
    { header: 'Name', field: 'CardName', type: 'text' },
    { header: 'Contact Person', field: 'ContactPerson', type: 'text' },
    { header: 'Address', field: 'Address', type: 'text' },
    { header: 'Phone', field: 'Phone1', type: 'text' },
  ];

  const stats = [
    { label: 'Total', value: businessPartners.length, icon: '📋', iconClass: 'blue', filterKey: 'all' },
  ];

  // Open the modal for Add / Edit / View. Edit & View load the record first.
  const handleModal = async (act, code = null) => {
    setAction(act);

    if (act === 'Add') {
      setForm({ ...emptyForm(), Series: defaultSeries });
      setActiveRateTab(MILK_RATE_TABS[0].key);
      priceListRef.current = null;
      setOpen(true);
      return;
    }

    setPending((p) => p + 1);
    try {
      const bp = await getBusinessPartnerById(code);
      // The price list is a separate UDO keyed by CardCode — a farmer created
      // before this screen existed simply has none yet, so a miss is not an error.
      const priceList = await getFarmerPriceListById(code).catch(() => null);
      priceListRef.current = priceList;

      // A row is the default when its AddressName matches the header pointer.
      // `_orig` keeps the exact object SAP returned so an update can be sent
      // back as read-modify-write (see buildCollections) — that's what lets the
      // Service Layer match the line in place instead of re-inserting (-2035).
      const addresses = (bp?.BPAddresses ?? []).map((a) => ({
        _orig: a,
        RowNum: a.RowNum,
        AddressName: a.AddressName,
        AddressType: a.AddressType || 'bo_BillTo',
        Street: a.Street ?? '',
        Block: a.Block ?? '',
        City: a.City ?? '',
        State: a.State ?? '',
        ZipCode: a.ZipCode ?? '',
        ShipCode: '',
        GstType: a.GstType ?? '',
        GSTIN: a.GSTIN ?? '',
        isDefault:
          (a.AddressType === 'bo_BillTo' && a.AddressName === bp?.BilltoDefault) ||
          (a.AddressType === 'bo_ShipTo' && a.AddressName === bp?.ShipToDefault),
      }));

      const contacts = (bp?.ContactEmployees ?? []).map((c) => ({
        InternalCode: c.InternalCode,
        FirstName: c.FirstName ?? '',
        MiddleName: c.MiddleName ?? '',
        LastName: c.LastName ?? '',
        Phone: c.Phone1 ?? '',
        isDefault: !!bp?.ContactPerson && c.Name === bp.ContactPerson,
      }));

      setForm({
        CardCode: bp?.CardCode ?? '',
        CardName: bp?.CardName ?? '',
        Phone1: bp?.Phone1 ?? '',
        Series: bp?.Series != null ? String(bp.Series) : '',
        U_COWTHRESHOLD: priceList?.U_CWSPRT ?? '',
        U_BUFTHRESHOLD: priceList?.U_BFSPRT ?? '',
        U_BUFDEDRATE: priceList?.U_BFDEDRT ?? '',
        U_MILKTYPE: bp?.U_MILKTYPE ?? '',
        addresses,
        contacts,
        milkRates: priceListToMilkRates(priceList?.[FARMER_PRICE_ROWS]),
      });
      setActiveRateTab(MILK_RATE_TABS[0].key);
      setOpen(true);
    } catch (err) {
      toast.error(err.message || 'Failed to load farmer');
    } finally {
      setPending((p) => p - 1);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete farmer "${row.CardName}"?`)) return;
    setPending((p) => p + 1);
    try {
      await deleteBusinessPartner(row.CardCode);
      toast.success('Farmer deleted successfully');
      fetchFarmers();
    } catch (err) {
      toast.error(err.message || 'Failed to delete farmer');
    } finally {
      setPending((p) => p - 1);
    }
  };

  // Build the SAP BPAddresses / ContactEmployees collections from the form rows.
  const buildCollections = () => {
    // Keep existing rows even if blanked (so SAP doesn't drop them); skip only
    // brand-new rows that were never filled in.
    const rows = form.addresses.filter((a) => a._orig || a.Street || a.City || a.ZipCode || a.GSTIN);

    // AddressName must be unique within a BP *per address type*. Track the names
    // already in use (from existing rows) so an auto-named new row can't collide
    // with them — a collision is exactly what triggers -2035.
    const usedNames = new Set(
      rows.filter((a) => a.AddressName).map((a) => `${a.AddressType}::${a.AddressName}`)
    );
    let BilltoDefault, ShipToDefault;
    const BPAddresses = rows.map((a) => {
      const isShip = a.AddressType === 'bo_ShipTo';
      // Existing rows keep their stored AddressName; new rows get a unique one.
      let AddressName = a.AddressName;
      if (!AddressName) {
        const label = isShip ? 'Ship From' : 'Bill To';
        let n = 1;
        let candidate = label;
        while (usedNames.has(`${a.AddressType}::${candidate}`)) candidate = `${label} ${++n}`;
        AddressName = candidate;
        usedNames.add(`${a.AddressType}::${candidate}`);
      }
      if (a.isDefault && !isShip) BilltoDefault = AddressName;
      if (a.isDefault && isShip) ShipToDefault = AddressName;

      // Read-modify-write: for an existing line, start from the exact object SAP
      // returned so its identity (AddressName + AddressType + RowNum) matches and
      // the Service Layer updates it in place instead of inserting a duplicate
      // (-2035). Overlay only the fields the form can edit. New rows start fresh.
      const base = a._orig ? { ...a._orig } : { AddressType: a.AddressType, Country: 'IN' };
      return {
        ...base,
        AddressName,
        Street: a.Street || null,
        Block: a.Block || null,
        City: a.City || null,
        State: a.State || null,
        ZipCode: a.ZipCode || null,
        GSTIN: a.GSTIN || null,
        ...(a.GstType ? { GstType: a.GstType } : {}),
      };
    });

    // Skip blank contact rows; keep the SAP Name unique.
    const seen = {};
    const cRows = form.contacts.filter((c) => c.FirstName || c.LastName || c.Phone);
    let ContactPerson;
    const ContactEmployees = cRows.map((c, i) => {
      let name = contactName(c, i);
      if (seen[name]) name = `${name} (${++seen[name]})`;
      else seen[name] = 1;
      if (c.isDefault) ContactPerson = name;
      return {
        Name: name,
        ...(c.InternalCode != null ? { InternalCode: c.InternalCode } : {}),
        FirstName: c.FirstName || null,
        MiddleName: c.MiddleName || null,
        LastName: c.LastName || null,
        Phone1: c.Phone || null,
      };
    });

    return { BPAddresses, ContactEmployees, BilltoDefault, ShipToDefault, ContactPerson };
  };

  // Build the SAS_UDO_MD_FRMPRCL payload: thresholds on the SAS_MD_FRMPRCL header,
  // one SAS_MR_FRMPRCL row per filled milk rate line (the tab decides the row's
  // MILKTYPE). Code/Name tie the price list back to the farmer. Add or rename a
  // UDF by editing one line here.
  const buildPriceListPayload = (cardCode) => {
    // A tab only owns some of the rate columns; the ones it doesn't have come
    // back undefined and `compact` drops them before they reach SAP.
    const priceListRows = MILK_RATE_TABS.flatMap((tab) =>
      form.milkRates[tab.key]
        .filter((row) => tab.fields.some((field) => row[field.key] !== ''))
        .map((row) =>
          compact({
            // Existing rows keep their LineId so SAP updates them in place.
            LineId: row.LineId,
            U_MILKTYPE: tab.milkType,
            U_EFCTDTF: row.EffectiveFrom || undefined,
            U_EFCTDTT: row.EffectiveTo || undefined,
            U_FATRATE: toNumber(row.FatRate),
            U_SNFRATE: toNumber(row.SnfRate),
            U_FATBRATE: toNumber(row.FatRateBelow),
            U_SNFBRATE: toNumber(row.SnfRateBelow),
          })
        )
    );

    return compact({
      Code: cardCode,
      Name: form.CardName,
      U_CWSPRT: toNumber(form.U_COWTHRESHOLD),
      U_BFSPRT: toNumber(form.U_BUFTHRESHOLD),
      U_BFDEDRT: toNumber(form.U_BUFDEDRATE),
      [FARMER_PRICE_ROWS]: priceListRows,
    });
  };

  // Save — creates on Add, updates on Edit. The Modal closes only when this
  // resolves to something other than false, so every failure returns false and
  // the user's input survives.
  const handleSave = async () => {
    if (!form.CardName) {
      toast.error('Name is required');
      return false;
    }

    // Prevent saving if there are duplicate Effective From dates in any tab
    for (const tab of MILK_RATE_TABS) {
      const dates = (form.milkRates[tab.key] || [])
        .map((r) => r.EffectiveFrom)
        .filter(Boolean);
      if (dates.length !== new Set(dates).size) {
        toast.error(`Duplicate "Effective From" dates found in ${tab.label}.`);
        return false;
      }
    }

    const { BPAddresses, ContactEmployees, BilltoDefault, ShipToDefault, ContactPerson } =
      buildCollections();

    // CardCode is never sent: on Add SAP assigns it from the series; on Edit
    // it's the route key. Collections/pointers are only sent when non-empty so
    // an Edit that leaves them blank doesn't wipe existing rows. On Edit the
    // BPAddresses are sent as read-modify-write objects (see buildCollections),
    // which is what makes the Service Layer update lines in place (no -2035).
    const payload = {
      CardName: form.CardName,
      Phone1: form.Phone1,
      CardType: 'S',
      GroupCode: '101',
      ...(form.Series ? { Series: Number(form.Series) } : {}),
      ...(BPAddresses.length ? { BPAddresses } : {}),
      ...(ContactEmployees.length ? { ContactEmployees } : {}),
      ...(BilltoDefault ? { BilltoDefault } : {}),
      ...(ShipToDefault ? { ShipToDefault } : {}),
      ...(ContactPerson ? { ContactPerson } : {}),
    };

    setPending((p) => p + 1);
    try {
      let cardCode = form.CardCode;
      if (action === 'Add') {
        const created = await createBusinessPartner(payload);
        cardCode = created?.CardCode ?? cardCode;
      } else {
        await updateBusinessPartner(form.CardCode, payload);
      }

      // Rates + thresholds live in their own UDO, keyed by the farmer's CardCode.
      // Code is the route key on an update, so it never goes in the PATCH body.
      // priceListRef says whether this farmer already has one.
      const { Code, ...priceListPayload } = buildPriceListPayload(cardCode);
      const savedPriceList = priceListRef.current
        ? await updateFarmerPriceList(Code, priceListPayload)
        : await createFarmerPriceList({ Code, ...priceListPayload });
      priceListRef.current = savedPriceList;
      console.log('Farmer price list saved:', savedPriceList?.Code, savedPriceList);

      toast.success(`Farmer ${action === 'Add' ? 'created' : 'updated'} successfully`);
      if (action === 'Add') {
        // Refresh first so the closing modal reveals an up-to-date table.
        const updatedPartners = await getAllBusinessPartners();
        useBusinessPartnerStore.getState().setBusinessPartners(updatedPartners);
      }
      // fetchFarmers();
    } catch (err) {
      // Returning false keeps the modal open so the user can fix the data.
      toast.error(sapErrorMessage(err, `Failed to ${action === 'Add' ? 'create' : 'update'} farmer`));
      return false;
    } finally {
      setPending((p) => p - 1);
    }
  };
  const isView = action === 'View';

  return (
    <>
      <style>{BP_SECTION_CSS}</style>

      {!open && (
        <ListingPage
          title="Farmers"
          subtitle="Manage milk suppliers · SAP Business One integrated"
          titleIcon="🧑‍🌾"
          rowData={businessPartners}
          columns={columns}
          rowKey="CardCode"
          stats={stats}
          searchPlaceholder="Search by code, name, phone…"
          searchFields={['CardCode', 'CardName', 'ContactPerson', 'Phone1']}
          toolbarActions={[
            {
              label: syncing ? 'Syncing…' : 'SAP B1 Sync',
              icon: syncing ? '⏳' : '🔄',
              onClick: handleSapSync,
              disabled: syncing,
            },
          ]}
          primaryAction={{ label: '+ New Farmer', onClick: () => handleModal('Add') }}
          onView={(row) => handleModal('View', row.CardCode)}
          onEdit={(row) => handleModal('Edit', row.CardCode)}
        />
      )}

      <Modal
        open={open}
        onClose={() => { setOpen(false); setForm(emptyForm()); }}
        onSave={handleSave}
        onReset={
          action === 'Edit'
            ? () => handleModal('Edit', form.CardCode)
            : () => setForm(emptyForm())
        }
        mode={isView ? 'view' : action === 'Add' ? 'add' : 'edit'}
        title={`${action} Farmer`}
        entity="Farmer"
        saveLoading={busy}
        saveDisabled={busy}
      >
        <FieldGroup title="Farmer Details" columns={2}>
          <TextField label="Card Code" name="CardCode" value={form.CardCode} disabled hint="Assigned by SAP B1 from the selected series" placeholder="Auto-generated" />
          <SelectField
            label="Series"
            name="Series"
            value={form.Series}
            onChange={change}
            options={seriesOptions}
            placeholder="Select series…"
            disabled={isView || action === 'Edit' || seriesOptions.length === 1}
          />
          <TextField label="Name" name="CardName" value={form.CardName} onChange={change} required disabled={isView} />
          <TextField label="Phone" name="Phone1" value={form.Phone1} onChange={change} disabled={isView} />
          <TextField label="Cow Milk Threshold Percentage" name="U_COWTHRESHOLD" type="number" value={form.U_COWTHRESHOLD} onChange={change} disabled={isView} suffix="%" placeholder="0.00" />
          <TextField label="Buffalo Milk Threshold Percentage" name="U_BUFTHRESHOLD" type="number" value={form.U_BUFTHRESHOLD} onChange={change} disabled={isView} suffix="%" placeholder="0.00" />
          <TextField label="Buffalo Milk Deduction Rate" name="U_BUFDEDRATE" type="number" value={form.U_BUFDEDRATE} onChange={change} disabled={isView} placeholder="0.00" />
          <SelectField label="Milk Type" name="U_MILKTYPE" value={form.U_MILKTYPE} onChange={change} options={MILK_TYPE_OPTIONS} placeholder="Select milk type…" disabled={isView} />
        </FieldGroup>

        {/* Address Information */}
        <div className="bp-section">
          <div className="bp-section-bar">
            <span className="bp-section-title">Address Information</span>
            {!isView && (
              <button type="button" className="bp-addrow" onClick={addAddress}>+ Add Row</button>
            )}
          </div>
          <div className="bp-table-wrap">
            <table className="bp-table">
              <thead>
                <tr>
                  <th>Address Type</th><th>Street</th><th>Block</th><th>City</th><th>State</th><th>Pincode</th><th>GST</th><th>PAN No.</th>
                  <th>Default</th>
                  {!isView && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {form.addresses.length === 0 && (
                  <tr>
                    <td colSpan={isView ? 9 : 10} className="bp-empty">
                      No addresses — {isView ? 'none on record.' : 'click “+ Add Row”.'}
                    </td>
                  </tr>
                )}
                {form.addresses.map((a, i) => (
                  <tr key={i}>
                    <td>
                      <select className="bp-cell-select" value={a.AddressType} disabled={isView}
                        onChange={(e) => changeAddress(i, 'AddressType', e.target.value)}>
                        {ADDRESS_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td><input className="bp-cell-input" value={a.Street} maxLength={100} placeholder="Enter street" disabled={isView} onChange={(e) => changeAddress(i, 'Street', e.target.value)} /></td>
                    <td><input className="bp-cell-input" value={a.Block} maxLength={100} placeholder="Enter block" disabled={isView} onChange={(e) => changeAddress(i, 'Block', e.target.value)} /></td>
                    <td><input className="bp-cell-input" value={a.City} maxLength={100} placeholder="Enter city" disabled={isView} onChange={(e) => changeAddress(i, 'City', e.target.value)} /></td>
                    <td>
                      <select className="bp-cell-select" value={a.State} disabled={isView}
                        onChange={(e) => changeAddress(i, 'State', e.target.value)}>
                        <option value="">Select State</option>
                        {stateOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td><input className="bp-cell-input" value={a.ZipCode} maxLength={100} placeholder="Enter pincode" disabled={isView} onChange={(e) => changeAddress(i, 'ZipCode', e.target.value)} /></td>
                    <td><input className="bp-cell-input" value={a.GSTIN} maxLength={100} placeholder="Enter GST" disabled={isView} onChange={(e) => changeAddress(i, 'GSTIN', e.target.value)} /></td>
                    <td><input className="bp-cell-input" value={a.PAN} maxLength={100} placeholder="Enter PAN" disabled={isView} onChange={(e) => changeAddress(i, 'PAN', e.target.value)} /></td>
                    <td className="bp-center">
                      <input type="checkbox" className="bp-default" checked={a.isDefault} disabled={isView} onChange={() => toggleAddressDefault(i)} />
                    </td>
                    {!isView && (
                      <td><button type="button" className="bp-del" disabled={form.addresses.length === 1} onClick={() => removeAddress(i)}>🗑 Delete</button></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Contact Person Information */}
        <div className="bp-section">
          <div className="bp-section-bar">
            <span className="bp-section-title">Contact Person Information</span>
            {!isView && (
              <button type="button" className="bp-addrow" onClick={addContact}>+ Add Row</button>
            )}
          </div>
          <div className="bp-table-wrap">
            <table className="bp-table">
              <thead>
                <tr>
                  <th>First Name</th><th>Middle Name</th><th>Last Name</th><th>Phone</th><th>Default</th>
                  {!isView && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {form.contacts.length === 0 && (
                  <tr>
                    <td colSpan={isView ? 5 : 6} className="bp-empty">
                      No contacts — {isView ? 'none on record.' : 'click “+ Add Row”.'}
                    </td>
                  </tr>
                )}
                {form.contacts.map((c, i) => (
                  <tr key={i}>
                    <td><input className="bp-cell-input" value={c.FirstName} placeholder="Enter first name" disabled={isView} onChange={(e) => changeContact(i, 'FirstName', e.target.value)} /></td>
                    <td><input className="bp-cell-input" value={c.MiddleName} placeholder="Enter middle name" disabled={isView} onChange={(e) => changeContact(i, 'MiddleName', e.target.value)} /></td>
                    <td><input className="bp-cell-input" value={c.LastName} placeholder="Enter last name" disabled={isView} onChange={(e) => changeContact(i, 'LastName', e.target.value)} /></td>
                    <td><input className="bp-cell-input" value={c.Phone} placeholder="Enter phone number" disabled={isView} onChange={(e) => changeContact(i, 'Phone', e.target.value)} /></td>
                    <td className="bp-center">
                      <input type="checkbox" className="bp-default" checked={c.isDefault} disabled={isView} onChange={() => toggleContactDefault(i)} />
                    </td>
                    {!isView && (
                      <td><button type="button" className="bp-del" disabled={form.contacts.length === 1} onClick={() => removeContact(i)}>🗑 Delete</button></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Milk Rates */}
        <div className="bp-section">
          <div className="bp-section-bar">
            <span className="bp-section-title">Milk Rates</span>
            {!isView && (
              <button type="button" className="bp-addrow" onClick={addRateRow}>+ Add Row</button>
            )}
          </div>
          <div className="bp-tabs">
            {MILK_RATE_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`bp-tab${tab.key === activeRateTab ? ' bp-tab-active' : ''}`}
                onClick={() => setActiveRateTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="bp-table-wrap">
            <table className="bp-table">
              <thead>
                <tr>
                  <th>Effective From</th>
                  <th>Effective To</th>
                  {currentRateTab.fields.map((field) => <th key={field.key}>{field.label}</th>)}
                  {!isView && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {form.milkRates[activeRateTab].length === 0 && (
                  <tr>
                    <td colSpan={currentRateTab.fields.length + (isView ? 2 : 3)} className="bp-empty">
                      No rates — {isView ? 'none on record.' : 'click “+ Add Row”.'}
                    </td>
                  </tr>
                )}
                {form.milkRates[activeRateTab].map((row, i) => (
                  <tr key={i}>
                    <td>
                      <input type="date" className="bp-cell-input" value={row.EffectiveFrom} disabled={isView}
                        onChange={(e) => changeRateRow(i, 'EffectiveFrom', e.target.value)} />
                    </td>
                    <td>
                      <input type="date" className="bp-cell-input" value={row.EffectiveTo} min={row.EffectiveFrom} disabled={isView}
                        onChange={(e) => changeRateRow(i, 'EffectiveTo', e.target.value)} />
                    </td>
                    {currentRateTab.fields.map((field) => (
                      <td key={field.key}>
                        <input type="number" step="0.01" className="bp-cell-input" value={row[field.key]}
                          placeholder="0.00" disabled={isView}
                          onChange={(e) => changeRateRow(i, field.key, e.target.value)} />
                      </td>
                    ))}
                    {!isView && (
                      <td><button type="button" className="bp-del" disabled={form.milkRates[activeRateTab].length === 1} onClick={() => removeRateRow(i)}>🗑 Delete</button></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      <Loader fullscreen show={busy} label="Please wait…" />
    </>
  );
}

const BP_SECTION_CSS = `
.bp-section { margin-top: 22px; }
.bp-section-bar {
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 2px solid #38bdf8; padding-bottom: 8px; margin-bottom: 14px;
}
.bp-section-title { font-size: 16px; font-weight: 700; color: #1f2937; }
.bp-addrow {
  background: #38bdf8; color: #fff; border: none; border-radius: 6px;
  padding: 8px 16px; font-weight: 600; font-size: 13px; cursor: pointer;
}
.bp-addrow:hover { background: #0ea5e9; }
.bp-tabs { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.bp-tab {
  background: #f0f9ff; color: #0369a1; border: 1px solid #bae6fd; border-radius: 6px;
  padding: 7px 16px; font-weight: 600; font-size: 13px; cursor: pointer;
}
.bp-tab:hover { background: #e0f2fe; }
.bp-tab-active { background: #38bdf8; border-color: #38bdf8; color: #fff; }
.bp-table-wrap { overflow-x: auto; border: 1px solid #e5e7eb; border-radius: 8px; }
.bp-table { border-collapse: collapse; width: 100%; min-width: 900px; }
.bp-table th {
  text-align: left; font-size: 12px; font-weight: 600; color: #374151;
  padding: 10px 8px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; white-space: nowrap;
}
.bp-table td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.bp-table tr:last-child td { border-bottom: none; }
.bp-cell-input, .bp-cell-select {
  width: 100%; padding: 7px 8px; border: 1px solid #d1d5db; border-radius: 6px;
  font-size: 13px; box-sizing: border-box; background: #fff; color: #111827;
}
.bp-cell-input:focus, .bp-cell-select:focus { outline: none; border-color: #38bdf8; }
.bp-cell-input:disabled, .bp-cell-select:disabled { background: #f3f4f6; color: #6b7280; }
.bp-center { text-align: center; }
.bp-default { width: 18px; height: 18px; accent-color: #38bdf8; cursor: pointer; }
.bp-del {
  background: #ef4444; color: #fff; border: none; border-radius: 6px;
  padding: 7px 12px; font-weight: 600; font-size: 13px; cursor: pointer; white-space: nowrap;
}
.bp-del:hover { background: #dc2626; }
.bp-del:disabled { background: #fca5a5; cursor: not-allowed; }
.bp-del:disabled:hover { background: #fca5a5; }
.bp-empty { text-align: center; color: #94a3b8; padding: 18px; font-size: 13px; }
`;
