import { getSap, getSapAll, PostSap, PatchSap, DeleteSap } from "../auth/login.js";

// Header fields used by the listing table. Passed as the $select query param so
// SAP does not ship DocumentLines for every row.
const SelectFields = "DocEntry,DocNum,DocDate,DocDueDate,Series,Comments,JournalMemo";
// Newest first, and $orderby also gives the Service Layer a stable sort to page
// against — without one, rows can repeat or go missing across pages.
const listConfig = {
    config: { params: { $select: SelectFields, $orderby: "DocEntry desc" } },
};

//! Get all — follows every "@odata.nextLink" so all rows come back, not just 20.
export async function getAllInventoryGenEntries() {
    try {
        return await getSapAll("/InventoryGenEntries", listConfig);
    } catch (error) {
        console.error("Error fetching inventory gen entries:", error);
        throw error;
    }
}

//! Get by id — a single-entity GET returns the document itself (with
//! DocumentLines). Only collection responses are wrapped in { value: [...] }.
export async function getInventoryGenEntryById(docEntry) {
    try {
        return await getSap(`/InventoryGenEntries(${docEntry})`);
    } catch (error) {
        console.error(`Error fetching inventory gen entry ${docEntry}:`, error);
        throw error;
    }
}

//! Post API
export async function createInventoryGenEntry(data) {
    try {
        return await PostSap("/InventoryGenEntries", data);
    } catch (error) {
        console.error("Error creating inventory gen entry:", error);
        throw error;
    }
}

//! Patch/update api
export async function updateInventoryGenEntry(docEntry, data) {
    try {
        // DocEntry is a NUMERIC key -> no quotes (unlike BusinessPartners' string CardCode).
        return await PatchSap(`/InventoryGenEntries(${docEntry})`, data);
    } catch (error) {
        console.error(`Error updating inventory gen entry with ID ${docEntry}:`, error);
        throw error;
    }
}

//! Delete api — kept for future use.
export async function deleteInventoryGenEntry(docEntry) {
    try {
        return await DeleteSap(`/InventoryGenEntries(${docEntry})`);
    } catch (error) {
        console.error(`Error deleting inventory gen entry with ID ${docEntry}:`, error);
        throw error;
    }
}
