import { getSap, getSapAll, PostSap, PatchSap, DeleteSap } from "../auth/login.js";
import { buildNote, getInTransitLedger } from "./inTransitLedger.js";

/* ── In-transit header UDFs ──────────────────────────────────────
   Three header UDFs carry the whole in-transit flow, because a dispatch's real
   ToWarehouse is the shared transit warehouse — identical for every
   destination, so the document itself has to say who its stock is for.

     U_DESTINATIONWHS  destination warehouse code                 (dispatch + receipt)
     U_TRFBASE         DocEntry of the dispatch a receipt settles  (receipt only)
     U_TRFTYPE         'D' dispatch | 'R' receipt                  (both)

   These three names must match the UDFs in SAP CHARACTER FOR CHARACTER. A
   $select naming a property the entity does not have fails the ENTIRE request
   with "[-1000] Property 'X' of 'StockTransfer' is invalid" — so one typo here
   empties the whole listing and reads as a total outage, not as a missing
   column. Rename in SAP and here together, never one without the other. */
export const IN_TRANSIT_UDFS = ["U_DESTINATIONWHS", "U_TRFBASE", "U_TRFTYPE"];

// Header fields used by the listing table. Passed as the $select query param so
// SAP does not ship StockTransferLines for every row.
const BaseSelectFields =
    "DocEntry,DocNum,DocDate,DocumentStatus,CardCode,CardName,Series,FromWarehouse,ToWarehouse,Comments,U_GRPOTYPE";
    // "DocEntry,DocNum,DocDate,DocTotal,CardCode,CardName,Series,FromWarehouse,ToWarehouse,Comments,U_GRPOTYPE,U_SHIFT,StockTransferLines"
const SelectFields = `${BaseSelectFields},${IN_TRANSIT_UDFS.join(",")}`;

// Newest first, and $orderby also gives the Service Layer a stable sort to page
// against — without one, rows can repeat or go missing across pages.
const listConfig = (select) => ({
    config: { params: { $select: select, $orderby: "DocEntry desc" } },
});

//! Get all — follows every "@odata.nextLink" so all rows come back, not just 20.
export async function getAllStockTransfers() {
    try {
        return await getSapAll("/StockTransfers", listConfig(SelectFields));
    } catch (error) {
        // A $select naming a property the entity does not have fails the ENTIRE
        // request, so before the three UDFs exist in SAP this read would 400 and
        // the listing would come up empty. Fall back to the plain header fields
        // — the page then shows no destination, which is at least honest.
        console.warn(
            "Stock transfers: retrying the listing without the in-transit UDFs.",
            error?.message
        );
        try {
            return await getSapAll("/StockTransfers", listConfig(BaseSelectFields));
        } catch (retryError) {
            console.error("Error fetching stock transfers:", retryError);
            throw retryError;
        }
    }
}

//! Get by id — a single-entity GET returns the document itself (with
//! StockTransferLines). Only collection responses are wrapped in { value: [...] }.
export async function getStockTransferById(docEntry) {
    try {
        return await getSap(`/StockTransfers(${docEntry})`);
    } catch (error) {
        console.error(`Error fetching stock transfer ${docEntry}:`, error);
        throw error;
    }
}

//! Post API
export async function createStockTransfer(data) {
    try {
        return await PostSap("/StockTransfers", data);
    } catch (error) {
        console.error("Error creating stock transfer:", error);
        throw error;
    }
}

//! Patch/update api
export async function updateStockTransfer(docEntry, data) {
    try {
        // DocEntry is a NUMERIC key -> no quotes (unlike BusinessPartners' string CardCode).
        return await PatchSap(`/StockTransfers(${docEntry})`, data);
    } catch (error) {
        console.error(`Error updating stock transfer with ID ${docEntry}:`, error);
        throw error;
    }
}

//! Delete api — kept for future use.
export async function deleteStockTransfer(docEntry) {
    try {
        return await DeleteSap(`/StockTransfers(${docEntry})`);
    } catch (error) {
        console.error(`Error deleting stock transfer with ID ${docEntry}:`, error);
        throw error;
    }
}

/* ── In-transit ledger reads ─────────────────────────────────────
   Everything SAP-specific about the in-transit flow is these two reads. The
   netting itself lives in inTransitLedger.js and knows nothing about HTTP. */

