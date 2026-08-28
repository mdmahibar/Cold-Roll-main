/**
 * BatchPicker — the batch numbers behind ONE document line.
 *
 * The page already reads batch stock for its lines (so typing a quantity can
 * allocate without waiting on the network), so this popup takes the rows as a
 * prop instead of fetching its own. Opening it is optional: it shows what the
 * store actually holds and lets the user re-split the line by hand.
 *
 * It renders through a portal onto <body> — it opens from inside a Modal whose
 * dialog is `overflow: hidden` and animates with a transform, either of which
 * would clip or re-anchor a fixed child.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import './BatchPicker.css';

// Quantities are added and subtracted here — trim the float noise that
// 0.1 + 0.2 arithmetic leaves behind before it ever reaches SAP.
const round = (value) => Math.round((Number(value) || 0) * 1e6) / 1e6;

const toQty = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

// [{ BatchNumber, Quantity }] -> { [batchNumber]: quantity } for editing.
const toDraft = (rows = []) =>
  rows.reduce((draft, row) => {
    const key = String(row.BatchNumber ?? '');
    if (key) draft[key] = String(row.Quantity ?? '');
    return draft;
  }, {});

const BatchPicker = ({
  open,
  itemCode,
  itemDescription = '',
  warehouseCode,
  quantity = 0, // line quantity — drives "still to allocate"
  value = [], // batches already on the line
  batches = [], // [{ BatchNum, Quantity }] as SAP reports them
  loading = false,
  readOnly = false,
  onRefresh,
  onApply,
  onClose,
}) => {
  // Allocation being edited: batch number -> quantity, as typed.
  const [draft, setDraft] = useState({});
  const [search, setSearch] = useState('');
  const [seededFor, setSeededFor] = useState(null);

  // Seed during render so the popup never paints one frame with the previous
  // line's allocation.
  const openKey = open ? `${itemCode}|${warehouseCode}` : null;
  if (openKey !== seededFor) {
    setSeededFor(openKey);
    setDraft(open ? toDraft(value) : {});
    setSearch('');
  }

  // Escape closes the popup, not the document behind it. The parent Modal
  // listens on `document` in the bubble phase; this runs first (capture) and
  // stops the event there.
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

  // What SAP has, plus anything the line already carries. A batch can be
  // emptied by someone else's posting before this document is saved — dropping
  // it silently would lose the user's allocation, so it stays at 0 and is flagged.
  const rows = useMemo(() => {
    const fromSap = batches.map((batch) => ({
      BatchNum: String(batch.BatchNum ?? ''),
      Available: Number(batch.Quantity) || 0,
      InSap: true,
    }));
    const known = new Set(fromSap.map((row) => row.BatchNum));
    const orphans = Object.keys(draft)
      .filter((batchNum) => batchNum && !known.has(batchNum))
      .map((batchNum) => ({ BatchNum: batchNum, Available: 0, InSap: false }));
    return [...fromSap, ...orphans];
  }, [batches, draft]);

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => row.BatchNum.toLowerCase().includes(term));
  }, [rows, search]);

  const allocated = useMemo(
    () => round(Object.values(draft).reduce((sum, qty) => sum + toQty(qty), 0)),
    [draft]
  );
  const lineQuantity = toQty(quantity);
  const remaining = round(lineQuantity - allocated);
  const totalAvailable = round(rows.reduce((sum, row) => sum + row.Available, 0));

  // Anything SAP would reject on save, checked while the user can still fix it.
  const overAllocated = rows.filter((row) => toQty(draft[row.BatchNum]) > row.Available);

  const setQuantity = (batchNum, next) => setDraft((prev) => ({ ...prev, [batchNum]: next }));

  // Ticking a batch fills it with what is still needed, capped by what the batch
  // holds; with no line quantity to go on it takes the whole batch.
  const toggleBatch = (row) => {
    if (readOnly) return;
    if (draft[row.BatchNum] !== undefined) {
      setDraft((prev) => {
        const next = { ...prev };
        delete next[row.BatchNum];
        return next;
      });
      return;
    }
    const stillNeeded = lineQuantity > 0 ? Math.max(round(lineQuantity - allocated), 0) : 0;
    const take = stillNeeded > 0 ? Math.min(stillNeeded, row.Available) : row.Available;
    setQuantity(row.BatchNum, String(take > 0 ? round(take) : ''));
  };

  const apply = () => {
    if (readOnly || overAllocated.length > 0) return;
    const applied = Object.entries(draft)
      .map(([BatchNumber, qty]) => ({ BatchNumber, Quantity: round(toQty(qty)) }))
      .filter((row) => row.Quantity > 0)
      // Stable order so the line reads the same every time it is reopened.
      .sort((a, b) => a.BatchNumber.localeCompare(b.BatchNumber));
    onApply?.(applied);
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
      <div className="bp-panel" role="dialog" aria-modal="true" aria-label="Batch details">
        <div className="bp-header">
          <div>
            <h3 className="bp-title">
              <span aria-hidden="true">🔖</span> Batch Details
            </h3>
            <p className="bp-subtitle">
              <strong>{itemCode || '—'}</strong>
              {itemDescription ? ` · ${itemDescription}` : ''}
              {' · in '}
              <strong>{warehouseCode || '—'}</strong>
              {` · ${totalAvailable.toLocaleString('en-IN')} in stock`}
            </p>
          </div>
          <button type="button" className="bp-close" onClick={onClose} aria-label="Close batch details">
            ✕
          </button>
        </div>

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
            onClick={onRefresh}
            disabled={loading || !onRefresh}
            title="Re-read batch stock from SAP B1"
          >
            {loading ? '⏳ Loading…' : '🔄 Refresh'}
          </button>
          {!readOnly && (
            <button type="button" className="bp-btn bp-btn--ghost" onClick={() => setDraft({})}>
              Clear
            </button>
          )}
        </div>

        <div className="bp-body">
          {loading && rows.length === 0 && <p className="bp-msg">Loading batches from SAP B1…</p>}
          {!loading && rows.length === 0 && (
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
                  <th style={{ width: 100 }}>Available</th>
                  <th style={{ width: 110 }}>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="bp-tbl-empty">
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
                      <td className="bp-num">{row.Available.toLocaleString('en-IN')}</td>
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
                          onChange={(event) => setQuantity(row.BatchNum, event.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="bp-footer">
          <div className="bp-totals">
            <span>
              <strong>{selectedCount}</strong> batch{selectedCount === 1 ? '' : 'es'} · allocated{' '}
              <strong>{allocated}</strong>
              {lineQuantity > 0 ? ` of ${lineQuantity}` : ''}
            </span>
            {overAllocated.length > 0 && (
              <span className="bp-warn">More than the batch holds — reduce {overAllocated[0].BatchNum}.</span>
            )}
            {overAllocated.length === 0 && lineQuantity > 0 && remaining !== 0 && (
              <span className="bp-note">
                {remaining > 0 ? `${remaining} still to allocate` : `${-remaining} over the transfer qty`}
                {` — applying sets Transfer Qty to ${allocated}.`}
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
                disabled={overAllocated.length > 0}
              >
                Apply
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BatchPicker;
