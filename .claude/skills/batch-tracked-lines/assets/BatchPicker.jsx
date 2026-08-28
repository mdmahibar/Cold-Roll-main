/**
 * components/BatchPicker/BatchPicker.jsx — pick batch numbers for one document
 * line.
 * ---------------------------------------------------------------------------
 * A small popup that lists every batch of ONE item held in ONE warehouse
 * (SQLQueries('GetBatchByItemWhs') behind hooks/sapb1) and lets the user
 * allocate a quantity against one batch or several.
 *
 *   <BatchPicker
 *     open={…} itemCode="AD-1007-22-NA-01" warehouseCode="HO-PR"
 *     quantity={35}                       // the line quantity, for guidance
 *     value={[{ BatchNumber, Quantity }]} // what the line already carries
 *     onApply={(rows) => …}               // same shape back
 *     onClose={() => …}
 *   />
 *
 * It renders through a portal onto <body>: the popup opens from inside a Modal
 * whose dialog is `overflow: hidden` and animates with a transform, either of
 * which would clip or re-anchor a fixed child.
 *
 * The picker owns no server state of its own — it reads through
 * useSapB1ItemWarehouseBatches and hands the chosen rows back on Apply. Nothing
 * is written until the parent document is saved.
 * ---------------------------------------------------------------------------
 */
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { useSapB1ItemWarehouseBatches } from '../../../hooks/sapb1';
import './BatchPicker.css';

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

// Quantities are added and subtracted here, so trim the float noise that
// 0.1 + 0.2 arithmetic leaves behind before it reaches SAP.
const round = (value) => Math.round((Number(value) || 0) * 1e6) / 1e6;

const toQty = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/** [{ BatchNumber, Quantity }] -> { [batchNumber]: quantity } for editing. */
const toDraft = (rows = []) =>
  rows.reduce((draft, row) => {
    const key = String(row.BatchNumber ?? row.BatchNum ?? '');
    if (key) draft[key] = String(row.Quantity ?? '');
    return draft;
  }, {});

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */

