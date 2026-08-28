import React, { useMemo, useState, useEffect } from 'react';

import Modal from '../../components/Modal/Modal';

/**
 * RecordPicker
 * A reusable modal that lists records (code + name) and lets the user pick
 * them via checkboxes. Single select by default — pass isMulti to allow
 * picking many at once. On confirm the chosen record (or array of records
 * when isMulti) is passed back through onSelect so the caller can bind
 * whatever fields it needs.
 */
const RecordPicker = ({
  open,
  onClose,
  records = [],
  codeKey = 'CardCode',
  // Row identity. Defaults to codeKey, but pass a truly unique field when the
  // code can repeat — B1 DocNum is unique per series, not across the company.
  idKey,
  nameKey = 'CardName',
  codeLabel = 'Card Code',
  nameLabel = 'Card Name',
  title = 'Select Record',
  subtitle = '',
  saveLabel = 'Select',
  emptyText = 'No records found.',
  loading = false,
  selectedCode = '',
  selectedCodes = [],              // used only when isMulti
  isMulti = false,
  onSelect,
  onSapSync,                       // optional — shows a sync button when passed
  sapSyncLabel = 'SAP Sync',
  showSerial = false,              // adds a "Sl No" column
  extraColumns = [],               // [{ header, field }] — rendered after the name column
}) => {
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState([]);   // always an array; holds max 1 in single mode
  const [syncing, setSyncing] = useState(false);

  // Everything below picks by identity, never by the displayed code.
  const rowKey = idKey || codeKey;
  const rowId = (record) => record[rowKey];

  // Sync the highlighted rows whenever the picker (re)opens.
  useEffect(() => {
    if (open) {
      if (isMulti) setPicked(selectedCodes.filter(Boolean));
      else setPicked(selectedCode ? [selectedCode] : []);
      setSearch('');
    }
    // selectedCodes is often an inline array — key off its contents, not identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isMulti, selectedCode, selectedCodes.join('|')]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return records;
    return records.filter((rec) => {
      const code = String(rec[codeKey] ?? '').toLowerCase();
      const name = String(rec[nameKey] ?? '').toLowerCase();
      return code.includes(term) || name.includes(term);
    });
  }, [records, search, codeKey, nameKey]);

  // checkbox + optional Sl No + code + name + extras
  const colCount = 3 + (showSerial ? 1 : 0) + extraColumns.length;

  const togglePick = (id) => {
    if (!isMulti) {
      setPicked([id]);
      return;
    }
    setPicked((prev) => (prev.includes(id) ? prev.filter((one) => one !== id) : [...prev, id]));
  };

  // Header checkbox — selects / clears every row currently visible.
  const allFilteredPicked = filtered.length > 0 && filtered.every((rec) => picked.includes(rowId(rec)));

  const toggleAllFiltered = () => {
    const ids = filtered.map((rec) => rowId(rec));
    setPicked((prev) => (allFilteredPicked
      ? prev.filter((id) => !ids.includes(id))
      : [...prev, ...ids.filter((id) => !prev.includes(id))]));
  };

  const handleConfirm = () => {
    const chosen = records.filter((rec) => picked.includes(rowId(rec)));
    if (chosen.length === 0) return;
    if (isMulti) onSelect?.(chosen);
    else onSelect?.(chosen[0]);
  };

  const handleSapSync = async () => {
    setSyncing(true);
    try {
      await onSapSync?.();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      onSave={handleConfirm}
      mode="add"
      title={title}
      subtitle={subtitle}
      entity=""
      variant="overlay"
      // Opens on top of an already full-screen form — keep it a compact
      // dialog so the form stays visible behind it.
      size="lg"
      resizable={false}
      showReset={false}
      saveLabel={isMulti && picked.length > 0 ? `${saveLabel} (${picked.length})` : saveLabel}
      saveDisabled={picked.length === 0}
    >
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <input
          type="text"
          className="modal-input"
          placeholder={`Search by ${codeLabel} or ${nameLabel}…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        {onSapSync && (
          <button
            type="button"
            className="modal-btn modal-btn--secondary"
            onClick={handleSapSync}
            disabled={syncing}
            style={{ whiteSpace: 'nowrap' }}
          >
            {syncing ? 'Syncing…' : sapSyncLabel}
          </button>
        )}
      </div>

      <div
        style={{
          border: '1px solid var(--modal-group-border, #e2e4e9)',
          borderRadius: 8,
          overflowY: 'auto',
          maxHeight: 360,
        }}
      >
        <table className="modal-tbl" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--modal-body-bg, #fff)' }}>
            <tr>
              <th style={{ width: 48, textAlign: 'center' }}>
                {isMulti && (
                  <input
                    type="checkbox"
                    checked={allFilteredPicked}
                    onChange={toggleAllFiltered}
                    disabled={filtered.length === 0}
                    aria-label="Select all"
                  />
                )}
              </th>
              {showSerial && <th style={{ width: 60, textAlign: 'left' }}>Sl No</th>}
              <th style={{ textAlign: 'left' }}>{codeLabel}</th>
              <th style={{ textAlign: 'left' }}>{nameLabel}</th>
              {extraColumns.map((column) => (
                <th key={column.field} style={{ textAlign: 'left' }}>{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="modal-tbl-empty" colSpan={colCount}>Loading…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="modal-tbl-empty" colSpan={colCount}>{emptyText}</td>
              </tr>
            ) : (
              filtered.map((rec, index) => {
                const id = rowId(rec);
                const isPicked = picked.includes(id);
                return (
                  <tr
                    key={id}
                    onClick={() => togglePick(id)}
                    style={{ cursor: 'pointer', background: isPicked ? 'rgba(59,130,246,0.08)' : undefined }}
                  >
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isPicked}
                        onChange={() => togglePick(id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select ${rec[nameKey]}`}
                      />
                    </td>
                    {showSerial && <td>{index + 1}</td>}
                    <td>{rec[codeKey]}</td>
                    <td>{rec[nameKey]}</td>
                    {extraColumns.map((column) => (
                      <td key={column.field}>
                        {column.render ? column.render(rec) : rec[column.field] ?? '—'}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
};

export default RecordPicker;
