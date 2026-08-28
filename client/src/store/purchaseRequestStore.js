import { create } from "zustand";
import { persist } from "zustand/middleware";

const usePurchaseRequestStore = create(
    persist(
        (set) => ({
            purchaseRequests: [],
            setPurchaseRequests: (pr) => set({ purchaseRequests: pr }),
            clearPurchaseRequests: () => set({ purchaseRequests: [] })
        }),
        {
            name: 'purchaserequest-sap-data'
        }
    )
)

export default usePurchaseRequestStore;
