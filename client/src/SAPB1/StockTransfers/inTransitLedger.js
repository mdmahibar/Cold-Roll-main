/**
 * inTransitLedger.js — WHOSE STOCK IS IN THE TRANSIT WAREHOUSE?
 * ---------------------------------------------------------------------------
 * One shared transit warehouse holds every destination's goods at once, so the
 * balance the ERP reports there is useless on its own:
 *
 *   WHS1 --300--> TRANSIT  (for WHS2)     TRANSIT holds 500 ...
 *   WHS1 --200--> TRANSIT  (for WHS3)     ... but the ERP cannot say whose 500.
 *
 * This file answers it by netting the documents against each other:
 *
 *   pending(destination) = SUM of dispatch lines addressed to it
 *                        - SUM of receipt lines linked back to those dispatches
 *
 * Pure arithmetic: no HTTP, no framework, no ERP import. Feed it documents, get
 * a ledger back. That is what makes it unit-testable with plain objects and
 * portable to any backend.
 * ---------------------------------------------------------------------------
 */

/** Quantities are decimal; keep float dust out of an "is it settled?" test. */
const round = (value) => Math.round((Number(value) || 0) * 1e6) / 1e6;
const text = (value) => String(value ?? "").trim();

/**
 * THE ONLY PART THAT KNOWS YOUR DOCUMENT SHAPE.
 * Re-point these accessors and nothing else in the file needs an edit.
 * The defaults are SAP B1 `StockTransfers` plus the three header UDFs.
 */
export const fields = {
    id: (doc) => doc?.DocEntry, // immutable internal id — what a receipt links to
    number: (doc) => doc?.DocNum, // human-facing number — display only
    date: (doc) => doc?.DocDate,
    source: (doc) => doc?.FromWarehouse,
    transit: (doc) => doc?.ToWarehouse, // a dispatch always lands in transit
    comments: (doc) => doc?.Comments ?? "",

    destination: (doc) => text(doc?.U_DESTINATIONWHS), // who the stock is FOR
    base: (doc) => text(doc?.U_TRFBASE), // which dispatch a receipt settles
    kind: (doc) => text(doc?.U_TRFTYPE).toUpperCase(), // 'D' dispatch | 'R' receipt

    lines: (doc) => doc?.StockTransferLines ?? [],
    lineItem: (line) => text(line?.ItemCode),
    lineDesc: (line) => text(line?.ItemDescription),
    lineQty: (line) => Number(line?.Quantity) || 0,
    lineBatches: (line) => line?.BatchNumbers ?? [],
    batchNumber: (batch) => text(batch?.BatchNumber),
    batchQty: (batch) => Number(batch?.Quantity) || 0,
};

/**
 * A receipt carries the dispatch it settles. The type marker is the explicit
 * answer, but the link field alone is enough — either one answering counts as a
 * receipt, so documents posted before the marker existed still net correctly.
 */
export const isReceiptDoc = (doc, f = fields) => f.kind(doc) === "R" || f.base(doc) !== "";

/**
 * A dispatch that went through the transit warehouse. The destination field is
 * what makes it one: a legacy direct WHS1 -> WHS2 transfer never parked stock
 * in transit, so it has no place in this ledger.
 */
export const isDispatchNote = (doc, f = fields) =>
    !isReceiptDoc(doc, f) && f.destination(doc) !== "";

/**
 * Fold a document's lines into `itemCode -> { qty, batches }`.
 *
 * Keyed by ITEM CODE, never by line number: a receipt renumbers its lines
 * (short lines are dropped before posting), so line 2 of a receipt is not line 2
 * of the note it settles. The item code is the only stable join between them.
 */
export function foldLines(doc, into = new Map(), f = fields) {
    for (const line of f.lines(doc)) {
        const itemCode = f.lineItem(line);
        if (!itemCode) continue;

        const entry = into.get(itemCode) ?? {
            ItemCode: itemCode,
            ItemDescription: f.lineDesc(line),
            Quantity: 0,
            Batches: new Map(),
        };

        entry.Quantity = round(entry.Quantity + f.lineQty(line));
        if (!entry.ItemDescription) entry.ItemDescription = f.lineDesc(line);

        for (const batch of f.lineBatches(line)) {
            const batchNumber = f.batchNumber(batch);
            if (!batchNumber) continue;
            entry.Batches.set(
                batchNumber,
                round((entry.Batches.get(batchNumber) ?? 0) + f.batchQty(batch)),
            );
        }

        into.set(itemCode, entry);
    }
    return into;
}

/**
 * One dispatch note netted against every receipt posted against it.
 *
 * @param {object} note            the dispatch document, with its lines
 * @param {Array<object>} receipts receipts whose link field points at this note
 */
