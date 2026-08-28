import { getSap, getSapAll } from "../auth/login.js";

const SelectFields = "?$select=ItemCode,ItemName";

export async function getAllItems() {
    try {
        // const items = await getSap("/Items?$select=ItemCode,ItemName");
        const items = await getSap("/Items" + SelectFields);
        return items.value;
    } catch (error) {
        console.error("Error fetching items:", error);
        throw error;
    }
}

/**
 * Items filtered by the U_TYPE UDF on the item master.
 * FP = Finished Product, MX = Mix Product. Used by the Production Order
 * screen to decide which items may be produced under the chosen type.
 *
 * getSapAll is used on purpose: the Service Layer pages at 20 rows and a
 * plain getSap would silently truncate the picker.
 *
 * @param {string} type  U_TYPE value, e.g. "FP" or "MX".
 * @returns {Promise<Array>} Matching item rows.
 */
export async function getItemsByType(type) {
    try {
        const route = `/Items${SelectFields}&$filter=U_TYPE eq '${type}'`;
        return await getSapAll(route);
    } catch (error) {
        console.error("Error fetching items by type:", error);
        throw error;
    }
}

/**
 * The item master facts a document line needs, read for ONE item on demand.
 *
 * The cached item master (Utils/itemMaster.js) is loaded with
 * `$filter=PurchaseItem eq 'tYES'`, so anything produced in-house — a finished
 * good, a semi-finished intermediate — is simply NOT in it. Reading
 * ManageBatchNumbers off a row that is not there answers "not batch managed",
 * which is exactly how a batch managed item reaches SAP with no BatchNumbers
 * and comes back as -4014 "Cannot add row without complete selection of
 * batch/serial numbers".
 *
 * @param {string} itemCode  The SAP item code.
 * @returns {Promise<object>} The item entity (single-entity GET, not wrapped).
 */
export async function getItemMasterInfo(itemCode) {
    try {
        return await getSap(
            `/Items('${itemCode}')?$select=ItemCode,ItemName,InventoryUOM,DefaultWarehouse,ManageBatchNumbers,ManageSerialNumbers`
        );
    } catch (error) {
        console.error(`Error fetching item master info for ${itemCode}:`, error);
        throw error;
    }
}

/**
 * One item with its per-warehouse stock, for the Production Order line grid.
 *
 * Returns the whole Item entity; the caller reads
 * ItemWarehouseInfoCollection[] where each row carries
 * { WarehouseCode, InStock, ... }.
 *
 * @param {string} itemCode  The SAP item code.
 * @returns {Promise<object>} The item entity.
 */
export async function getItemWarehouseStock(itemCode) {
    try {
        return await getSap(`/Items('${itemCode}')?$select=ItemCode,ItemWarehouseInfoCollection`);
    } catch (error) {
        console.error("Error fetching item warehouse stock:", error);
        throw error;
    }
}
