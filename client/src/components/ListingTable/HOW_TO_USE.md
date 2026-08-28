# How to Use ListingPage v2 in Any Master Page

This guide shows you the **exact pattern** to follow for every master data page in your POS project.
All examples are **pure JavaScript** (no TypeScript).

---

## What ListingPage Replaces

Before → each page needed:
- Manual `<table>` / `<thead>` / `<tbody>` JSX
- Separate filter `<input>`, pagination `<button>`s
- Custom sort logic
- Skeleton loader guard
- Export buttons wired separately

With ListingPage → pass **data + columns + callbacks** and get everything for free.

---

## Step-by-Step Pattern

### Step 1 — Import

```jsx
import ListingPage from "@/components/ListingTable/ListingPage";
```

---

### Step 2 — Define Columns (outside component)

```jsx
const COLUMNS = [
  // Plain text
  { field: "id",   header: "ID",   width: "80px" },

  // Clickable link → calls onView
  { field: "name", header: "Name", type: "link" },

  // Monospace blue code text
  { field: "code", header: "Code", type: "code" },

  // Clickable code → calls onView
  { field: "code", header: "Code", type: "code", isLink: true },

  // Frozen (sticky left) column
  { field: "code", header: "Code", type: "code", freeze: true },

  // Date: YYYY-MM-DD → DD-MM-YYYY
  { field: "createdAt", header: "Created", type: "date" },

  // Number with en-IN locale (12,000)
  { field: "qty", header: "Qty", type: "number" },

  // Currency ₹ 1,20,000
  { field: "amount", header: "Amount", type: "currency", cellClass: "lp-cell-right" },

  // Boolean → green "Yes" / amber "No"
  { field: "isActive", header: "Active", type: "boolean", trueLabel: "Yes", falseLabel: "No" },

  // Badge with value → label/color map
  {
    field: "status",
    header: "Status",
    type: "badge",
    badgeMap: {
      Active:   { variant: "success", label: "Active",   dot: true },
      Inactive: { variant: "warning", label: "Inactive", dot: true },
      Y: { variant: "success", label: "Active",   dot: true },
      N: { variant: "warning", label: "Inactive", dot: true },
    },
  },

  // Badge with function (conditional logic)
  {
    field: "category",
    header: "Category",
    type: "badge",
    badgeFn: (val) =>
      String(val).includes("Franchise")
        ? { variant: "info",   label: "COFO" }
        : { variant: "purple", label: "COCO" },
  },

  // Fully custom JSX cell
  {
    field: "tags",
    header: "Tags",
    sortable: false,
    render: (val) => (
      <div style={{ display: "flex", gap: 4 }}>
        {(val ?? []).map((t) => (
          <span key={t} style={{ background: "#EBF3FC", color: "#0A6ED1", padding: "1px 6px", borderRadius: 10, fontSize: 11 }}>
            {t}
          </span>
        ))}
      </div>
    ),
  },
];
```

**Rules:**
- Put COLUMNS **outside** the component (not re-created on every render)
- `field` must exactly match the key (or dot path like `"address.city"`) in your data
- `width` is a CSS string: `"80px"`, `"10%"`, `"auto"`

---

### Step 3 — Build Stats (inside component, uses data)

```jsx
const stats = [
  { label: "Total",    value: data.length,
    icon: "📋", iconClass: "blue",  filterKey: "all"      },
  { label: "Active",   value: data.filter(d => d.isActive === "Y").length,
    icon: "✅", iconClass: "green", filterKey: "active"   },
  { label: "Inactive", value: data.filter(d => d.isActive === "N").length,
    icon: "⏸️", iconClass: "amber", filterKey: "inactive" },
];
```

- `filterKey` ties the stat card to a chip — clicking it activates that chip
- `iconClass` options: `blue` `green` `amber` `red` `purple` `teal`

---

### Step 4 — Build Filter Chips (inside component)

```jsx
const filterChips = [
  { key: "all",      label: "All",      chipClass: "lp-chip-blue"  },
  { key: "active",   label: "Active",   chipClass: "lp-chip-green",
    filterFn: row => row.isActive === "Y" },
  { key: "inactive", label: "Inactive", chipClass: "lp-chip-amber",
    filterFn: row => row.isActive === "N" },
];
```