export default function BatchPicker({
  open,
  itemCode,
  itemDescription = '',
  warehouseCode,
  warehouseLabel = '',
  quantity = 0,          // the line quantity — drives "remaining to allocate"
  value = [],            // batches already on the line
  readOnly = false,
  /**
   * Whether allocating more than the warehouse shows may be applied.
   *
   * `true` (a fresh transfer): the quantities on screen ARE what may be moved,
   * so over-allocating is simply wrong and Apply stays disabled.
   * `false` (receiving against a dispatch note): the note's batches were posted
   * out of that warehouse when it was raised, so they can read as 0 here even
   * though they are the right batches. The mismatch is still shown — SAP is the
   * one that decides at post time.
   */
  enforceAvailability = true,
  /**
   * Restrict the popup to these batch numbers (null = every batch of the item).
   *
   * The Stock Receipt page splits a note's line into one row per batch, so the
   * row is already about ONE batch: opening the picker there should show that
   * batch and nothing else, rather than inviting a swap to a batch the note
   * never carried. A listed batch is shown even when the warehouse reports no
   * stock for it — that is the normal state when receiving.
   */
  onlyBatches = null,
  /**
   * { [batchNumber]: mrp } — the sticker price the CALLER already knows, used
   * when the warehouse query has no row for the batch to read it from. A
   * dispatch note carries its batches' U_MRP, and a batch already moved out of
   * the source warehouse is exactly the case where SAP reports nothing.
   */
  knownMrp = null,
  onApply,
  onClose,
}) {
  // Allocation being edited: batch number -> quantity, as typed.
  const [draft, setDraft] = useState({});
  const [search, setSearch] = useState('');
  // Bumped every time the popup opens, so reopening the same line reseeds the
  // draft from the line's current batches instead of keeping the last edit.
  const [seededFor, setSeededFor] = useState(null);

  const { batches, isFetching, isError, errorMessage, refetch } =
    useSapB1ItemWarehouseBatches(itemCode, warehouseCode, { enabled: open });

  // Seed during render (React's "adjust state when the input changes"), so the
  // popup never paints one frame with the previous line's allocation.
  const openKey = open ? `${itemCode}|${warehouseCode}` : null;
  if (openKey !== seededFor) {
    setSeededFor(openKey);
    setDraft(open ? toDraft(value) : {});
    setSearch('');
  }

  /* ── Escape closes the popup, not the document behind it ────────────────
     The parent Modal listens for Escape on `document` in the bubble phase.
     This listener runs first (capture phase, same node) and stops the event
     there, so the transfer being edited stays open. */
  useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose?.();
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [open, onClose]);

  /* ── Rows: what SAP has, plus anything the line already carries ─────────
     A batch can be picked, then emptied by someone else's posting before this
     document is saved. Dropping it silently would lose the user's allocation,
     so it stays in the list with 0 available and is flagged. */
  const rows = useMemo(() => {
    // null = no restriction; a Set so the two filters below stay O(1).
    const allowed = onlyBatches?.length ? new Set(onlyBatches.map(String)) : null;

    const mrpOf = (batchNum, fromWarehouse) => {
      // What SAP reports for the batch in this warehouse wins; the caller's
      // number is the fallback for a batch the warehouse no longer holds.
      if (fromWarehouse != null) return Number(fromWarehouse);
      const known = knownMrp?.[batchNum];
      return known == null ? null : Number(known);
    };

    const fromSap = batches
      .map((batch) => ({
        BatchNum: String(batch.BatchNum ?? ''),
        Available: Number(batch.Quantity) || 0,
        // OBTN.U_MRP — the price printed on THIS batch's sticker, which can
        // differ from the item master's. Null when the batch carries none.
        Mrp: mrpOf(String(batch.BatchNum ?? ''), batch.B_MRP),
        InSap: true,
      }))
      .filter((row) => !allowed || allowed.has(row.BatchNum));

    const known = new Set(fromSap.map((row) => row.BatchNum));
    /* Batches the warehouse does not report but the popup still has to show:
     * whatever the line already holds, plus every batch it was restricted to —
     * a note's batch normally reads as 0 in the warehouse it was posted out of,
     * and dropping it would leave the picker empty. */
    const orphans = [...new Set([...Object.keys(draft), ...(onlyBatches ?? []).map(String)])]
      .filter((batchNum) => batchNum && !known.has(batchNum))
      .filter((batchNum) => !allowed || allowed.has(batchNum))
      .map((batchNum) => ({
        BatchNum: batchNum,
        Available: 0,
        Mrp: mrpOf(batchNum, null),
        InSap: false,
      }));

    return [...fromSap, ...orphans];
  }, [batches, draft, onlyBatches, knownMrp]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.BatchNum.toLowerCase().includes(q));
  }, [rows, search]);

  const allocated = useMemo(
    () => round(Object.values(draft).reduce((sum, qty) => sum + toQty(qty), 0)),
    [draft],
  );
  const lineQty = toQty(quantity);
  const remaining = round(lineQty - allocated);

  // Anything SAP would reject on save, checked while the user can still fix it.
  const overAllocated = rows.filter(
    (row) => toQty(draft[row.BatchNum]) > row.Available,
  );
  const canApply = !readOnly && (!enforceAvailability || overAllocated.length === 0);

  /* ── Edits ──────────────────────────────────────────────────────────── */

  const setQty = (batchNum, next) =>
    setDraft((prev) => ({ ...prev, [batchNum]: next }));

  const clearBatch = (batchNum) =>
    setDraft((prev) => {
      const next = { ...prev };
      delete next[batchNum];
      return next;
    });

  /**
   * Ticking a batch fills it with what is still needed (capped by what the
   * batch holds); with no line quantity to go on, it takes the whole batch.
   * Un-ticking clears it. That makes the common "one batch covers the line"
   * case a single click, and multi-batch a click per batch.
   */
  const toggleBatch = (row) => {
    if (readOnly) return;
    if (draft[row.BatchNum] !== undefined) {
      clearBatch(row.BatchNum);
      return;
    }
    const stillNeeded = lineQty > 0 ? Math.max(round(lineQty - allocated), 0) : 0;
    // What the batch shows is the cap — unless availability is only advisory
    // here, in which case what the line still needs is the better guess.
    const take = stillNeeded > 0
      ? (enforceAvailability ? Math.min(stillNeeded, row.Available) : stillNeeded)
      : row.Available;
    setQty(row.BatchNum, String(take > 0 ? round(take) : ''));
  };

  const clearAll = () => setDraft({});

  const apply = () => {
    if (!canApply) return;
    const rowsOut = Object.entries(draft)
      .map(([BatchNumber, qty]) => ({ BatchNumber, Quantity: round(toQty(qty)) }))
      .filter((row) => row.Quantity > 0)
      // Stable order so the line reads the same every time it is reopened.
      .sort((a, b) => a.BatchNumber.localeCompare(b.BatchNumber));
    onApply?.(rowsOut);
  };

  if (!open) return null;

  const selectedCount = Object.values(draft).filter((qty) => toQty(qty) > 0).length;

  return createPortal(
    <div
      className="bp-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className="bp-panel" role="dialog" aria-modal="true" aria-label="Select batch numbers">
        {/* ── HEADER ── */}
        <div className="bp-header">
          <div className="bp-header-left">
            <h3 className="bp-title">
              <span aria-hidden="true">🔖</span> Select Batch
            </h3>
            <p className="bp-subtitle">
              <strong>{itemCode || '—'}</strong>
              {itemDescription ? ` · ${itemDescription}` : ''}
              {' · from '}
              <strong>{warehouseLabel || warehouseCode || '—'}</strong>
              {/* Restricted to one batch — say so, or the short list reads like
                  the item only ever had that batch. */}
              {onlyBatches?.length === 1 ? (
                <>
                  {' · batch '}
                  <strong>{onlyBatches[0]}</strong>
                </>
              ) : null}
            </p>
          </div>
          <button type="button" className="bp-close" onClick={onClose} aria-label="Close batch picker">
            ✕
          </button>
        </div>

        {/* ── TOOLBAR ── */}
        <div className="bp-toolbar">
          <input
            className="bp-search"
            value={search}
            placeholder="Search batch number…"
            onChange={(event) => setSearch(event.target.value)}
          />
          <button
            type="button"
            className="bp-btn bp-btn--ghost"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Re-read batch stock from SAP B1"
          >
            {isFetching ? '⏳ Loading…' : '🔄 Refresh'}
          </button>
          {!readOnly && (
            <button type="button" className="bp-btn bp-btn--ghost" onClick={clearAll}>
              Clear
            </button>
          )}
        </div>

        {/* ── LIST ── */}
        <div className="bp-body">
          {isError && (
            <p className="bp-msg bp-msg--error">
              {errorMessage || 'Could not read batches from SAP B1.'}
            </p>
          )}
          {!isError && isFetching && rows.length === 0 && (
            <p className="bp-msg">Loading batches from SAP B1…</p>
          )}
          {!isError && !isFetching && rows.length === 0 && (
            <p className="bp-msg">
              No batch stock for this item in {warehouseCode || 'this warehouse'}.
            </p>
          )}

          {rows.length > 0 && (
            <table className="bp-tbl">
              <thead>
                <tr>
                  <th style={{ width: 38 }} />
                  <th>Batch Number</th>
                  {/* The batch's own sticker price (OBTN.U_MRP) — the same
                      number the POS charges on, so it belongs next to the
                      batch being picked. */}
                  <th style={{ width: 90 }}>MRP</th>
                  <th style={{ width: 90 }}>Available</th>
                  <th style={{ width: 110 }}>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="bp-tbl-empty">
                      No batch matches “{search}”.
                    </td>
                  </tr>
                )}
                {visibleRows.map((row) => {
                  const picked = draft[row.BatchNum] !== undefined;
                  const over = toQty(draft[row.BatchNum]) > row.Available;
                  return (
                    <tr
                      key={row.BatchNum}
                      className={`${picked ? 'bp-row--picked' : ''}${over ? ' bp-row--over' : ''}`}
                    >
                      <td>
                        <input
                          type="checkbox"
                          className="bp-check"
                          checked={picked}
                          disabled={readOnly}
                          onChange={() => toggleBatch(row)}
                          aria-label={`Select batch ${row.BatchNum}`}
                        />
                      </td>
                      <td className="bp-batchnum">
                        {row.BatchNum}
                        {!row.InSap && (
                          <span className="bp-flag" title="No stock left in this warehouse">
                            not in stock
                          </span>
                        )}
                      </td>
                      <td className="bp-num" title={row.Mrp == null ? 'No MRP on this batch' : ''}>
                        {row.Mrp == null ? '—' : `₹${row.Mrp.toLocaleString('en-IN')}`}
                      </td>
                      <td className="bp-num">{row.Available}</td>
                      <td>
                        <input
                          className="bp-qty"
                          type="number"
                          min="0"
                          max={row.Available}
                          step="any"
                          value={draft[row.BatchNum] ?? ''}
                          disabled={readOnly || !picked}
                          placeholder="0"
                          onChange={(event) => setQty(row.BatchNum, event.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="bp-footer">
          <div className="bp-totals">
            <span>
              <strong>{selectedCount}</strong> batch{selectedCount === 1 ? '' : 'es'} ·
              allocated <strong>{allocated}</strong>
              {lineQty > 0 ? ` of ${lineQty}` : ''}
            </span>
            {overAllocated.length > 0 && (
              <span className={enforceAvailability ? 'bp-warn' : 'bp-note'}>
                {enforceAvailability
                  ? `More than the batch holds — reduce ${overAllocated[0].BatchNum}.`
                  : `${overAllocated[0].BatchNum} is more than ${warehouseCode || 'this warehouse'} currently shows — SAP will reject it if the stock is not there.`}
              </span>
            )}
            {overAllocated.length === 0 && lineQty > 0 && remaining !== 0 && (
              <span className="bp-note">
                {remaining > 0 ? `${remaining} still to allocate` : `${-remaining} over the line quantity`}
                {' — applying sets the line quantity to '}
                {allocated}.
              </span>
            )}
          </div>
          <div className="bp-footer-actions">
            <button type="button" className="bp-btn bp-btn--secondary" onClick={onClose}>
              {readOnly ? 'Close' : 'Cancel'}
            </button>
            {!readOnly && (
              <button
                type="button"
                className="bp-btn bp-btn--primary"
                onClick={apply}
                disabled={!canApply}
              >
                Apply
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