export function buildNote(note, receipts, f = fields) {
    const dispatched = foldLines(note, new Map(), f);
    const received = (receipts ?? []).reduce(
        (acc, receipt) => foldLines(receipt, acc, f),
        new Map(),
    );

    const lines = [...dispatched.values()].map((line) => {
        const got = received.get(line.ItemCode);
        const receivedQty = got?.Quantity ?? 0;

        // Batch-level netting is what the receipt screen's batch picker needs: a
        // note of A x 60 + B x 40 already receipted as A x 50 has A x 10 + B x 40
        // left, and offering the full allocation again asks the ERP for stock
        // that is no longer sitting in the transit warehouse.
        const batches = [...line.Batches.entries()]
            .map(([BatchNumber, dispatchedQty]) => {
                const receivedBatchQty = got?.Batches.get(BatchNumber) ?? 0;
                return {
                    BatchNumber,
                    Dispatched: dispatchedQty,
                    Received: receivedBatchQty,
                    // Never negative: an over-receipt is a data problem, not a
                    // licence to hand back a nonsense allocation.
                    Pending: round(Math.max(dispatchedQty - receivedBatchQty, 0)),
                };
            })
            .filter((batch) => batch.Pending > 0);

        return {
            ItemCode: line.ItemCode,
            ItemDescription: line.ItemDescription,
            Dispatched: line.Quantity,
            Received: round(receivedQty),
            Pending: round(Math.max(line.Quantity - receivedQty, 0)),
            Batches: batches,
        };
    });

    const totals = lines.reduce(
        (acc, line) => ({
            Dispatched: round(acc.Dispatched + line.Dispatched),
            Received: round(acc.Received + line.Received),
            Pending: round(acc.Pending + line.Pending),
        }),
        { Dispatched: 0, Received: 0, Pending: 0 },
    );

    return {
        DocEntry: f.id(note),
        DocNum: f.number(note),
        DocDate: f.date(note),
        FromWarehouse: f.source(note),
        TransitWarehouse: f.transit(note),
        Store: f.destination(note),
        Comments: f.comments(note),
        ReceiptCount: (receipts ?? []).length,
        ...totals,
        IsSettled: totals.Pending <= 0,
        Lines: lines,
    };
}

/**
 * The netting itself — PURE. Give it documents, get the ledger.
 *
 * @param {Array<object>} openDocuments open transfer documents, WITH their lines
 * @param {Array<object>} receiptDocs   receipts linked back to those documents
 */
export function buildLedger(openDocuments, receiptDocs, f = fields) {
    const notes = (openDocuments ?? []).filter((doc) => isDispatchNote(doc, f));
    if (notes.length === 0) return { byStore: [], notes: [], totalPending: 0 };

    const receiptsByBase = new Map();
    for (const receipt of receiptDocs ?? []) {
        const base = f.base(receipt);
        if (!base) continue;
        receiptsByBase.set(base, [...(receiptsByBase.get(base) ?? []), receipt]);
    }

    const built = notes
        .map((note) => buildNote(note, receiptsByBase.get(String(f.id(note))) ?? [], f))
        // A settled note that was never closed (the ERP refused it, or the close
        // call failed after the receipt posted) contributes nothing and would
        // only clutter the destination's pending list.
        .filter((note) => !note.IsSettled);

    const stores = new Map();
    for (const note of built) {
        const entry = stores.get(note.Store) ?? {
            Store: note.Store,
            Notes: 0,
            Dispatched: 0,
            Received: 0,
            Pending: 0,
        };
        entry.Notes += 1;
        entry.Dispatched = round(entry.Dispatched + note.Dispatched);
        entry.Received = round(entry.Received + note.Received);
        entry.Pending = round(entry.Pending + note.Pending);
        stores.set(note.Store, entry);
    }

    return {
        byStore: [...stores.values()].sort((a, b) => b.Pending - a.Pending),
        notes: built,
        totalPending: round(built.reduce((total, note) => total + note.Pending, 0)),
    };
}

/**
 * What the controller calls. The reads are injected, so this file stays free of
 * any ERP or HTTP dependency.
 *
 * @param {{readOpenDocuments: Function, readReceiptsFor: Function}} reads
 */
export async function getInTransitLedger({ readOpenDocuments, readReceiptsFor }, f = fields) {
    const open = await readOpenDocuments();

    const notes = open.filter((doc) => isDispatchNote(doc, f));
    if (notes.length === 0) return { byStore: [], notes: [], totalPending: 0 };

    const receipts = await readReceiptsFor(notes.map((note) => f.id(note)));
    return buildLedger(open, receipts, f);
}
