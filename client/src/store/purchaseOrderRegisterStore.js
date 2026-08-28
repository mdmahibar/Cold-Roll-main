import { create } from "zustand";
import { persist } from "zustand/middleware";

const usePurchaseOrderRegisterStore = create(
    persist(
        (set) => ({
            purchaseOrders: [],
            setPurchaseOrders: (po) => set({ purchaseOrders: po }),
            clearPurchaseOrders: () => set({ purchaseOrders: [] })
        }),
        {
            name: 'purchaseorderregister-sap-data'
        }
    )
)

export default usePurchaseOrderRegisterStore;
