# Production Issue & Receipt — two pages, two SAP documents

Two halves of the production cycle, one page each:

| Page | Posts | What moves |
|---|---|---|
| `ProductionIssue.jsx` | `POST /InventoryGenExits` | components **leave** stock into WIP |
| `ProductionReceipt.jsx` | `POST /InventoryGenEntries` | the finished good **arrives** out of WIP |

They are raised against the same production order and read the same three header quantities,
but each screen does one thing: the issue picks components and batches, the receipt books one
finished good. §1-§6 below describe the SAP mechanics both pages share; §7 says which file
holds what.

```
                    ┌─────────────────────────────────────────┐
                    │        PRODUCTION ORDER (oProductionOrder)
                    │        AbsoluteEntry = the identity      │
                    │        PlannedQuantity   100             │
                    │        CompletedQuantity  40  ◀──┐       │
                    │        ProductionOrderLines:     │       │
                    │          [0] COW MILK    Base 1.507      │
                    │          [1] WHITE BUTTER Base 1.0       │
                    │              IssuedQuantity  ◀──┐│       │
                    └─────────────────────────────────┼┼───────┘
                                                      ││
   components                                         ││            finished good
   leave stock                                        ││            enters stock
        │                                             ││                  │
        ▼                                             ││                  ▼
┌───────────────────────┐                             ││   ┌───────────────────────┐
│ ISSUE FOR PRODUCTION  │─── raises IssuedQuantity ───┘│   │ RECEIPT FROM PRODUCTION│
│ /InventoryGenExits    │                              └───│ /InventoryGenEntries   │
│ oInventoryGenExit  60 │      raises CompletedQuantity    │ oInventoryGenEntry  59 │
│ BaseType 202          │                                  │ BaseType 202           │
│ BaseEntry = AbsEntry  │                                  │ BaseEntry = AbsEntry   │
│ BaseLine  = LineNumber│  ← per COMPONENT                 │ (no BaseLine)          │
└───────────────────────┘                                  └───────────────────────┘
```

Where this sits in the wider flow:

```
Production Order ──▶ Store Dispatch ──▶ Production Receive ──▶ **Production Issue** ──▶ **Production Receipt**
   (plan)              (WHS → TRANSIT)     (TRANSIT → WHS)        (stock → WIP)          (WIP → finished good)
```

Store Dispatch and Production Receive *move* the components to where production can reach
them (see `IN-TRANSIT-FLOW.md`). This page is what actually **consumes** them and **produces**
the output.

---

## 1. The base reference is the whole point

Both documents can be posted with nothing but an `ItemCode`, a `Quantity` and a
`WarehouseCode`. SAP accepts them. Stock moves. **And the production order is never
touched** — it stays open forever, `IssuedQuantity` stays 0, `CompletedQuantity` stays 0,
and nobody notices until month-end.

What turns a plain inventory movement into a *production* posting is the base reference on
every `DocumentLine`:

| Field | Value | Why |
|---|---|---|
| `BaseType` | `202` | SAP's object type for a Production Order |
| `BaseEntry` | the order's **`AbsoluteEntry`** | the immutable internal id — never `DocumentNumber`, which is for humans and repeats across series |
| `BaseLine` | **issue only** — the `ProductionOrderLine.LineNumber` | which component this line consumes |

### Why the receipt has NO `BaseLine`

`ProductionOrderLines` holds the **components**, not the product. The finished good lives on
the order *header* (`ItemNo`). So on a receipt there is nothing for `BaseLine` to point at —
`BaseEntry` alone means "the product of this order". Sending `BaseLine: 0` on a receipt aims
it at the **first component** and SAP will either reject it or receive the wrong item.

### Why `BaseLine` is never the array index

```js
// ✅ the production order line's OWN LineNumber
BaseLine: line.lineNumber

// ❌ collapses as soon as a backflush or zero-qty row is filtered out,
//    and then stock is issued against the wrong component
BaseLine: index
```

The page filters out backflush rows and rows with no quantity before building the payload. If
`BaseLine` came from the surviving array's index, dropping component `[0]` would make
component `[1]` post as `BaseLine: 0`. `makeEmptyLine()` therefore carries `lineNumber`
straight from `ProductionOrderLine.LineNumber` and never renumbers it.

