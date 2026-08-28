import { useCallback, useEffect } from "react";
import usePurchaseRequestStore from "../store/purchaseRequestStore";
import { getAllPurchaseRequests } from "../SAPB1/PurchaseRequests/PurchaseRequestServices";

const usePurchaseRequestHook = () => {
    const purchaseRequests = usePurchaseRequestStore((pr) => pr.purchaseRequests);
    const setPurchaseRequests = usePurchaseRequestStore((pr) => pr.setPurchaseRequests);

    // One fetch path for both the first load and the refresh after a save.
    const refreshPurchaseRequests = useCallback(async () => {
        try {
            const response = await getAllPurchaseRequests();
            setPurchaseRequests(response);
        } catch (error) {
            console.log("Error Fetching Purchase Requests", error);
        }
    }, [setPurchaseRequests]);

    useEffect(() => {
        //! Force fresh data fetch so new fields are always loaded from SAP B1
        // if (purchaseRequests.length > 0) {
        //     return;
        // }
        refreshPurchaseRequests();
    }, [])

    return { purchaseRequests, refreshPurchaseRequests };
}

export default usePurchaseRequestHook;
