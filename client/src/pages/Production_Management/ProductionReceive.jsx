//! This is Production Receive Page — the SECOND leg of the in-transit flow.
//!
//! Stock does not jump from the store to production. Store Dispatch moves it
//! out of the store into the TRANSIT warehouse; this page receives it out of
//! transit into the warehouse that actually takes delivery. Two documents,
//! days apart, with the quantity visible on the balance sheet the whole time.
//!
//!    STORE ──── dispatch ────▶ TRANSIT ──── receipt ────▶ DESTINATION
//!    (Store Dispatch)                       (this page)
//!
//! There is ONE transit warehouse for every destination, so SAP can say it
//! holds 500 units and cannot say whose 500 they are. Everything below is
//! driven by the in-transit ledger, which answers that by netting the
//! documents against each other:
//!
//!    pending(destination) = Σ dispatch lines addressed to it
//!                         − Σ receipt lines linked back to those dispatches

import React, { useMemo, useState } from 'react';

import { toast } from 'react-toastify';

import ListingPage from '../../components/ListingTable/ListingPage';
import Modal, { TextField, TextareaField, SearchableSelectField, DateField, FieldGroup } from '../../components/Modal/Modal';
import Loader from '../../components/Loader/Loader.jsx';
import RecordPicker from '../CollectMilk/RecordPicker.jsx';

//! Zustand
import useWarehouseHook from '../../hooks/useWarehouseHook.js';
import useWarehouseStore from '../../store/warehouseStore.js';
//! End Zustand

//! custom hooks
import useStockTransferHook from '../../hooks/useStockTransferHook.js';
import useInTransitHook from '../../hooks/useInTransitHook.js';
//! End custom hooks

import {
  getStockTransferById,
  getInTransitNoteDetail,
  createStockTransfer,
  closeStockTransfer,
} from '../../SAPB1/StockTransfers/StockTransferServices.js';
import { sapErrorMessage } from '../../SAPB1/auth/login.js';
import { uiToSapDate } from '../../common/Function.js';

//! In-transit — which warehouse is transit and which is damaged is read from
//! U_TYPE on the warehouse master, never hardcoded.
import {
  destinationWarehouses,
  findDamagedWarehouse,
  findTransitWarehouse,
  toWarehouseOptions,
} from '../../common/warehouseTypes.js';

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Drops keys whose value is undefined so we never POST an empty field.
const compact = (object) =>
  Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));

// Quantities are added and subtracted all over this page — trim the float dust
// 0.1 + 0.2 leaves behind before any of it reaches a comparison or SAP.
const round6 = (value) => Math.round((Number(value) || 0) * 1e6) / 1e6;
const qty = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? round6(parsed) : 0;
};

// SAP field limits — a longer value is rejected outright, not truncated.
const COMMENTS_MAX = 254;
const JOURNAL_MEMO_MAX = 50;
const clip = (value, max) => String(value ?? '').slice(0, max);

/* ── The three header UDFs ───────────────────────────────────────
   U_TRFBASE         the DocEntry of the dispatch note this receipt settles.
                     THE link the ledger nets on — without it the transit
                     warehouse is one anonymous pile. It holds DocEntry (the
                     immutable internal id), never DocNum, which is for humans
                     and repeats across series.
   U_TRFTYPE         'R'. A receipt is a stock transfer too; without the marker
                     it comes back looking like another note to be received.
   U_DESTINATIONWHS  taken from the NOTE, not from ToWarehouse. A store may
                     receive into another of its own warehouses without changing
                     who the stock was addressed to, and both sides of the
                     ledger must group by the same key. */

// A receipt carries the note it settles. The type marker is the explicit
// answer, but the link field alone is enough.
const isReceiptRow = (row) =>
  String(row?.U_TRFTYPE ?? '').trim().toUpperCase() === 'R' ||
  String(row?.U_TRFBASE ?? '').trim() !== '';

const EMPTY_FORM = {
  // The NOTE being received — its DocEntry is what U_TRFBASE carries.
  noteDocEntry: '',
  noteDocNum: '',
  noteDate: '',
  sourceWarehouse: '',
  // From Warehouse on a receipt is always the transit warehouse.
  fromWarehouse: '',
  // Where delivery is actually taken. Defaults to the note's destination.
  toWarehouse: '',
  // U_DESTINATIONWHS — who the stock was addressed to. From the NOTE.
  destination: '',
  postingDate: getTodayDate(),
  receivedBy: '',
  remarks: '',
  // Set only when an already-posted receipt is opened for viewing.
  docEntry: '',
  documentNumber: '',
};