---

## 2. The three header quantities

Straight off the production order — the page computes only the third one.

| Shown as | SAP field | Means |
|---|---|---|
| **Planned Qty** | `ProductionOrder.PlannedQuantity` | what the order asked for |
| **Produced Qty** | `ProductionOrder.CompletedQuantity` | what receipts have already booked |
| **Pending Qty** | *derived* | what is still to make |

```
Pending = Planned − Produced − Rejected
```

`RejectedQuantity` is subtracted because those units were made and scrapped — the order will
never produce them again, so they are not pending.

The user types **one** number, `Qty To Produce Now` (labelled *Qty To Receive Now* on a
receipt). It defaults to the whole pending quantity, so "finish the order" is one click.

---

## 3. The row-level explosion

Every component row is **derived** from that one number. Nothing on the grid is hand-typed
except an override.

```
row Required = ProductionOrderLine.BaseQuantity × Qty To Produce Now
row Open     = ProductionOrderLine.PlannedQuantity − ProductionOrderLine.IssuedQuantity
```

`BaseQuantity` is the BOM ratio — **component needed for ONE unit of product**. It is exactly
what SAP itself multiplied by the order quantity when it built `PlannedQuantity` on each line.
Re-using it here is what keeps a partial issue proportional instead of guessing.

### Worked example

Production order: **100 KG** of the finished product.

| | BaseQuantity | line PlannedQuantity | already IssuedQuantity |
|---|---|---|---|
| `1000003` COW MILK | 1.507 | 150.70 | 90.42 |
| `1000026` WHITE BUTTER | 1.000 | 100.00 | 60.00 |

40 KG already produced, so **Pending = 60**. The store issues for the next **40 KG**:

| | Required = Base × 40 | Open = Planned − Issued | Issue Qty (default) |
|---|---|---|---|
| COW MILK | 1.507 × 40 = **60.28** | 150.70 − 90.42 = 60.28 | 60.28 |
| WHITE BUTTER | 1.000 × 40 = **40.00** | 100.00 − 60.00 = 40.00 | 40.00 |

Required and Open agree here because issues have kept pace with production. When they
*disagree*, both columns are on screen and the difference is the story — a short issue, an
over-issue, or a scrap booked against the order.

---

## 4. Backflush components are never issued by hand

`ProductionOrderLine.ProductionOrderIssueType` decides who consumes the component:

| Value | Who consumes it | On this page |
|---|---|---|
| `im_Manual` | this Issue document | editable row |
| `im_Backflush` | **SAP, automatically, when the receipt posts** | row shown, greyed, tagged *"Backflush — consumed by the receipt"*, excluded from the payload |

Issuing a backflush component by hand consumes the same stock **twice**: once from the issue,
once again when the receipt backflushes it. SAP will not stop you. The rows are shown rather
than hidden so nothing looks missing from the BOM.

---

## 5. Batches - the two directions are NOT the same problem

Both documents answer

```
-4014  Cannot add row without complete selection of batch/serial numbers
```

when a batch-managed item arrives without a complete `BatchNumbers` collection. But the fix is
different on each side, because **stock is moving the opposite way**.

| | Stock direction | Do the batches exist? | What the page does |
|---|---|---|---|
| **Issue** | leaves the warehouse | **yes** - they are sitting there | allocates them **FIFO**, oldest `InDate` first |
| **Receipt** | arrives in the warehouse | **no** - this document creates one | asks for a batch **number**, defaulted to the production order number |

FIFO on a receipt is meaningless: there is nothing to consume. That is why the receipt has a
**Batch No** field instead of a picker.

### Issue - FIFO allocation

Identical to `StoreDispatch.jsx`, and reading from the same source:

```
getWarehouseWiseBatchOfItem(itemCode, warehouseCode, cookies)
   -> [{ BatchNum, Quantity, InDate }]  already sorted oldest-first
allocateBatches(stock, quantity)
   -> [{ BatchNumber, Quantity }]  taking from each batch until the quantity is covered
```

