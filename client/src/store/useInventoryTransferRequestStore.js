import { create } from "zustand";
import { persist } from "zustand/middleware";

const useInventoryTransferRequest = create(
    persist(
        (set) => ({
            inventoryTransferRequests: [],
            setInventoryTransferRequests: (wh) => set({ inventoryTransferRequests: wh }),
            clearInventoryTransferRequests: () => set({ inventoryTransferRequests: [] })
        }),
        {
            name: 'inventorytransferrequest-sap-data'
        }
    )
)

export default useInventoryTransferRequest;
