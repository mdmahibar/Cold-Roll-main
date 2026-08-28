import { create } from "zustand";
import { persist } from "zustand/middleware";

const useWarehouseStore = create(
    persist(
        (set) => ({
            warehouses: [],
            setWarehouses: (wh) => set({ warehouses: wh }),
            clearWarehouses: () => set({ warehouses: [] })
        }),
        {
            name: 'warehouse-sap-data'
        }
    )
)

export default useWarehouseStore;
