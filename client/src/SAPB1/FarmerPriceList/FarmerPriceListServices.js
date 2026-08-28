/**
 * Farmer Price List — the RAW SAP calls for the Farmer Price List UDO.
 * Nothing else in the app knows these names; if SAP renames the object you
 * edit ONE constant here.
 *
 *   UDO     : SAS_UDO_MD_FRMPRCL   (the wrapper — this is what gives us an API)
 *   Header  : SAS_MD_FRMPRCL       (thresholds, deduction rate)
 *   Lines   : SAS_MR_FRMPRCL       (sent nested, as SAS_MR_FRMPRCLCollection)
 *
 * login.js already handles Login, the session cookie and auto re-login, so
 * these functions only say WHAT to fetch, never HOW to authenticate.
 */
import { getSap, PatchSap, PostSap, DeleteSap } from "../auth/login.js";

// The UDO wrapper is the endpoint — NOT the header table.
export const FARMER_PRICE_UDO = "SAS_UDO_MD_FRMPRCL";

// Child rows travel inside the header as "<child table>Collection".
export const FARMER_PRICE_ROWS = "SAS_MR_FRMPRCLCollection";

// Master-data UDO keys are strings (Code); a numeric key is used as-is.
const key = (code) => (typeof code === "number" ? `(${code})` : `('${code}')`);

export async function getAllFarmerPriceLists() {
    try {
        // SAP pages collections (20 rows by default) and returns "@odata.nextLink"
        // for the rest — follow it until there are none left.
        const all = [];
        let res = await getSap(`/${FARMER_PRICE_UDO}`);
        all.push(...(res.value ?? []));
        while (res["@odata.nextLink"]) {
            res = await getSap("/" + res["@odata.nextLink"]);
            all.push(...(res.value ?? []));
        }
        return all;
    } catch (error) {
        console.error("Error fetching farmer price lists:", error);
        throw error;
    }
}

// One price list + its rate rows.
export async function getFarmerPriceListById(code) {
    try {
        return await getSap(`/${FARMER_PRICE_UDO}${key(code)}`);
    } catch (error) {
        console.error(`Error fetching farmer price list ${code}:`, error);
        throw error;
    }
}

// SAP replies 201 with the created object (Code, DocEntry, rows…).
export async function createFarmerPriceList(data) {
    try {
        return await PostSap(`/${FARMER_PRICE_UDO}`, data);
    } catch (error) {
        console.error("Error creating farmer price list:", error);
        throw error;
    }
}

// UDOs are updated with PATCH and SAP replies 204 No Content — there is no
// body to read, so hand back the key we already know.
export async function updateFarmerPriceList(code, data) {
    try {
        await PatchSap(`/${FARMER_PRICE_UDO}${key(code)}`, data);
        return { Code: code };
    } catch (error) {
        console.error(`Error updating farmer price list ${code}:`, error);
        throw error;
    }
}

export async function deleteFarmerPriceList(code) {
    try {
        return await DeleteSap(`/${FARMER_PRICE_UDO}${key(code)}`);
    } catch (error) {
        console.error(`Error deleting farmer price list ${code}:`, error);
        throw error;
    }
}
