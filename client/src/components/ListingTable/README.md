# ListingPage v2 — Advanced Reusable Table Component

A **fully JavaScript** (no TypeScript), SAP B1-styled listing/master-data page for your POS React project.
Drop it into any module, pass data + column definitions, and get a professional enterprise table instantly.

---

## What's New in v2

| Feature | How to enable |
|---------|---------------|
| 🌙 Dark / ☀ Light Mode | `theme="dark"` or toggle button in UI |
| 🎨 Custom Color Picker | `colorCustomizer={true}` (default) |
| 📊 Pivot Table | `pivot={true}` + `pivotConfig={{...}}` |
| 📌 Freeze Columns | `col.freeze = true` on any column |
| 🗂 Column Visibility | `columnToggle={true}` (default) |
| ✏️ Inline Cell Editing | `editable={true}` + `onCellEdit` |
| 📏 Column Resize | Drag right edge of any column header |
| 🔽 Per-Column Filter | Click the funnel icon in any header |
| 📦 Row Grouping | `groupBy="fieldName"` |
| Σ Aggregate Row | `aggregates={{ sum: ["field"] }}` |
| 📐 Row Height | `rowHeight="compact|default|comfortable"` |
| ⛶ Full Screen | `fullscreenable={true}` (default) |
| 📋 Copy to Clipboard | `copyable={true}` (default) |
| 📄 Page Size Selector | 8 / 20 / 50 / 100 / All in pagination |
| 🔢 Numeric Sort | Numbers sort by value, not string |
| 🖨 Print Friendly | `Ctrl+P` — toolbar/actions auto-hidden |

All **v1 props still work unchanged**.

---

## Files

| File | Purpose |
|------|---------|
| `ListingPage.jsx` | React component (pure JS) |
| `ListingPage.css` | All styles — dark mode, pivot, resize, etc. |
| `README.md` | This file |
| `HOW_TO_USE.md` | Step-by-step migration guide |

---

## Quick Start

```jsx
import ListingPage from "@/components/ListingTable/ListingPage";

<ListingPage
  title="Store Master"
  subtitle="Manage POS stores"
  titleIcon="🏪"
  rowData={stores}
  columns={columns}
  rowKey="id"
  onView={row => openViewModal(row)}
  onEdit={row => openEditModal(row)}
  onDelete={row => handleDelete(row)}
  primaryAction={{ label: "+ New Store", onClick: () => openCreateModal() }}
/>
```

---

## All Props

### Identity

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | string | `"Records"` | Page heading |
| `subtitle` | string | `""` | Small text below title |
| `titleIcon` | string | `"📋"` | Emoji/text for icon tile |

---

### Data

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `rowData` | `Array` | `[]` | Your data array |
| `columns` | `Array` | `[]` | Column definitions (see below) |
| `rowKey` | string | `"id"` | Unique key field |
| `loading` | boolean | `false` | Show skeleton rows |

---

### Column Definition

```js
{
  field:     "fieldName",      // key on row object (dot notation: "address.city")
  header:    "Column Header",  // displayed header text
  type?:     "code|link|date|number|currency|badge|boolean|checkbox",
  width?:    "120px",          // CSS width
  minWidth?: "60px",           // CSS min-width
  sortable?: true,             // default true
  freeze?:   false,            // true = sticky left (freeze column)
  cellClass?: "lp-cell-right", // extra CSS class on <td>
  tdStyle?:  {},               // inline style on <td>
  render?:   (value, row) => JSX,  // full custom renderer

  // for type "link" / "code"
  isLink?:   true,             // makes it clickable → calls onView

  // for type "badge"
  badgeMap?: { Active: { variant: "success", label: "Active", dot: true } },
  badgeFn?:  (value, row) => ({ variant, label, dot }),

  // for type "boolean"
  trueLabel?:  "Yes",
  falseLabel?: "No",
}
```

#### Column Types

| type | Renders | Notes |
|------|---------|-------|
| `"code"` | Monospace blue text | `isLink: true` → clickable |
| `"link"` | Blue underline text | calls `onView` |
| `"date"` | `YYYY-MM-DD → DD-MM-YYYY` | |
| `"number"` | en-IN locale (12,000) | numeric sort |
| `"currency"` | ₹ 1,20,000 | numeric sort |
| `"badge"` | Colored pill | needs `badgeMap` or `badgeFn` |
| `"boolean"` | Green/Amber badge | `trueLabel`, `falseLabel` |
| `"checkbox"` | Read-only checkbox | |
| _(none)_ | Plain string | |

Badge variants: `success` `warning` `error` `info` `purple` `teal` `neutral`

---

### Stats Cards

```js
stats={[
  { label: "Total",    value: 42, icon: "📦", iconClass: "blue",  filterKey: "all"      },
  { label: "Active",   value: 38, icon: "✅", iconClass: "green", filterKey: "active"   },
  { label: "Inactive", value: 4,  icon: "⏸️", iconClass: "amber", filterKey: "inactive" },
]}
```

`iconClass` values: `blue` `green` `amber` `red` `purple` `teal`

---

### Filter Chips

