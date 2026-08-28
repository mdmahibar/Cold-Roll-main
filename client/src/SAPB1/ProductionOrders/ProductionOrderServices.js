import { getSap, getSapAll, PostSap, PatchSap, DeleteSap } from "../auth/login.js";

// Header fields used by the listing table. Passed as the $select query param so
// SAP does not ship ProductionOrderLines for every row.
const SelectFields = "AbsoluteEntry,DocumentNumber,ItemNo,ProductDescription,ProductionOrderStatus,ProductionOrderType,PlannedQuantity,CompletedQuantity,RejectedQuantity,Warehouse,InventoryUOM,PostingDate,StartDate,DueDate";
// Newest first, and $orderby also gives the Service Layer a stable sort to page
// against — without one, rows can repeat or go missing across pages.
const listConfig = {
    config: { params: { $select: SelectFields, $orderby: "AbsoluteEntry desc" } },
};

//! Get all — follows every "@odata.nextLink" so all rows come back, not just 20.
export async function getAllProductionOrders() {
    try {
        return await getSapAll("/ProductionOrders", listConfig);
    } catch (error) {
        console.error("Error fetching production orders:", error);
        throw error;
    }
}

//! Get by id — a single-entity GET returns the document itself (with
//! ProductionOrderLines). Only collection responses are wrapped in { value: [...] }.
export async function getProductionOrderById(absoluteEntry) {
    try {
        return await getSap(`/ProductionOrders(${absoluteEntry})`);
    } catch (error) {
        console.error(`Error fetching production order ${absoluteEntry}:`, error);
        throw error;
    }
}

//! Post API
export async function createProductionOrder(data) {
    try {
        return await PostSap("/ProductionOrders", data);
    } catch (error) {
        console.error("Error creating production order:", error);
        throw error;
    }
}

//! Patch/update api
export async function updateProductionOrder(absoluteEntry, data) {
    try {
        // AbsoluteEntry is a NUMERIC key -> no quotes (unlike Items' string ItemCode).
        return await PatchSap(`/ProductionOrders(${absoluteEntry})`, data);
    } catch (error) {
        console.error(`Error updating production order with ID ${absoluteEntry}:`, error);
        throw error;
    }
}

//! Delete api — kept for future use.
export async function deleteProductionOrder(absoluteEntry) {
    try {
        return await DeleteSap(`/ProductionOrders(${absoluteEntry})`);
    } catch (error) {
        console.error(`Error deleting production order with ID ${absoluteEntry}:`, error);
        throw error;
    }
}