**Quantity and allocation are one control, and there is nothing to click.** Anything that
changes a row's quantity re-spreads its batches in the same update - `changeQuantityNow()` for
the whole grid, `updateIssueQuantity()` for one row. The **Batch** column is read-only: it
shows the split the allocation landed on, and turns red when it falls short of the quantity.

No batch popup. Store Dispatch keeps its `BatchPicker` trigger column commented out and lets
FIFO decide silently; this page does the same, minus the dead code.

One difference from Store Dispatch worth knowing: Store Dispatch issues everything out of a
single header **From Warehouse**, so its batch cache is keyed by item alone. Here **every
component line carries its own warehouse**, so the cache is keyed by the *pair*:

```js
batchKey(itemNo, warehouseCode)     // JSON.stringify([itemNo, warehouseCode])
batchPairKey                        // "ITEM@@WHS|ITEM@@WHS" - what the fetch effect watches
```

A batch number only means something in one warehouse, so changing a row's warehouse **clears**
that row's allocation (`updateLineWarehouse`) and the effect refetches and re-allocates.

Allocation deliberately **falls short** rather than capping the quantity: asking for 100 when
the warehouse holds 60 allocates 60 and leaves the row flagged, so the save check can name the
difference instead of silently changing what the user typed.

```
Not enough batch stock for 1000003 in 19WB0001 - 60 of 100 allocated. Check the batch button on that line.
```

### Receipt - the batch this document creates

`receiptBatch` defaults to the **production order number**, so every receipt against one order
lands in the same batch (SAP adds to an existing batch rather than erroring). It is editable
before posting, and required when the product is batch managed.

### The trap: the cached item master cannot answer for a finished good

`ManageBatchNumbers` is what decides whether a line gets a `BatchNumbers` collection at all.
The obvious place to read it is the cached item master - and that is wrong here:

```js
// SAPB1/Utils/itemMaster.js
`/Items?$select=...&$filter=PurchaseItem eq 'tYES'`
```

**The cache holds purchase items only.** A finished good produced in-house is not purchased, so
it is not in the list. `itemByCode.get(productCode)` returns `undefined`, and

```js
undefined?.ManageBatchNumbers === 'tYES'   // false
```

reads as *"not batch managed"*. The Batch No field never renders, `BatchNumbers` is never sent,
and SAP answers **-4014** - for an item that is very much batch managed. The same hole swallows
any semi-finished component that is produced rather than bought.

So **both** pages resolve the flag from **two** sources, through the shared
`useItemMasterInfoHook`:

```js
itemMasterOf(itemNo) = itemByCode.get(itemNo) ?? itemInfo[itemNo]
```

`itemInfo` is filled by `getItemMasterInfo(itemCode)` (`SAPB1/Items/ItemServices.js`), a
single-item read fired for every code on the document the cache cannot answer for. A failed
read caches `{}` so the effect cannot loop, and the unresolved key shrinks to `''` once
everything is resolved, which is what stops it re-firing on its own result.

It lives in `hooks/useItemMasterInfoHook.js` rather than in either page: it is the one piece of
logic both screens depend on for correctness, and two copies of it would drift.

On the issue page, resolution feeds straight back into the FIFO read - `batchPairKey` watches
the resolved flags too, so a component that turns out to be batch managed gets its warehouse
stock fetched and allocated the moment the flag lands.

---

## 6. The payloads

### Issue for Production — `POST /InventoryGenExits`

```jsonc
{
  "DocDate": "2026-08-21",
  "JournalMemo": "Issue for PO 100015",          // ≤ 50 chars, SAP rejects longer
  "Comments": "Issue for production order 100015 · FG-001",   // ≤ 254 chars
  "DocumentLines": [
    {
      "BaseType": 202,
      "BaseEntry": 12,        // ProductionOrder.AbsoluteEntry
      "BaseLine": 0,          // ProductionOrderLines[0].LineNumber
      "Quantity": 60.28,
      "WarehouseCode": "19WB0001",
      "BatchNumbers": [       // FIFO - omitted entirely if not batch managed
        { "BatchNumber": "B-2026-07-30", "Quantity": 42.00, "BaseLineNumber": 0 },
        { "BatchNumber": "B-2026-08-04", "Quantity": 18.28, "BaseLineNumber": 0 }
      ]
    },
    {
      "BaseType": 202,
      "BaseEntry": 12,
      "BaseLine": 1,
      "Quantity": 40,
      "WarehouseCode": "19WB0001"
    }
  ]
}
```

