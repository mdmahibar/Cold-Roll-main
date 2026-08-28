# In-Transit Transfers — Build Guide (zero to 100)

**What this document is for.** `IN-TRANSIT-FLOW.md` next to it says *what was built*. This one
says *how it works and how to change it*. Read Parts 1–3 once to get the model in your head;
after that live in **Part 6 (the Cookbook)**, which is written so a typical change takes
minutes, not an afternoon.

| Part | Read it when |
|---|---|
| [1. The problem](#part-1--the-problem-in-60-seconds) | first time, once |
| [2. The mental model](#part-2--the-mental-model) | first time, once |
| [3. The architecture](#part-3--the-architecture) | first time, and whenever you add a layer |
| [4. Build it step by step](#part-4--build-it-step-by-step) | porting to another project |
| [5. One transaction, traced end to end](#part-5--one-transaction-traced-end-to-end) | when something doesn't add up |
| [6. **Cookbook — change it in minutes**](#part-6--cookbook--change-it-in-minutes) | **every time you change something** |
| [7. Debugging](#part-7--debugging-symptom--cause--fix) | when it breaks |
| [8. Invariants](#part-8--the-invariants) | before you merge |
| [9. Testing](#part-9--testing-your-changes) | before you merge |

---

## Part 1 — The problem in 60 seconds

Stock does not jump from the store to production. It **leaves** the store into a transit
warehouse, sits there while it's on the move, and is **received** out of transit into the
destination. Two documents, days apart:

```
   STORE ──── dispatch ────▶ TRANSIT ──── receipt ────▶ DESTINATION
              (doc 1)                     (doc 2)
```

That part is easy. Here's the part that isn't:

```
WHS1 ──300──▶ TRANSIT   (bound for WHS2)      TRANSIT holds 500…
WHS1 ──200──▶ TRANSIT   (bound for WHS3)      …but SAP can't say whose 500.
```

There is **one** transit warehouse, not one per destination. So SAP will happily tell you
TRANSIT holds 500 units and has no idea that 300 belong to WHS2 and 200 to WHS3. Show WHS2 the
raw transit balance and it will receive all 500 — including WHS3's stock.

> **Everything in this codebase exists to answer one question:**
> *How much of the transit warehouse belongs to WHS2, and against which dispatch note?*

**Why not one transit warehouse per destination?** Because then a new destination means a
master-data change in SAP — usually a consultant, usually a ticket. With one shared warehouse,
a new destination is just a value in a field. You pay for that once, in ~230 lines of netting
code. If you ever get per-destination transit warehouses cheaply, **take them and delete
`inTransitLedger.js` entirely.**

---

## Part 2 — The mental model

### Two documents, both `StockTransfers`

|  | Dispatch (Store Dispatch page) | Receipt (Production Receive page) |
|---|---|---|
| `FromWarehouse` | the store | **TRANSIT** |
| `ToWarehouse` | **TRANSIT** | the destination |
| `U_DESTINATIONWHS` | the destination | copied **from the note** |
| `U_TRFTYPE` | `'D'` | `'R'` |
| `U_TRFBASE` | — | the note's **DocEntry** |

The whole trick is in row 2 and 3. A dispatch's `ToWarehouse` is TRANSIT — *identical on every
note ever posted* — so it tells you nothing. `U_DESTINATIONWHS` is the only field that says who
the stock is for.

### The formula

```
pending(destination) = Σ dispatch lines addressed to it
                     − Σ receipt lines linked back to those dispatches
```

Computed per note, per item, and per batch.

### Nothing is stored locally

No in-transit table, no cache, no sync job. **The SAP documents are the ledger** and the portal
just does the subtraction. That costs 2–3 SAP round trips per read and buys a guarantee:

> The portal can never disagree with SAP. No reconciliation job, no drift, no *"the portal says
> 150 but SAP says 200"* ticket.

For a flow where a wrong number means a store receives someone else's stock, correctness beats
latency. Don't "optimise" this into a cached table without reading Part 6 §6.11 first.

---

## Part 3 — The architecture

### Five layers, strictly separated

```
 ┌───────────────────────────────────────────────────────────────────────┐
 │  PAGES          StoreDispatch.jsx        ProductionReceive.jsx         │
 │                 (workflow + validation, knows no HTTP)                 │
 └────────────┬──────────────────────────────────┬───────────────────────┘
              │                                  │
 ┌────────────▼──────────────┐    ┌──────────────▼───────────────────────┐
 │  HOOKS   useInTransitHook │    │  HELPERS   warehouseTypes.js         │
 │          (caching policy) │    │            (reads U_TYPE)            │
 └────────────┬──────────────┘    └──────────────────────────────────────┘
              │
 ┌────────────▼──────────────────────────────────────────────────────────┐
 │  SERVICES   StockTransferServices.js                                  │
 │             (the SAP reads + writes — the ONLY layer that knows OData)│
 └────────────┬──────────────────────────────────────────────────────────┘
              │
 ┌────────────▼──────────────────────────────────────────────────────────┐
 │  PURE       inTransitLedger.js                                        │
 │             (the netting — no imports, no HTTP, no SAP)               │
 └───────────────────────────────────────────────────────────────────────┘
```

### The files

| File | Lines | Job | Touch it when… |
|---|---|---|---|
| `SAPB1/StockTransfers/inTransitLedger.js` | 232 | The netting arithmetic. **Zero imports.** | changing *what pending means*, or porting to another ERP |
| `SAPB1/StockTransfers/StockTransferServices.js` | 210 | Every SAP call | adding a read/write, changing a `$select` or `$filter` |
| `common/warehouseTypes.js` | 54 | Reads `U_TYPE` off the warehouse master | adding a warehouse purpose |
| `hooks/useInTransitHook.js` | 88 | Ledger + caching policy | changing when the ledger refreshes |
| `pages/…/StoreDispatch.jsx` | 1599 | Dispatch workflow | changing dispatch fields/validation |
| `pages/…/ProductionReceive.jsx` | 999 | Receipt workflow | changing receipt fields/validation |

### The rule that keeps this maintainable

> **A page never calls SAP directly. A service never decides caching. The ledger never imports
> anything.**

If you catch yourself writing `getSap(...)` inside a page, stop — put it in
`StockTransferServices.js` and call it from there.

---

## Part 4 — Build it step by step

This is the order to build it in, whether you're re-reading it here or porting to a new
project. Each step is independently testable.

---

### Step 1 — Create four UDFs in SAP

**Nothing works until these exist.** Three on the document header, one on the warehouse master.

**Administration ▸ Setup ▸ General ▸ User-Defined Fields ▸ Marketing Documents ▸ Title**
(**Title**, not Rows — these are header fields. SAP adds the `U_` prefix itself.)

| Create as | Type | Carries |
|---|---|---|
| `DESTINATIONWHS` | Alphanumeric 50 | the destination warehouse code |
| `TRFBASE` | Alphanumeric 50 | the **DocEntry** of the dispatch a receipt settles |
| `TRFTYPE` | Alphanumeric 1 | `D` dispatch / `R` receipt |

**User-Defined Fields ▸ Warehouses (`OWHS`)** → `TYPE`, Alphanumeric 5.

**Why each one is non-negotiable:**

- **`U_DESTINATIONWHS`** — the dispatch's real `ToWarehouse` is TRANSIT, identical on every
  note. Without this field the document cannot say who it's for, and nothing else in this guide
  can work.
- **`U_TRFBASE`** — the link that lets a receipt be netted against its note. Without it,
  transit is one anonymous pile. **It holds DocEntry**, the immutable internal id — *never*
  DocNum, which is for humans and repeats across series.
- **`U_TRFTYPE`** — a receipt is a `StockTransfer` too. Without a marker it comes back in the
  dispatch list looking like another note still waiting to be received.

> ⚠️ **These names must match SAP character for character.** A `$select` naming a property the
> entity doesn't have fails the **entire** request — so a single typo empties the whole listing
> and reads as a total outage, not as a missing column. See §6.1 to rename them safely.

---

### Step 2 — Tag the warehouses by purpose, and read the tag

Don't hardcode which warehouse is transit. Tag them:

| `U_TYPE` | Meaning | How many |
|---|---|---|
| `IN` | the in-transit warehouse | **exactly one** |
| `DM` | the damaged-goods warehouse | exactly one |
| `SIS` | a destination / store counter | many |
| *(blank)* | ordinary warehouse (HO, raw materials) | many |

**`common/warehouseTypes.js`** — the whole reader:

```js
// U_TYPE is typed by hand in SAP, so "in", " IN " and "In" are all the same tag.
const wType = (warehouse) => String(warehouse?.U_TYPE ?? '').trim().toUpperCase();

export const findTransitWarehouse = (warehouses = []) =>
    warehouses.find((wh) => wType(wh) === 'IN') ?? null;

export const findDamagedWarehouse = (warehouses = []) =>
    warehouses.find((wh) => wType(wh) === 'DM') ?? null;

// If NOT ONE warehouse carries a tag, the field isn't being served — treating
// that as "no destinations" would leave every dropdown blank with no explanation.
export const hasWarehouseTypes = (warehouses = []) => warehouses.some((wh) => wType(wh) !== '');

export const destinationWarehouses = (warehouses = []) => {
    if (!hasWarehouseTypes(warehouses)) return warehouses;   // ← the safety valve
    return warehouses.filter((wh) => wType(wh) !== 'IN' && wType(wh) !== 'DM');
};
```

Two decisions worth copying:

1. **Case- and space-insensitive.** Someone will type `in ` with a trailing space. Don't make
   that a support ticket.
2. **`hasWarehouseTypes` is the safety valve.** No tags anywhere means the UDF isn't being
   served — fall back to "every warehouse is a destination" rather than showing empty dropdowns.

And add the field to the read (`SAPB1/warehouse/warehouseServices.js`):

```js
const BaseSelectFields = "WarehouseCode,WarehouseName,Location,U_LOCATION";
const SelectFields = `${BaseSelectFields},U_TYPE`;

export async function getAllWarehouses() {
    try {
        return await readAllPages(SelectFields);
    } catch (error) {
        // A $select naming a property the entity doesn't have fails the ENTIRE
        // request — without this retry, a missing UDF empties every warehouse
        // dropdown in the whole app, not just these two pages.
        console.warn("Warehouses: retrying without U_TYPE — the UDF is not being served.", error?.message);
        return await readAllPages(BaseSelectFields);
    }
}
```

> **The retry is not defensive padding.** It is what lets you deploy this code *before* the SAP
> setup is done without taking the app down.

---

### Step 3 — The ledger (the pure part)

`SAPB1/StockTransfers/inTransitLedger.js` has **no imports**. Feed it documents, get a ledger
back. That is what makes it unit-testable with plain objects and portable to any backend.

Everything ERP-specific is one object at the top:

```js
export const fields = {
    id:          (doc) => doc?.DocEntry,        // immutable id — what a receipt links to
    number:      (doc) => doc?.DocNum,          // human-facing — display only
    source:      (doc) => doc?.FromWarehouse,
    transit:     (doc) => doc?.ToWarehouse,     // a dispatch always lands in transit

    destination: (doc) => text(doc?.U_DESTINATIONWHS),        // who the stock is FOR
    base:        (doc) => text(doc?.U_TRFBASE),               // which dispatch a receipt settles
    kind:        (doc) => text(doc?.U_TRFTYPE).toUpperCase(), // 'D' | 'R'

    lines:       (doc)  => doc?.StockTransferLines ?? [],
    lineItem:    (line) => text(line?.ItemCode),
    lineQty:     (line) => Number(line?.Quantity) || 0,
    lineBatches: (line) => line?.BatchNumbers ?? [],
    // …
};
```

**Re-point those accessors and nothing else in the file needs an edit.** That's the whole
porting story — see §6.12.

The four exported functions, in the order they call each other:

```
getInTransitLedger()   ← what the service calls; takes its reads by injection
  └─ buildLedger()     ← PURE: documents in, ledger out
       └─ buildNote()  ← one note netted against its receipts
            └─ foldLines()  ← a document's lines → Map(itemCode → { qty, batches })
```

#### The four things in this file that cost real time to rediscover

**1. Fold by item code, never by line number.**

```js
export function foldLines(doc, into = new Map(), f = fields) {
    for (const line of f.lines(doc)) {
        const itemCode = f.lineItem(line);   // ← the join key
        if (!itemCode) continue;
        // …accumulate Quantity and Batches under itemCode
    }
    return into;
}
```

A receipt renumbers its lines — short lines are dropped before posting — so **line 2 of a
receipt is not line 2 of its note**. Item code is the only stable join.

**2. Round to 6 dp before every comparison.**

```js
const round = (value) => Math.round((Number(value) || 0) * 1e6) / 1e6;
```

`IsSettled` is an equality test in disguise. Without rounding, `0.1 + 0.2 − 0.3` leaves
`5.55e-17` pending forever and the note never settles.

**3. Clamp pending at zero.**

```js
Pending: round(Math.max(dispatchedQty - receivedBatchQty, 0)),
```

An over-receipt is a data problem, not a licence to hand back a negative allocation that a
later comparison might let through.

**4. Drop settled notes.**

```js
.filter((note) => !note.IsSettled);
```

A settled note that was never closed (SAP refused, or the close call failed after the receipt
posted) contributes nothing and would only clutter the destination's pending list.

#### What it returns

```jsonc
{
  "byStore": [{ "Store": "WHS2", "Notes": 1, "Dispatched": 100, "Received": 50, "Pending": 50 }],
  "notes": [{
    "DocEntry": 82, "DocNum": 82, "Store": "WHS2",
    "FromWarehouse": "WHS1", "TransitWarehouse": "TRANSIT",
    "Dispatched": 100, "Received": 50, "Pending": 50, "IsSettled": false,
    "Lines": [
      { "ItemCode": "FG-1001", "Dispatched": 60, "Received": 50, "Pending": 10,
        "Batches": [{ "BatchNumber": "B1", "Dispatched": 60, "Received": 50, "Pending": 10 }] },
      { "ItemCode": "RM-1007", "Dispatched": 40, "Received": 0,  "Pending": 40,
        "Batches": [{ "BatchNumber": "B2", "Dispatched": 40, "Received": 0,  "Pending": 40 }] }
    ]
  }],
  "totalPending": 50
}
```

---

### Step 4 — The SAP reads

Everything ERP-specific lives in `StockTransferServices.js`. Four functions matter.

#### 4a. Open documents — **no `$select`**

```js
export async function getOpenTransferDocuments() {
    return await getSapAll("/StockTransfers", {
        config: {
            params: {
                $filter: "DocumentStatus eq 'bost_Open'",
                $orderby: "DocEntry desc",   // also gives paging a stable sort
            },
        },
    });
}
```

Two load-bearing decisions in four lines:

> **⚠️ NO `$select`.** The Service Layer only ships the nested `StockTransferLines` collection
> when the request does **not** narrow the fields. Add a `$select` and every quantity silently
> vanishes — you get documents with no lines and a ledger of zeros. This single quirk is why
> the ledger is its own read instead of something derived from the listing the page already has.

> **⚠️ Open documents only.** This filter is the only thing keeping the work bounded as history
> piles up — and it only holds if something actually **closes** settled notes (Step 7c).

#### 4b. Receipts for a set of notes — chunked, and validated

```js
const BASE_FILTER_CHUNK = 40;   // keeps the URL well inside SAP's length limit

export async function getReceiptsForNotes(baseEntries) {
    const keys = [...new Set((baseEntries ?? []).map((e) => String(e).trim()))]
        // SECURITY, not tidiness: these are interpolated into an OData string
        // literal. A value containing a quote would close the literal early and
        // let the caller append arbitrary filter syntax. These are DocEntry numbers.
        .filter((entry) => /^\d+$/.test(entry));
    if (keys.length === 0) return [];
    // …chunk into 40s, one getSapAll per chunk, flatten
}
```

**Do not remove that `/^\d+$/` filter.** It is the only thing between a caller and OData filter
injection.

#### 4c. Wire the ledger up

```js
export async function readInTransitLedger() {
    return getInTransitLedger({
        readOpenDocuments: getOpenTransferDocuments,
        readReceiptsFor: getReceiptsForNotes,
    });
}
```

#### 4d. One note, netted at **batch** level

This one exists because of a second SAP quirk:

> **Collection GETs never return nested `BatchNumbers`** — only a single-document GET does.

So the ledger's quantities are right while its batch splits come back **empty**. That's fine
for a pending overview and useless for a receipt screen that has to name the batch on every row.

```js
export async function getInTransitNoteDetail(docEntry) {
    const note = await getStockTransferById(docEntry);          // ← single GET: batches included

    // The collection read is only used for the DocEntry list; each receipt is
    // then re-read on its own so its BatchNumbers come with it.
    const receiptHeads = await getReceiptsForNotes([docEntry]);
    const receipts = await Promise.all(
        receiptHeads.map((r) => getStockTransferById(r.DocEntry))
    );

    return buildNote(note, receipts);   // ← the SAME pure arithmetic, better data
}
```

**Why this is cheap:** one note + however many receipts were posted against it (0 or 1 in the
normal case), and only when a note is actually opened. Not once per row in a list.

---

### Step 5 — The hook (caching policy lives here, nowhere else)

```js
const useInTransitHook = ({ enabled = true } = {}) => {
    const [ledger, setLedger] = useState(EMPTY_LEDGER);
    const [loading, setLoading] = useState(enabled);      // first load only
    const [refreshing, setRefreshing] = useState(false);  // background re-read
    // …
};
```

**Why this is deliberately NOT a zustand store** like every other master in this app:

> HO dispatches notes while a store has the receipt page open, and another till may have
> received the same note a minute ago. **Acting on a cached ledger means receiving stock SAP has
> already moved.**

So it re-reads on every mount. One consequence, already handled:

> Drive the blocking overlay off **`loading`** (first load only), **never `isFetching`/
> `refreshing`**, or it strobes every time the user tabs back. Show background re-reads as a
> small "⏳ Syncing…" instead.

---

### Step 6 — The dispatch page

Three rules, in order of how much damage getting them wrong does.

**6a. `ToWarehouse` is the transit warehouse. Always.**

```js
const transitWarehouse = useMemo(() => findTransitWarehouse(warehouses), [warehouses]);
const transitCode = transitWarehouse?.WarehouseCode ?? '';
```

The form's "Destination Warehouse" field writes to `U_DESTINATIONWHS`, **not** to `ToWarehouse`.

**6b. Refuse to post rather than post into `undefined`.**

```js
if (!transitCode) {
    toast.error('No in-transit warehouse found. Tag one warehouse with U_TYPE = "IN" in SAP…');
    return false;
}
```

> The upstream recipe suggests a hardcoded constant fallback here. There is no correct constant
> for a given company, and an invented warehouse code just draws a SAP rejection nobody can act
> on. **Refusing with an instruction is the same guarantee with a better failure.**

**6c. The payload**

```jsonc
POST /StockTransfers
{
  "FromWarehouse": "WHS1",
  "ToWarehouse":   "TRANSIT",          // ← ALWAYS transit
  "JournalMemo":   "Dispatch to WHS2",                          // ≤ 50 chars
  "Comments":      "Store dispatch for WHS2 against order 179", // ≤ 254 chars
  "U_DESTINATIONWHS": "WHS2",          // ← who it's FOR
  "U_TRFTYPE": "D",
  "StockTransferLines": [
    { "LineNum": 0, "ItemCode": "FG-1001", "Quantity": 60,
      "FromWarehouseCode": "WHS1", "WarehouseCode": "TRANSIT",
      "BatchNumbers": [{ "BatchNumber": "B1", "Quantity": 60, "BaseLineNumber": 0 }] }
  ]
}
```

Encoded rules:

1. **`BaseLineNumber` is the index within *this* document.** Omit it and SAP files every batch
   against line 0.
2. **`BatchNumbers` is omitted entirely for a non-batch item** — an *empty* array makes SAP
   complain about the batch setup instead. That's what `compact()` is for.
3. `Comments` ≤ 254, `JournalMemo` ≤ 50 — longer values are **rejected outright**, not
   truncated. That's what `clip()` is for.

**6d. Validate in domain language, client-side**

SAP enforces the batch rule too, but its message is
`[-4014] Cannot add row without complete selection of batch/serial numbers`. Yours should be
*"Not enough batch stock for FG-1001 in WHS1 — 45 of 50 allocated."*

Every failure `return false` so the modal stays open and the user's work survives.

---

### Step 7 — The receipt page

**7a. Where each number comes from — get this wrong and stock is received twice**

| Value | Source | Why |
|---|---|---|
| **Quantities** (what's still owed) | the **ledger** | Only the ledger knows what earlier receipts already took |
| **Batch numbers** | the **note document** (single GET) | Collection GETs don't ship nested `BatchNumbers` |

Both come together in `handleSelectNote` → `getInTransitNoteDetail(docEntry)`.

**7b. One row per batch, not per item**

```js
const noteToLines = (note) =>
  (note?.Lines ?? [])
    .filter((line) => line.Pending > 0)          // settled lines are gone
    .flatMap((line) => {
      if (!line.Batches?.length) return [row('', line.Dispatched, line.Pending)];
      return line.Batches.map((b) => row(b.BatchNumber, b.Dispatched, b.Pending));
    });
```

A note line dispatched as three batches comes up as **three rows**, so the store checks physical
stickers off one for one instead of guessing which batch a shortfall belongs to.

Pre-fill "expected" with what's **still owed**, and show the original underneath (`of 60`) so
the smaller number doesn't look like a bug.

**7c. Post order matters — and so does what each failure means**

```
1. POST receipt (good stock)  ── fails → nothing posted, error shown, form intact, STOP
2. POST damaged transfer      ── fails → receipt already posted; warn, leave the note OPEN
3. close the note             ── only when shortfall == 0 AND the damaged transfer succeeded
```

> **Once step 1 succeeds, nothing below it may be reported as a failure of the transfer itself.**
> That stock has already moved. A failed close is logged, never surfaced — the receipt is valid
> either way.

**Step 3 is the one everyone skips.** Every open note is re-read *with all its lines* on every
ledger request, so skipping the close makes the ledger degrade steadily. And it hides
beautifully: the ledger drops settled notes, so nothing looks broken until it's slow.

**7d. Damaged stock is *moved*, not just noted**

One line moves into exactly one warehouse, so good and damaged stock cannot ride together — the
damaged split is its **own document**, into the warehouse tagged `U_TYPE = 'DM'`, carrying the
**same `U_TRFBASE` and `U_DESTINATIONWHS`**.

> Give the damaged document a different `U_TRFBASE` (or none) and the ledger will offer those
> units to the store all over again.

---

## Part 5 — One transaction, traced end to end

Follow this once and the whole thing clicks. Real numbers, real payloads.

### The setup

```
WHS1     = the store          (U_TYPE blank)
TRANSIT  = in-transit         (U_TYPE = 'IN')
WHS2     = the destination    (U_TYPE = 'SIS')
DMG      = damaged goods      (U_TYPE = 'DM')
```

### Stage 1 — Dispatch 60 of FG-1001 (batch B1) + 40 of RM-1007 (batch B2) to WHS2

Store Dispatch posts **one** document:

```jsonc
{ "FromWarehouse": "WHS1", "ToWarehouse": "TRANSIT",
  "U_DESTINATIONWHS": "WHS2", "U_TRFTYPE": "D",
  "StockTransferLines": [
    { "LineNum": 0, "ItemCode": "FG-1001", "Quantity": 60, "FromWarehouseCode": "WHS1",
      "WarehouseCode": "TRANSIT", "BatchNumbers": [{ "BatchNumber": "B1", "Quantity": 60, "BaseLineNumber": 0 }] },
    { "LineNum": 1, "ItemCode": "RM-1007", "Quantity": 40, "FromWarehouseCode": "WHS1",
      "WarehouseCode": "TRANSIT", "BatchNumbers": [{ "BatchNumber": "B2", "Quantity": 40, "BaseLineNumber": 1 }] }
  ]}
```

SAP assigns `DocEntry: 82`. **Stock is now: WHS1 −100, TRANSIT +100.**

Meanwhile someone else dispatches 200 to **WHS3**, so TRANSIT physically holds **300**.

**The ledger now says:**

```jsonc
{ "byStore": [ { "Store": "WHS3", "Pending": 200 },
               { "Store": "WHS2", "Notes": 1, "Dispatched": 100, "Received": 0, "Pending": 100 } ],
  "totalPending": 300 }
```

👉 **WHS2 is offered 100, not 300.** That's the whole point of the exercise.

### Stage 2 — WHS2 receives only 50 of FG-1001 (the truck was short)

The picker shows note 82 with Pending 100. Opening it calls `getInTransitNoteDetail(82)` and
the grid loads **two rows** (one per batch):

| # | Item | Batch | Expected | Received | Damaged |
|---|---|---|---|---|---|
| 1 | FG-1001 | B1 | 60 | `50` ← typed | |
| 2 | RM-1007 | B2 | 40 | `40` | |

Banner: **Expected 100 · Receiving 90 · Short by 10** — that stays in TRANSIT against WHS2.

Posted:

```jsonc
{ "FromWarehouse": "TRANSIT", "ToWarehouse": "WHS2",
  "U_TRFBASE": "82",             // ← DocEntry, not DocNum
  "U_TRFTYPE": "R",
  "U_DESTINATIONWHS": "WHS2",    // ← from the NOTE
  "StockTransferLines": [
    { "LineNum": 0, "ItemCode": "FG-1001", "Quantity": 50, "FromWarehouseCode": "TRANSIT",
      "WarehouseCode": "WHS2", "BatchNumbers": [{ "BatchNumber": "B1", "Quantity": 50, "BaseLineNumber": 0 }] },
    { "LineNum": 1, "ItemCode": "RM-1007", "Quantity": 40, "FromWarehouseCode": "TRANSIT",
      "WarehouseCode": "WHS2", "BatchNumbers": [{ "BatchNumber": "B2", "Quantity": 40, "BaseLineNumber": 1 }] }
  ]}
```

Shortfall is 10, so **the note is NOT closed**. Stock: TRANSIT −90, WHS2 +90.

**The ledger now says:**

```jsonc
{ "notes": [{ "DocEntry": 82, "Store": "WHS2", "Dispatched": 100, "Received": 90, "Pending": 10,
    "IsSettled": false,
    "Lines": [{ "ItemCode": "FG-1001", "Dispatched": 60, "Received": 50, "Pending": 10,
                "Batches": [{ "BatchNumber": "B1", "Pending": 10 }] }] }] }
```

👉 **RM-1007 is gone from `Lines`** — it's fully received, so `Pending: 0` filters it out.
👉 **FG-1001 offers 10 of B1**, not the original 60.

### Stage 3 — The last 10 arrive, 2 of them damaged

The grid now loads **one row**: FG-1001 / B1 / Expected **10** *(of 60)*.

The store types Received `8`, Damaged `2`. **Two documents post, in order:**

```jsonc
// 1 — the receipt
{ "FromWarehouse": "TRANSIT", "ToWarehouse": "WHS2", "U_TRFBASE": "82", "U_TRFTYPE": "R",
  "U_DESTINATIONWHS": "WHS2",
  "StockTransferLines": [ { "LineNum": 0, "ItemCode": "FG-1001", "Quantity": 8,
    "BatchNumbers": [{ "BatchNumber": "B1", "Quantity": 8, "BaseLineNumber": 0 }] } ] }

// 2 — the damaged split: SAME U_TRFBASE, SAME U_DESTINATIONWHS, different ToWarehouse
{ "FromWarehouse": "TRANSIT", "ToWarehouse": "DMG", "U_TRFBASE": "82", "U_TRFTYPE": "R",
  "U_DESTINATIONWHS": "WHS2",
  "StockTransferLines": [ { "LineNum": 0, "ItemCode": "FG-1001", "Quantity": 2,
    "BatchNumbers": [{ "BatchNumber": "B1", "Quantity": 2, "BaseLineNumber": 0 }] } ] }
```

> Note `LineNum: 0` in **both**. `buildTransferLines` renumbers from 0 per document, and
> `BaseLineNumber` follows it. The damaged doc is not "line 1 of the receipt".

Shortfall is now **0** and the damaged post succeeded → **`POST /StockTransfers(82)/Close`**.

**The ledger now says:** `{ "byStore": [{ "Store": "WHS3", "Pending": 200 }], "totalPending": 200 }`

Note 82 is gone — both because it's settled (`IsSettled` filter) and because it's closed
(`bost_Open` filter). WHS3's 200 was never affected at any point.

### Final ledger check

| | WHS1 | TRANSIT | WHS2 | DMG |
|---|---|---|---|---|
| Start | 100 | 0 | 0 | 0 |
| After dispatch | 0 | 100 | 0 | 0 |
| After receipt 1 | 0 | 10 | 90 | 0 |
| After receipt 2 | 0 | 0 | 98 | 2 |

---

## Part 6 — Cookbook — change it in minutes

Each recipe names **every** file you must touch. If a recipe says two files, changing one is a bug.

---

### 6.1 · Rename a UDF

**Files: 2 (plus SAP).** This is the one change where missing a spot takes the whole listing down.

```js
// 1 — SAPB1/StockTransfers/StockTransferServices.js
export const IN_TRANSIT_UDFS = ["U_DESTINATIONWHS", "U_TRFBASE", "U_TRFTYPE"];

// 2 — SAPB1/StockTransfers/inTransitLedger.js  (the `fields` object)
destination: (doc) => text(doc?.U_DESTINATIONWHS),
base:        (doc) => text(doc?.U_TRFBASE),
kind:        (doc) => text(doc?.U_TRFTYPE).toUpperCase(),
```

Then sweep the pages for hardcoded uses (payload keys, `columns`, `searchFields`, `isReceiptRow`):

```bash
grep -rn "U_DESTINATIONWHS\|U_TRFBASE\|U_TRFTYPE" client/src
```

**Rename in SAP and in code together, never one without the other.**

---

### 6.2 · Change which warehouse is transit / damaged

**Files: 0.** Retag in SAP (`U_TYPE`), then hit **SAP B1 Sync** on either page. That's the
entire point of Step 2.

To add a *new* purpose (say `QC` for a quarantine warehouse):

```js
// common/warehouseTypes.js
export const WAREHOUSE_TYPE = { TRANSIT: 'IN', DAMAGED: 'DM', DESTINATION: 'SIS', QC: 'QC' };

export const findQcWarehouse = (warehouses = []) =>
    warehouses.find((wh) => wType(wh) === WAREHOUSE_TYPE.QC) ?? null;

// …and exclude it from destinations if it isn't one:
export const destinationWarehouses = (warehouses = []) => {
    if (!hasWarehouseTypes(warehouses)) return warehouses;
    return warehouses.filter((wh) => !['IN', 'DM', 'QC'].includes(wType(wh)));
};
```

---

### 6.3 · Add a field to the dispatch header (e.g. a transporter / LR number)

**Files: 1** — `StoreDispatch.jsx`, three edits.

```js
// 1 — EMPTY_FORM (≈ line 215)
const EMPTY_FORM = { /* … */ transporter: '', lrNumber: '' };

// 2 — the JSX, inside the "Dispatch" FieldGroup
<TextField label="Transporter" name="transporter" value={form.transporter}
           onChange={change} disabled={dispatchLocked} />
<TextField label="LR / Docket No" name="lrNumber" value={form.lrNumber}
           onChange={change} disabled={dispatchLocked} />

// 3 — the payload, inside handleSave's `payloadStockTransfer`
U_TRANSPORTER: form.transporter || undefined,   // undefined → compact() drops it
U_LRNUMBER: form.lrNumber || undefined,
```

Then **either** add the UDF to `IN_TRANSIT_UDFS` so it comes back on the listing, **or** don't —
a field you only write doesn't need to be in the `$select`.

> If you *do* add it to `IN_TRANSIT_UDFS`, it must exist in SAP or the listing `$select` fails
> (the retry catches it, but you'll silently lose the destination column too).

To read it back in the modal, add one line to `applyStockTransfer`:
```js
transporter: headers.U_TRANSPORTER ?? '',
```

---

### 6.4 · Add a column to the receipt grid

**Files: 1** — `ProductionReceive.jsx`.

Say you want to show the item's UoM. It has to survive `noteToLines`, so first make sure the
ledger carries it (`inTransitLedger.js` → `buildNote` already keeps `ItemDescription`; add
`UoM` the same way if you need it), then:

```js
// 1 — noteToLines: put it on the row
const row = (batchNumber, dispatched, pending) => ({
    key: `${line.ItemCode}|${batchNumber}`,
    itemNo: line.ItemCode,
    itemName: line.ItemDescription ?? '',
    uom: line.UoM ?? '',          // ← new
    /* … */
});

// 2 — the <thead>, and bump the table's minWidth by the new column's width
<th style={{ width: 90 }}>UoM</th>

// 3 — the <tbody> row
<td><input className="modal-tbl-inp" value={line.uom} disabled /></td>
```

> ⚠️ `minWidth: 1099` on the `<table>` is the **sum of the column widths**. Keep it in step or
> the columns squeeze instead of the wrapper scrolling.

---

### 6.5 · Let the store receive into a different warehouse than the note's destination

**Already supported.** `toWarehouse` is editable; `U_DESTINATIONWHS` is copied from the note and
never follows it:

```js
U_DESTINATIONWHS: form.destination,   // ← from the NOTE, not form.toWarehouse
```

**Do not "fix" this to use `toWarehouse`.** Both sides of the ledger must group by the same key,
or the note stops netting against its own receipts and reopens forever.

To *lock* it instead, one line: `disabled={isView}` → `disabled`.

---

### 6.6 · Block editing a dispatch note that already has receipts

**Files: 1** — `StoreDispatch.jsx`. (This is the known gap flagged in `IN-TRANSIT-FLOW.md`.)

```js
// near the other hooks
const { notes } = useInTransitHook();

// a note with receipts must not be re-lined: a PATCH carrying StockTransferLines
// REPLACES the whole collection, so the ledger would re-net around receipts that
// have already moved stock.
const noteHasReceipts = (docEntry) =>
    (notes.find((n) => String(n.DocEntry) === String(docEntry))?.ReceiptCount ?? 0) > 0;

// in the ListingPage props
onEdit={(record) =>
    noteHasReceipts(record.DocEntry)
        ? toast.info('This note has already been partly received — post a new dispatch instead.')
        : handleModal('Edit', record.DocEntry)}
```

`ReceiptCount` is already on every ledger note; you don't need a new read.

---

### 6.7 · Change the "close the note" rule

**Files: 1** — `ProductionReceive.jsx`, inside `handleSave`, step 3.

```js
// current: close only when nothing is short AND the damaged split posted
if (totals.shortfall <= 0 && damagedPosted) {
    try { await closeStockTransfer(form.noteDocEntry); } catch (err) { /* logged, not surfaced */ }
}
```

Common variations:

```js
// A) close on any receipt — "one truck, one note", partials become write-offs
if (damagedPosted) { /* close */ }

// B) close when within tolerance (e.g. 0.5% weight loss on bulk items)
const tolerance = totals.expected * 0.005;
if (totals.shortfall <= tolerance && damagedPosted) { /* close */ }

// C) never auto-close — a supervisor closes it from a separate screen
```

> Whatever you choose, **something must close settled notes.** Option (C) without that screen
> means `getOpenTransferDocuments()` grows forever. Re-read Step 7c.

---

### 6.8 · Add a "Receive All" / "Receive None" button

**Files: 1** — `ProductionReceive.jsx`. `resetForm` already does "receive all":

```js
const resetForm = () =>
    setLines((prev) => prev.map((l) => ({ ...l, receiveQuantity: l.pending, damagedQuantity: '' })));
```

Add the mirror and drop two buttons above the table:

```js
const receiveNone = () =>
    setLines((prev) => prev.map((l) => ({ ...l, receiveQuantity: '', damagedQuantity: '' })));
```

```jsx
<button type="button" className="modal-tbl-add" onClick={resetForm}>Receive All</button>
<button type="button" className="modal-tbl-add" onClick={receiveNone}>Clear</button>
```

---

### 6.9 · Change how batches are allocated on dispatch (FIFO → something else)

**Files: 1** — `StoreDispatch.jsx`, `allocateBatches` (≈ line 124).

FIFO is not in this function — it's in the *sort order* the batch service returns
(`services/Batch.js` sorts by `InDate` ascending). `allocateBatches` just walks the list:

```js
const allocateBatches = (stock, quantity) => {
  let remaining = round6(quantity);
  const allocated = [];
  (stock ?? []).forEach((batch) => {
    if (remaining <= 0) return;
    const take = Math.min(remaining, batch.Quantity);
    if (take > 0) {
      allocated.push({ BatchNumber: batch.BatchNum, Quantity: round6(take) });
      remaining = round6(remaining - take);
    }
  });
  return allocated;   // ← deliberately falls SHORT if stock is insufficient
};
```

**LIFO:** reverse the input — `allocateBatches([...stock].reverse(), qty)`.

**Largest-batch-first (fewest splits):** `[...stock].sort((a, b) => b.Quantity - a.Quantity)`.

**FEFO (earliest expiry):** two steps, because `getWarehouseWiseBatchOfItem` doesn't map an
expiry field today. In `services/Batch.js`, add it to the projection and sort on it:

```js
.map((row) => ({ /* … */ InDate: row.InDate ?? '', ExpDate: row.ExpDate ?? '' }))
.sort((a, b) => expDateTime(a.ExpDate) - expDateTime(b.ExpDate))
```

Copy `inDateTime()` as `expDateTime()` — the API returns `dd-MM-yyyy`, which **no JavaScript
date parser reads correctly on its own**. An undated batch must sort *last* (`MAX_SAFE_INTEGER`)
so it's only consumed after every dated one.

> **Don't make it cap at available stock.** Falling short on purpose is what lets `handleSave`
> name the difference — *"45 of 50 allocated"* — instead of silently dispatching less than the
> user typed.

---

### 6.10 · Add a "pending in transit" dashboard / report

**Files: 1 new page. Zero backend work** — `byStore` already exists:

```jsx
import useInTransitHook from '../../hooks/useInTransitHook.js';

const InTransitDashboard = () => {
  const { byStore, notes, ledger, loading, refreshLedger } = useInTransitHook();

  return (
    <ListingPage
      title="Pending In Transit"
      rowData={byStore}                 // [{ Store, Notes, Dispatched, Received, Pending }]
      rowKey="Store"
      columns={[
        { header: 'Destination', field: 'Store', type: 'code' },
        { header: 'Open Notes',  field: 'Notes' },
        { header: 'Dispatched',  field: 'Dispatched' },
        { header: 'Received',    field: 'Received' },
        { header: 'Pending',     field: 'Pending' },
      ]}
      stats={[{ label: 'Total Pending', value: ledger.totalPending, icon: '⏳' }]}
      toolbarActions={[{ label: 'Refresh', icon: '🔄', onClick: refreshLedger }]}
    />
  );
};
```

Ageing (how long stock has been sitting) needs one line, since `DocDate` is already on each note:

```js
const ageInDays = (note) =>
    Math.floor((Date.now() - new Date(note.DocDate)) / 86400000);
```

---

### 6.11 · Move the ledger to the server

Do this when you need to close the **concurrent over-receipt** gap (two tills receiving the same
note at once), or when 2–3 SAP round trips per page load starts to hurt.

`inTransitLedger.js` moves **unchanged** — it has no imports. On the server:

```js
import { getInTransitLedger } from "./inTransitLedger.js";
import { getOpenTransferDocuments, getReceiptsForNotes } from "./sapTransferReads.js";

export const readLedger = () =>
    getInTransitLedger({ readOpenDocuments: getOpenTransferDocuments, readReceiptsFor: getReceiptsForNotes });

// controller + route
const getLedger = handle(() => readLedger(), "Failed to build the in-transit ledger");
router.get("/intransit", sap.getLedger);
```

Client side, only the service changes:

```js
// SAPB1/StockTransfers/StockTransferServices.js
export const readInTransitLedger = () => apiService.get('/api/intransit').then((r) => r.data?.data);
```

**The hook and both pages don't change at all.** That's what the layer separation bought you.

> While you're there: re-net **inside** the receipt POST and reject the write if the note no
> longer owes what the client thinks. That's the only real fix for concurrent over-receipt.

---

### 6.12 · Port to a completely different backend (not SAP)

`inTransitLedger.js` ports as-is. Re-point `fields`:

```js
export const fields = {
    id:          (doc) => doc?.shipment_id,       // immutable internal id
    number:      (doc) => doc?.shipment_no,
    source:      (doc) => doc?.origin_location,
    transit:     (doc) => doc?.current_location,
    destination: (doc) => text(doc?.destination_location),
    base:        (doc) => text(doc?.settles_shipment_id),
    kind:        (doc) => text(doc?.doc_kind).toUpperCase(),
    lines:       (doc)  => doc?.items ?? [],
    lineItem:    (line) => text(line?.sku),
    lineQty:     (line) => Number(line?.qty) || 0,
    lineBatches: (line) => line?.lots ?? [],
    batchNumber: (batch) => text(batch?.lot_no),
    batchQty:    (batch) => Number(batch?.qty) || 0,
};
```

What you need from any backend — five things:

```
[ ] a destination field on the shipment header
[ ] a link field on the receipt header (holding the shipment's IMMUTABLE id)
[ ] a document-type marker
[ ] location-purpose tagging, read from data not hardcoded
[ ] read open shipments WITH line quantities in one call
[ ] read receipts filtered by the link field in one call (chunk if URLs are capped)
```

If your backend can query the transfer tables in SQL, **one view replaces this whole file** —
same arithmetic, less code:

```sql
SELECT d.destination, d.shipment_id, l.sku,
       SUM(l.qty) - COALESCE(SUM(r.qty), 0) AS pending
FROM shipments d
JOIN shipment_lines l  ON l.shipment_id = d.shipment_id
LEFT JOIN receipt_lines r ON r.settles_shipment_id = d.shipment_id AND r.sku = l.sku
WHERE d.status = 'open'
GROUP BY d.destination, d.shipment_id, l.sku
HAVING SUM(l.qty) - COALESCE(SUM(r.qty), 0) > 0;
```

(SAP's `SQLQueries` endpoint refuses `OWTR`/`WTR1`, which is exactly why we net in JavaScript
here and not in SQL.)

---

## Part 7 — Debugging: symptom → cause → fix

| Symptom | Almost always | Fix |
|---|---|---|
| **Listing is completely empty**, whole page looks broken | A `$select` names a property SAP doesn't have — it fails the **entire** request | Check the console for the retry warning. Verify `IN_TRANSIT_UDFS` spelling against SAP exactly (§6.1) |
| **Ledger says everything is 0 pending** but notes exist | Someone added a `$select` to `getOpenTransferDocuments()` | Remove it. `$select` **suppresses nested collections** — no `$select`, no exceptions |
| **Batch column is empty** on the receipt grid | Reading batches from a *collection* GET | Only a single-document GET ships `BatchNumbers`. Use `getInTransitNoteDetail()` |
| **A note never settles**, pending shows `0` but `IsSettled` is false | Float dust — `0.1 + 0.2 ≠ 0.3` | Every comparison must go through `round()`. Check any arithmetic you added |
| **A store is offered the same stock twice** | The receipt's `U_TRFBASE` is missing/wrong, or the damaged doc has a different one | Both documents must carry the **same** `U_TRFBASE` (the note's DocEntry) and `U_DESTINATIONWHS` |
| **Receipts show up on the dispatch list** | `U_TRFTYPE` wasn't written, or `isReceiptRow` was changed | `isReceiptRow` accepts either `U_TRFTYPE === 'R'` **or** a non-empty `U_TRFBASE` — keep both |
| **SAP: `[-4014] Cannot add row without complete selection of batch/serial numbers`** | Batch quantities don't total the line quantity | The client check should catch this first — see `handleSave`'s `shortLine` |
| **SAP complains about batch setup** on a non-batch item | You sent `BatchNumbers: []` | It must be **absent**, not empty. That's what `compact()` + `undefined` do |
| **All batches land on line 0** | `BaseLineNumber` missing | It indexes the line within **this** document — see `buildTransferLines` |
| **SAP rejects the post with no useful message** | `Comments` > 254 or `JournalMemo` > 50 | `clip()` both. Longer values are rejected outright, not truncated |
| **Ledger gets slower every month** | Notes aren't being closed | Step 7c. Check that `closeStockTransfer` is actually being reached |
| **Loader strobes** every time you tab back | Overlay is driven off `refreshing`/`isFetching` | Drive it off `loading` (first load only) |
| **Warehouse dropdowns all empty** | `U_TYPE` missing **and** the retry was removed | Restore the fallback in `getAllWarehouses()` |
| **"No in-transit warehouse found"** | No warehouse tagged `U_TYPE = 'IN'`, or two are | Tag exactly one, then SAP B1 Sync |
| **Pending is stale after posting** | A refresh was dropped | Both pages must `Promise.all([refreshStockTransfers(), refreshLedger()])` after any write |

---

## Part 8 — The invariants

Check these first when something breaks. Breaking one is always a bug, never a shortcut.

### This flow's own rules

1. `ToWarehouse` on a dispatch is **always** the transit warehouse; the destination lives in `U_DESTINATIONWHS`.
2. Netting joins on **item code**, never line number — receipts renumber their lines.
3. `U_TRFBASE` holds the note's **DocEntry** (stable), not its DocNum (display).
4. Round every quantity to 6 dp before comparing; "settled" is an equality test.
5. Only **open** documents are read — and something must actually close settled ones.
6. Damaged transfers carry the **same `U_TRFBASE`**, or their units get offered again.
7. Seed the receipt form from the **ledger**, and only after the ledger has loaded.
8. `U_DESTINATIONWHS` on a receipt comes from the **note**, never from `ToWarehouse`.

### SAP B1 Service Layer

9. A `$select` naming a property the entity doesn't have fails the **entire** request.
10. `$select` **suppresses nested collections** — no `StockTransferLines`, no `BatchNumbers`.
11. Collection GETs never return nested `BatchNumbers`; only a single-document GET does.
12. Collections paginate at 20 by default — always follow `@odata.nextLink` (`getSapAll` does).
13. `StockTransfers` has no `Cancelled` property; a cancelled transfer reads as `bost_Close`.
14. `OWTR`/`WTR1` are **not** reachable via `SQLQueries`.
15. Sending `StockTransferLines` on a PATCH **replaces the whole collection**.
16. `BatchNumbers` must be **absent**, not empty, for a non-batch item.
17. `BaseLineNumber` indexes the line **within the document being posted**.
18. `Comments` ≤ 254 chars; `JournalMemo` ≤ 50 — longer values are rejected outright.
19. `/Cancel` and `/Close` return `204 No Content` — no body to parse. `/Cancel` posts a reversal; it does not delete.
20. `DocEntry` is numeric — `/StockTransfers(82)`, no quotes.

---

## Part 9 — Testing your changes

The netting is pure, so it tests with plain objects — no SAP, no React, no test framework needed.

```js
// scratch/ledger.test.mjs — run with: node ledger.test.mjs
import { buildLedger, buildNote } from '../client/src/SAPB1/StockTransfers/inTransitLedger.js';

const note = {
  DocEntry: 82, DocNum: 82, FromWarehouse: 'WHS1', ToWarehouse: 'TRANSIT',
  U_DESTINATIONWHS: 'WHS2', U_TRFTYPE: 'D',
  StockTransferLines: [
    { ItemCode: 'FG-1001', Quantity: 60, BatchNumbers: [{ BatchNumber: 'B1', Quantity: 60 }] },
    { ItemCode: 'RM-1007', Quantity: 40, BatchNumbers: [{ BatchNumber: 'B2', Quantity: 40 }] },
  ],
};
const receipt = {
  DocEntry: 90, U_TRFBASE: '82', U_TRFTYPE: 'R', U_DESTINATIONWHS: 'WHS2',
  StockTransferLines: [{ ItemCode: 'FG-1001', Quantity: 50, BatchNumbers: [{ BatchNumber: 'B1', Quantity: 50 }] }],
};

const ledger = buildLedger([note], [receipt]);
console.assert(ledger.totalPending === 50, 'pending should be 50');
console.assert(ledger.notes[0].Lines[0].Batches[0].Pending === 10, 'B1 should have 10 left');
```

### The six cases worth keeping

| Case | Asserts |
|---|---|
| Two destinations, one transit warehouse | WHS3's stock is never offered to WHS2 |
| Partial receipt | A 100/50 note offers **10 of B1 + 40 of B2**, not the original 60 + 40 |
| Full receipt | The note drops out of the ledger |
| `0.1 + 0.2` vs `0.3` | Settles instead of leaving float dust pending forever |
| Over-receipt | Clamps to 0, never negative |
| Renumbered receipt lines | Still nets against the right note lines |

### Testing the page payload logic

`noteToLines` and `buildTransferLines` live inside `ProductionReceive.jsx`, so extract them at
test time rather than copying them (a copy drifts and stops proving anything):

```js
const src  = fs.readFileSync('.../ProductionReceive.jsx', 'utf8');
const body = src.slice(src.indexOf('// Drops keys whose value'), src.indexOf('/* ── Icons ──'));
fs.writeFileSync('receiveLogic.mjs',
  'const getTodayDate = () => "2026-01-01";\n' + body +
  '\nexport { noteToLines, buildTransferLines };\n');
```

Assert: one row per batch · settled lines dropped · rows fold to one document line per item ·
`BaseLineNumber` indexes this document · non-batch items omit `BatchNumbers` entirely · the
damaged split renumbers from 0.

### Before you merge

```bash
cd client
npx eslint src/pages/Production_Management/ src/hooks/ src/common/ src/SAPB1/
npx vite build
```

> `StoreDispatch.jsx` carries **two pre-existing** unused-variable errors (`stockQuantity`,
> `updateBaseQuantity`) that back commented-out JSX, and `ProductionIssue.jsx` carries five.
> Those are not yours. Anything else is.

---

## Appendix — the 30-second cheat sheet

```
DISPATCH                                 RECEIPT
FromWarehouse   = store                  FromWarehouse   = TRANSIT
ToWarehouse     = TRANSIT  ← always      ToWarehouse     = destination
U_DESTINATIONWHS= destination            U_DESTINATIONWHS= from the NOTE
U_TRFTYPE       = 'D'                    U_TRFTYPE       = 'R'
                                         U_TRFBASE       = note's DocEntry

pending = Σ dispatch lines for a destination − Σ receipts linked to those dispatches
          (per note, per item, per batch — folded by ITEM CODE, rounded to 6dp)

transit warehouse  = the one tagged U_TYPE = 'IN'      (never hardcoded)
damaged warehouse  = the one tagged U_TYPE = 'DM'

NO $select on the open-documents read      ($select kills nested collections)
BatchNumbers absent — never []             (for non-batch items)
BaseLineNumber indexes THIS document       (not the note's)
Close the note when pending hits zero      (or the ledger degrades forever)
```
