---
name: in-transit-transfers
description: Move stock between two warehouses through an in-transit warehouse — dispatch WHS1 → TRANSIT, receipt TRANSIT → WHS2 — plus the ledger that says whose stock is sitting in the shared transit warehouse. Use when asked for in-transit / goods-in-transit transfers, a dispatch-note + receipt pair, "pending to receive" per store, partial receipts, or a damaged-goods split. Written for SAP B1 Service Layer + React, with a porting guide for any backend.
---

# In-transit warehouse transfers

Stock does not jump from WHS1 to WHS2. It **leaves** WHS1 into a transit warehouse, sits
there while it is on the truck, and is **received** out of transit into WHS2 — two documents,
days apart, with the quantity visible on the balance sheet the whole time.

```
   WHS1              TRANSIT               WHS2
 (source)          (virtual whs)          (destination)
    │                   │                     │
    │──── dispatch ────▶│                     │     doc 1: WHS1 → TRANSIT
    │                   │                     │     (Mon: goods leave)
    │                   │──── receipt ───────▶│     doc 2: TRANSIT → WHS2
    │                   │                     │     (Wed: goods checked in)
```

A working implementation lives in the SIS Portal
(`server/src/integrations/sapb1/services/inTransitService.js`,
`client/src/features/transfers/pages/Transfers.jsx`,
`client/src/features/receipts/pages/Receipt.jsx`) with the long-form walkthrough in
`docs/architecture/in-transit-flow.md`. **This skill is the portable recipe.**

Ships with this skill:

    assets/inTransitLedger.js    the netting — pure functions, no imports, no HTTP
    assets/sapTransferReads.js   the only two ERP-specific reads

---

## The one problem everything else solves

There is **one** transit warehouse, not one per destination. So the ERP will say TRANSIT
holds 500 units and cannot say whose 500 they are:

```
WHS1 ──300──▶ TRANSIT   (bound for WHS2)      TRANSIT holds 500…
WHS1 ──200──▶ TRANSIT   (bound for WHS3)      …but the ERP can't say whose 500.
```

Show WHS2 the raw transit balance and it will receive 500 — including the 200 that belong to
WHS3. Every step below exists to answer one question:

> **How much of the transit warehouse belongs to WHS2, and against which dispatch note?**

**Why not one transit warehouse per destination?** Because a new destination then means a
master-data change in the ERP (usually a consultant, usually a ticket), where the shared
warehouse means a new destination is just a value in a field. You pay for that once, in
~200 lines of netting code. If your ERP gives you per-destination transit locations cheaply,
**take them and skip sections 3–4 of this skill entirely.**

---

## Step 1 · Three fields make the whole thing work

Since the ERP can't say whose stock is in transit, the documents say it themselves. Add three
**header** fields (SAP B1: UDFs on Marketing Documents ▸ **Title**, not Rows):

| Field | On | Carries | Why it must exist |
|---|---|---|---|
| `U_DESTNATIONSIS` | dispatch + receipt | the destination warehouse code (`WHS2`) | The document's real `ToWarehouse` is TRANSIT — identical for every destination. This is the **only** field that says who it's for. |
| `U_SISBASE` | receipt only | the **DocEntry** of the dispatch it settles | The link that lets a receipt be netted against its note. Without it, transit is one anonymous pile. |
| `U_SISTYPE` | both | `'D'` dispatch / `'R'` receipt | A receipt is a stock-transfer document too. Without a marker it looks like another note waiting to be received. |

SAP B1 setup: **Administration ▸ Setup ▸ General ▸ User-Defined Fields ▸ Marketing Documents
▸ Title** — `DESTNATIONSIS` (alphanumeric 50), `SISBASE` (alphanumeric 50), `SISTYPE`
(alphanumeric 1). They become `U_`-prefixed.

> ⚠️ `U_SISBASE` holds the **DocEntry** (the immutable internal id), never the DocNum. DocNum
> is for humans and is not a stable key.
>
> ⚠️ Keep the spelling **`DESTNATIONSIS`** — missing "I", a typo baked into the SAP object.
> Renaming it in code without renaming it in SAP makes the whole `$select` fail with
> `[-1000] Property 'X' of 'StockTransfer' is invalid`, which reads as a total outage.

### And tag the warehouses by purpose

Don't hardcode which warehouse is the transit one. Put a `U_WTYPE` UDF on the warehouse
master (`OWHS`) and read it:

