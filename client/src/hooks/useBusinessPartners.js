import { useEffect } from "react";
import { getAllBusinessPartners } from "../SAPB1/BP/BpServices";
import useBusinessPartnerStore from "../store/businessPartnerStore";

const useBusinessPartners  = () => {

    const businessPartners = useBusinessPartnerStore((state) => state.businessPartners);

    const setBusinessPartners = useBusinessPartnerStore((state) => state.setBusinessPartners);

    useEffect(() => {

        //! Already fetched, no need to fetch again localstorage
        if (businessPartners.length > 0) {
            return;
        }

        const fetchData = async () => {
            try {
                const partners = await getAllBusinessPartners();
                setBusinessPartners(partners);
            } catch (error) {
                console.error("Error fetching business partners:", error);
            }
        };

        fetchData();
    }, []);
}

export default useBusinessPartners;