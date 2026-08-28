import { create } from "zustand";
import { persist } from "zustand/middleware";

const useInventoryGenExitStore = create(
    persist(
        (set) => ({
            inventoryGenExits: [],
            setInventoryGenExits: (ge) => set({ inventoryGenExits: ge }),
            clearInventoryGenExits: () => set({ inventoryGenExits: [] })
        }),
        {
            name: 'inventorygenexit-sap-data'
        }
    )
)

export default useInventoryGenExitStore;
