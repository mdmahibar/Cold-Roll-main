---
name: batch-tracked-lines
description: Add batch/lot-number tracking to document lines in a React + SAP B1 Service Layer app — the batch picker popup, the allocation rules SAP enforces, and the BatchNumbers payload. Use when a transfer, receipt, delivery note, invoice or any other SAP document line has to carry batch numbers, or when SAP rejects a posting with -4014 "Cannot add row without complete selection of batch/serial numbers".
---

# Batch-tracked document lines

A working implementation lives in the SIS Portal (`client/src/components/common/BatchPicker/`,
used by the Transfers, Receipt and EOD Sales pages). This skill is the portable recipe:
**two files to copy, ~40 lines of glue per page, no new dependencies.**

Snapshots of the two files ship with this skill:

    .claude/skills/batch-tracked-lines/assets/BatchPicker.jsx   (435 lines)
    .claude/skills/batch-tracked-lines/assets/BatchPicker.css   (317 lines)

They are copies taken from the SIS Portal — if that repo is at hand, prefer copying the
live files, which may have moved on.

---

## The one rule everything else follows

> **A line's batch quantities must add up to the line quantity — or the line must carry no
> `BatchNumbers` collection at all.**

There is no third state. SAP rejects a batch-managed line that is short, over, or carrying
an *empty* `BatchNumbers: []`. Every helper below exists to keep that invariant true while
the user is still editing, rather than discovering it in a Service Layer error.

The corollary that catches people: **quantity and allocation are one control, not two.**
Typing a quantity re-spreads the batches; picking batches sets the quantity. Never let a
page offer both as independent fields.

---

## Architecture in one screen

```
 SAP B1                     server                    client
 ──────                     ──────                    ──────
 OBTQ  (qty per whs) ─┐
                      ├─ saved SQL query ─→ GET /api/batch ─→ useSapB1ItemWarehouseBatches
 OBTN  (batch master,─┘   GetBatchByItemWhs                          │
        U_MRP)                                                       ▼
                                                              <BatchPicker/>  ← 🔖 on the row
                                                                     │ onApply([{BatchNumber, Quantity}])
                                                                     ▼
                                                              line.Batches  (page state)
                                                                     │ fold + map on submit
                                                                     ▼
 StockTransfers ←──── POST ──────────────────────────  line.BatchNumbers[]
```

Batch **quantities** have no Service Layer entity — `BatchNumberDetails` describes the batch
*master*, not where the stock sits. That is the whole reason for the saved SQL query.

---

## Step 1 · Server: one saved SQL query

Create these in SAP B1 Query Manager. Names are what the code asks for by URL, so keep them
or change both sides.

| Saved query | Returns | Params |
|---|---|---|
| `GetBatchByItemWhs` | batches of one item in one warehouse | `:itemCode`, `:whsCode` |
| `GetBatchWhsDetails` | every batch/warehouse row (optional — for pages that bind batches without opening a picker) | — |

Query body — **verify the column names against your own DB before trusting this**:

```sql
SELECT T0."ItemCode",
       T1."DistNumber" AS "BatchNum",
       T0."WhsCode",
       T0."Quantity",
       T1."U_MRP"      AS "B_MRP"        -- drop if your batches carry no per-batch price
FROM   "OBTQ" T0
INNER JOIN "OBTN" T1
        ON T0."ItemCode"  = T1."ItemCode"
       AND T0."SysNumber" = T1."SysNumber"
WHERE  T0."ItemCode" = :itemCode
  AND  T0."WhsCode"  = :whsCode
  AND  T0."Quantity" > 0
```

`SysNumber` is SAP's internal batch id; `DistNumber` is the number humans read and the one
that goes back in the payload.

Read it as a paginated collection, not a single GET:

```js
const BATCHES_BY_ITEM_WHS = "/SQLQueries('GetBatchByItemWhs')/List";

// Quotes stay literal — SAP wants them around the parameter. Double any quote
// inside the value first; encodeURIComponent leaves apostrophes alone.
const sqlParam = (v) => `'${encodeURIComponent(String(v).replace(/'/g, "''"))}'`;

const rows = await getSapAll(                      // getSapAll, not getSap:
  `${BATCHES_BY_ITEM_WHS}?itemCode=${sqlParam(item)}&whsCode=${sqlParam(whs)}`,
);                                                 // /List paginates like any collection
```

Normalise before it leaves the server, and drop exhausted batches — a batch with 0 left is
no use to a document:

```js
rows.map((r) => ({
  ItemCode: r.ItemCode,
  BatchNum: r.BatchNum,
  WhsCode:  r.WhsCode,
  Quantity: Number(r.Quantity) || 0,
  B_MRP:    r.B_MRP == null ? null : Number(r.B_MRP),
})).filter((r) => r.Quantity > 0);
```

Reference: `server/src/integrations/sapb1/services/batchService.js`.

## Step 2 · Client: service + hook

```js
// services/sapb1/SAPB1Batches.js
getByItemWarehouse: (itemCode, whsCode) =>
  apiService.get('/api/batch', { params: { itemCode, whsCode } }),
