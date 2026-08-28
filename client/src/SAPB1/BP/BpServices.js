import {getSap, getSapById, PatchSap, PostSap, DeleteSap} from "../auth/login.js";

// Comma-separated list of fields to return. Passed as the $select query param
// so it sits AFTER the entity key, e.g. /BusinessPartners('V000001')?$select=...
const SelectFields = "CardCode,CardName,ContactPerson,Address,Phone1,ContactEmployees";
const selectConfig = { config: { params: { $select: SelectFields } } };

// For a single record we also want the child collections (addresses + contacts)
// plus the header pointers that mark which address is the default Bill-To / Ship-To,
// so the Edit/View form can be pre-filled from them. Kept out of the list query
// above to keep the grid fetch light.
const DetailSelectFields = `${SelectFields},BilltoDefault,ShipToDefault,BPAddresses,ContactEmployees`;
const detailSelectConfig = { config: { params: { $select: DetailSelectFields } } };

export async function getAllBusinessPartners() {
    try {
        // SAP returns only 20 per page + an "@odata.nextLink" for the next slice.
        // Keep following that link until there are none left, collecting all rows.
        const all = [];
        let res = await getSap("/BusinessPartners", selectConfig);
        all.push(...res.value);
        while (res["@odata.nextLink"]) {
            res = await getSap("/" + res["@odata.nextLink"]);
            all.push(...res.value);
        }
        return all;
    } catch (error) {
        console.error("Error fetching business partners:", error);
        throw error;
    }
}

export async function getBusinessPartnerById(id) {
    try {
        const businessPartner = await getSapById("/BusinessPartners", id, detailSelectConfig);
        return businessPartner;
    } catch (error) {
        console.error(`Error fetching business partner with ID ${id}:`, error);
        throw error;
    }
}

export async function createBusinessPartner(data) {
    try {
        return await PostSap("/BusinessPartners", data);
    } catch (error) {
        console.error("Error creating business partner:", error);
        throw error;
    }
}

export async function updateBusinessPartner(id, data) {
    try {
        return await PatchSap(`/BusinessPartners('${id}')`, data);
    } catch (error) {
        console.error(`Error updating business partner with ID ${id}:`, error);
        throw error;
    }
}

export async function deleteBusinessPartner(id) {
    try {
        return await DeleteSap(`/BusinessPartners('${id}')`);
    } catch (error) {
        console.error(`Error deleting business partner with ID ${id}:`, error);
        throw error;
    }
}