Chip classes: `lp-chip-blue` `lp-chip-green` `lp-chip-amber` `lp-chip-purple` `lp-chip-teal` `lp-chip-red`

---

### Step 5 — Write Action Handlers

```jsx
function handleView(row)   { setMode("View");   setId(row.id); openModal(); }
function handleEdit(row)   { setMode("Edit");   setId(row.id); openModal(); }
function handleDelete(row) { setMode("Delete"); deleteRecord(row.id); }
function handleCreate()    { setMode("Create"); clearId();     openModal(); }
```

---

### Step 6 — Return JSX

```jsx
return (
  <>
    <ListingPage
      title="Your Master"
      subtitle="Manage records · SAP Business One integrated"
      titleIcon="📋"
      rowData={data}
      columns={COLUMNS}
      rowKey="id"
      loading={isLoading}
      stats={stats}
      filterChips={filterChips}
      defaultFilter="all"
      searchPlaceholder="Search by name, code…"
      searchFields={["name", "code"]}
      defaultSortCol="id"
      pageSize={20}
      onView={handleView}
      onEdit={handleEdit}
      onDelete={handleDelete}
      primaryAction={{ label: "+ New Record", onClick: handleCreate }}
    />
    <YourModal />
  </>
);
```

---

## Enabling v2 Features

### Dark Mode (user-controlled)

```jsx
// Remove the theme prop → a toggle button appears automatically
<ListingPage ... />

// Force dark mode
<ListingPage theme="dark" ... />

// Force light mode
<ListingPage theme="light" ... />
```

---

### Pivot Table

```jsx
<ListingPage
  pivot={true}
  pivotConfig={{
    rowField:   "category",   // group rows by this
    colField:   "month",      // pivot columns by this
    valueField: "sales",      // aggregate this numeric field
    aggFn:      "sum",        // "sum" | "count" | "avg" | "max" | "min"
  }}
  ...
/>
```

A "Pivot Table" tab appears next to "Table View". Users can switch between them.

---

### Inline Cell Editing (double-click to edit)

```jsx
<ListingPage
  editable={true}
  onCellEdit={(row, field, newValue) => {
    console.log("User edited:", field, "=", newValue, "on row:", row.id);
    // call your save API here
    updateRecord(row.id, { [field]: newValue });
  }}
  ...
/>
```

---

### Freeze Columns

Add `freeze: true` to any column definition:

```jsx
const COLUMNS = [
  { field: "code", header: "Code", type: "code", freeze: true },  // ← sticky left
  { field: "name", header: "Name", type: "link" },
  // ...
];
```

---

### Row Grouping

```jsx
<ListingPage
  groupBy="category"   // field name to group by
  ...
/>
```

Rows are collapsed into expandable groups. Click the group header to expand/collapse.

---

### Aggregate Row

```jsx
<ListingPage
  aggregates={{
    sum:   ["amount", "qty"],    // show Σ total
    avg:   ["price"],             // show Ø average
    count: ["id"],                // show # count
  }}
  ...
/>
```

A summary row appears at the bottom of the table.

---

### Column Resize

Built-in — just drag the right edge of any column header.

---

### Per-Column Filter

Built-in — click the small funnel (🔽) icon in any column header.

---

### Row Height

```jsx
<ListingPage rowHeight="compact" />         // tighter rows
<ListingPage rowHeight="default" />         // default
<ListingPage rowHeight="comfortable" />     // spacious rows
```

Also a row-height toggle is always visible in the title bar (≡ ≣ ☰).

---

### Page Size Selector

Built-in — a dropdown at the bottom-left of pagination lets users pick 8 / 20 / 50 / 100 / All.

---

### Copy to Clipboard

Built-in — the **Copy** button (top of table) copies all visible columns as TSV (tab-separated),
compatible with Excel paste. Copies selected rows only if selection is active.

---

### Full Screen

Built-in — the ⛶ button in the title bar expands the table to full screen.