/**
 * A netted note becomes the receipt rows: ONE ROW PER BATCH, not per item.
 *
 * A note line dispatched as three batches comes up as three rows, each with its
 * own batch number and the quantity still owed on it, so the store checks
 * physical stickers off one for one instead of guessing which batch a shortfall
 * belongs to. The rows are folded back into one document line per item when the
 * receipt posts.
 *
 * "Expected" is pre-filled with what is STILL OWED, and the original is shown
 * beside it ("of 60") so the smaller number does not read as a bug.
 */
const noteToLines = (note) =>
  (note?.Lines ?? [])
    .filter((line) => line.Pending > 0)
    .flatMap((line) => {
      const row = (batchNumber, dispatched, pending) => ({
        key: `${line.ItemCode}|${batchNumber}`,
        itemNo: line.ItemCode,
        itemName: line.ItemDescription ?? '',
        batchNumber,
        dispatched,
        pending,
        // The store confirms this row by row; it starts on the full balance.
        receiveQuantity: pending,
        damagedQuantity: '',
      });

      // No batches at all: either the item is not batch managed, or SAP did not
      // ship them. Either way the item line is the row.
      if (!line.Batches?.length) return [row('', line.Dispatched, line.Pending)];

      return line.Batches.map((batch) =>
        row(batch.BatchNumber, batch.Dispatched, batch.Pending)
      );
    });

/** A posted receipt, read back for viewing. Same one-row-per-batch shape. */
const receiptToLines = (headers) =>
  (headers?.StockTransferLines ?? []).flatMap((line) => {
    const base = {
      itemNo: line.ItemCode ?? '',
      itemName: line.ItemDescription ?? '',
      dispatched: '',
      damagedQuantity: '',
    };
    if (!line.BatchNumbers?.length) {
      return [
        {
          ...base,
          key: `${line.ItemCode}|`,
          batchNumber: '',
          pending: Number(line.Quantity) || 0,
          receiveQuantity: Number(line.Quantity) || 0,
        },
      ];
    }
    return line.BatchNumbers.map((batch) => ({
      ...base,
      key: `${line.ItemCode}|${batch.BatchNumber}`,
      batchNumber: batch.BatchNumber,
      pending: Number(batch.Quantity) || 0,
      receiveQuantity: Number(batch.Quantity) || 0,
    }));
  });

/**
 * Fold the per-batch rows back into ONE document line per item.
 *
 * @param rows   the receipt rows
 * @param pick   which quantity of a row this document carries (good / damaged)
 */
const buildTransferLines = (rows, pick, fromWarehouse, toWarehouse) => {
  const byItem = new Map();

  rows.forEach((row) => {
    const quantity = qty(pick(row));
    if (quantity <= 0) return;

    const entry = byItem.get(row.itemNo) ?? { ItemCode: row.itemNo, Quantity: 0, batches: [] };
    entry.Quantity = round6(entry.Quantity + quantity);
    // BatchNumbers must be ABSENT, not empty, for a non-batch item — an empty
    // collection makes SAP complain about the batch setup instead.
    if (row.batchNumber) entry.batches.push({ BatchNumber: row.batchNumber, Quantity: quantity });
    byItem.set(row.itemNo, entry);
  });

  return [...byItem.values()].map((entry, index) =>
    compact({
      LineNum: index,
      ItemCode: entry.ItemCode,
      Quantity: entry.Quantity,
      FromWarehouseCode: fromWarehouse,
      WarehouseCode: toWarehouse,
      // BaseLineNumber indexes the line within THIS document, not the note's —
      // short rows are dropped above, so the two no longer line up. Omit it and
      // SAP files every batch against line 0.
      BatchNumbers: entry.batches.length
        ? entry.batches.map((batch) => ({ ...batch, BaseLineNumber: index }))
        : undefined,
    })
  );
};

/* ── Icons ──────────────────────────────────────────────────────── */

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

