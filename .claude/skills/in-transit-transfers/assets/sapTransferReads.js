/**
 * sapTransferReads.js — THE TWO SAP READS THE LEDGER FEEDS ON
 * ---------------------------------------------------------------------------
 * Everything ERP-specific about the in-transit flow lives in this file. Swap it
 * and `inTransitLedger.js` ports unchanged.
 *
 * Assumes an L1 client exposing `getSapAll(path, { config })`, which follows
 * every `@odata.nextLink` and sends `Prefer: odata.maxpagesize=<n>` on EVERY
 * request (the header is per-request; nextLink pages fall back to 20 rows
 * without it, and you lose documents silently).
 * ---------------------------------------------------------------------------
 */
import { getSapAll } from "../core/sapClient.js";

/**
 * Every still-open transfer, WITH its StockTransferLines.
 *
 * Two decisions in four lines, both load-bearing:
 *
 * 1. NO $select. The Service Layer only ships the nested StockTransferLines
 *    collection when the request does not narrow the fields. Add a $select and
 *    the quantities vanish — which is why the ledger is its own endpoint rather
 *    than something the client derives from the listing it already has.
 *
 * 2. Open documents only. A closed note is settled by definition, so the work
 *    tracks the number of UNSETTLED notes instead of growing with history
 *    forever. This only holds if something actually closes settled notes —
 *    see the "close the note" step in SKILL.md.
 */
export async function getOpenTransferDocuments() {
    return await getSapAll("/StockTransfers", {
        config: {
            params: {
                $filter: "DocumentStatus eq 'bost_Open'",
                $orderby: "DocEntry desc", // also gives paging a stable sort
            },
        },
    });
}

// SAP rejects an over-long URL, and a $filter of ORs is the only way to ask for
// several notes at once — 40 keeps the query string well inside the limit.
const BASE_FILTER_CHUNK = 40;

/**
 * The receipts posted against a given set of dispatch notes, with their lines.
 *
 * @param {Array<number|string>} baseEntries DocEntry of each note of interest
 * @returns {Promise<Array<object>>} receipt documents, StockTransferLines included
 */
export async function getReceiptsForNotes(baseEntries) {
    const keys = [...new Set((baseEntries ?? []).map((entry) => String(entry).trim()))]
        // SECURITY, not tidiness: these values are interpolated into an OData
        // string literal. A value containing a quote would close the literal
        // early and let the caller append arbitrary filter syntax. These are
        // DocEntry numbers — anything else has no business being asked about.
        .filter((entry) => /^\d+$/.test(entry));
    if (keys.length === 0) return [];

    const chunks = [];
    for (let i = 0; i < keys.length; i += BASE_FILTER_CHUNK) {
        chunks.push(keys.slice(i, i + BASE_FILTER_CHUNK));
    }

    const pages = await Promise.all(
        chunks.map((chunk) =>
            getSapAll("/StockTransfers", {
                config: {
                    params: {
                        $filter: chunk.map((key) => `U_SISBASE eq '${key}'`).join(" or "),
                        $orderby: "DocEntry desc",
                    },
                },
            }),
        ),
    );
    return pages.flat();
}

/**
 * Wire-up. The ledger service takes its reads by injection:
 *
 *   import { getInTransitLedger } from "./inTransitLedger.js";
 *   import { getOpenTransferDocuments, getReceiptsForNotes } from "./sapTransferReads.js";
 *
 *   export const readLedger = () =>
 *       getInTransitLedger({
 *           readOpenDocuments: getOpenTransferDocuments,
 *           readReceiptsFor: getReceiptsForNotes,
 *       });
 */
