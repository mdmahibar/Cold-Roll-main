# In-transit transfers — Store Dispatch → Production Receive

Stock no longer jumps from the store to production. It **leaves** the store into a transit
warehouse, sits there while it is on the move, and is **received** out of transit into the
destination — two documents, days apart, with the quantity visible on the balance sheet the
whole time.

```
   STORE                 TRANSIT                DESTINATION
 (FromWarehouse)      (U_TYPE = 'IN')        (U_DESTINATIONWHS)
     │                     │                        │
     │──── dispatch ──────▶│                        │   doc 1: StoreDispatch.jsx
     │                     │                        │   ToWarehouse = TRANSIT
     │                     │                        │   U_TRFTYPE = 'D'
     │                     │                        │
     │                     │──── receipt ──────────▶│   doc 2: ProductionReceive.jsx
     │                     │                        │   FromWarehouse = TRANSIT
     │                     │                        │   U_TRFBASE = doc 1's DocEntry
     │                     │                        │   U_TRFTYPE = 'R'
```

Both documents are SAP `StockTransfers`. Nothing new is stored locally — no in-transit table,
no cache, no sync job. **The SAP documents are the ledger** and the portal just does the
subtraction, so the portal can never disagree with SAP.

---

## ⚠️ SAP setup required before this works

The flow is driven entirely by four user-defined fields. **Until they exist in SAP, the pages
fall back to safe behaviour but the flow cannot post** (see *Graceful degradation* below).

### 1. Three header UDFs on stock transfers

**Administration ▸ Setup ▸ General ▸ User-Defined Fields ▸ Marketing Documents ▸ Title**
(Title, **not** Rows — these are header fields.) SAP prefixes them with `U_` automatically.

| Create as | Type | On | Carries |
|---|---|---|---|
| `DESTINATIONWHS` | Alphanumeric 50 | dispatch + receipt | the destination warehouse code |
| `TRFBASE` | Alphanumeric 50 | receipt only | the **DocEntry** of the dispatch it settles |
| `TRFTYPE` | Alphanumeric 1 | both | `D` dispatch / `R` receipt |

> **The names must match SAP character for character.** A `$select` naming a property the
> entity does not have fails the **entire** request with
> `[-1000] Property 'X' of 'StockTransfer' is invalid` — one typo empties the whole listing
> and reads as a total outage, not as a missing column. If you rename a UDF, rename it in SAP
> and in `SAPB1/StockTransfers/StockTransferServices.js` (`IN_TRANSIT_UDFS`) plus the `fields`
> accessors at the top of `inTransitLedger.js` together, never one without the other.

Why each one has to exist:

- **`U_DESTINATIONWHS`** — a dispatch's real `ToWarehouse` is the transit warehouse, *identical
  on every note*. This is the only field that says who the stock is for.
- **`U_TRFBASE`** — the link that lets a receipt be netted against its note. Without it,
  transit is one anonymous pile. It holds **DocEntry** (the immutable internal id), never
  DocNum, which is for humans and repeats across series.
- **`U_TRFTYPE`** — a receipt is a stock transfer too. Without a marker it comes back in the
  Store Dispatch list looking like another note still waiting to be received.

### 2. One UDF on the warehouse master

**User-Defined Fields ▸ Warehouses (`OWHS`)** → create `TYPE`, Alphanumeric 5:

| `U_TYPE` | Meaning | How many |
|---|---|---|
| `IN` | the in-transit warehouse | **exactly one** |
| `DM` | the damaged-goods warehouse | exactly one (only if damaged splits are used) |
| `SIS` | a destination / store counter | many |
| *(blank)* | ordinary warehouse (HO, raw materials) | many |

Nothing is hardcoded — a new destination is a value in a field, not a code change. The tag is
read **case- and space-insensitively** because it is typed by hand.

---

## Files

### Added

| File | What it is |
|---|---|
| `SAPB1/StockTransfers/inTransitLedger.js` | The netting. **Pure** — no imports, no HTTP, no SAP. Ports to any backend by re-pointing the `fields` accessors at the top. |
| `common/warehouseTypes.js` | Reads `U_TYPE`: `findTransitWarehouse`, `findDamagedWarehouse`, `destinationWarehouses`, `toWarehouseOptions`. |
| `hooks/useInTransitHook.js` | The ledger as a hook. Deliberately **not** persisted to zustand — see *Why the ledger is never cached*. |