const ProductionReceive = () => {
  //! zustand
  useWarehouseHook();
  const warehouses = useWarehouseStore((state) => state.warehouses);
  //! zustand

  //! Custom Hook
  // The listing is the posted receipts — a production receive IS a stock transfer.
  const { stockTransfers, refreshStockTransfers } = useStockTransferHook();
  // …and the ledger is what says how much of transit is still owed to whom.
  const {
    notes,
    ledger,
    loading: ledgerLoading,
    refreshing: ledgerRefreshing,
    refreshLedger,
  } = useInTransitHook();
  //! End Custom Hook

  //! In-transit warehouses — read from U_TYPE, never hardcoded.
  const transitWarehouse = useMemo(() => findTransitWarehouse(warehouses), [warehouses]);
  const transitCode = transitWarehouse?.WarehouseCode ?? '';
  const damagedWarehouse = useMemo(() => findDamagedWarehouse(warehouses), [warehouses]);
  const damagedCode = damagedWarehouse?.WarehouseCode ?? '';

  // Transit and damaged are never a place to take delivery.
  const receiveWarehouseOptions = useMemo(
    () => toWarehouseOptions(destinationWarehouses(warehouses)),
    [warehouses]
  );

  const [pending, setPending] = useState(0);
  const busy = pending > 0;

  const [open, setOpen] = useState(false);
  const [action, setAction] = useState('Add');
  const [form, setForm] = useState(EMPTY_FORM);
  const [lines, setLines] = useState([]);
  const [notePickerOpen, setNotePickerOpen] = useState(false);

  const isView = action === 'View';

  const change = (event) => setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  const updateLine = (key, field, value) =>
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, [field]: value } : line)));

  /* ── Totals the store reads before it posts ─────────────────── */

  const totals = useMemo(() => {
    const expected = lines.reduce((sum, line) => round6(sum + qty(line.pending)), 0);
    const good = lines.reduce((sum, line) => round6(sum + qty(line.receiveQuantity)), 0);
    const damaged = lines.reduce((sum, line) => round6(sum + qty(line.damagedQuantity)), 0);
    return {
      expected,
      good,
      damaged,
      // What stays in transit against this destination once this posts.
      shortfall: round6(Math.max(expected - good - damaged, 0)),
    };
  }, [lines]);

  //! SAP B1 Sync — the ledger is netted from the documents, so both refresh.
  const [syncing, setSyncing] = useState(false);
  const handleSapSync = async () => {
    setSyncing(true);
    try {
      await Promise.all([refreshStockTransfers(), refreshLedger()]);
      toast.success('Synced production receives and the in-transit ledger from SAP B1');
    } catch (err) {
      toast.error(sapErrorMessage(err, 'SAP B1 sync failed'));
    } finally {
      setSyncing(false);
    }
  };

  /* ── Picking the dispatch note ──────────────────────────────── */

  // Rows for the picker. The ledger has already dropped settled notes, so
  // everything here still owes its destination something.
  const noteRows = useMemo(
    () =>
      notes.map((note) => ({
        ...note,
        NoteLabel: String(note.DocNum ?? note.DocEntry ?? ''),
        StoreLabel: note.Store || '—',
      })),
    [notes]
  );

  /**
   * The picker row carries the ledger's own netting, which is built from
   * COLLECTION reads — and a collection GET never ships nested BatchNumbers.
   * So the note is re-netted here from single-document GETs, which is what
   * gives every row its batch number and a batch-accurate balance.
   */
  const handleSelectNote = async (row) => {
    setPending((p) => p + 1);
    try {
      const note = await getInTransitNoteDetail(row.DocEntry);

      setForm({
        ...EMPTY_FORM,
        noteDocEntry: note.DocEntry ?? row.DocEntry,
        noteDocNum: String(note.DocNum ?? row.DocNum ?? ''),
        noteDate: uiToSapDate(note.DocDate) ?? '',
        sourceWarehouse: note.FromWarehouse ?? '',
        // Always transit. The note's own ToWarehouse is the authority; the
        // U_TYPE lookup is the fallback for a note posted before tagging.
        fromWarehouse: note.TransitWarehouse || transitCode,
        // Delivery defaults to the destination the note is addressed to.
        toWarehouse: note.Store ?? '',
        // …but U_DESTINATIONWHS keeps saying the NOTE's destination even if the
        // store receives into a different warehouse of its own.
        destination: note.Store ?? '',
        postingDate: getTodayDate(),
      });

      const rows = noteToLines(note);
      setLines(rows);
      if (rows.length === 0) {
        toast.info('Nothing is pending on this note — it has already been received in full.');
      }
    } catch (err) {
      toast.error(sapErrorMessage(err, 'Failed to read the dispatch note'));
    } finally {
      setPending((p) => p - 1);
    }
  };

  /* ── Modal open / close / save ──────────────────────────────── */

  // A posted receipt, read back. Only a single-document GET carries the batches.
  const applyReceipt = (headers) => {
    setForm({
      ...EMPTY_FORM,
      docEntry: headers.DocEntry ?? '',
      documentNumber: headers.DocNum ?? '',
      noteDocEntry: headers.U_TRFBASE ?? '',
      noteDocNum: headers.U_TRFBASE ?? '',
      fromWarehouse: headers.FromWarehouse ?? '',
      toWarehouse: headers.ToWarehouse ?? '',
      destination: headers.U_DESTINATIONWHS ?? '',
      postingDate: uiToSapDate(headers.DocDate) ?? getTodayDate(),
      remarks: headers.Comments ?? '',
    });
    setLines(receiptToLines(headers));
  };

  const handleModal = async (act, docEntry = null) => {
    setAction(act);

    if (act === 'Add') {
      setForm({ ...EMPTY_FORM, postingDate: getTodayDate() });
      setLines([]);
      setOpen(true);
      // Nothing on this page means anything until a note is picked.
      setNotePickerOpen(true);
      return;
    }

    setPending((p) => p + 1);
    try {
      const headers = await getStockTransferById(docEntry);
      applyReceipt(headers);
      setOpen(true);
    } catch (err) {
      toast.error(sapErrorMessage(err, 'Failed to load production receive'));
    } finally {
      setPending((p) => p - 1);
    }
  };

  const closeModal = () => {
    setOpen(false);
    setForm(EMPTY_FORM);
    setLines([]);
  };

  // Back to the note's own balances — the store's typing is what gets reset,
  // never the note.
  const resetForm = () =>
    setLines((prev) =>
      prev.map((line) => ({ ...line, receiveQuantity: line.pending, damagedQuantity: '' }))
    );

  const handleSave = async () => {
    // Returning false keeps the modal open so the store's work survives.
    if (!form.noteDocEntry) {
      toast.error('Pick the dispatch note being received first.');
      return false;
    }
    if (!form.fromWarehouse) {
      toast.error(
        'No in-transit warehouse found. Tag one warehouse with U_TYPE = "IN" in SAP (Warehouse master) and sync again.'
      );
      return false;
    }
    if (!form.toWarehouse) {
      toast.error('Receive Warehouse is mandatory — it takes delivery of the stock.');
      return false;
    }
    if (form.toWarehouse === form.fromWarehouse) {
      toast.error('Stock cannot be received back into the transit warehouse.');
      return false;
    }
    if (lines.length === 0) {
      toast.error('Nothing is pending on this note.');
      return false;
    }

    // Over-receipt is the one error that silently takes someone else's stock
    // out of the shared transit warehouse — name the row it is on.
    const overLine = lines.find(
      (line) =>
        round6(qty(line.receiveQuantity) + qty(line.damagedQuantity)) > round6(qty(line.pending))
    );
    if (overLine) {
      toast.error(
        `${overLine.itemNo}${overLine.batchNumber ? ` · ${overLine.batchNumber}` : ''}: ` +
          `${round6(qty(overLine.receiveQuantity) + qty(overLine.damagedQuantity))} entered, but only ` +
          `${qty(overLine.pending)} is pending in ${form.fromWarehouse}.`
      );
      return false;
    }

    if (totals.good + totals.damaged <= 0) {
      toast.error('Enter a received or damaged quantity on at least one row.');
      return false;
    }
    // Damaged stock is MOVED, not just noted — with nowhere to move it there is
    // no honest way to post it.
    if (totals.damaged > 0 && !damagedCode) {
      toast.error(
        'No damaged-goods warehouse found. Tag one warehouse with U_TYPE = "DM" in SAP, or clear the damaged quantities.'
      );
      return false;
    }

    const receivedBy = form.receivedBy?.trim();
    const shortNote = totals.shortfall > 0 ? ` · Short by ${totals.shortfall}` : '';
    const damagedNote = totals.damaged > 0 ? ` · Damaged ${totals.damaged}` : '';

    const goodLines = buildTransferLines(
      lines,
      (line) => line.receiveQuantity,
      form.fromWarehouse,
      form.toWarehouse
    );

    // Good and damaged stock cannot ride together: one line moves into exactly
    // one warehouse, so the damaged split is its own document.
    const damagedLines = buildTransferLines(
      lines,
      (line) => line.damagedQuantity,
      form.fromWarehouse,
      damagedCode
    );

    // B1 calls the posting date DocDate. Resolved with a fallback so the key is
    // ALWAYS sent — left undefined, `compact` drops it and B1 stamps its own today.
    // The damaged split spreads this payload, so it inherits the same date.
    const docDate = uiToSapDate(form.postingDate) ?? getTodayDate();

    const receiptPayload = compact({
      DocDate: docDate,
      FromWarehouse: form.fromWarehouse,
      ToWarehouse: form.toWarehouse,
      JournalMemo: clip(
        `Receipt against note ${form.noteDocNum || form.noteDocEntry}`,
        JOURNAL_MEMO_MAX
      ),
      Comments: clip(
        `Receipt against transfer note ${form.noteDocNum || form.noteDocEntry}` +
          (receivedBy ? ` · Received by ${receivedBy}` : '') +
          shortNote +
          damagedNote +
          (form.remarks ? ` · ${form.remarks.trim()}` : ''),
        COMMENTS_MAX
      ),
      //! The netting link. DocEntry, never DocNum.
      U_TRFBASE: String(form.noteDocEntry),
      U_TRFTYPE: 'R',
      //! From the NOTE, so both sides of the ledger group by the same key.
      U_DESTINATIONWHS: form.destination,
      StockTransferLines: goodLines,
    });

    setPending((p) => p + 1);
    try {
      /* Post order matters, and so does what each failure means:
           1. receipt (good stock) fails → nothing posted, form intact, STOP.
           2. damaged transfer fails     → the receipt IS posted; warn, and
                                           leave the note open.
           3. close the note             → only when nothing is short AND the
                                           damaged transfer went through. */

      // 1 — the receipt itself.
      if (goodLines.length > 0) {
        await createStockTransfer(receiptPayload);
      }

      // 2 — the damaged split. Same U_TRFBASE and U_DESTINATIONWHS, or the
      // ledger would offer those units to the store all over again.
      let damagedPosted = true;
      if (damagedLines.length > 0) {
        const damagedPayload = compact({
          ...receiptPayload,
          ToWarehouse: damagedCode,
          JournalMemo: clip(
            `Damaged ex note ${form.noteDocNum || form.noteDocEntry}`,
            JOURNAL_MEMO_MAX
          ),
          Comments: clip(
            `Damaged goods against transfer note ${form.noteDocNum || form.noteDocEntry}` +
              (receivedBy ? ` · Received by ${receivedBy}` : ''),
            COMMENTS_MAX
          ),
          StockTransferLines: damagedLines,
        });
        try {
          await createStockTransfer(damagedPayload);
        } catch (err) {
          damagedPosted = false;
          // Nothing below step 1 may be reported as a failure of the receipt —
          // that stock has already moved.
          toast.error(
            `The receipt posted, but the damaged transfer into ${damagedCode} failed: ` +
              `${sapErrorMessage(err, 'SAP rejected it')}. The note stays open — post the damaged split again.`
          );
        }
      }

      // 3 — close the note once it owes nothing. This is the step everyone
      // skips and the one that keeps the ledger bounded: every open note is
      // re-read with all its lines on every ledger request. It hides well —
      // the ledger drops settled notes, so nothing looks broken until it is slow.
      //! Comment out on 25-08-2026
      // if (totals.shortfall <= 0 && damagedPosted) {
      //   try {
      //     await closeStockTransfer(form.noteDocEntry);
      //   } catch (err) {
      //     console.warn('Receipt posted but the note could not be closed', err);
      //   }
      // }

      if (totals.shortfall > 0) {
        toast.success(
          `Receipt posted. Short by ${totals.shortfall} — that stays in ${form.fromWarehouse} ` +
            `against ${form.destination}, and the note stays open so you can receive the rest later.`
        );
      } else {
        toast.success(`Receipt posted against note ${form.noteDocNum || form.noteDocEntry}.`);
      }

      // Refresh both before the modal closes: the ledger is netted from the
      // very documents that just changed, so a stale pending figure here would
      // invite the next store to receive the same stock twice.
      await Promise.all([refreshStockTransfers(), refreshLedger()]);
    } catch (err) {
      toast.error(sapErrorMessage(err, 'Failed to post the production receive'));
      return false;
    } finally {
      setPending((p) => p - 1);
    }
  };

  const handleDelete = () => {
    // A posted receipt is a movement that already happened — it is reversed
    // with another document, never deleted.
    toast.info('A posted receipt is reversed in SAP, not deleted here.');
  };

  /* ── Listing config ─────────────────────────────────────────── */

  const columns = [
    { header: 'Doc No', field: 'DocNum', type: 'code', isLink: true },
    { header: 'Doc Date', field: 'DocDate', type: 'date' },
    { header: 'Against Note', field: 'U_TRFBASE', type: 'text' },
    { header: 'From (Transit)', field: 'FromWarehouse', type: 'text' },
    { header: 'Received Into', field: 'ToWarehouse', type: 'text' },
    { header: 'Destination', field: 'U_DESTINATIONWHS', type: 'text' },
    { header: 'Remarks', field: 'Comments', type: 'text' },
  ];

  // Only the receipts. A dispatch note is a stock transfer too and belongs on
  // Store Dispatch — showing it here would invite it to be "received" twice.
  const receiptRows = useMemo(() => stockTransfers.filter(isReceiptRow), [stockTransfers]);

  const today = getTodayDate();
  const thisMonth = today.slice(0, 7);
  // SAP sends DocDate as "YYYY-MM-DD", so a string compare is enough.
  const isToday = (row) => String(row.DocDate ?? '').startsWith(today);
  const isThisMonth = (row) => String(row.DocDate ?? '').startsWith(thisMonth);

  const stats = useMemo(
    () => [
      { label: 'Total Receipts', value: receiptRows.length, icon: '🏭', iconClass: 'blue', filterKey: 'all' },
      { label: 'Today', value: receiptRows.filter(isToday).length, icon: '📅', iconClass: 'amber', filterKey: 'today' },
      { label: 'This Month', value: receiptRows.filter(isThisMonth).length, icon: '📦', iconClass: 'purple', filterKey: 'month' },
      // Straight off the ledger — how much of the transit warehouse is still
      // owed to somebody, and across how many notes.
      { label: 'Notes To Receive', value: notes.length, icon: '🚚', iconClass: 'amber' },
      { label: 'Pending In Transit', value: ledger.totalPending, icon: '⏳', iconClass: 'purple' },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [receiptRows, notes, ledger]
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
          title="Production Receive"
          subtitle="Stock received out of the in-transit warehouse against a store dispatch note"
          titleIcon="🏭"
          rowData={receiptRows}
          columns={columns}
          rowKey="DocEntry"
          stats={stats}
          filterChips={filterChips}
          defaultFilter="all"
          searchPlaceholder="Search production receives…"
          searchFields={['DocNum', 'U_TRFBASE', 'FromWarehouse', 'ToWarehouse', 'U_DESTINATIONWHS', 'Comments']}
          defaultSortCol="DocNum"
          primaryAction={{ label: '+ Receive From Transit', onClick: () => handleModal('Add') }}
          // A posted receipt is viewed, never edited: a PATCH carrying
          // StockTransferLines REPLACES the whole collection, and the ledger
          // would silently re-net around the edit.
          onView={(record) => handleModal('View', record.DocEntry)}
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
        title={isView ? 'View Production Receive' : 'Receive From In-Transit'}
        subtitle={
          isView
            ? `Receipt ${form.documentNumber} against note ${form.noteDocNum || '—'}`
            : form.noteDocNum
              ? `Note ${form.noteDocNum} · ${form.sourceWarehouse || '—'} → ${form.fromWarehouse || '—'} → ${form.destination || '—'}`
              : 'Pick the dispatch note being received'
        }
        entity="Production Receive"
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
        <FieldGroup title="Dispatch Note" columns={4}>
          <TextField
            label="Note No"
            name="noteDocNum"
            value={form.noteDocNum}
            onChange={change}
            placeholder="Search pending dispatch notes"
            hint="Only notes still owing stock are listed"
            required
            disabled
            suffix={
              !isView && (
                <button
                  type="button"
                  onClick={() => setNotePickerOpen(true)}
                  aria-label="Search pending dispatch notes"
                  title="Search pending dispatch notes"
                  style={searchButtonStyle}
                >
                  <SearchIcon />
                </button>
              )
            }
          />
          <TextField label="Note Date" name="noteDate" value={form.noteDate} onChange={change} disabled />
          <TextField
            label="Dispatched From"
            name="sourceWarehouse"
            value={form.sourceWarehouse}
            onChange={change}
            hint="The store that issued the components"
            disabled
          />
          <TextField
            label="Addressed To"
            name="destination"
            value={form.destination}
            onChange={change}
            hint="U_DESTINATIONWHS — stays as the note wrote it"
            disabled
          />
        </FieldGroup>

        <FieldGroup title="Receive" columns={4}>
          <TextField
            label="From Warehouse (In-Transit)"
            name="fromWarehouse"
            value={form.fromWarehouse}
            onChange={change}
            placeholder="Not configured"
            hint={
              form.fromWarehouse
                ? 'Where the stock has been sitting'
                : '⚠️ Tag one warehouse U_TYPE = "IN" in SAP'
            }
            required
            disabled
          />
          <SearchableSelectField
            label="Receive Warehouse"
            name="toWarehouse"
            value={form.toWarehouse}
            onChange={change}
            options={receiveWarehouseOptions}
            placeholder="Search warehouse…"
            hint="Takes delivery — defaults to the note's destination"
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
          <TextField
            label="Received By"
            name="receivedBy"
            value={form.receivedBy}
            onChange={change}
            placeholder="Who checked the stock in"
            hint="Written into the receipt's remarks"
            disabled={isView}
          />
        </FieldGroup>

        <FieldGroup columns={1}>
          <TextareaField
            label="Remarks"
            name="remarks"
            value={form.remarks}
            onChange={change}
            placeholder="Anything worth recording about this delivery…"
            rows={2}
            disabled={isView}
          />
        </FieldGroup>

        <div className="modal-field-group">
          <div className="modal-field-group-title">
            Received Items {lines.length > 0 && `(${lines.length} ${lines.length === 1 ? 'row' : 'rows'})`}
          </div>

          <div className="modal-tbl-wrap">
            {/* The table keeps its own width and the wrap scrolls, otherwise
                every input is squeezed to a few characters. minWidth is the sum
                of the column widths below — keep it in step. */}
            <table className="modal-tbl" style={{ minWidth: 1099, tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: 44, textAlign: 'center' }}>#</th>
                  <th style={{ width: 165 }}>Item No</th>
                  <th style={{ width: 250 }}>Description</th>
                  {/* One row per batch, so the store checks physical stickers
                      off one for one instead of guessing which batch is short. */}
                  <th style={{ width: 160 }}>Batch</th>
                  <th style={{ width: 130, textAlign: 'right' }} title="Still owed on this note">
                    Expected
                  </th>
                  <th style={{ width: 120, textAlign: 'right' }}>Received</th>
                  <th style={{ width: 120, textAlign: 'right' }} title="Moved into the damaged-goods warehouse">
                    Damaged
                  </th>
                  <th style={{ width: 110, textAlign: 'right' }}>Short</th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '18px 0', opacity: 0.7 }}>
                      {isView ? 'This receipt has no lines.' : 'Pick a dispatch note to load what is pending.'}
                    </td>
                  </tr>
                )}
                {lines.map((line, index) => {
                  const short = round6(
                    Math.max(qty(line.pending) - qty(line.receiveQuantity) - qty(line.damagedQuantity), 0)
                  );
                  return (
                    <tr key={line.key}>
                      <td className="modal-tbl-idx" style={{ textAlign: 'center' }}>{index + 1}</td>
                      <td>
                        <input className="modal-tbl-inp" value={line.itemNo} placeholder="Code" disabled />
                      </td>
                      <td>
                        {/* Textarea, not input — B1 item names are long and must wrap. */}
                        <textarea
                          className="modal-tbl-inp modal-tbl-area"
                          value={line.itemName}
                          rows={2}
                          placeholder="Item name"
                          disabled
                        />
                      </td>
                      <td>
                        <input
                          className="modal-tbl-inp"
                          value={line.batchNumber || '—'}
                          placeholder="—"
                          title={line.batchNumber || 'Not batch managed'}
                          disabled
                        />
                      </td>
                      {/* What is STILL owed, with the original underneath so the
                          smaller number does not read as a bug. */}
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        <div>{qty(line.pending).toLocaleString('en-IN')}</div>
                        {line.dispatched !== '' && qty(line.dispatched) !== qty(line.pending) && (
                          <div style={{ fontSize: 11, opacity: 0.65 }}>
                            of {qty(line.dispatched).toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>
                      <td>
                        <input
                          className="modal-tbl-inp"
                          type="number"
                          value={line.receiveQuantity}
                          onChange={(e) => updateLine(line.key, 'receiveQuantity', e.target.value)}
                          placeholder="0"
                          style={{ textAlign: 'right' }}
                          disabled={isView}
                        />
                      </td>
                      <td>
                        <input
                          className="modal-tbl-inp"
                          type="number"
                          value={line.damagedQuantity}
                          onChange={(e) => updateLine(line.key, 'damagedQuantity', e.target.value)}
                          placeholder="0"
                          style={{ textAlign: 'right' }}
                          title={
                            damagedCode
                              ? `Moved into ${damagedCode}`
                              : 'No warehouse is tagged U_TYPE = "DM"'
                          }
                          disabled={isView || !damagedCode}
                        />
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {short > 0 ? short.toLocaleString('en-IN') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Say what a partial receipt means BEFORE anything posts. */}
          {!isView && lines.length > 0 && (
            <div className="modal-field-hint" style={{ marginTop: 10, lineHeight: 1.6, fontSize: 12 }}>
              <strong>Expected {totals.expected.toLocaleString('en-IN')}</strong>
              {' · '}Receiving {totals.good.toLocaleString('en-IN')}
              {totals.damaged > 0 && (
                <> · Damaged {totals.damaged.toLocaleString('en-IN')} → {damagedCode}</>
              )}
              {totals.shortfall > 0 ? (
                <>
                  {' · '}
                  <strong>Short by {totals.shortfall.toLocaleString('en-IN')}</strong> — that stays in{' '}
                  {form.fromWarehouse || 'transit'} against {form.destination || 'this store'}, and the
                  note stays open so you can receive the rest later.
                </>
              ) : (
                <> · Nothing left over — the note will be closed.</>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Pending notes, straight off the ledger. Every row here still owes its
          destination something — settled notes are already netted out. */}
      <RecordPicker
        open={notePickerOpen}
        onClose={() => setNotePickerOpen(false)}
        records={noteRows}
        codeKey="NoteLabel"
        // DocNum repeats across series — DocEntry is the real identity, and it
        // is what U_TRFBASE has to carry.
        idKey="DocEntry"
        nameKey="StoreLabel"
        codeLabel="Note No"
        nameLabel="Destination"
        extraColumns={[
          { header: 'From', field: 'FromWarehouse' },
          { header: 'In Transit', field: 'TransitWarehouse' },
          { header: 'Dispatched', field: 'Dispatched' },
          { header: 'Received', field: 'Received' },
          { header: 'Pending', field: 'Pending' },
        ]}
        showSerial
        loading={ledgerLoading}
        title="Select Dispatch Note"
        subtitle="Only notes with stock still sitting in transit for a destination"
        emptyText={
          ledgerLoading
            ? 'Reading the in-transit ledger…'
            : 'Nothing is pending in transit — every dispatch note has been received.'
        }
        selectedCode={form.noteDocEntry}
        onSelect={handleSelectNote}
        onSapSync={refreshLedger}
        sapSyncLabel="Refresh Ledger"
      />

      <Loader
        fullscreen
        show={busy || ledgerLoading}
        label={ledgerLoading ? 'Reading the in-transit ledger…' : 'Please wait…'}
      />
      {/* A background re-read must never blank the screen — only the first one
          gets the overlay above. */}
      {ledgerRefreshing && !busy && (
        <div className="bp-loading" style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 60 }}>
          ⏳ Syncing the in-transit ledger…
        </div>
      )}
    </>
  );
};

export default ProductionReceive;
