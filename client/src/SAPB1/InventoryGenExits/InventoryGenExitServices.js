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
export async function getAllInventoryGenExits() {
    try {
        return await getSapAll("/InventoryGenExits", listConfig);
    } catch (error) {
        console.error("Error fetching inventory gen exits:", error);
        throw error;
    }
}

//! Get by id — a single-entity GET returns the document itself (with
//! DocumentLines). Only collection responses are wrapped in { value: [...] }.
export async function getInventoryGenExitById(docEntry) {
    try {
        return await getSap(`/InventoryGenExits(${docEntry})`);
    } catch (error) {
        console.error(`Error fetching inventory gen exit ${docEntry}:`, error);
        throw error;
    }
}

//! Post API
export async function createInventoryGenExit(data) {
    try {
        return await PostSap("/InventoryGenExits", data);
    } catch (error) {
        console.error("Error creating inventory gen exit:", error);
        throw error;
    }
}

//! Patch/update api
export async function updateInventoryGenExit(docEntry, data) {
    try {
        // DocEntry is a NUMERIC key -> no quotes (unlike BusinessPartners' string CardCode).
        return await PatchSap(`/InventoryGenExits(${docEntry})`, data);
    } catch (error) {
        console.error(`Error updating inventory gen exit with ID ${docEntry}:`, error);
        throw error;
    }
}

//! Delete api — kept for future use.
export async function deleteInventoryGenExit(docEntry) {
    try {
        return await DeleteSap(`/InventoryGenExits(${docEntry})`);
    } catch (error) {
        console.error(`Error deleting inventory gen exit with ID ${docEntry}:`, error);
        throw error;
    }
}
