import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useItemMaster = create(
    persist((set) => ({
        itemMaster: [],
        setItemMaster: (masters) => set({ itemMaster: masters }),
        clearItemMaster: () => set({ itemMaster: [] }),
    }),
    {
        name: "item-master-storage",
        // Bumped when the $select changes — old cached rows are dropped and refetched.
        version: 2,
    }
))

export default useItemMaster;