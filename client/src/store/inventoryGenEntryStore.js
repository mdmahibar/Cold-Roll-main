import { create } from "zustand";
import { persist } from "zustand/middleware";

const useInventoryGenEntryStore = create(
    persist(
        (set) => ({
            inventoryGenEntries: [],
            setInventoryGenEntries: (ge) => set({ inventoryGenEntries: ge }),
            clearInventoryGenEntries: () => set({ inventoryGenEntries: [] })
        }),
        {
            name: 'inventorygenentry-sap-data'
        }
    )
)

export default useInventoryGenEntryStore;
