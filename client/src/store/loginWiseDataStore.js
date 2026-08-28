import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useLoginWiseStore = create(
    persist(
        (set) => ({
            loginWiseData: [],
            setLoginWiseData: (data) => set({ loginWiseData: data }),
            clearLoginWiseData: () => set({ loginWiseData: [] }),
        }),
        {
            name: 'login-wise-storage',
        }
    )
);

export default useLoginWiseStore;
