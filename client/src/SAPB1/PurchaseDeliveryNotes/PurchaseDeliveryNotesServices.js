import { getSap, getSapAll, PostSap, PatchSap } from "../auth/login";
import { useQuery } from "@tanstack/react-query";

// Fields returned by the list query. Passed as the $select query param.
const SelectFields = "DocEntry,DocNum,CardCode,CardName,DocTotal,DocDate,U_DIVISION,U_LOCATION,DocumentStatus,U_SHIFT,DocumentLines,U_GRPOTYPE";
// Newest first, and $orderby also gives the Service Layer a stable sort to page
// against — without one, rows can repeat or go missing across pages.
const listConfig = {
    config: { params: { $select: SelectFields, $orderby: "DocEntry desc" } },
};

// Plain async service function — no hooks, callable from anywhere.
// Returns every note, following the Service Layer's paging links.
export async function getAllPurchaseDeliveryNotes() {
    try {
        return await getSapAll("/PurchaseDeliveryNotes", listConfig);
    } catch (error) {
        console.error("Error fetching purchase delivery notes:", error);
        throw error;
    }
}

// Custom hook — the valid place to call useQuery. Components call this.
export function usePurchaseDeliveryNotes() {
    return useQuery({
        queryKey: ["purchaseDeliveryNotesData"],
        queryFn: getAllPurchaseDeliveryNotes,
        staleTime: 0
    });
}

// Plain async service function — fetches a single note by its DocEntry key.
export async function getPurchaseDeliveryNoteById(docEntry) {
    try {
        const res = await getSap(`/PurchaseDeliveryNotes(${docEntry})`);
        return res;
    } catch (error) {
        console.error(`Error fetching purchase delivery note ${docEntry}:`, error);
        throw error;
    }
}

// Custom hook — fetches a single note. `enabled` guards against a missing id.
export function usePurchaseDeliveryNote(docEntry) {
    return useQuery({
        queryKey: ["purchaseDeliveryNotesData", docEntry],
        queryFn: () => getPurchaseDeliveryNoteById(docEntry),
        enabled: docEntry != null,
        staleTime: 0
    });
}

//! Post API
export async function createPurchaseDeliveryNote(data) {
    try {
        return await PostSap("/PurchaseDeliveryNotes", data);
    } catch (error) {
        console.error("Error creating Purchase Delivery Note:", error);
        throw error;
    }
}

//! Patch/update api
export async function updatePurchaseDeliveryNote(id, data) {
    try {
        // DocEntry is a NUMERIC key -> no quotes (unlike BusinessPartners' string CardCode).
        return await PatchSap(`/PurchaseDeliveryNotes(${id})`, data);
    } catch (error) {
        console.error(`Error updating Purchase Delivery Note with ID ${id}:`, error);
        throw error;
    }
}