```js
filterChips={[
  { key: "all",    label: "All",    chipClass: "lp-chip-blue"  },
  { key: "active", label: "Active", chipClass: "lp-chip-green",
    filterFn: row => row.status === "Active" },
]}
defaultFilter="all"
```

Chip classes: `lp-chip-blue` `lp-chip-green` `lp-chip-amber` `lp-chip-purple` `lp-chip-teal` `lp-chip-red`

---

### v2 Feature Props

```jsx
// Theme
theme="dark"           // "light" | "dark" | undefined (user-toggleable)

// Pivot Table
pivot={true}
pivotConfig={{
  rowField:   "category",   // group rows by this field
  colField:   "month",      // pivot columns by this field
  valueField: "amount",     // aggregate this field
  aggFn:      "sum",        // "sum" | "count" | "avg" | "max" | "min"
}}

// Inline Editing (double-click a cell to edit)
editable={true}
onCellEdit={(row, field, newValue) => console.log(row, field, newValue)}

// Row Grouping
groupBy="category"     // collapses rows into expandable groups

// Aggregate Row (shown below table)
aggregates={{
  sum:   ["amount", "qty"],
  avg:   ["price"],
  count: ["id"],
}}

// Row Height
rowHeight="compact"    // "compact" | "default" | "comfortable"

// UI Feature Toggles (all default true)
fullscreenable={true}
copyable={true}
columnToggle={true}
colorCustomizer={true}

// Freeze first column
columns={[
  { field: "code", header: "Code", type: "code", freeze: true },
  // ...rest
]}
```

---

### Actions & Callbacks

```jsx
// Primary button (top-right)
primaryAction={{ label: "+ New", icon: "➕", onClick: () => {} }}

// Row callbacks (built-in icons)
onView={row => openViewModal(row)}
onEdit={row => openEditModal(row)}
onDelete={row => handleDelete(row)}

// Custom row actions
rowActions={[
  { icon: "🔗", title: "Sync", btnClass: "lp-btn-ghost", onClick: row => sync(row) },
]}

// Toolbar actions
toolbarActions={[
  { label: "Refresh", icon: "🔄", onClick: () => refetch(), showWhen: "always"   },
  { label: "Delete",  icon: "🗑",  onClick: ids => bulkDelete(ids), showWhen: "selected" },
]}
```

---

## Full Example

```jsx
import ListingPage from "@/components/ListingTable/ListingPage";

const COLUMNS = [
  { field: "code",   header: "Code",   type: "code",   isLink: true, freeze: true, width: "100px" },
  { field: "name",   header: "Name",   type: "link" },
  { field: "city",   header: "City" },
  { field: "amount", header: "Amount", type: "currency", cellClass: "lp-cell-right" },
  { field: "date",   header: "Date",   type: "date" },
  {
    field: "status",
    header: "Status",
    type: "badge",
    badgeMap: {
      Active:   { variant: "success", label: "Active",   dot: true },
      Inactive: { variant: "warning", label: "Inactive", dot: true },
    },
  },
];

export default function StorePage() {
  const [stores] = useState([...]);

  return (
    <ListingPage
      title="Store Master"
      subtitle="Manage POS stores"
      titleIcon="🏪"
      rowData={stores}
      columns={COLUMNS}
      rowKey="id"
      stats={[
        { label: "Total",  value: stores.length, icon: "🏪", iconClass: "blue",  filterKey: "all"    },
        { label: "Active", value: stores.filter(s => s.status === "Active").length,
          icon: "✅", iconClass: "green", filterKey: "active" },
      ]}
      filterChips={[
        { key: "all",    label: "All",    chipClass: "lp-chip-blue"  },
        { key: "active", label: "Active", chipClass: "lp-chip-green",
          filterFn: r => r.status === "Active" },
      ]}
      // v2 features
      pivot={true}
      pivotConfig={{ rowField: "city", colField: "status", valueField: "amount", aggFn: "sum" }}
      aggregates={{ sum: ["amount"] }}
      groupBy="city"
      editable={true}
      onCellEdit={(row, field, val) => console.log("Edited:", field, "=", val)}
      theme={undefined}        // user can toggle dark/light
      rowHeight="default"
      pageSize={20}
      onView={row => alert("View: " + row.code)}
      onEdit={row => alert("Edit: " + row.code)}
      onDelete={row => alert("Delete: " + row.code)}
      primaryAction={{ label: "+ New Store", onClick: () => {} }}
    />
  );
}
```

---

## CSS Utility Classes

| Class | Use |
|-------|-----|
| `lp-cell-code` | Monospace blue code text |
| `lp-cell-link` | Blue clickable text |
| `lp-cell-mono` | Monospace font |
| `lp-cell-sm`   | 12px font |
| `lp-cell-muted`| Subtle grey text |
| `lp-cell-num`  | Tabular numerals |
| `lp-cell-center` | Center align |
| `lp-cell-right`  | Right align |

---

## Folder Structure

```
src/components/ListingTable/
  ListingPage.jsx
  ListingPage.css
  README.md
  HOW_TO_USE.md
```

Import:
```js
import ListingPage from "@/components/ListingTable/ListingPage";
```
