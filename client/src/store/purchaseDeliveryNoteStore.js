import { create } from "zustand";
import { persist } from "zustand/middleware";

const usePurchaseDeliveryNoteStore = create(
    persist(
        (set) => ({
            purchaseDeliveryNotes: [],
            setPurchaseDeliveryNotes: (pdn) => set({ purchaseDeliveryNotes: pdn }),
            clearPurchaseDeliveryNotes: () => set({ purchaseDeliveryNotes: [] })
        }),
        {
            name: 'purchasedeliverynote-sap-data'
        }
    )
)

export default usePurchaseDeliveryNoteStore;