```

```js
// hooks/sapb1/useSapB1Batches.js
export function useSapB1ItemWarehouseBatches(itemCode, warehouseCode, { enabled = true } = {}) {
  const query = useQuery({
    queryKey: queryKeys.sapb1.itemWarehouseBatches(itemCode, warehouseCode),
    queryFn:  () => sapb1BatchesService.getByItemWarehouse(itemCode, warehouseCode),
    select:   (res) => res?.data?.data ?? [],
    // Blank codes keep the query idle — that is how the picker holds the fetch
    // back until the line has both an item and a source warehouse.
    enabled:  enabled && Boolean(itemCode) && Boolean(warehouseCode),
    ...ALWAYS_FRESH,   // staleTime 0 + refetchOnMount: batch stock moves constantly
  });
  return { batches: query.data ?? [], ...query };
}
```

**Do not cache batch stock.** Anyone posting a document moves it. One extra request per
picker open is far cheaper than an over-allocation SAP rejects at save time.

## Step 3 · Copy the picker

```
assets/BatchPicker.jsx  →  src/components/common/BatchPicker/BatchPicker.jsx
assets/BatchPicker.css  →  src/components/common/BatchPicker/BatchPicker.css
```

Edit three things and nothing else:

1. the `useSapB1ItemWarehouseBatches` import path;
2. the CSS custom properties it inherits (`--gold`, `--bg2`, `--text1`, `--line`, …) —
   remap to your tokens or paste equivalents into the CSS;
3. the `₹`/`en-IN` MRP formatting, or delete the MRP `<th>`/`<td>` if your batches carry no
   per-batch price.

It renders through `createPortal` onto `<body>` on purpose: opened from inside a modal whose
dialog is `overflow: hidden` and animates with a transform, either would clip or re-anchor a
fixed child. Its Escape handler runs in the **capture** phase and calls `stopPropagation`, so
Escape closes the picker and not the document behind it. Keep both.

## Step 4 · The line shape

```js
const blankLine = () => ({
  ItemCode: '', ItemDescription: '', Quantity: '',
  FromWarehouseCode: '', WarehouseCode: '',
  Batches: [],      // [{ BatchNumber, Quantity }] — the CURRENT split of Quantity
  BatchPool: [],    // batch numbers this line may draw from, in scan/pick order
});
```

`BatchPool` is worth the extra field on any page where quantity is edited after batches are
chosen: `Batches` is only the current split, so a batch must stay in the pool even when the
split currently gives it nothing. Pages that never re-spread (a receipt, where one row *is*
one batch) can drop it.

## Step 5 · Wire it into the page — five additions

```jsx
// 1 · which row the picker is open on
const [batchLine, setBatchLine] = useState(null);

// 2 · the trigger, one cell per row
<button className="bp-trigger" disabled={!fromWarehouse}
        onClick={() => setBatchLine(index)}
        title={line.Batches?.length
          ? line.Batches.map((b) => `${b.BatchNumber} × ${b.Quantity}`).join('\n')
          : 'Select batch numbers'}>
  🔖{line.Batches?.length ? <span className="bp-trigger-count">{line.Batches.length}</span> : null}
</button>

// 3 · the picker, mounted only while open and KEYED by the row, so it always
//     reads that row's current allocation
{batchLine !== null && lines[batchLine] && (
  <BatchPicker key={batchLine} open
    itemCode={lines[batchLine].ItemCode}
    warehouseCode={fromWarehouse}
    quantity={toQty(lines[batchLine].Quantity)}
    value={lines[batchLine].Batches}
    onApply={(batches) => applyBatches(batchLine, batches)}
    onClose={() => setBatchLine(null)} />
)}

// 4 · apply — the line quantity FOLLOWS the allocation
const applyBatches = (index, batches) => {
  setLines((prev) => prev.map((l, i) =>
    i === index ? { ...l, Batches: batches, Quantity: sumBatches(batches) } : l));
  setBatchLine(null);
};

// 5 · edit — the allocation FOLLOWS the quantity (re-spread over the pool)
const editQty = (index, value) =>
  setLines((prev) => prev.map((l, i) =>
    i === index ? withReallocatedBatches({ ...l, Quantity: value }) : l));
