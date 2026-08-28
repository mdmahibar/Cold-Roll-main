import { create } from "zustand";

const useDepartmentStore = create((set) => ({
    departments: [],
    setDepartments: (departments) => set({ departments }),
}));

export default useDepartmentStore;
