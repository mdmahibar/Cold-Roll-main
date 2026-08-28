import { getSap } from "../auth/login.js";

export const getAllItemMaster = async () => {
    try {
        // SAP returns only 20 per page + an "@odata.nextLink" for the next slice.
        // Keep following that link until there are none left, collecting all rows.
        const all = [];
        // $select is required here: without it SAP sends every field of every item
        // (including ItemPrices and the warehouse collections), which blows past
        // the localStorage quota when the store persists the list.
        // let res = await getSap("/Items&$filter=startswith(ItemCode, 'a')");
        // Fields the pages actually read:
        //   InventoryUOM              -> UoM column on the line grids
        //   QuantityOnStock           -> "In Stock"
        //   QuantityOrderedByCustomers-> committed, subtracted from Available
        //   QuantityOrderedFromVendors-> on order, added to Available
        //   DefaultWarehouse          -> pre-fills the line warehouse
        // Anything beyond this needs a per-item call, so keep the list tight.
        const SelectFields = [
            "ItemCode",
            "ItemName",
            "InventoryUOM",
            "QuantityOnStock",
            "QuantityOrderedByCustomers",
            "QuantityOrderedFromVendors",
            "DefaultWarehouse",
            "U_TYPE",
            "PurchaseUnit",
            // Store Dispatch keys its whole batch flow off this: a component is
            // only read for batch stock, and only posted with BatchNumbers, when
            // it is tYES. Dropping it silently disables batch handling.
            "ManageBatchNumbers"
        ].join(",");

        let res = await getSap(`/Items?$select=${SelectFields}&$filter=PurchaseItem eq 'tYES'`);
        all.push(...res.value);
        while (res["@odata.nextLink"]) {
            res = await getSap("/" + res["@odata.nextLink"]);
            all.push(...res.value);
        }
        return all;
    } catch (error) {
        console.error("Error fetching items:", error);
        throw error;
    }
}