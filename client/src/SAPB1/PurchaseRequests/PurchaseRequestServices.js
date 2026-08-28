import { getSap, getSapAll, PostSap, PatchSap, DeleteSap } from "../auth/login.js";

// Header fields used by the listing table. Passed as the $select query param so
// SAP does not ship DocumentLines for every row.
const SelectFields = "DocEntry,DocNum,DocDate,DocumentStatus,U_DIVISION,U_LOCATION,RequriedDate,RequesterDepartment,DocumentLines";
// Newest first, and $orderby also gives the Service Layer a stable sort to page
// against — without one, rows can repeat or go missing across pages.
const listConfig = {
    config: { params: { $select: SelectFields, $orderby: "DocEntry desc" } },
};

//! Get all — follows every "@odata.nextLink" so all pages come back, not just 20.
export async function getAllPurchaseRequests() {
    try {
        return await getSapAll("/PurchaseRequests", listConfig);
    } catch (error) {
        console.error("Error fetching purchase requests:", error);
        throw error;
    }
}

//! Get by id — a single-entity GET returns the document itself (with
//! DocumentLines). Only collection responses are wrapped in { value: [...] }.
export async function getPurchaseRequestById(docEntry) {
    try {
        return await getSap(`/PurchaseRequests(${docEntry})`);
    } catch (error) {
        console.error(`Error fetching purchase request ${docEntry}:`, error);
        throw error;
    }
}

//! Post API
export async function createPurchaseRequest(data) {
    try {
        return await PostSap("/PurchaseRequests", data);
    } catch (error) {
        console.error("Error creating purchase request:", error);
        throw error;
    }
}

//! Patch/update api
export async function updatePurchaseRequest(docEntry, data) {
    try {
        // DocEntry is a NUMERIC key -> no quotes (unlike BusinessPartners' string CardCode).
        return await PatchSap(`/PurchaseRequests(${docEntry})`, data);
    } catch (error) {
        console.error(`Error updating purchase request with ID ${docEntry}:`, error);
        throw error;
    }
}

//! Delete api — kept for future use.
export async function deletePurchaseRequest(docEntry) {
    try {
        return await DeleteSap(`/PurchaseRequests(${docEntry})`);
    } catch (error) {
        console.error(`Error deleting purchase request with ID ${docEntry}:`, error);
        throw error;
    }
}