| `U_WTYPE` | Meaning | How many |
|---|---|---|
| `SIS` | a destination / store counter | many |
| `IN` | the in-transit warehouse | exactly one |
| `DM` | the damaged-goods warehouse | exactly one |
| *(blank)* | ordinary warehouse (HO, raw materials) | many |

Read it case- and space-insensitively — it is typed by hand. And if **no** warehouse carries
a `U_WTYPE` at all, assume the field isn't being served and treat every warehouse as a
destination, or an older server build leaves every dropdown blank.

---

## Step 2 · The formula

```
pending(destination) = Σ dispatch lines addressed to it
                     − Σ receipt lines linked back to those dispatches
```

Computed per note, per item, and per batch. **Nothing is stored locally** — no
`SIS_InTransit` table, no cache, no sync job. The ERP documents *are* the ledger and the
server just does the subtraction.

That costs 2–3 ERP round trips per read and buys the guarantee that the portal can never
disagree with the ERP: no reconciliation job, no drift, no "the portal says 150 but SAP says
200" ticket. For a flow where a wrong number means a store receives someone else's stock,
correctness beats latency.

---

## Step 3 · Server: copy the ledger

```
assets/inTransitLedger.js   →  server/.../services/inTransitLedger.js
assets/sapTransferReads.js  →  server/.../services/sapTransferReads.js
```

`inTransitLedger.js` is pure — no imports, no HTTP, no ERP. Everything that knows your
document shape is the `fields` accessor object at the top; re-point those and nothing else in
the file changes.

Wire it up in three lines:

```js
import { getInTransitLedger } from "./inTransitLedger.js";
import { getOpenTransferDocuments, getReceiptsForNotes } from "./sapTransferReads.js";

export const readLedger = () =>
    getInTransitLedger({
        readOpenDocuments: getOpenTransferDocuments,
        readReceiptsFor: getReceiptsForNotes,
    });
```

Then one controller line and one route line:

```js
const getInTransitLedger = handle(() => readLedger(), "Failed to build the in-transit ledger");
router.get("/intransit", sap.getInTransitLedger);
```

### What it returns

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

Note #82 dispatched 100 and had 50 received, so WHS2's next visit is offered **10 of B1 and
40 of B2** — not the original 60 + 40. Meanwhile TRANSIT might physically hold 500 units; WHS2
is capped at 50.

### Four things in that file that cost real time to rediscover

1. **Fold lines by item code, never by line number.** A receipt renumbers its lines — short
   lines are dropped before posting — so line 2 of a receipt is not line 2 of its note.
2. **Round to 6 dp before every comparison.** `IsSettled` is an equality test in disguise;
   without rounding, `0.1 + 0.2 − 0.3` leaves `5.55e-17` pending forever and the note never
   settles.
3. **Clamp pending at zero.** An over-receipt is a data problem, not a licence to hand back a
   negative allocation that a later comparison might let through.
4. **Read open documents only, and make sure something actually closes them.** That filter is
   the only thing keeping the work bounded as history piles up.

### Two SAP quirks that shape the reads

- **No `$select` on the open-documents read.** The Service Layer only ships the nested
  `StockTransferLines` collection when the request does *not* narrow the fields. Add a
  `$select` and the quantities silently vanish. This single quirk is why the ledger is its own
  endpoint instead of something the client derives from the listing it already has.
- **`OWTR`/`WTR1` are not SQL-readable** — SAP's `SQLQueries` endpoint refuses them. That is
  why the netting happens in JavaScript rather than as one `SELECT … GROUP BY`. If your
  backend *can* query the transfer tables, one SQL view replaces this whole step.

---

## Step 4 · Client: hooks and cache keys

Three layers, strictly separated — service knows the URL, hook knows the cache, page knows
neither:

```js
// services/…/StockTransfers.js — HTTP only, no unwrapping
getInTransit: () => apiService.get('/api/intransit'),

// hooks/…/useSapB1StockTransfers.js — caching + unwrapping, no axios
const selectData = (response) => response?.data?.data ?? null;

// pages/*.jsx — workflow only, no idea the envelope exists
const { ledger, noteFor, refetch } = useSapB1InTransit({ fresh: true });
```

**Make the cache keys hierarchical.** The ledger key must be *prefixed* by the list key, so
one invalidation after any write refreshes the grid, every cached document, **and** the
pending numbers:

