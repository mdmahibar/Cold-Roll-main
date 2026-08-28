import {getSap, getSapAll, PatchSap, PostSap, DeleteSap} from "../auth/login.js";

const SelectFields = "DocEntry,DocDate,CardCode,CardName,Series,FromWarehouse,ToWarehouse";
const selectConfig = { config: { params: { $select: SelectFields } } };


export async function getAllInventoryTransferRequest() {
    try {
        // Service Layer pages collections at MaxPageSize (20), so this follows
        // every "@odata.nextLink" and returns the rows from all pages.
        return await getSapAll("/InventoryTransferRequests", selectConfig);
    } catch (error) {
        console.error("Error fething data", error);
        throw error;
    }
}

export async function getInventoryTransferRequestById(id) {
    try {
        // A single-entity GET returns the document itself. Only *collection*
        // responses are wrapped in { value: [...] }, so there is nothing to unwrap.
        return await getSap(`/InventoryTransferRequests(${id})`);
    } catch (error) {
        console.error("Error fetching data", error);
        throw error;
    }
}

export async function createInventoryTransferRequest(data) {
    try {
        return await PostSap("/InventoryTransferRequests", data);
    } catch (error) {
        console.error("Error creating inventory transfer request:", error);
        throw error;
    }
}

export async function updateInventoryTransferRequest(id, data) {
    try {
        // DocEntry is a NUMERIC key -> no quotes (unlike BusinessPartners' string CardCode).
        return await PatchSap(`/InventoryTransferRequests(${id})`, data);
    } catch (error) {
        console.error(`Error updating inventory transfer request with ID ${id}:`, error);
        throw error;
    }
}

export async function deleteInventoryTransferRequest(id) {
    try {
        return await DeleteSap(`/InventoryTransferRequests(${id})`);
    } catch (error) {
        console.error(`Error deleting inventory transfer request with ID ${id}:`, error);
        throw error;
    }
}