//! Every still-open transfer, WITH its StockTransferLines.
//! NO $select here on purpose: the Service Layer only ships the nested
//! StockTransferLines collection when the request does not narrow the fields —
//! add a $select and every quantity silently vanishes. That single quirk is why
//! the ledger cannot be derived from the listing above.
//! Open documents only, so the work tracks the number of UNSETTLED notes rather
//! than growing with history — which only holds while closeStockTransfer() below
//! actually runs on the notes that settle.
export async function getOpenTransferDocuments() {
    try {
        return await getSapAll("/StockTransfers", {
            config: {
                params: {
                    $filter: "DocumentStatus eq 'bost_Open'",
                    $orderby: "DocEntry desc",
                },
            },
        });
    } catch (error) {
        console.error("Error fetching open stock transfers:", error);
        throw error;
    }
}

// SAP rejects an over-long URL and a $filter of ORs is the only way to ask for
// several notes at once — 40 keeps the query string well inside the limit.
const BASE_FILTER_CHUNK = 40;

//! The receipts posted against a given set of dispatch notes, with their lines.
export async function getReceiptsForNotes(baseEntries) {
    const keys = [...new Set((baseEntries ?? []).map((entry) => String(entry).trim()))]
        // SECURITY, not tidiness: these values are interpolated into an OData
        // string literal, so a value carrying a quote would close the literal
        // early and append arbitrary filter syntax. They are DocEntry numbers.
        .filter((entry) => /^\d+$/.test(entry));
    if (keys.length === 0) return [];

    const chunks = [];
    for (let i = 0; i < keys.length; i += BASE_FILTER_CHUNK) {
        chunks.push(keys.slice(i, i + BASE_FILTER_CHUNK));
    }

    try {
        const pages = await Promise.all(
            chunks.map((chunk) =>
                getSapAll("/StockTransfers", {
                    config: {
                        params: {
                            $filter: chunk.map((key) => `U_TRFBASE eq '${key}'`).join(" or "),
                            $orderby: "DocEntry desc",
                        },
                    },
                })
            )
        );
        return pages.flat();
    } catch (error) {
        console.error("Error fetching receipts for dispatch notes:", error);
        throw error;
    }
}

//! The ledger: how much of the transit warehouse belongs to each destination,
//! and against which dispatch note. Nothing is cached in SAP or here — the
//! documents ARE the ledger and this just does the subtraction, so the portal
//! can never disagree with SAP.
export async function readInTransitLedger() {
    return getInTransitLedger({
        readOpenDocuments: getOpenTransferDocuments,
        readReceiptsFor: getReceiptsForNotes,
    });
}

//! Close a fully-received note so it drops out of getOpenTransferDocuments().
//! This is the step that keeps the ledger bounded, and it hides well when
//! skipped: the ledger drops settled notes anyway, so nothing looks broken
//! until every ledger read is re-reading years of notes.
//! Returns 204 No Content — there is no body to parse.
export async function closeStockTransfer(docEntry) {
    try {
        return await PostSap(`/StockTransfers(${docEntry})/Close`);
    } catch (error) {
        console.error(`Error closing stock transfer ${docEntry}:`, error);
        throw error;
    }
}

//! ONE dispatch note, netted at BATCH level.
//!
//! The ledger above is built from collection reads, and a collection GET never
//! ships the nested BatchNumbers — only a single-document GET does. So the
//! ledger's quantities are right while its batch splits are empty, which is
//! fine for a pending overview and useless for a receipt screen that has to
//! name the batch on every row.
//!
//! This re-nets ONE note from single-document GETs, using the very same
//! arithmetic, so the receipt screen gets batch-accurate pending. The cost is
//! bounded — one note plus however many receipts were posted against it (0 or
//! 1 in the normal case), and only when a note is actually opened.
export async function getInTransitNoteDetail(docEntry) {
    const note = await getStockTransferById(docEntry);

    // The collection read is only used for the DocEntry list; each receipt is
    // then re-read on its own so its BatchNumbers come with it.
    const receiptHeads = await getReceiptsForNotes([docEntry]);
    const receipts = await Promise.all(
        receiptHeads.map((receipt) => getStockTransferById(receipt.DocEntry))
    );

    return buildNote(note, receipts);
}
