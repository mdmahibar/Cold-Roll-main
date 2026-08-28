import { useState, useEffect } from 'react';

/**
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  SchemaPage — reusable CRUD page template (copy this for new entities).   │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │  How to use:                                                              │
 * │    1. Copy this file into src/pages/<Entity>.jsx.                         │
 * │    2. Rename the component (SchemaPage → <Entity>).                       │
 * │    3. Point the imports at your entity's service file.                    │
 * │    4. Fill in EMPTY_FORM, columns, stats, and the modal fields.           │
 * │    5. Search for `TODO` to find every spot that needs your values.        │
 * │                                                                           │
 * │  Modelled after src/pages/Farmers.jsx — same loader/modal/toast wiring.   │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

// TODO: point these at your entity's service file (get, getById, create, update, delete).
import {
  getAllRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
} from '../../SAPB1/ENTITY/EntityServices.js';

// OPTIONAL: document series (numbering) — remove if the entity has no series.
import { getDocumentSeries } from '../../SAPB1/Utils/documentSeries.js';

import { toast } from 'react-toastify';   // app-wide toast host lives in App.jsx

import ListingPage from '../ListingTable/ListingPage';
import Modal, { TextField, SelectField, FieldGroup } from '../Modal/Modal';
import Loader from '../Loader/Loader';

// TODO: SAP series document type / sub type for this entity. Remove if no series.
const DOCUMENT = '';
const DOCUMENT_SUBTYPE = '';

// TODO: the entity's key field (used as rowKey and the id in edit/view/delete).
const KEY_FIELD = 'Code';

// TODO: empty form shape — reused when opening "Add" and after saving.
const EMPTY_FORM = {
  Code: '',
  Name: '',
  Series: '',
};

export default function SchemaPage() {
  //! Data state
  const [rowData, setRowData] = useState([]);

  //! Loader state — a counter so overlapping calls stay correct.
  //  Every API call does setPending(+1) before and setPending(-1) after,
  //  so `busy` is true whenever at least one request is in flight.
  const [pending, setPending] = useState(0);
  const busy = pending > 0;

  //! Modal state
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState('Add');      // 'Add' | 'Edit' | 'View'
  const [form, setForm] = useState(EMPTY_FORM);

  //! Document series options for the Series dropdown — loaded once on mount.
  //  Each option is { value: Series (numeric key), label: Name }.
  const [seriesOptions, setSeriesOptions] = useState([]);

  // One handler for every field — updates form[name] as the user types.
  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  //! Load all records from SAP.
  const fetchRecords = async () => {
    setPending((p) => p + 1);
    try {
      const data = await getAllRecords();   // returns the array directly
      setRowData(data ?? []);
    } catch (err) {
      toast.error(err.message || 'Failed to load records');
    } finally {
      setPending((p) => p - 1);
    }
  };

  //! Load the document series options for the Series dropdown.
  //  Remove this (and its useEffect call) if the entity has no series.
  const fetchSeries = async () => {
    setPending((p) => p + 1);
    try {
      const res = await getDocumentSeries(DOCUMENT, DOCUMENT_SUBTYPE);
      // The service action may return the array directly or wrapped in `value`.
      const list = Array.isArray(res) ? res : res?.value ?? [];
      setSeriesOptions(
        list.map((s) => ({ value: String(s.Series), label: s.Name }))
      );
    } catch (err) {
      toast.error(err.message || 'Failed to load document series');
    } finally {
      setPending((p) => p - 1);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchSeries();
  }, []);

  //! Table columns — field names must match the SAP entity's fields.
  const columns = [
    // TODO: define your columns.
    { header: 'Code', field: 'Code', type: 'text' },
    { header: 'Name', field: 'Name', type: 'text' },
  ];

  //! Stats card(s)
  const stats = [
    { label: 'Total', value: rowData.length, icon: '📋', iconClass: 'blue', filterKey: 'all' },
  ];

  //! Open the modal for Add / Edit / View.
  //  For Edit & View we fetch the single record first so the form is pre-filled.
  const handleModal = async (act, id = null) => {
    setAction(act);

    if (act === 'Add') {
      setForm(EMPTY_FORM);
      setOpen(true);
      return;
    }

    // Edit or View — load the record by its key.
    setPending((p) => p + 1);
    try {
      const rec = await getRecordById(id);   // returns the record directly
      // TODO: map the loaded record onto the form shape.
      setForm({
        Code: rec?.Code ?? '',
        Name: rec?.Name ?? '',
        Series: rec?.Series != null ? String(rec.Series) : '',
      });
      setOpen(true);
    } catch (err) {
      toast.error(err.message || 'Failed to load record');
    } finally {
      setPending((p) => p - 1);
    }
  };

  //! Delete a record, then refresh the list.
  const handleDelete = async (row) => {
    if (!window.confirm(`Delete "${row.Name}"?`)) return;
    setPending((p) => p + 1);
    try {
      await deleteRecord(row[KEY_FIELD]);
      toast.success('Deleted successfully');
      fetchRecords();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setPending((p) => p - 1);
    }
  };

  //! Save — creates on Add, updates on Edit.
  const handleSave = async () => {
    // TODO: basic validation.
    if (!form.Name) {
      toast.error('Name is required');
      return;
    }

    // TODO: build the payload SAP expects. The key field is usually not sent:
    //  on Add, SAP assigns it (e.g. from the series); on Edit it's the route key.
    const payload = {
      Name: form.Name,
      // SAP expects Series as a numeric key; omit it when nothing is selected.
      ...(form.Series ? { Series: Number(form.Series) } : {}),
    };

    setPending((p) => p + 1);
    try {
      if (action === 'Add') {
        await createRecord(payload);
      } else {
        await updateRecord(form[KEY_FIELD], payload);
      }
      toast.success(`${action === 'Add' ? 'Created' : 'Updated'} successfully`);
      setOpen(false);
      setForm(EMPTY_FORM);
      fetchRecords();
    } catch (err) {
      toast.error(err.message || `Failed to ${action === 'Add' ? 'create' : 'update'}`);
    } finally {
      setPending((p) => p - 1);
    }
  };

  const isView = action === 'View';

  return (
    <>
      <ListingPage
        title="Entity"                                        // TODO
        subtitle="Manage records · SAP Business One integrated" // TODO
        titleIcon="📦"                                          // TODO
        rowData={rowData}
        columns={columns}
        rowKey={KEY_FIELD}
        stats={stats}
        searchPlaceholder="Search…"                             // TODO
        searchFields={['Code', 'Name']}                         // TODO
        primaryAction={{ label: '+ New', onClick: () => handleModal('Add') }}
        onView={(row) => handleModal('View', row[KEY_FIELD])}
        onEdit={(row) => handleModal('Edit', row[KEY_FIELD])}
        // onDelete={(row) => handleDelete(row)}
      />

      <Modal
        open={open}
        onClose={() => { setOpen(false); setForm(EMPTY_FORM); }}
        onSave={handleSave}
        onReset={
          // Edit → reload the record's original data; Add → clear the form.
          action === 'Edit'
            ? () => handleModal('Edit', form[KEY_FIELD])
            : () => setForm(EMPTY_FORM)
        }
        mode={isView ? 'view' : action === 'Add' ? 'add' : 'edit'}
        title={`${action} Entity`}                              // TODO
        entity="Entity"                                         // TODO
        saveLoading={busy}
        saveDisabled={busy}
      >
        <FieldGroup title="Details" columns={2}>
          {/* TODO: your fields. */}
          <TextField label="Code" name="Code" value={form.Code} disabled hint="Assigned by SAP B1" placeholder="Auto-generated" />
          <SelectField
            label="Series"
            name="Series"
            value={form.Series}
            onChange={change}
            options={seriesOptions}
            placeholder="Select series…"
            disabled={isView || action === 'Edit'}
          />
          <TextField label="Name" name="Name" value={form.Name} onChange={change} required disabled={isView} />
        </FieldGroup>
      </Modal>

      {/* Global loader — shows on every API call (fetch, open edit/view, save, delete). */}
      <Loader fullscreen show={busy} label="Please wait…" />
    </>
  );
}
