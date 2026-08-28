import { create } from "zustand";
import { persist } from "zustand/middleware";

const useBusinessPartnerStore = create((
    persist((set) => ({
        businessPartners: [],
        setBusinessPartners: (partners) => set({ businessPartners: partners }),
        clearBusinessPartners: () => set({ businessPartners: [] }),
    }),
    {
        name: "business-partner-storage", // unique name
    })
))

export default useBusinessPartnerStore;