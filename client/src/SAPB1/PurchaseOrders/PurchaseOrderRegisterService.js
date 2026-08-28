import { getSap, getSapAll, PostSap, PatchSap } from "../auth/login";
import { useQuery } from "@tanstack/react-query";

// Fields returned by the list query. Passed as the $select query param.
// NOTE: Do NOT include DocumentLines here — it's a navigation property and
// causes 502 Bad Gateway on the collection endpoint. DocumentLines are fetched
// per-document via getPurchaseOrderById() when the user opens View/Edit.
const SelectFields = "DocEntry,DocNum,DocDate,CardCode,CardName,DocTotal,DocumentStatus,U_DIVISION,U_LOCATION";
// Newest first, and $orderby also gives the Service Layer a stable sort to page
// against — without one, rows can repeat or go missing across pages.
const listConfig = {
    config: { params: { $select: SelectFields, $orderby: "DocEntry desc" } },
};

// Plain async service function — no hooks, callable from anywhere.
// Returns every purchase order, following the Service Layer's paging links.
export async function getAllPurchaseOrders() {
    try {
        return await getSapAll("/PurchaseOrders", listConfig);
    } catch (error) {
        console.error("Error fetching purchase orders:", error);
        throw error;
    }
}

// Custom hook — the valid place to call useQuery. Components call this.
export function usePurchaseOrders() {
    return useQuery({
        queryKey: ["purchaseOrdersData"],
        queryFn: getAllPurchaseOrders,
        staleTime: 0
    });
}

// Plain async service function — fetches a single purchase order by its DocEntry key.
export async function getPurchaseOrderById(docEntry) {
    try {
        const res = await getSap(`/PurchaseOrders(${docEntry})`);
        return res;
    } catch (error) {
        console.error(`Error fetching purchase order ${docEntry}:`, error);
        throw error;
    }
}

// Custom hook — fetches a single purchase order. `enabled` guards against a missing id.
export function usePurchaseOrder(docEntry) {
    return useQuery({
        queryKey: ["purchaseOrdersData", docEntry],
        queryFn: () => getPurchaseOrderById(docEntry),
        enabled: docEntry != null,
        staleTime: 0
    });
}

//! Post API
export async function createPurchaseOrder(data) {
    try {
        return await PostSap("/PurchaseOrders", data);
    } catch (error) {
        console.error("Error creating Purchase Order:", error);
        throw error;
    }
}

//! Patch/update api
export async function updatePurchaseOrder(id, data) {
    try {
        // DocEntry is a NUMERIC key -> no quotes (unlike BusinessPartners' string CardCode).
        return await PatchSap(`/PurchaseOrders(${id})`, data);
    } catch (error) {
        console.error(`Error updating Purchase Order with ID ${id}:`, error);
        throw error;
    }
}

/**
 * Fetch open Purchase Orders for a specific supplier (CardCode).
 * Used by the GRPO page's "Copy From Purchase Order" flow.
 * Returns the full document including DocumentLines so the user can pick
 * which PO lines to copy into the GRPO.
 */
export async function getPendingPurchaseOrdersForGRPO(cardCode) {
    try {
        const res = await getSapAll(
            `/PurchaseOrders?$filter=CardCode eq '${cardCode}' and DocumentStatus eq 'bost_Open'`
        );
        return Array.isArray(res) ? res : res?.value ?? [];
    } catch (error) {
        console.error(`Error fetching pending POs for ${cardCode}:`, error);
        throw error;
    }
}