```js
stockTransfers: ()         => [...all, 'stockTransfers'],
stockTransfer:  (docEntry) => [...stockTransfers(), String(docEntry ?? '')],
inTransit:      ()         => [...stockTransfers(), 'inTransit'],

const invalidateAll = (qc) => qc.invalidateQueries({ queryKey: queryKeys.stockTransfers() });
```

Posting a receipt then cannot leave a stale pending figure on screen — the ledger is netted
from the very documents that just changed.

**Browse from cache; act on fresh.** The listing page can use the app's default staleTime.
The dispatch and receipt pages must not:

```js
export const ALWAYS_FRESH = {
    staleTime: 0,                 // every read is stale the moment it lands
    refetchOnMount: 'always',     // re-entering the page really re-reads
    refetchOnWindowFocus: true,   // coming back to the tab re-reads
};
```

HO dispatches notes while a store has the receipt page open, and another till may have
received the same note a minute ago. Acting on a cached list means receiving stock the ERP has
already moved. Leave `gcTime` alone so the cached answer still paints instantly while the
fresh one is in flight.

> One consequence: with `refetchOnMount: 'always'`, drive the blocking overlay off
> `isLoading` (first load only), **not** `isFetching`, or it strobes on every tab focus. Show
> background re-reads as a small "⏳ Syncing…" in the header.

---

## Step 5 · The dispatch page

**`ToWarehouse` is the transit warehouse. Always.** The form's "destination" field writes to
`U_DESTNATIONSIS`, not to `ToWarehouse`. Read the transit code from the warehouse marked
`U_WTYPE = 'IN'`, with a constant fallback — a dispatch must never post into `undefined`:

```js
const TRANSIT_WAREHOUSE = 'HO-SIS';
const transitCode = transitWarehouse?.WarehouseCode || TRANSIT_WAREHOUSE;
```

### The payload

```jsonc
POST /api/stocktransfer
{
  "DocDate": "2026-08-20",
  "DueDate": "2026-08-20",
  "FromWarehouse": "WHS1",
  "ToWarehouse":   "TRANSIT",         // ← the TRANSIT warehouse, always
  "Comments": "…",                    // ≤ 254 chars
  "JournalMemo": "…",                 // ≤ 50 chars
  "U_DESTNATIONSIS": "WHS2",          // ← the destination it's FOR
  "U_SISTYPE": "D",
  "StockTransferLines": [
    { "LineNum": 0, "ItemCode": "FG-1001", "Quantity": 60,
      "FromWarehouseCode": "WHS1", "WarehouseCode": "TRANSIT",
      "BatchNumbers": [{ "BatchNumber": "B1", "Quantity": 60, "BaseLineNumber": 0 }] }
  ]
}
```

Rules encoded there:

1. Refuse to save if the user picks the transit warehouse **as** the destination — that is a
   note addressed to nowhere. Refuse same-source-and-destination too.
2. `BaseLineNumber` is the index of the line **within this document**. Omit it and SAP files
   every batch against line 0.
3. `BatchNumbers` is **omitted entirely** for a non-batch item — an *empty* array makes SAP
   complain about the batch setup. (Batch allocation itself: see the `batch-tracked-lines`
   skill.)
4. `CardCode` only on create — SAP won't move a posted document to another business partner.

> **Sending `StockTransferLines` on an update REPLACES the whole collection.** Every line the
> document should keep must be in the array, including untouched ones.

### Validate client-side in domain language

Check before building the payload, each failure keeping the modal open so the user's work
survives: posting date present; both warehouses picked; not the same warehouse; destination
isn't the transit warehouse; at least one line; every line has an item code and quantity > 0;
batch totals equal line quantities.

The ERP enforces the last one too — but its message is
`[-4014] Cannot add row without complete selection of batch/serial numbers`, and
*"Line 2: batch quantities total 45, but the line quantity is 50"* is the one a store clerk
can act on.

---

## Step 6 · The receipt page

### Where each number comes from — get this wrong and stock is received twice