```

Clear `Batches` whenever the **item** or the **source warehouse** on a line changes — a batch
number is only meaningful for one item in one warehouse.

### The two helpers every page needs

```js
const round6      = (v) => Math.round((Number(v) || 0) * 1e6) / 1e6;   // kill float noise
const sumBatches  = (b) => round6((b ?? []).reduce((t, x) => t + (Number(x.Quantity) || 0), 0));
```

### Re-spread (only for pages that edit quantity after picking)

```js
/** Spread `quantity` over `pool` in order — first batch scanned is first emptied. */
const allocateAcross = (pool, quantity, availableOf) => {
  let remaining = round6(quantity);
  return (pool ?? []).reduce((rows, batchNumber) => {
    if (remaining <= 0) return rows;
    const take = Math.min(remaining, availableOf(batchNumber));
    if (take > 0) {
      rows.push({ BatchNumber: batchNumber, Quantity: round6(take) });
      remaining = round6(remaining - take);
    }
    return rows;
  }, []);
};
```

Asking for more than the pool holds yields an allocation that falls **short on purpose** —
so the save check can name the difference, rather than this quietly capping what was typed.
`availableOf` must fall back to what the line already had against a batch, or an edit
silently drops a batch the cached stock no longer reports.

---

## The three modes the picker supports

| Situation | Props | Behaviour |
|---|---|---|
| **Fresh document** (dispatch, delivery) | defaults | Every batch of the item in that warehouse; over-allocation blocks Apply. |
| **Receiving against a note** | `enforceAvailability={false}` `onlyBatches={[batch]}` `knownMrp={{[batch]: mrp}}` `readOnly` | One batch, shown even at 0 available — the note already posted it out of that warehouse. Detail view only; the quantity is edited on the row. |
| **Correcting an old document** | `value={existing}` | Batches already on the line survive in the list at 0 available, flagged `not in stock`, instead of vanishing. |

`enforceAvailability={false}` still *shows* the mismatch — SAP is the one that decides at
post time.

---

## Posting to SAP

**Fold rows to one line per item first** if your UI splits an item across rows (the receipt
page has one row per batch). SAP takes a line's batches as all-or-nothing:

```js
StockTransferLines: documentLines.map((line, index) => ({
  LineNum: index,
  ItemCode: line.ItemCode,
  Quantity: line.Quantity,
  FromWarehouseCode: fromWarehouse,
  WarehouseCode: destination,
  // Omitted ENTIRELY for a non-batch item — an empty collection makes SAP
  // complain about the batch setup.
  ...(line.Batches.length ? {
    BatchNumbers: line.Batches.map((batch) => ({
      BatchNumber:    batch.BatchNumber,
      Quantity:       batch.Quantity,
      // Index within THIS document, not the base document's line number.
      BaseLineNumber: index,
    })),
  } : {}),
})),
```

`BaseLineNumber` is the single most common cause of a posting that "works" but puts every
batch on line 0. It must equal the index of the line in the array being posted — which is
*not* the source document's `LineNum` once short lines have been dropped.

### Three checks to run before posting

```js
// 1 · per row: batches must add up to the row quantity
lines.find((l) => l.Batches?.length > 0 && sumBatches(l.Batches) !== toQty(l.Quantity))

// 2 · per folded line: same check again after rows are merged by item
documentLines.find((l) => l.Batches.length > 0 && sumBatches(l.Batches) !== l.Quantity)

// 3 · nothing over what is being received/moved
lines.find((l) => toQty(l.ReceivedQty) + toQty(l.DamagedQty) > l.ExpectedQty)
```

Name the item and batch in the message and point at the 🔖 button. A generic "batch mismatch"
sends the user hunting across twenty rows.

---

## Gotchas SAP will punish you for

- **`-4014 Cannot add row without complete selection of batch/serial numbers`** — the line
  moves a batch-managed item without a complete allocation. If the allocation *looks* right,
  check that (a) `BatchNumbers` is absent rather than `[]`, (b) `BaseLineNumber` matches the
  posted index, (c) the quantities sum exactly — `0.1 + 0.2` is why `round6` exists.
- **A batch number is unique per item *and* warehouse.** Key any lookup on
  `JSON.stringify([itemCode, whsCode, batchNumber])` — a string join will collide the day a
  code contains your separator.
- **Availability is stale the moment it is read.** Show it, cap on it, but expect SAP to be
  the final word; keep the picker's `🔄 Refresh`.
- **A batch picked then emptied by someone else must not silently disappear** from the list —
  that loses the user's allocation. Keep it with `Available: 0` and a flag.
- **Damaged/split destinations need a second document.** One SAP line moves into exactly one
  warehouse, so good and damaged stock cannot ride together. Give both documents the same
  base-document UDF so your netting counts them once.
- **Per-batch price (`OBTN.U_MRP`) is not the item master price.** If the POS charges on the
  batch's sticker, carry it through the document — the picker's `knownMrp` prop exists
  because a batch already moved out of a warehouse reports nothing to read it from.

---

## Porting to a non-SAP backend

Only two things are SAP-shaped. Swap them and the rest carries over:

1. **The read** — replace the saved query with any endpoint returning
   `[{ ItemCode, BatchNum, WhsCode, Quantity, B_MRP? }]`.
2. **The write** — replace the `BatchNumbers` mapping with your own line shape.

The picker, the invariant, the re-spread, and the three validation checks are all backend
agnostic.