### Changed

| File | Change |
|---|---|
| `SAPB1/StockTransfers/StockTransferServices.js` | Added `getOpenTransferDocuments`, `getReceiptsForNotes`, `readInTransitLedger`, `getInTransitNoteDetail`, `closeStockTransfer`. The listing `$select` now carries the three UDFs. |
| `SAPB1/warehouse/warehouseServices.js` | `$select` now carries `U_TYPE`. |
| `pages/Production_Management/StoreDispatch.jsx` | Posts into transit; destination moved to `U_DESTINATIONWHS`. |
| `pages/Production_Management/ProductionReceive.jsx` | Rewritten as the receipt leg, driven by the ledger. |

---

## Store Dispatch — the first leg

The workflow the store follows is unchanged: pick the released production order, pick the
From Warehouse, and the BOM component lines fill in with their batch allocation. What changed
is where the stock lands.

**The "To Warehouse" field is gone.** In its place:

| Field | Posts to | Editable |
|---|---|---|
| From Warehouse | `FromWarehouse` + every line's `FromWarehouseCode` | yes |
| **Destination Warehouse** | **`U_DESTINATIONWHS`** | yes |
| In-Transit Warehouse | `ToWarehouse` + every line's `WarehouseCode` | **no** — resolved from `U_TYPE = 'IN'`, shown so it is never a surprise |

### Payload

```jsonc
POST /StockTransfers
{
  "FromWarehouse": "WHS1",
  "ToWarehouse":   "TRANSIT",          // ← ALWAYS the transit warehouse
  "JournalMemo":   "Dispatch to WHS2", // ≤ 50 chars
  "Comments":      "Store dispatch for WHS2 against production order 179",  // ≤ 254 chars
  "U_DESTINATIONWHS": "WHS2",           // ← who it is FOR
  "U_TRFTYPE": "D",
  "StockTransferLines": [
    { "LineNum": 0, "ItemCode": "FG-1001", "Quantity": 60,
      "FromWarehouseCode": "WHS1", "WarehouseCode": "TRANSIT",
      "BatchNumbers": [{ "BatchNumber": "B1", "Quantity": 60, "BaseLineNumber": 0 }] }
  ]
}
```

### Validations added (each keeps the modal open so the store's work survives)

- From Warehouse is required.
- Destination Warehouse is required.
- **Destination ≠ transit** — a note addressed to transit is addressed to nowhere: the receipt
  side groups by `U_DESTINATIONWHS`, so nothing could ever claim it.
- **Destination ≠ source** — nothing would move.
- **A transit warehouse must be known** (see *Graceful degradation*).

The existing batch check is untouched: on a batch-managed item the allocation must total the
Transfer Qty exactly, or SAP answers `[-4014] Cannot add row without complete selection of
batch/serial numbers`.

### Listing

Receipts are filtered out (they belong on Production Receive), and the grid gained a
**Destination** column — `ToWarehouse` is the transit warehouse on every row here, so it is
the destination that actually tells the rows apart. Legacy rows with no UDFs stay visible:
they are nobody's receipt.

---

## Production Receive — the second leg

Previously this page was a near-copy of Store Dispatch, posting a second unrelated transfer
against a production order. It is now the receipt side of the note.

1. **+ Receive From Transit** opens the pending-note picker straight away — nothing on the
   page means anything until a note is picked. Every row in the picker still owes its
   destination something; settled notes are already netted out.
2. Picking a note fills the header and loads **one row per batch** with the quantity still
   owed on it.
3. The store types what actually arrived, and any damaged quantity, then posts.

| Field | Source |
|---|---|
| From Warehouse (In-Transit) | the note's own `ToWarehouse`, falling back to `U_TYPE = 'IN'` — read-only |
| Receive Warehouse | defaults to the note's destination, but editable — a store may take delivery into another of its own warehouses |
| Addressed To (`U_DESTINATIONWHS`) | **the note**, never `ToWarehouse` — both sides of the ledger must group by the same key |

### One row per batch, not per item

A note line dispatched as three batches comes up as **three rows**, each with its own batch
number, so the store checks physical stickers off one for one instead of guessing which batch
a shortfall belongs to. Expected is pre-filled with what is **still owed**, with the original
shown underneath (`of 60`) so the smaller number does not read as a bug. The rows are folded
back into one document line per item when the receipt posts.

### Payload

