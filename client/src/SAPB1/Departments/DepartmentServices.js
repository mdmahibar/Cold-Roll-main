import { getSap } from "../auth/login.js";

const selectedFields = "Code,Name,Description"

export async function getAllDepartments() {
    try {
        const res = await getSap(`/Departments?$select=${selectedFields}`);
        return res.value || [];
    } catch (error) {
        console.error("Error fetching departments", error);
        throw error;
    }
}
