import { create } from "zustand";
import { persist } from "zustand/middleware";

const useProductTreeStore = create(
    persist(
        (set) => ({
            productTrees: [],
            setProductTrees: (pt) => set({ productTrees: pt }),
            clearProductTrees: () => set({ productTrees: [] })
        }),
        {
            name: 'producttree-sap-data'
        }
    )
)

export default useProductTreeStore;