---

### Color Customizer

Built-in — the 🎨 button in the title bar opens a color picker panel.
Users can customize: brand color, accent color, row alt color, hover color, selected color, header background.

---

## Complete Skeleton (copy-paste template)

```jsx
// YourMasterTable.jsx

import { useState } from "react";
import ListingPage from "@/components/ListingTable/ListingPage";

// ── 1. Columns (outside component)
const COLUMNS = [
  { field: "id",   header: "ID",     width: "80px" },
  { field: "name", header: "Name",   type: "link" },
  { field: "code", header: "Code",   type: "code", isLink: true },
  {
    field: "isActive",
    header: "Status",
    type: "badge",
    width: "100px",
    badgeMap: {
      Y: { variant: "success", label: "Active",   dot: true },
      N: { variant: "warning", label: "Inactive", dot: true },
    },
  },
];

// ── 2. Component
function YourMasterTable() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Stats
  const stats = [
    { label: "Total",    value: data.length,
      icon: "📋", iconClass: "blue",  filterKey: "all"      },
    { label: "Active",   value: data.filter(d => d.isActive === "Y").length,
      icon: "✅", iconClass: "green", filterKey: "active"   },
    { label: "Inactive", value: data.filter(d => d.isActive === "N").length,
      icon: "⏸️", iconClass: "amber", filterKey: "inactive" },
  ];

  // Filter chips
  const filterChips = [
    { key: "all",      label: "All",      chipClass: "lp-chip-blue"  },
    { key: "active",   label: "Active",   chipClass: "lp-chip-green",
      filterFn: row => row.isActive === "Y" },
    { key: "inactive", label: "Inactive", chipClass: "lp-chip-amber",
      filterFn: row => row.isActive === "N" },
  ];

  // Handlers
  function handleView(row)   { console.log("View", row);   }
  function handleEdit(row)   { console.log("Edit", row);   }
  function handleDelete(row) { console.log("Delete", row); }
  function handleCreate()    { console.log("Create");      }

  return (
    <ListingPage
      title="Your Master"
      subtitle="Manage records · SAP Business One integrated"
      titleIcon="📋"
      rowData={data}
      columns={COLUMNS}
      rowKey="id"
      loading={loading}
      stats={stats}
      filterChips={filterChips}
      defaultFilter="all"
      searchPlaceholder="Search by name, code…"
      searchFields={["name", "code"]}
      defaultSortCol="id"
      pageSize={20}
      onView={handleView}
      onEdit={handleEdit}
      onDelete={handleDelete}
      primaryAction={{ label: "+ New Record", onClick: handleCreate }}
    />
  );
}

export default YourMasterTable;
```

---

## Column Type Cheat-Sheet

| `type` | Renders | Extra props |
|--------|---------|-------------|
| _(none)_ | Plain string | — |
| `"code"` | Monospace blue text | `isLink`, `freeze` |
| `"link"` | Blue underline → onView | — |
| `"date"` | DD-MM-YYYY | — |
| `"number"` | en-IN locale | numeric sort |
| `"currency"` | ₹ en-IN locale | numeric sort |
| `"badge"` | Colored pill | `badgeMap` or `badgeFn` |
| `"boolean"` | Green/Amber badge | `trueLabel`, `falseLabel` |
| `"checkbox"` | Read-only checkbox | — |
| _(custom)_ | Any JSX | `render: (val, row) => JSX` |

**Badge variants:** `success` `warning` `error` `info` `purple` `teal` `neutral`

---

## Common Issues

| Problem | Fix |
|---------|-----|
| Column not showing | Check `field` matches exactly the key in your data object |
| Sort wrong order | Number columns: set `type: "number"` so they sort numerically |
| Pivot tab not showing | Must pass both `pivot={true}` AND `pivotConfig={{...}}` |
| Group rows but no groups | `groupBy` must match an exact field name in your data |
| Inline edit not firing | Must pass both `editable={true}` AND `onCellEdit` callback |
| Dark mode forced | Remove `theme` prop to let user toggle, or set `theme="light"` |
