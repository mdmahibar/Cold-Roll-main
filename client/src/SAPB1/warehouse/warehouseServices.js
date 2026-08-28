import { getSap } from "../auth/login.js";

/* U_TYPE tags a warehouse by PURPOSE, so nothing in the in-transit flow has to
   hardcode which warehouse is the transit one:

     SIS    a destination / store counter     many
     IN     the in-transit warehouse          exactly one
     DM     the damaged-goods warehouse       exactly one
     blank  an ordinary warehouse (HO, raw)   many

   See ../../common/warehouseTypes.js for the readers — it is typed by hand in
   SAP, so it is matched case- and space-insensitively. */
const BaseSelectFields = "WarehouseCode,WarehouseName,Location,U_LOCATION";
const SelectFields = `${BaseSelectFields},U_TYPE`;

const selectConfig = (select) => ({ config: { params: { $select: select } } });

async function readAllPages(select) {
    const all = [];
    let res = await getSap("/Warehouses", selectConfig(select));
    all.push(...res.value);
    while (res["@odata.nextLink"]) {
        res = await getSap("/" + res["@odata.nextLink"]);
        all.push(...res.value);
    }
    return all;
}

export async function getAllWarehouses() {
    try {
        return await readAllPages(SelectFields);
    } catch (error) {
        // A $select naming a property the entity does not have fails the ENTIRE
        // request, so on a company where U_TYPE has not been created yet this
        // read would 400 and every warehouse dropdown in the app would come up
        // empty. Retry without it — warehouseTypes.js then sees no tags at all
        // and treats every warehouse as an ordinary destination.
        console.warn(
            "Warehouses: retrying without U_TYPE — the UDF is not being served.",
            error?.message
        );
        try {
            return await readAllPages(BaseSelectFields);
        } catch (retryError) {
            console.error("Error fetching warehouses:", retryError);
            throw retryError;
        }
    }
}