```jsonc
POST /StockTransfers
{
  "FromWarehouse": "TRANSIT",          // ← out of transit
  "ToWarehouse":   "WHS2",             // ← into the destination
  "JournalMemo":   "Receipt against note 179",
  "Comments":      "Receipt against transfer note 179 · Received by … · Short by 10",
  "U_TRFBASE": "179",                  // ← the netting link: the note's DocEntry
  "U_TRFTYPE": "R",
  "U_DESTINATIONWHS": "WHS2",           // ← from the NOTE
  "StockTransferLines": [
    { "LineNum": 0, "ItemCode": "FG-1001", "Quantity": 50,
      "FromWarehouseCode": "TRANSIT", "WarehouseCode": "WHS2",
      "BatchNumbers": [{ "BatchNumber": "B1", "Quantity": 50, "BaseLineNumber": 0 }] }
  ]
}
```

### Partial receipts

Receive less than expected and the note **stays open**, the balance still held against that
destination in transit. The page says so before anything posts:

> *Expected 57 · Receiving 50 · **Short by 5** — that stays in TRANSIT against WHS2, and the
> note stays open so you can receive the rest later.*

### Damaged stock is *moved*, not just noted

A row with a damaged quantity posts a **second** transfer document, out of transit into the
warehouse tagged `U_TYPE = 'DM'` — one line moves into exactly one warehouse, so good and
damaged stock cannot ride together. It carries the **same `U_TRFBASE` and `U_DESTINATIONWHS`**,
or the ledger would offer those units to the store all over again.

The Damaged column is disabled outright when no warehouse is tagged `DM`.

### Post order, and what each failure means

```
1. POST receipt (good stock)  ── fails → nothing posted, error shown, form intact, STOP
2. POST damaged transfer      ── fails → receipt already posted; warn, leave the note OPEN
3. close the note             ── only when shortfall == 0 AND the damaged transfer succeeded
```

Once step 1 succeeds, nothing below it is reported as a failure of the transfer itself — that
stock has already moved. A failed close is logged, never surfaced: the receipt is valid either
way.

**Step 3 is the one everyone skips.** Every open note is re-read with all its lines on every
ledger request, so skipping it makes the ledger degrade steadily — and it hides well, because
the ledger drops settled notes and nothing looks broken until it is slow.

### Listing

Only receipts, with **Against Note**, **Received Into** and **Destination** columns, plus two
stat tiles read straight off the ledger: **Notes To Receive** and **Pending In Transit**.

**Edit is deliberately not offered.** A PATCH carrying `StockTransferLines` *replaces the
whole collection*, and the ledger would silently re-net around the edit. A posted receipt is
a movement that already happened — it is reversed in SAP with another document.

---

## How "whose stock is in transit?" gets answered

There is **one** transit warehouse, not one per destination, so SAP can say it holds 500 units
and cannot say whose 500 they are:

```
WHS1 ──300──▶ TRANSIT   (bound for WHS2)      TRANSIT holds 500…
WHS1 ──200──▶ TRANSIT   (bound for WHS3)      …but SAP can't say whose 500.
```

Show WHS2 the raw transit balance and it will receive 500 — including WHS3's 200. So:

```
pending(destination) = Σ dispatch lines addressed to it
                     − Σ receipt lines linked back to those dispatches
```

computed per note, per item, and per batch by `inTransitLedger.js`.

### Four things in that file that are load-bearing

1. **Fold lines by item code, never by line number.** A receipt renumbers its lines — short
   lines are dropped before posting — so line 2 of a receipt is not line 2 of its note.
2. **Round to 6 dp before every comparison.** `IsSettled` is an equality test in disguise;
   without rounding, `0.1 + 0.2 − 0.3` leaves `5.55e-17` pending forever and the note never
   settles.
3. **Clamp pending at zero.** An over-receipt is a data problem, not a licence to hand back a
   negative allocation.
4. **Read open documents only** — that filter is the only thing keeping the work bounded as
   history piles up, which is why step 3 above must actually run.

### Two SAP quirks that shaped the reads

- **No `$select` on the open-documents read.** The Service Layer only ships the nested
  `StockTransferLines` collection when the request does *not* narrow the fields. Add a
  `$select` and the quantities silently vanish. This is why the ledger is its own read rather
  than something derived from the listing the page already has.