> `BaseLineNumber` inside `BatchNumbers` is the index of the line **within this payload** - not
> the production order's `LineNumber` and not the row's position on screen. Zero-quantity and
> backflush rows are dropped first, so the two no longer line up. Omit it and SAP files every
> batch against line 0.

`ItemCode` is **not** sent — SAP resolves it from `BaseEntry` + `BaseLine`. `WarehouseCode` is
sent because it is a legitimate override of the component's own warehouse; leave it out and
SAP uses the production order line's warehouse.

### Receipt from Production — `POST /InventoryGenEntries`

```jsonc
{
  "DocDate": "2026-08-21",
  "JournalMemo": "Receipt from PO 100015",
  "Comments": "Receipt from production order 100015 · FG-001",
  "DocumentLines": [
    {
      "BaseType": 202,
      "BaseEntry": 12,
      "Quantity": 40,             // NO BaseLine — see §1
      "WarehouseCode": "19WB0001",
      "BatchNumbers": [           // the batch this document CREATES
        { "BatchNumber": "100015", "Quantity": 40, "BaseLineNumber": 0 }
      ]
    }
  ]
}
```

### What SAP does with them

| Post | SAP updates |
|---|---|
| Issue | `ProductionOrderLines[BaseLine].IssuedQuantity` += Quantity · component stock ↓ · WIP account ↑ |
| Receipt | `ProductionOrder.CompletedQuantity` += Quantity · finished-good stock ↑ · WIP account ↓ · **any `im_Backflush` component is consumed now** |

Both write `DocumentStatus: "bost_Open"` on themselves — that is the *document's* status, not
the order's, and it is normal.

---

## 7. Page anatomy

### Shared by both pages

| Concern | Where |
|---|---|
| The base reference constant | `PRODUCTION_ORDER_OBJECT = 202` (declared in each page) |
| Pending Qty | `pendingQuantity` (useMemo over the three header quantities) |
| Batch / serial flags, cache **+** on-demand | `hooks/useItemMasterInfoHook.js` -> `isBatchManaged`, `isSerialManaged` |
| The single-item read behind it | `getItemMasterInfo()` in `SAPB1/Items/ItemServices.js` |
| Released-order picker | `openOrderPicker()` -> `getAllProductionOrders()` filtered to `boposReleased`. Opened by the search button next to *Production Order*, never on its own |
| Order -> form | `applyProductionOrder(headers)` |
| Posted document -> form | `applyPostedDocument(headers)` |
| Payload build + post | `handleSave()` |

Only `useItemMasterInfoHook` is literally shared. The small helpers (`getTodayDate`, `compact`,
`round6`, `clip`, …) are declared in each page, matching how `StoreDispatch.jsx` and
`ProductionReceive.jsx` already do it in this folder.

### ProductionIssue.jsx only

| Concern | Where |
|---|---|
| Row explosion | `requiredQuantity(line, quantityNow)` |
| Row open balance | `openQuantity(line)` |
| Backflush test | `isBackflush(line)` |
| One number re-explodes + re-allocates the grid | `changeQuantityNow()` |
| Batch cache key (item **+** warehouse) | `batchKey(itemNo, warehouseCode)` |
| What the batch fetch watches | `batchPairKey` |
| FIFO split | `allocateBatches(stock, quantity)` |
| Qty -> batches (the only direction) | `changeQuantityNow()`, `updateIssueQuantity()` |
| Warehouse change clears the split | `updateLineWarehouse()` |

### ProductionReceipt.jsx only

| Concern | Where |
|---|---|
| The batch this document creates | `form.receiptBatch`, defaulted to the order number |
| Whether the Batch No field shows at all | `productIsBatchManaged` |
| The single line, with no `BaseLine` | built inline in `handleSave()` |

