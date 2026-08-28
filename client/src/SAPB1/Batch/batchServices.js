import { getSapAll, getSap } from "../auth/login.js";

const selectedFields = "DocEntry,ItemCode,ItemDescription,Status,Batch"

const listConfig = {
    config: { params: { $select: selectedFields, $orderby: "DocEntry desc" } },
};


export async function getAllbatch() {
    try {
        return await getSapAll("/BatchNumberDetails", listConfig);
    } catch (error) {
        console.error("Error fetching batch:", error);
        throw error;
    }
}

export async function getBatchById(itemcode) {
    try {
        const res = await getSap(`/BatchNumberDetails?$filter=ItemCode eq '${itemcode}'&$select=Batch`);
        console.log("Batch response:", res.value[0]?.Batch);
        return res.value[0]?.Batch || null;
    } catch (error) {
        console.error(`Error fetching batch ${itemcode}:`, error);
        throw error;
    }
}