- **Collection GETs never return nested `BatchNumbers`** — only a single-document GET does.
  So the ledger's quantities are right while its batch splits come back empty, which is fine
  for a pending overview and useless for a receipt screen that has to name the batch on every
  row. `getInTransitNoteDetail(docEntry)` re-nets **one** note from single-document GETs
  (the note plus however many receipts were posted against it — 0 or 1 in the normal case),
  using the very same `buildNote()` arithmetic. That is what gives the receipt rows a
  batch-accurate balance, and the cost is bounded to the note actually being opened.

---

## Why the ledger is never cached

Every other master here is persisted to a zustand store. The ledger is not, on purpose.

HO dispatches notes while a store has the receipt page open, and another till may have
received the same note a minute ago. **Acting on a cached ledger means receiving stock SAP has
already moved.** So `useInTransitHook` re-reads on every mount, and both pages re-read the
ledger *and* the transfer listing after any post — the ledger is netted from the very
documents that just changed.

One consequence, handled: the blocking overlay is driven off `loading` (first load only), not
`refreshing`, or it would strobe. A background re-read shows as a small *"⏳ Syncing the
in-transit ledger…"* instead.

---

## Graceful degradation

A `$select` naming a property the entity does not have fails the **entire** request. That
makes rolling this out ahead of the SAP setup genuinely dangerous — a missing UDF would empty
every warehouse dropdown in the app, not just these two pages. Both reads therefore retry
without the UDFs and log a warning:

| Missing | What happens |
|---|---|
| the three header UDFs | The transfer listing still loads; the Destination column is blank and the dispatch/receipt split stops filtering. |
| `U_TYPE` | Every warehouse loads and is treated as an ordinary destination. Transit and damaged resolve to nothing. |
| no warehouse tagged `IN` | Dispatch and receipt **refuse to post**, with: *Tag one warehouse with U_TYPE = "IN" in SAP (Warehouse master) and sync again.* |
| no warehouse tagged `DM` | The Damaged column is disabled; everything else works. |

> **One deliberate deviation from the skill.** It suggests a hardcoded constant as the transit
> fallback so a dispatch never posts into `undefined`. There is no correct constant for this
> company, and an invented warehouse code would be rejected by SAP with a message nobody can
> act on — so the pages **refuse to post** with an instruction instead. Same guarantee, better
> failure.

---

## Verified

Both checks run against the shipped code, not a copy of it.

**The netting** (`inTransitLedger.js`, exercised with plain objects):

- a note for WHS3 in the same transit warehouse is never offered to WHS2
- a note dispatched 100 / received 50 offers **10 of B1 + 40 of B2**, not the original 60 + 40
- a fully-received note is dropped from the ledger
- `0.1 + 0.2` settles against `0.3` instead of leaving float dust pending forever
- an over-receipt clamps to 0 rather than going negative
- a receipt whose lines were renumbered still nets against the right note lines

**The receipt payload** (`noteToLines` / `buildTransferLines`, extracted from the page):

- one row per batch; a settled note line is dropped
- Expected pre-fills with what is still owed
- rows fold back to one document line per item, with `BaseLineNumber` indexing **this**
  document
- a non-batch item omits `BatchNumbers` entirely (an *empty* array makes SAP complain about
  the batch setup instead)
- the damaged split is its own document, renumbered from 0
- a shortfall is reported so the note stays open

`npx eslint` is clean on every new and changed file (`StoreDispatch.jsx` keeps two pre-existing
unused-variable errors that back commented-out JSX), and `npx vite build` succeeds.

**Not verified against a live SAP instance** — the UDFs above have to exist first.

---

## Known gaps

- **Concurrent over-receipt.** Two tills receiving the same note at once can both pass client
  validation. Re-reading the ledger on every mount narrows the window to seconds; closing it
  needs the netting to run again *inside* the receipt POST and reject the write — which means
  moving the ledger behind a server endpoint.
- **Editing a dispatch note that already has receipts** is still offered on Store Dispatch,
  and a PATCH replaces the whole line collection, so it would re-net around the receipts
  already posted against it. Consider blocking Edit once `ReceiptCount > 0`.
- **No site scoping.** Any authenticated user sees every destination's pending notes. Locking
  the picker in the browser stops honest mistakes, not a crafted request.
- **The ledger runs in the browser**, because that is where this app's SAP access lives (the
  Node service is a pure OData passthrough). It costs 2–3 SAP round trips per read. Moving it
  to a `/api/intransit` endpoint would also be the natural place to fix the first two gaps.
