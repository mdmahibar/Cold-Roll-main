import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStateMasterStore = create(
    persist((set) => ({
        stateMasters: [],
        setStateMasters: (masters) => set({ stateMasters: masters }),
        clearStateMasters: () => set({ stateMasters: [] }),
    }),
    {
        name: "state-master-storage",
    }
))

export default useStateMasterStore;