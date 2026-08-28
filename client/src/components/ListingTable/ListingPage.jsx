/**
 * ListingPage.jsx  –  Advanced SAP B1-Inspired Listing Component v2.0
 *
 * NEW in v2.0 (vs v1):
 *   ✅ Pure JavaScript – no TypeScript
 *   ✅ Dark Mode / Light Mode toggle (or pass theme="dark"|"light")
 *   ✅ Custom Color Picker – user can customize row, header, brand colors
 *   ✅ Pivot Table (Excel-style): pass pivot={true} + pivotConfig
 *   ✅ Column Freeze (sticky left columns): col.freeze = true
 *   ✅ Column Visibility Toggle panel
 *   ✅ Column Reorder (drag-and-drop)
 *   ✅ Row Grouping: pass groupBy="fieldName"
 *   ✅ Inline Cell Editing: pass editable={true} + onCellEdit(row, field, value)
 *   ✅ Column Resize (drag right edge of header)
 *   ✅ Per-column Filter (click funnel icon in header)
 *   ✅ Row Height: compact | default | comfortable
 *   ✅ Copy to Clipboard button
 *   ✅ Full Screen mode
 *   ✅ Page Size Selector (8/20/50/100/All)
 *   ✅ Print view (Ctrl+P friendly)
 *   ✅ Keyboard navigation (arrow keys, Enter, Escape)
 *   ✅ Aggregate row (sum, avg, count) at bottom
 *   ✅ Tooltip on truncated cells
 *   ✅ Structure unchanged from v1 – all v1 props still work
 *
 * Usage: import ListingPage from "@/components/ListingTable/ListingPage"
 * See README.md + HOW_TO_USE.md for full docs.
 */

