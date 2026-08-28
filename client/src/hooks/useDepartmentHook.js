import { useCallback, useEffect } from "react";
import useDepartmentStore from "../store/departmentStore";
import { getAllDepartments } from "../SAPB1/Departments/DepartmentServices";

const useDepartmentHook = () => {
    const departments = useDepartmentStore((state) => state.departments);
    const setDepartments = useDepartmentStore((state) => state.setDepartments);

    const refreshDepartments = useCallback(async () => {
        try {
            const response = await getAllDepartments();
            setDepartments(response);
        } catch (error) {
            console.log("Error Fetching Departments", error);
        }
    }, [setDepartments]);

    useEffect(() => {
        if (departments.length > 0) {
            return;
        }
        refreshDepartments();
    }, [departments.length, refreshDepartments]);

    return { departments, refreshDepartments };
}

export default useDepartmentHook;
