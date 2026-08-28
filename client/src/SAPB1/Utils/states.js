import { PostSap } from "../auth/login.js";

/**
 * Fetch the master list of states defined in SAP B1.
 * Calls the Service Layer action StatesService_GetStateList.
 *
 * @returns {Promise<any>} The response body — usually { value: [{ Code, Name, Country }, …] }.
 */
export async function getAllStates() {
    try {
        const states = await PostSap("/StatesService_GetStateList");
        return states;
    } catch (error) {
        console.error("Error fetching states:", error);
        throw error;
    }
}
