import { create } from "zustand";
import { persist } from "zustand/middleware";

const useStockTransferStore = create(
    persist(
        (set) => ({
            stockTransfers: [],
            setStockTransfers: (st) => set({ stockTransfers: st }),
            clearStockTransfers: () => set({ stockTransfers: [] })
        }),
        {
            name: 'stocktransfer-sap-data'
        }
    )
)

export default useStockTransferStore;