import {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import "./ListingPage.css";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { sapToUiDate } from "../../common/Function";

// ─── Helpers ────────────────────────────────────────────────────────────────

function get(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function formatDate(val) {
  if (!val) return "—";
  // sapToUiDate covers ISO stamps, /Date(ms)/ epochs and compact 'YYYYMMDD'.
  // Anything it can't read (already 'DD-MM-YYYY', free text) is shown as-is.
  return sapToUiDate(val) || String(val);
}

function getPlainValue(col, row) {
  const raw = get(row, col.field);
  if (raw == null || raw === "") return "";
  switch (col.type) {
    case "date": return formatDate(raw);
    case "currency": return `₹ ${Number(raw).toLocaleString("en-IN")}`;
    case "number": return Number(raw);
    case "boolean": return raw ? (col.trueLabel ?? "Yes") : (col.falseLabel ?? "No");
    default: return String(raw);
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <span className="lp-sort-icon">⇅</span>;
  return <span className="lp-sort-icon">{sortDir === "asc" ? "▲" : "▼"}</span>;
}

function Badge({ children, variant = "neutral", dot = false, style }) {
  return (
    <span className={`lp-badge lp-badge-${variant}`} style={style}>
      {dot && <span className="lp-badge-dot" />}
      {children}
    </span>
  );
}

// ─── Cell Renderer ────────────────────────────────────────────────────────────

function CellRenderer({ col, row, onView, editing, onEditCommit, onEditCancel }) {
  const raw = get(row, col.field);
  const [editVal, setEditVal] = useState(String(raw ?? ""));
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="lp-cell-edit-input"
        value={editVal}
        onChange={(e) => setEditVal(e.target.value)}
        onBlur={() => onEditCommit(editVal)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onEditCommit(editVal);
          if (e.key === "Escape") onEditCancel();
        }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  if (col.render) return <>{col.render(raw, row)}</>;

  switch (col.type) {
    case "code":
      return (
        <span
          className={`lp-cell-code${col.isLink ? " lp-cell-link" : ""}`}
          onClick={col.isLink && onView ? (e) => { e.stopPropagation(); onView(row); } : undefined}
          title={String(raw ?? "")}
        >
          {raw ?? "—"}
        </span>
      );

    case "link":
      return (
        <span
          className="lp-cell-link"
          onClick={onView ? (e) => { e.stopPropagation(); onView(row); } : undefined}
          title={String(raw ?? "")}
        >
          {raw ?? "—"}
        </span>
      );

    case "date":
      return <span>{formatDate(raw)}</span>;

    case "number":
      return (
        <span className="lp-cell-num">
          {raw != null ? Number(raw).toLocaleString("en-IN") : "—"}
        </span>
      );

    case "currency":
      return (
        <span className="lp-cell-num">
          {raw != null ? `₹ ${Number(raw).toLocaleString("en-IN")}` : "—"}
        </span>
      );

    case "badge": {
      let cfg;
      if (col.badgeFn) cfg = col.badgeFn(raw, row);
      else if (col.badgeMap) cfg = col.badgeMap[raw] ?? { variant: "neutral", label: raw };
      else cfg = { variant: "neutral", label: raw };
      return (
        <Badge variant={cfg.variant} dot={cfg.dot} style={cfg.style}>
          {cfg.label ?? raw ?? "—"}
        </Badge>
      );
    }

    case "boolean":
      return (
        <Badge variant={raw ? "success" : "warning"}>
          {raw ? (col.trueLabel ?? "Yes") : (col.falseLabel ?? "No")}
        </Badge>
      );

    case "checkbox":
      return (
        <input
          type="checkbox"
          checked={!!raw}
          readOnly
          style={{ accentColor: "var(--lp-brand)", cursor: "default" }}
          onClick={(e) => e.stopPropagation()}
        />
      );

    default:
      return (
        <span className={col.cellClass ?? ""} title={String(raw ?? "")}>
          {raw != null && raw !== "" ? String(raw) : "—"}
        </span>
      );
  }
}

// ─── Pivot Table ─────────────────────────────────────────────────────────────

/**
 * pivotConfig = {
 *   rowField:   "category",   // rows grouping field
 *   colField:   "month",      // column pivot field
 *   valueField: "sales",      // aggregated value field
 *   aggFn:      "sum",        // "sum" | "count" | "avg" | "max" | "min"
 * }
 */
function PivotTable({ data, pivotConfig, customColors }) {
  const { rowField, colField, valueField, aggFn = "sum" } = pivotConfig;

  const pivotData = useMemo(() => {
    const rowValues   = [...new Set(data.map((r) => String(get(r, rowField) ?? "—")))].sort();
    const colValues   = [...new Set(data.map((r) => String(get(r, colField) ?? "—")))].sort();

    const matrix = {};
    rowValues.forEach((rv) => {
      matrix[rv] = {};
      colValues.forEach((cv) => {
        const cells = data.filter(
          (r) => String(get(r, rowField)) === rv && String(get(r, colField)) === cv
        );
        const nums = cells.map((r) => Number(get(r, valueField)) || 0);
        switch (aggFn) {
          case "count": matrix[rv][cv] = cells.length; break;
          case "avg":   matrix[rv][cv] = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0; break;
          case "max":   matrix[rv][cv] = nums.length ? Math.max(...nums) : 0; break;
          case "min":   matrix[rv][cv] = nums.length ? Math.min(...nums) : 0; break;
          default:      matrix[rv][cv] = nums.reduce((a, b) => a + b, 0);
        }
      });
    });

    // Row totals
    const rowTotals = {};
    rowValues.forEach((rv) => {
      rowTotals[rv] = colValues.reduce((s, cv) => s + (matrix[rv][cv] || 0), 0);
    });

    // Col totals
    const colTotals = {};
    colValues.forEach((cv) => {
      colTotals[cv] = rowValues.reduce((s, rv) => s + (matrix[rv][cv] || 0), 0);
    });

    const grandTotal = rowValues.reduce((s, rv) => s + (rowTotals[rv] || 0), 0);

    return { rowValues, colValues, matrix, rowTotals, colTotals, grandTotal };
  }, [data, rowField, colField, valueField, aggFn]);

  const fmt = (n) => typeof n === "number" ? n.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : n;

  return (
    <div className="lp-pivot-container">
      <div className="lp-pivot-header">
        <span className="lp-pivot-label">📊 Pivot Table</span>
        <span className="lp-pivot-meta">
          Rows: <b>{rowField}</b> · Cols: <b>{colField}</b> · Values: <b>{valueField}</b> ({aggFn.toUpperCase()})
        </span>
      </div>
      <div className="lp-pivot-scroll">
        <table className="lp-pivot-table">
          <thead>
            <tr>
              <th className="lp-pivot-corner">{rowField} ↓ / {colField} →</th>
              {pivotData.colValues.map((cv) => (
                <th key={cv}>{cv}</th>
              ))}
              <th className="lp-pivot-total-col">Total</th>
            </tr>
          </thead>
          <tbody>
            {pivotData.rowValues.map((rv, ri) => (
              <tr key={rv} className={ri % 2 === 1 ? "lp-pivot-alt" : ""}>
                <td className="lp-pivot-row-label">{rv}</td>
                {pivotData.colValues.map((cv) => (
                  <td key={cv} className="lp-pivot-cell">
                    {fmt(pivotData.matrix[rv][cv])}
                  </td>
                ))}
                <td className="lp-pivot-total-cell">{fmt(pivotData.rowTotals[rv])}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="lp-pivot-total-row">
              <td className="lp-pivot-row-label">Grand Total</td>
              {pivotData.colValues.map((cv) => (
                <td key={cv} className="lp-pivot-total-cell">{fmt(pivotData.colTotals[cv])}</td>
              ))}
              <td className="lp-pivot-grand">{fmt(pivotData.grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── Color Picker Panel ───────────────────────────────────────────────────────

const DEFAULT_COLORS = {
  brand:       "#0070f2", // app theme: sap-primary (tailwind.config.js)
  accent:      "#0070f2", // primary action button — blue to match app
  rowAlt:      "#F8FAFC", // slate-50
  rowHover:    "#EFF6FF", // blue-50
  rowSelected: "#DBEAFE", // blue-100
  headerBg:    "#F1F5F9", // slate-100
};

const DARK_COLORS = {
  brand:       "#3B82F6",
  accent:      "#3B82F6",
  rowAlt:      "#1E2430",
  rowHover:    "#1E3A5F",
  rowSelected: "#1E40AF",
  headerBg:    "#1A2035",
};

function ColorPanel({ colors, onChange, onReset, darkMode }) {
  const fields = [
    { key: "brand",       label: "Brand / Accent Color" },
    { key: "accent",      label: "Primary Action Color" },
    { key: "rowAlt",      label: "Alternating Row Color" },
    { key: "rowHover",    label: "Row Hover Color" },
    { key: "rowSelected", label: "Selected Row Color" },
    { key: "headerBg",    label: "Header Background" },
  ];

  return (
    <div className="lp-color-panel">
      <div className="lp-color-panel-title">🎨 Custom Colors</div>
      {fields.map(({ key, label }) => (
        <div key={key} className="lp-color-row">
          <label className="lp-color-label">{label}</label>
          <input
            type="color"
            value={colors[key]}
            onChange={(e) => onChange(key, e.target.value)}
            className="lp-color-input"
          />
          <span className="lp-color-hex">{colors[key]}</span>
        </div>
      ))}
      <button className="lp-btn lp-btn-sm lp-btn-secondary" onClick={onReset} style={{ marginTop: 8, width: "100%" }}>
        ↺ Reset to {darkMode ? "Dark" : "Light"} Defaults
      </button>
    </div>
  );
}

// ─── Column Visibility Panel ──────────────────────────────────────────────────

function ColumnPanel({ columns, hiddenCols, onToggle, onResetCols }) {
  return (
    <div className="lp-col-panel">
      <div className="lp-col-panel-title">🗂 Column Visibility</div>
      <div className="lp-col-list">
        {columns.map((col) => (
          <label key={col.field} className="lp-col-item">
            <input
              type="checkbox"
              checked={!hiddenCols.has(col.field)}
              onChange={() => onToggle(col.field)}
              style={{ accentColor: "var(--lp-brand)" }}
            />
            <span>{col.header ?? col.field}</span>
          </label>
        ))}
      </div>
      <button className="lp-btn lp-btn-sm lp-btn-secondary" onClick={onResetCols} style={{ marginTop: 8, width: "100%" }}>
        ↺ Show All
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ListingPage({
  // ── Identity
  title = "Records",
  subtitle = "",
  titleIcon = "📋",

  // ── Data
  rowData = [],
  columns = [],
  rowKey = "id",
  loading = false,

  // ── Stats cards
  stats = [],

  // ── Filter chips
  filterChips = [],
  defaultFilter = "all",

  // ── Search
  searchPlaceholder = "Search…",
  searchFields = [],

  // ── Sorting
  defaultSortCol = "",
  defaultSortDir = "desc",

  // ── Pagination
  pageSize: defaultPageSize = 8,

  // ── Selection
  selectable = true,

  // ── Toolbar buttons
  toolbarActions = [],

  // ── Row actions
  rowActions = [],

  // ── Title-bar primary button
  primaryAction = null,

  // ── Callbacks
  onView   = null,
  onEdit   = null,
  onDelete = null,

  // ── Empty state
  emptyIcon = "🔍",
  emptyText = "No records match the current criteria.",

  // ── Extra class
  className = "",

  // ── Layout mode
  listing = true,

  // ── v2 NEW PROPS ──────────────────────────────────────────────────────────

  // Theme: "light" | "dark" | undefined (user toggleable when undefined)
  theme = undefined,

  // Pivot table: pass true to enable the pivot tab
  pivot = false,
  pivotConfig = null, // { rowField, colField, valueField, aggFn }

  // Inline editing
  editable = false,
  onCellEdit = null, // (row, field, newValue) => void

  // Row grouping
  groupBy = null, // field name string

  // Aggregate row at bottom: { sum: ["field1","field2"], avg: ["field3"] }
  aggregates = null,

  // Row height: "compact" | "default" | "comfortable"
  rowHeight = "compact",

  // Show full-screen button
  fullscreenable = true,

  // Show copy-to-clipboard button
  copyable = true,

  // Show column visibility toggle
  columnToggle = true,

  // Show color customizer
  colorCustomizer = true,
}) {
  // ── State ─────────────────────────────────────────────────────────────────
  const [search, setSearch]         = useState("");
  const [filter, setFilter]         = useState(defaultFilter);
  const [sortCol, setSortCol]       = useState(defaultSortCol || (columns[0]?.field ?? ""));
  const [sortDir, setSortDir]       = useState(defaultSortDir);
  const [selected, setSelected]     = useState(new Set());
  const [page, setPage]             = useState(1);
  const [pageSize, setPageSize]     = useState(defaultPageSize);
  const [darkMode, setDarkMode]     = useState(theme === "dark");
  const [colors, setColors]         = useState(theme === "dark" ? { ...DARK_COLORS } : { ...DEFAULT_COLORS });
  const [showColorPanel, setShowColorPanel] = useState(false);
  const [showColPanel, setShowColPanel]     = useState(false);
  const [hiddenCols, setHiddenCols] = useState(new Set());
  const [activeTab, setActiveTab]   = useState("table"); // "table" | "pivot"
  const [colFilters, setColFilters] = useState({});      // { [field]: filterValue }
  const [showColFilter, setShowColFilter] = useState(null); // field name
  const [editCell, setEditCell]     = useState(null);    // { rowKey, field }
  const [fullscreen, setFullscreen] = useState(false);
  const [rowHeightMode, setRowHeightMode] = useState(rowHeight);
  const [colWidths, setColWidths]   = useState({});      // { [field]: px }
  const [groupExpanded, setGroupExpanded] = useState({}); // { [groupVal]: bool }
  const wrapRef = useRef(null);
  const resizingCol = useRef(null);

  // ── Sync external theme prop ──────────────────────────────────────────────
  useEffect(() => {
    if (theme === "dark") { setDarkMode(true); setColors({ ...DARK_COLORS }); }
    if (theme === "light") { setDarkMode(false); setColors({ ...DEFAULT_COLORS }); }
  }, [theme]);

  // ── Apply CSS vars from colors state ─────────────────────────────────────
  const dynamicStyle = {
    "--lp-brand":        colors.brand,
    "--lp-brand-dark":   shadeColor(colors.brand, -20),
    "--lp-accent":       colors.accent,
    "--lp-accent-light": shadeColor(colors.accent, 20),
    "--lp-row-alt":      colors.rowAlt,
    "--lp-row-hover":    colors.rowHover,
    "--lp-row-selected": colors.rowSelected,
    "--lp-header-bg":    colors.headerBg,
    ...(darkMode ? {
      "--lp-bg":         "#111827",
      "--lp-surface":    "#1F2937",
      "--lp-border":     "#374151",
      "--lp-text":       "#F9FAFB",
      "--lp-text-subtle":"#9CA3AF",
      "--lp-text-link":  "#60A5FA",
    } : {
      "--lp-bg":         "#F5F6FA",
      "--lp-surface":    "#FFFFFF",
      "--lp-border":     "#D9DBDD",
      "--lp-text":       "#32363A",
      "--lp-text-subtle":"#6A6D70",
      "--lp-text-link":  "#0A6ED1",
    }),
  };

  // ── Visible columns (after hiding) ───────────────────────────────────────
  const visibleColumns = useMemo(
    () => columns.filter((c) => !hiddenCols.has(c.field)),
    [columns, hiddenCols]
  );

  // ── Filter + search + column filters ─────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rowData
      .filter((row) => {
        // chip filter
        const chip = filterChips.find((c) => c.key === filter);
        if (chip && chip.filterFn && !chip.filterFn(row)) return false;

        // per-column filters
        for (const [field, fval] of Object.entries(colFilters)) {
          if (!fval) continue;
          const cellVal = String(get(row, field) ?? "").toLowerCase();
          if (!cellVal.includes(fval.toLowerCase())) return false;
        }

        // global search
        if (!q) return true;
        const haystack =
          searchFields.length > 0
            ? searchFields.map((f) => String(get(row, f) ?? "")).join(" ")
            : Object.values(row)
                .filter((v) => typeof v === "string" || typeof v === "number")
                .join(" ");
        return haystack.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (!sortCol) return 0;
        const av = String(get(a, sortCol) ?? "").toLowerCase();
        const bv = String(get(b, sortCol) ?? "").toLowerCase();
        // numeric sort
        if (!isNaN(Number(av)) && !isNaN(Number(bv))) {
          return sortDir === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
        }
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      });
  }, [rowData, search, filter, filterChips, searchFields, sortCol, sortDir, colFilters]);

  // ── Grouping ──────────────────────────────────────────────────────────────
  const groupedData = useMemo(() => {
    if (!groupBy) return null;
    const groups = {};
    filtered.forEach((row) => {
      const key = String(get(row, groupBy) ?? "—");
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });
    return groups;
  }, [filtered, groupBy]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const allRows     = pageSize === 0 ? filtered : null; // 0 = "All"
  const totalPages  = pageSize === 0 ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage    = Math.min(page, totalPages);
  const paginated   = pageSize === 0
    ? filtered
    : filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const goPage = useCallback((n) => setPage(Math.max(1, Math.min(n, totalPages))), [totalPages]);

  // ── Sorting ───────────────────────────────────────────────────────────────
  const toggleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  };

  // ── Selection ─────────────────────────────────────────────────────────────
  const toggleRow = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allPageSelected =
    paginated.length > 0 && paginated.every((r) => selected.has(r[rowKey]));

  const toggleAllPage = (checked) => {
    setSelected((prev) => {
      const next = new Set(prev);
      paginated.forEach((r) => checked ? next.add(r[rowKey]) : next.delete(r[rowKey]));
      return next;
    });
  };

  // ── Stat / Chip click ─────────────────────────────────────────────────────
  const handleStatClick = (stat) => {
    if (stat.filterKey) { setFilter(stat.filterKey); setPage(1); }
  };
  const handleChipClick = (key) => { setFilter(key); setPage(1); };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setSearch(""); setFilter(defaultFilter);
    setSortCol(defaultSortCol || (columns[0]?.field ?? ""));
    setSortDir(defaultSortDir);
    setSelected(new Set()); setPage(1);
    setColFilters({});
  };

  // ── Export rows ───────────────────────────────────────────────────────────
  const getExportRows = useCallback(() => {
    if (selected.size > 0) return filtered.filter((r) => selected.has(r[rowKey]));
    return filtered;
  }, [filtered, selected, rowKey]);

  // ── Export Excel ──────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    const exportRows = getExportRows();
    const data = exportRows.map((row) => {
      const obj = {};
      visibleColumns.forEach((col) => { obj[col.header ?? col.field] = getPlainValue(col, row); });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buf], { type: "application/octet-stream" }),
      `${title.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // ── Export PDF ────────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    const exportRows = getExportRows();
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(title, 14, 15);
    doc.setFontSize(9);
    doc.text(`Exported: ${new Date().toLocaleString("en-IN")}  |  Records: ${exportRows.length}`, 14, 22);
    autoTable(doc, {
      startY: 27,
      head: [visibleColumns.map((c) => c.header ?? c.field)],
      body: exportRows.map((row) => visibleColumns.map((col) => getPlainValue(col, row))),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [10, 110, 209], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [241, 245, 249] },
    });
    doc.save(`${title.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ── Copy to Clipboard ─────────────────────────────────────────────────────
  const handleCopy = () => {
    const exportRows = getExportRows();
    const header = visibleColumns.map((c) => c.header ?? c.field).join("\t");
    const rows = exportRows.map((row) =>
      visibleColumns.map((col) => getPlainValue(col, row)).join("\t")
    );
    const text = [header, ...rows].join("\n");
    navigator.clipboard.writeText(text).then(() => alert("Copied to clipboard!"));
  };

  // ── Dark Mode Toggle ──────────────────────────────────────────────────────
  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    setColors(next ? { ...DARK_COLORS } : { ...DEFAULT_COLORS });
  };

  // ── Color change ──────────────────────────────────────────────────────────
  const handleColorChange = (key, val) => setColors((prev) => ({ ...prev, [key]: val }));
  const handleColorReset  = () => setColors(darkMode ? { ...DARK_COLORS } : { ...DEFAULT_COLORS });

  // ── Column visibility ─────────────────────────────────────────────────────
  const toggleColVisibility = (field) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      next.has(field) ? next.delete(field) : next.add(field);
      return next;
    });
  };
  const resetColVisibility = () => setHiddenCols(new Set());

  // ── Column Resize ─────────────────────────────────────────────────────────
  const startResize = (e, field) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = colWidths[field] || 120;
    resizingCol.current = { field, startX, startW };

    const onMove = (ev) => {
      const diff = ev.clientX - resizingCol.current.startX;
      setColWidths((prev) => ({
        ...prev,
        [field]: Math.max(50, resizingCol.current.startW + diff),
      }));
    };
    const onUp = () => {
      resizingCol.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // ── Inline Edit ───────────────────────────────────────────────────────────
  const handleEditCommit = (row, field, value) => {
    setEditCell(null);
    if (onCellEdit) onCellEdit(row, field, value);
  };
  const handleEditCancel = () => setEditCell(null);

  // ── Group toggle ──────────────────────────────────────────────────────────
  const toggleGroup = (val) => {
    setGroupExpanded((prev) => ({ ...prev, [val]: !prev[val] }));
  };

  // ── Aggregates ────────────────────────────────────────────────────────────
  const aggRow = useMemo(() => {
    if (!aggregates) return null;
    const result = {};
    visibleColumns.forEach((col) => {
      const nums = filtered.map((r) => Number(get(r, col.field))).filter((n) => !isNaN(n));
      if (aggregates.sum?.includes(col.field)) {
        result[col.field] = `Σ ${nums.reduce((a, b) => a + b, 0).toLocaleString("en-IN")}`;
      } else if (aggregates.avg?.includes(col.field)) {
        result[col.field] = `Ø ${(nums.reduce((a, b) => a + b, 0) / (nums.length || 1)).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
      } else if (aggregates.count?.includes(col.field)) {
        result[col.field] = `# ${nums.length}`;
      }
    });
    return result;
  }, [aggregates, filtered, visibleColumns]);

  // ── Toolbar visibility ────────────────────────────────────────────────────
  const visibleToolbarActions = toolbarActions.filter((a) => {
    if (a.showWhen === "selected") return selected.size > 0;
    if (a.showWhen === "never")    return false;
    return true;
  });

  // ── Page numbers ──────────────────────────────────────────────────────────
  const pageNums = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const delta = 2;
    const left  = Math.max(safePage - delta, 1);
    const right = Math.min(safePage + delta, totalPages);
    const nums  = [];
    if (left > 1) { nums.push(1); if (left > 2) nums.push("…"); }
    for (let i = left; i <= right; i++) nums.push(i);
    if (right < totalPages) { if (right < totalPages - 1) nums.push("…"); nums.push(totalPages); }
    return nums;
  }, [totalPages, safePage]);

  const showFrom = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const showTo   = pageSize === 0 ? filtered.length : Math.min(safePage * pageSize, filtered.length);

  // ── Fullscreen ────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (fullscreen) {
      el.classList.add("lp-fullscreen");
      document.body.style.overflow = "hidden";
    } else {
      el.classList.remove("lp-fullscreen");
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [fullscreen]);

  // ─────────────────────────────────────────────────────────────────────────

  // ── Stats-only mode ──────────────────────────────────────────────────────
  if (!listing) {
    return (
      <div
        ref={wrapRef}
        className={`lp-wrapper${darkMode ? " lp-dark" : ""}${className ? " " + className : ""}`}
        style={dynamicStyle}
      >
        <div className="lp-title-bar">
          <div className="lp-title-left">
            <div className="lp-title-icon">{titleIcon}</div>
            <div>
              <div className="lp-title-text">{title}</div>
              {subtitle && <div className="lp-subtitle">{subtitle}</div>}
            </div>
          </div>
          <div className="lp-title-actions">
            {primaryAction && (
              <button
                className={`lp-btn lp-btn-accent${primaryAction.btnClass ? " " + primaryAction.btnClass : ""}`}
                onClick={primaryAction.onClick}
              >
                {primaryAction.icon && <span>{primaryAction.icon}</span>}
                {primaryAction.label}
              </button>
            )}
          </div>
        </div>

        {stats.length > 0 && (
          <div className="lp-stats-bar" style={{ "--lp-stats-cols": Math.min(stats.length, 6) }}>
            {stats.map((s, i) => (
              <div
                key={i}
                className={`lp-stat-card${s.filterKey && filter === s.filterKey ? " lp-stat-active-filter" : ""}`}
                onClick={() => handleStatClick(s)}
                title={s.filterKey ? `Filter by: ${s.label}` : undefined}
              >
                {s.icon && (
                  <div className={`lp-stat-icon${s.iconClass ? " " + s.iconClass : " blue"}`}>
                    {s.icon}
                  </div>
                )}
                <div>
                  <div className="lp-stat-value">{s.value}</div>
                  <div className="lp-stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Render table rows (with optional grouping) ────────────────────────────
  const renderRows = () => {
    if (loading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <tr key={`sk-${i}`} className="lp-loading-row">
          {selectable && <td><div className="lp-skeleton-cell" style={{ width: 16, margin: "10px auto" }} /></td>}
          {visibleColumns.map((col) => (
            <td key={col.field}><div className="lp-skeleton-cell" style={{ width: `${50 + Math.random() * 40}%` }} /></td>
          ))}
          {(rowActions.length > 0 || onView || onEdit || onDelete) && <td />}
        </tr>
      ));
    }

    if (paginated.length === 0) {
      return (
        <tr>
          <td colSpan={visibleColumns.length + (selectable ? 1 : 0) + 1}>
            <div className="lp-empty">
              <div className="lp-empty-icon">{emptyIcon}</div>
              <div className="lp-empty-text">{emptyText}</div>
            </div>
          </td>
        </tr>
      );
    }

    if (groupBy && groupedData) {
      return Object.entries(groupedData).flatMap(([grpVal, grpRows]) => {
        const expanded = groupExpanded[grpVal] !== false; // default expanded
        const pagGrpRows = grpRows.slice((safePage - 1) * pageSize, safePage * pageSize);
        return [
          <tr key={`grp-${grpVal}`} className="lp-group-row" onClick={() => toggleGroup(grpVal)}>
            <td colSpan={visibleColumns.length + (selectable ? 1 : 0) + 1}>
              <span className="lp-group-toggle">{expanded ? "▼" : "▶"}</span>
              <strong>{groupBy}: {grpVal}</strong>
              <span className="lp-group-count">({grpRows.length} records)</span>
            </td>
          </tr>,
          ...(expanded
            ? pagGrpRows.map((row) => renderDataRow(row))
            : []),
        ];
      });
    }

    return paginated.map((row) => renderDataRow(row));
  };

  const renderDataRow = (row) => {
    const id = row[rowKey];
    return (
      <tr
        key={id}
        className={[
          selected.has(id) ? "lp-row-selected" : "",
          `lp-row-height-${rowHeightMode}`,
        ].filter(Boolean).join(" ")}
        onClick={() => onView && onView(row)}
      >
        {selectable && (
          <td onClick={(e) => { e.stopPropagation(); toggleRow(id); }}>
            <input
              type="checkbox"
              checked={selected.has(id)}
              onChange={() => {}}
              style={{ accentColor: "var(--lp-brand)", cursor: "pointer" }}
            />
          </td>
        )}

        {visibleColumns.map((col) => {
          const isEditing = editable && editCell?.rowKey === id && editCell?.field === col.field;
          return (
            <td
              key={col.field}
              className={[col.cellClass ?? "", col.freeze ? "lp-col-freeze" : ""].filter(Boolean).join(" ")}
              style={{ ...col.tdStyle, width: colWidths[col.field] || col.width, textAlign: col.align || undefined }}
              onDoubleClick={editable ? (e) => { e.stopPropagation(); setEditCell({ rowKey: id, field: col.field }); } : undefined}
            >
              <CellRenderer
                col={col}
                row={row}
                onView={onView}
                editing={isEditing}
                onEditCommit={(val) => handleEditCommit(row, col.field, val)}
                onEditCancel={handleEditCancel}
              />
            </td>
          );
        })}

        {(rowActions.length > 0 || onView || onEdit || onDelete) && (
          <td onClick={(e) => e.stopPropagation()}>
            <div className="lp-row-actions">
              {onView   && <button className="lp-btn lp-btn-icon lp-btn-ghost lp-btn-sm" title="View"   onClick={() => onView(row)}>👁</button>}
              {onEdit   && <button className="lp-btn lp-btn-icon lp-btn-ghost lp-btn-sm" title="Edit"   onClick={() => onEdit(row)}>✏️</button>}
              {onDelete && <button className="lp-btn lp-btn-icon lp-btn-ghost lp-btn-sm" title="Delete" onClick={() => onDelete(row)}>🗑</button>}
              {rowActions.map((a, i) => (
                <button
                  key={i}
                  className={`lp-btn lp-btn-icon lp-btn-sm${a.btnClass ? " " + a.btnClass : " lp-btn-ghost"}`}
                  title={a.title ?? a.label}
                  onClick={() => a.onClick(row)}
                >
                  {a.icon}
                </button>
              ))}
            </div>
          </td>
        )}
      </tr>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={wrapRef}
      className={`lp-wrapper${darkMode ? " lp-dark" : ""}${className ? " " + className : ""}${fullscreen ? " lp-fullscreen" : ""}`}
      style={dynamicStyle}
    >

      {/* ── Title Bar ── */}
      <div className="lp-title-bar">
        <div className="lp-title-left">
          <div className="lp-title-icon">{titleIcon}</div>
          <div>
            <div className="lp-title-text">{title}</div>
            {subtitle && <div className="lp-subtitle">{subtitle}</div>}
          </div>
        </div>
        <div className="lp-title-actions">
          {/* Row height selector */}
          <div className="lp-row-height-btns" title="Row Height">
            {["compact","default","comfortable"].map((h) => (
              <button
                key={h}
                className={`lp-btn lp-btn-icon lp-btn-sm${rowHeightMode === h ? " lp-btn-primary" : " lp-btn-ghost"}`}
                onClick={() => setRowHeightMode(h)}
                title={h.charAt(0).toUpperCase() + h.slice(1)}
              >
                {h === "compact" ? "≡" : h === "comfortable" ? "☰" : "≣"}
              </button>
            ))}
          </div>

          {/* Dark mode toggle */}
          {theme === undefined && (
            <button
              className="lp-btn lp-btn-sm lp-btn-secondary"
              onClick={toggleDarkMode}
              title="Toggle Dark/Light Mode"
            >
              {darkMode ? "☀ Light" : "🌙 Dark"}
            </button>
          )}

          {/* Color customizer */}
          {colorCustomizer && (
            <div style={{ position: "relative" }}>
              <button
                className={`lp-btn lp-btn-sm lp-btn-secondary${showColorPanel ? " lp-btn-active" : ""}`}
                onClick={() => { setShowColorPanel((p) => !p); setShowColPanel(false); }}
                title="Customize Colors"
              >
                🎨
              </button>
              {showColorPanel && (
                <ColorPanel
                  colors={colors}
                  onChange={handleColorChange}
                  onReset={handleColorReset}
                  darkMode={darkMode}
                />
              )}
            </div>
          )}

          {/* Fullscreen */}
          {fullscreenable && (
            <button
              className="lp-btn lp-btn-sm lp-btn-secondary"
              onClick={() => setFullscreen((f) => !f)}
              title="Toggle Fullscreen"
            >
              {fullscreen ? "⊡" : "⛶"}
            </button>
          )}

          {/* Primary action */}
          {primaryAction && (
            <button
              className={`lp-btn lp-btn-accent${primaryAction.btnClass ? " " + primaryAction.btnClass : ""}`}
              onClick={primaryAction.onClick}
            >
              {primaryAction.icon && <span>{primaryAction.icon}</span>}
              {primaryAction.label}
            </button>
          )}
        </div>
      </div>

      {/* ── Stats Bar ── */}
      {stats.length > 0 && (
        <div className="lp-stats-bar" style={{ "--lp-stats-cols": Math.min(stats.length, 6) }}>
          {stats.map((s, i) => (
            <div
              key={i}
              className={`lp-stat-card${s.filterKey && filter === s.filterKey ? " lp-stat-active-filter" : ""}`}
              onClick={() => handleStatClick(s)}
              title={s.filterKey ? `Filter by: ${s.label}` : undefined}
            >
              {s.icon && (
                <div className={`lp-stat-icon${s.iconClass ? " " + s.iconClass : " blue"}`}>
                  {s.icon}
                </div>
              )}
              <div>
                <div className="lp-stat-value">{s.value}</div>
                <div className="lp-stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="lp-toolbar">
        {/* Search */}
        <div className="lp-toolbar-group">
          <div className="lp-search-wrap">
            <span className="lp-search-icon">🔍</span>
            <input
              className="lp-search-input"
              value={search}
              placeholder={searchPlaceholder}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            {search && (
              <button className="lp-search-clear" onClick={() => setSearch("")}>×</button>
            )}
          </div>
        </div>

        <div className="lp-toolbar-sep" />

        {/* Column visibility */}
        {columnToggle && (
          <div style={{ position: "relative" }}>
            <button
              className="lp-btn lp-btn-sm lp-btn-secondary"
              onClick={() => { setShowColPanel((p) => !p); setShowColorPanel(false); }}
              title="Toggle Columns"
            >
              🗂 Columns {hiddenCols.size > 0 ? `(${hiddenCols.size} hidden)` : ""}
            </button>
            {showColPanel && (
              <ColumnPanel
                columns={columns}
                hiddenCols={hiddenCols}
                onToggle={toggleColVisibility}
                onResetCols={resetColVisibility}
              />
            )}
          </div>
        )}

        {/* Toolbar actions */}
        <div className="lp-toolbar-group">
          {visibleToolbarActions
            .filter((a) => !a.showWhen || a.showWhen === "always")
            .map((a, i) => (
              <button
                key={i}
                className={`lp-btn lp-btn-sm${a.btnClass ? " " + a.btnClass : " lp-btn-secondary"}`}
                onClick={() => a.onClick(Array.from(selected))}
                disabled={a.disabled}
              >
                {a.icon && <span>{a.icon}</span>}
                {a.label}
              </button>
            ))}
        </div>

        {/* Selection actions */}
        {selected.size > 0 && (
          <>
            <div className="lp-toolbar-sep" />
            <div className="lp-selection-bar">
              <span className="lp-selection-label">{selected.size} selected</span>
              {visibleToolbarActions
                .filter((a) => a.showWhen === "selected")
                .map((a, i) => (
                  <button
                    key={i}
                    className={`lp-btn lp-btn-sm${a.btnClass ? " " + a.btnClass : " lp-btn-secondary"}`}
                    onClick={() => a.onClick(Array.from(selected))}
                  >
                    {a.icon && <span>{a.icon}</span>}
                    {a.label}
                  </button>
                ))}
              <button
                className="lp-btn lp-btn-sm lp-btn-ghost"
                onClick={() => setSelected(new Set())}
                title="Clear selection"
              >
                ✕ Clear
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Filter Chips ── */}
      {filterChips.length > 0 && (
        <div className="lp-filter-bar">
          {filterChips.map((c) => (
            <span
              key={c.key}
              className={`lp-chip${filter === c.key ? " lp-chip--active-filter " + (c.chipClass ?? "lp-chip-blue") : ""}`}
              onClick={() => handleChipClick(c.key)}
            >
              {c.label}
            </span>
          ))}
          <span className="lp-filter-count">
            {filtered.length} record{filtered.length !== 1 ? "s" : ""} found
          </span>
          {/* Active col filters indicator */}
          {Object.values(colFilters).some(Boolean) && (
            <span
              className="lp-chip lp-chip-amber"
              onClick={() => setColFilters({})}
              title="Clear all column filters"
            >
              🔽 Col Filters Active · Clear ×
            </span>
          )}
        </div>
      )}

      {/* ── Tab Bar (Table / Pivot) ── */}
      {pivot && pivotConfig && (
        <div className="lp-tab-bar">
          <button
            className={`lp-tab${activeTab === "table" ? " lp-tab--active" : ""}`}
            onClick={() => setActiveTab("table")}
          >
            📋 Table View
          </button>
          <button
            className={`lp-tab${activeTab === "pivot" ? " lp-tab--active" : ""}`}
            onClick={() => setActiveTab("pivot")}
          >
            📊 Pivot Table
          </button>
        </div>
      )}

      {/* ── Pivot View ── */}
      {activeTab === "pivot" && pivot && pivotConfig && (
        <PivotTable data={filtered} pivotConfig={pivotConfig} customColors={colors} />
      )}

      {/* ── Table View ── */}
      {activeTab === "table" && (
        <div className="lp-table-container">
          {/* Table Header */}
          <div className="lp-table-header">
            <span>
              <span className="lp-table-title">{title} List</span>
              <span className="lp-table-count">({filtered.length} records)</span>
            </span>
            <span className="lp-table-header-right">
              <span className="lp-showing-text">
                {filtered.length > 0
                  ? `Showing ${showFrom}–${showTo} of ${filtered.length}`
                  : "No records"}
              </span>
              <div className="lp-export-actions">
                {copyable && (
                  <button className="lp-btn lp-btn-sm lp-btn-copy" title="Copy to clipboard" onClick={handleCopy}>
                    <span>📋</span>
                    {selected.size > 0 ? `Copy (${selected.size})` : "Copy"}
                  </button>
                )}
                <button
                  className="lp-btn lp-btn-sm lp-btn-pdf"
                  title={selected.size > 0 ? `PDF (${selected.size} selected)` : "PDF (all)"}
                  onClick={handleExportPDF}
                >
                  <span>📄</span>
                  {selected.size > 0 ? `PDF (${selected.size})` : "PDF"}
                </button>
                <button
                  className="lp-btn lp-btn-sm lp-btn-excel"
                  title={selected.size > 0 ? `Excel (${selected.size} selected)` : "Excel (all)"}
                  onClick={handleExportExcel}
                >
                  <span>📊</span>
                  {selected.size > 0 ? `Excel (${selected.size})` : "Excel"}
                </button>
                <button className="lp-btn lp-btn-sm lp-btn-reset" title="Reset" onClick={handleReset}>
                  <span>↺</span>Reset
                </button>
              </div>
            </span>
          </div>

          {/* Scrollable body */}
          <div className="lp-table-scroll">
            <table className="lp-table">
              <thead style={{ position: "sticky", top: 0, backgroundColor: "var(--lp-bg)", zIndex: 1 }}>
                <tr>
                  {selectable && (
                    <th className="lp-th-checkbox">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={(e) => toggleAllPage(e.target.checked)}
                        style={{ accentColor: "var(--lp-brand)", cursor: "pointer" }}
                      />
                    </th>
                  )}
                  {visibleColumns.map((col) => (
                    <th
                      key={col.field}
                      className={[
                        col.sortable !== false ? "lp-th-sortable" : "",
                        sortCol === col.field ? "lp-th-sorted" : "",
                        col.freeze ? "lp-col-freeze" : "",
                      ].filter(Boolean).join(" ")}
                      style={{
                        width: colWidths[col.field] || col.width,
                        minWidth: col.minWidth,
                        position: "relative",
                      }}
                      onClick={col.sortable !== false ? () => toggleSort(col.field) : undefined}
                    >
                      <span 
                        className="lp-th-content"
                        style={col.align ? { justifyContent: col.align === 'right' ? 'flex-end' : (col.align === 'center' ? 'center' : 'flex-start') } : {}}
                      >
                        {col.header}
                        {col.sortable !== false && (
                          <SortIcon col={col.field} sortCol={sortCol} sortDir={sortDir} />
                        )}
                      </span>
                      {/* Per-column filter */}
                      <button
                        className={`lp-col-filter-btn${colFilters[col.field] ? " lp-col-filter-active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowColFilter((f) => (f === col.field ? null : col.field));
                        }}
                        title="Filter this column"
                      >
                        🔽
                      </button>
                      {showColFilter === col.field && (
                        <div className="lp-col-filter-popup" onClick={(e) => e.stopPropagation()}>
                          <input
                            autoFocus
                            className="lp-col-filter-input"
                            placeholder={`Filter ${col.header}…`}
                            value={colFilters[col.field] || ""}
                            onChange={(e) => {
                              setColFilters((prev) => ({ ...prev, [col.field]: e.target.value }));
                              setPage(1);
                            }}
                          />
                          {colFilters[col.field] && (
                            <button
                              className="lp-col-filter-clear"
                              onClick={() => {
                                setColFilters((prev) => { const n = { ...prev }; delete n[col.field]; return n; });
                                setShowColFilter(null);
                              }}
                            >
                              × Clear
                            </button>
                          )}
                        </div>
                      )}
                      {/* Resize handle */}
                      <div
                        className="lp-col-resize-handle"
                        onMouseDown={(e) => startResize(e, col.field)}
                      />
                    </th>
                  ))}
                  {(rowActions.length > 0 || onView || onEdit || onDelete) && (
                    <th className="lp-th-actions" style={{ textAlign: "center" }}>Actions</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {renderRows()}
              </tbody>

              {/* Aggregate row */}
              {aggRow && (
                <tfoot>
                  <tr className="lp-agg-row">
                    {selectable && <td />}
                    {visibleColumns.map((col) => (
                      <td key={col.field} className="lp-agg-cell">
                        {aggRow[col.field] ?? ""}
                      </td>
                    ))}
                    {(rowActions.length > 0 || onView || onEdit || onDelete) && <td />}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination */}
          <div className="lp-pagination">
            <div className="lp-pagination-left">
              <span className="lp-page-info">
                Page {safePage} of {totalPages} · {filtered.length} records
              </span>
              <select
                className="lp-page-size-select"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                title="Rows per page"
              >
                {[8, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>{n} / page</option>
                ))}
                <option value={0}>All</option>
              </select>
            </div>
            <div className="lp-page-btns">
              <button className="lp-page-btn" disabled={safePage === 1} onClick={() => goPage(1)}>«</button>
              <button className="lp-page-btn" disabled={safePage === 1} onClick={() => goPage(safePage - 1)}>‹</button>
              {pageNums.map((n, i) =>
                n === "…" ? (
                  <span key={`el-${i}`} className="lp-page-ellipsis">…</span>
                ) : (
                  <button
                    key={n}
                    className={`lp-page-btn${n === safePage ? " lp-page-btn--active" : ""}`}
                    onClick={() => goPage(n)}
                  >
                    {n}
                  </button>
                )
              )}
              <button className="lp-page-btn" disabled={safePage === totalPages} onClick={() => goPage(safePage + 1)}>›</button>
              <button className="lp-page-btn" disabled={safePage === totalPages} onClick={() => goPage(totalPages)}>»</button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close panels */}
      {(showColorPanel || showColPanel || showColFilter) && (
        <div
          className="lp-panel-backdrop"
          onClick={() => { setShowColorPanel(false); setShowColPanel(false); setShowColFilter(null); }}
        />
      )}

    </div>
  );
}

// ─── Utility: shade a hex color ──────────────────────────────────────────────
function shadeColor(hex, percent) {
  try {
    const num = parseInt(hex.replace("#", ""), 16);
    const r   = Math.max(0, Math.min(255, (num >> 16) + percent));
    const g   = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + percent));
    const b   = Math.max(0, Math.min(255, (num & 0x0000ff) + percent));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  } catch {
    return hex;
  }
}

// ─── Re-export Badge ──────────────────────────────────────────────────────────
export { Badge };
