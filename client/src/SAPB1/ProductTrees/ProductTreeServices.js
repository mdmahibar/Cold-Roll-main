import { getSap, getSapAll, PostSap, PatchSap, DeleteSap } from "../auth/login.js";

// Header fields used by the listing table. Passed as the $select query param so
// SAP does not ship ProductTreeLines for every row.
const SelectFields = "TreeCode,TreeType,Quantity,Warehouse,PriceList,ProductDescription";
// $orderby also gives the Service Layer a stable sort to page against — without
// one, rows can repeat or go missing across pages.
const listConfig = {
    config: { params: { $select: SelectFields, $orderby: "TreeCode" } },
};

//! Get all — follows every "@odata.nextLink" so all rows come back, not just 20.
export async function getAllProductTrees() {
    try {
        return await getSapAll("/ProductTrees", listConfig);
    } catch (error) {
        console.error("Error fetching product trees:", error);
        throw error;
    }
}

//! Get by id — a single-entity GET returns the BOM itself (with ProductTreeLines).
//! Only collection responses are wrapped in { value: [...] }.
export async function getProductTreeById(treeCode) {
    try {
        // TreeCode is a STRING key (the parent ItemCode) -> wrap it in quotes.
        return await getSap(`/ProductTrees('${treeCode}')`);
    } catch (error) {
        console.error(`Error fetching product tree ${treeCode}:`, error);
        throw error;
    }
}

//! Post API
export async function createProductTree(data) {
    try {
        return await PostSap("/ProductTrees", data);
    } catch (error) {
        console.error("Error creating product tree:", error);
        throw error;
    }
}

//! Patch/update api
export async function updateProductTree(treeCode, data) {
    try {
        return await PatchSap(`/ProductTrees('${treeCode}')`, data);
    } catch (error) {
        console.error(`Error updating product tree with ID ${treeCode}:`, error);
        throw error;
    }
}

//! Delete api — kept for future use.
export async function deleteProductTree(treeCode) {
    try {
        return await DeleteSap(`/ProductTrees('${treeCode}')`);
    } catch (error) {
        console.error(`Error deleting product tree with ID ${treeCode}:`, error);
        throw error;
    }
}
