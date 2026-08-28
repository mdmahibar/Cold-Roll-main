import { create } from "zustand";
import { persist } from "zustand/middleware";

const useProductionOrderStore = create(
    persist(
        (set) => ({
            productionOrders: [],
            setProductionOrders: (po) => set({ productionOrders: po }),
            clearProductionOrders: () => set({ productionOrders: [] })
        }),
        {
            name: 'productionorder-sap-data'
        }
    )
)

export default useProductionOrderStore;