| Value | Source | Why |
|---|---|---|
| **Quantities** (what's still owed) | the **ledger** `/api/intransit` | Only the ledger knows what earlier receipts already took |
| **Batch numbers** and their per-batch price | the **note document** `/api/stocktransfer/:id` | Collection GETs don't ship nested `BatchNumbers` — only a single-document GET does |

Seed the form **from the ledger, and only once the ledger has loaded**:

```js
if (note && !isLedgerLoading && syncedDocEntry !== note.DocEntry) {
    setSyncedDocEntry(note.DocEntry);
    setLines(ledgerToLines(note));
}
```

Without `!isLedgerLoading`, a partly-received note seeds from its **original** quantities and
invites the store to receive the same stock twice. (Adjusting state during render like this is
React's documented "adjust state when the input changes" pattern — in an effect, a cached
document paints the form blank for one frame first. `syncedDocEntry` is what stops the loop.)

Branch on **the note**, not on whether the ledger knows it. A fully-received note whose close
failed is absent from the ledger; falling through to the document would offer its whole
quantity again, whereas branching on `U_DESTNATIONSIS` makes the table come up empty —
correct, and obviously so.

### One row per batch, not per item

A note line dispatched as three batches comes up as **three rows**, each with its own batch
number and the quantity still owed on it, so the store checks physical stickers off one for
one instead of guessing which batch a shortfall belongs to. Fold the rows back into one
document line per item when the receipt posts.

Pre-fill "expected" with what's **still owed**, and show the original underneath ("of 60") so
the smaller number doesn't look like a bug.

### The payload

```jsonc
POST /api/stocktransfer
{
  "FromWarehouse": "TRANSIT",         // ← out of TRANSIT
  "ToWarehouse":   "WHS2",            // ← into the destination
  "Comments":    "Receipt against transfer note 82 · Received by … · Short by 10",
  "JournalMemo": "SIS Receipt 82",
  "U_SISBASE": "82",                  // ← the netting link: the note's DocEntry
  "U_SISTYPE": "R",
  "U_DESTNATIONSIS": "WHS2",          // ← taken from the NOTE, not from ToWarehouse
  "StockTransferLines": [
    { "LineNum": 0, "ItemCode": "FG-1001", "Quantity": 50,
      "FromWarehouseCode": "TRANSIT", "WarehouseCode": "WHS2",
      "BatchNumbers": [{ "BatchNumber": "B1", "Quantity": 50, "BaseLineNumber": 0 }] }
  ]
}
```

- **`U_DESTNATIONSIS` comes from the note.** A store may receive into another of its own
  warehouses without changing who the stock was addressed to — and both sides of the ledger
  must group by the same key.
- **`BaseLineNumber` indexes this document**, not the note's. Short lines are dropped before
  posting, so the two no longer line up.

### Partial receipts

Receive less than expected and the note **stays open**, the balance still held against that
destination in transit. Say so before anything posts:

> *Short by 10 — that stays in TRANSIT against this store, and the note stays open so you can
> receive the rest later.*

### Damaged stock is *moved*, not just noted

A row with a damaged quantity posts a **second** transfer document, out of TRANSIT into the
warehouse marked `U_WTYPE = 'DM'` — because one line moves into exactly one warehouse, so good
and damaged stock cannot ride together.

Give the damaged document the **same `U_SISBASE` and `U_DESTNATIONSIS`**, or the ledger offers
those units to the store again.

Post order matters, and so does what each failure means:

```
1. POST receipt (good stock)  ── fails → nothing posted, error shown, form intact, STOP
2. POST damaged transfer      ── fails → receipt already posted; warn, leave the note OPEN
3. close the note             ── only when shortfall == 0 AND the damaged transfer succeeded
```

Once step 1 succeeds, nothing below it may be reported as a failure of the transfer itself.

### Close the note when pending hits zero

**Do this server-side, inside the receipt POST.** It is the step everyone skips and the one
that keeps `getOpenTransferDocuments()` bounded — every open note is re-read with all its
lines on every single ledger request. Skip it and notes accumulate in `bost_Open` forever and
the ledger degrades steadily. (It hides well: the ledger drops settled notes, so nothing looks
broken until it's slow.)

---

## Invariants — the list to check first when it breaks

**This flow's own rules**

1. `ToWarehouse` on a dispatch is **always** the transit warehouse; the destination lives in
   `U_DESTNATIONSIS`.
2. Netting joins on **item code**, never line number — receipts renumber their lines.
3. `U_SISBASE` holds the note's **DocEntry** (stable), not its DocNum (display).
4. Round every quantity to 6 dp before comparing; "settled" is an equality test.
5. Only **open** documents are read — and something must actually close settled ones.
6. Damaged transfers carry the **same `U_SISBASE`**, or their units get offered again.
7. Seed the receipt form from the **ledger**, and only after the ledger has loaded.

**SAP B1 Service Layer**

8. A `$select` naming a property the entity doesn't have fails the **entire** request.
9. `$select` **suppresses nested collections** — no `StockTransferLines`, no `BatchNumbers`.
10. Collection GETs never return nested `BatchNumbers`; only a single-document GET does.
11. Collections paginate at 20 by default — always follow `@odata.nextLink`.
12. `Prefer: odata.maxpagesize` is **per request**; send it on every page or nextLink pages
    silently fall back to 20.
13. `StockTransfers` has no `Cancelled` property; a cancelled transfer reads as `bost_Close`.
14. `OWTR`/`WTR1` are **not** reachable via `SQLQueries`.
15. Sending `StockTransferLines` on a PATCH **replaces the whole collection**.
16. `BatchNumbers` must be **absent**, not empty, for a non-batch item.
17. `BaseLineNumber` indexes the line **within the document being posted**.
18. `Comments` ≤ 254 chars; `JournalMemo` ≤ 50 — longer values are rejected outright.
19. `/Cancel` and `/Close` return `204 No Content` — no body to parse. `/Cancel` posts a
    reversal document; it does not delete.
20. `DocEntry` is numeric — `/StockTransfers(82)`, no quotes.

**Known gaps worth closing in a new build**

- **Site scoping.** `/api/intransit` returns every destination's ledger to any authenticated
  user unless you add scoping middleware. Locking the dropdown in the browser stops honest
  mistakes, not a crafted request.
- **Concurrent over-receipt.** Two tills receiving the same note simultaneously can both pass
  client validation. `fresh: true` narrows the window to seconds; closing it needs the server
  to re-net *inside* the receipt POST and reject the write.

---

## Porting to a non-SAP backend

`inTransitLedger.js` has no imports — it ports as-is once you re-point the `fields`
accessors. What you need from your backend is five things:

1. **Tag a shipment with its destination** — a custom field on the document header. Without
   it, nothing else works.
2. **Link a receipt back to its shipment** — via the shipment's *immutable internal id*, not
   its human-readable number.
3. **Mark which kind of document it is** — shipments and receipts are usually the same entity.
4. **Read open shipments with their line quantities** in one call.
5. **Read receipts filtered by the link field** in one call (chunk the filter if there's a URL
   length limit).

If your backend can't do 4 and 5 efficiently, do the netting in SQL as a view instead — same
arithmetic, less code.

### Port checklist

```
[ ] Destination field on the shipment header
[ ] Link field on the receipt header (immutable id)
[ ] Document-type marker
[ ] Location-purpose tagging (transit / destination / damaged), read from data not hardcoded
[ ] Read: open shipments WITH line quantities
[ ] Read: receipts filtered by link field, chunked
[ ] Netting: fold by item, round, clamp at zero, drop settled
[ ] One endpoint returning { byDestination, shipments, totalPending }
[ ] Dispatch screen: ToWarehouse = transit, real destination in the custom field
[ ] Receipt screen: seeded from the LEDGER, only after it has loaded
[ ] Partial receipt leaves the shipment open
[ ] Damaged/rejected split carries the SAME link field
[ ] Close the shipment when pending hits zero        ← don't skip this one
[ ] Invalidate list + detail + ledger with one cache key after any write
```



### Final =>
1. In @src\pages\Production_Management\StoreDispatch.jsx page=>
user selects released production number and then from warehouse the in comoponests (bom) line level data populated then user post dispatch with batch , item details, qty everthiye needed. From warehouse treate as from warehouse , to warehouse : transit warehouse from sap, 
"U_DESTNATIONSIS": "destination warehouse",
"U_SISTYPE": "D", d for dispatch 

2. In  @src\pages\Production_Management\ProductionReceive.jsx page recipts happen => 

Here From warehouse would be in-transit warehouse filter by type from sap 
to warehouse is recpits warehouse
"U_SISBASE": "179", docnum / docentry of stock transfer for pendin, partial recipts, damage warehouse transfer that no warehouse over recipts from in-transit warhouse that given from source warehouse to that particular warehouse.
"U_SISTYPE": "R", R for recipts
"U_DESTNATIONSIS": "SIS-01", here recipts happens

The portal doesn't hardcode which warehouse is which — it reads a UDF on the warehouse
master, `U_WTYPE`| `IN` | The in-transit warehouse | exactly one | Dispatch destination |

Start implementation with minimal code chnages