There is no line-state array on a new receipt: the finished good **is** the header, so the one
row on screen renders straight from `form`. `lines` is used only to show a posted document.

### One listing per page

`InventoryGenExits` and `InventoryGenEntries` are separate stores with separate `DocEntry`
sequences - **DocEntry 5 exists in both**. Each page lists exactly one of them and keys rows on
`DocEntry`, so the collision that a merged table has to work around never arises. Each page's
`SAP B1 Sync` refreshes only its own store.

### Posted documents are viewed, never edited

Both objects are stock movements that have already happened. SAP reverses them with a
cancellation document; it does not accept a `PATCH` once inventory has moved. So both pages
offer **View** only — no `onEdit` — and `handleDelete` says so out loud.

---

## 8. What is validated, and what is deliberately not

**Blocked** (the save returns `false`, the modal stays open, nothing is lost):

- no production order picked
- receipt: quantity ≤ 0, or no Receipt Warehouse
- issue: no line with a quantity, or a line with no warehouse
- issue: a batch-managed line whose allocation does not cover its quantity **exactly** - this is
  the -4014 check, made before the request ever leaves the browser
- receipt: a batch-managed product with no Batch No

**Flagged but allowed** — because SAP itself allows them, and a portal that is stricter than
the ERP just teaches people to work around it:

- **over-issue** — issuing more than a component's Open quantity. The figure turns red, the
  Open column shows why, and a toast names the lines at save time. Genuine on a rework or a
  spillage.
- **over-receipt** — receiving more than Pending. Same treatment. Genuine when a batch yields
  more than planned.

---

## 9. Known limitations

- **Serial-managed items are refused, not handled.** Batches are done (see §5), but an item
  managed by *serial* number needs a `SerialNumbers` collection that no page in this repo
  builds. Both save paths check `ManageSerialNumbers` and stop with a plain message rather than
  letting SAP answer with the same cryptic `-4014`.
- **The receipt does not set batch attributes.** It creates the batch with a number only - no
  expiry date, manufacturing date, or admission date. Those are `BatchNumbers` properties
  (`ExpiryDate`, `ManufacturingDate`, ...) and go on the one line the receipt builds.
- **One extra round trip per unknown item.** Resolving `ManageBatchNumbers` for an item the
  cached master cannot answer for costs a single-item GET (§5). It is cached for the session,
  including the misses. Widening the item-master `$filter` would remove it, but that cache is
  persisted to localStorage and the `$select` list is kept tight on purpose.
- **No document series is chosen.** SAP applies the default series for each object (115 for
  exits, 114 for entries in the sample company). Pass `Series` on the payload if a specific one
  is ever needed.
- **The production order store is not refreshed after a post.** `IssuedQuantity` and
  `CompletedQuantity` have changed in SAP, but the cached order list has not. The order picker
  re-fetches from SAP on every open (`getAllProductionOrders`), so this page is always correct;
  the *Production Order* page needs its own `SAP B1 Sync` to catch up.
- **Only released orders can be picked.** A planned order cannot consume or produce — release
  it on the Production Order page first.

---

## 10. Troubleshooting

| SAP says | Cause |
|---|---|
| `-5002 No matching records found (ODBC -2028)` | `BaseEntry` is not a real `AbsoluteEntry`, or `BaseLine` names a line the order does not have |
| `-4014 Cannot add row without complete selection of batch/serial numbers` | **issue**: the FIFO allocation did not cover the quantity - the warehouse is short, or that row's warehouse holds no batches of the item. **receipt**: no Batch No on a batch-managed product. The page checks both before posting, so seeing this *from SAP* means the flag was read as false - the item master top-up in §5 is what fixes that |
| `-10 Item is not defined as an inventory item` | the component or product is a non-inventory item; it cannot move stock |
| `Quantity falls into negative inventory` | the issue warehouse does not hold enough — the components were probably never received out of transit |
| Document posts but the order does not move | `BaseType` / `BaseEntry` were dropped from the payload — see §1 |
| Receipt books the wrong item | a `BaseLine` was sent on the receipt — see §1 |
