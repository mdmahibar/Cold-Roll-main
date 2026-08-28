import { useCallback, useEffect } from "react";
import usePurchaseOrderRegisterStore from "../store/purchaseOrderRegisterStore";
import { getAllPurchaseOrders } from "../SAPB1/PurchaseOrders/PurchaseOrderRegisterService";

const usePurchaseOrderRegisterHook = () => {
    const purchaseOrders = usePurchaseOrderRegisterStore((po) => po.purchaseOrders);
    const setPurchaseOrders = usePurchaseOrderRegisterStore((po) => po.setPurchaseOrders);

    // One fetch path for both the first load and the refresh after a save.
    const refreshPurchaseOrders = useCallback(async () => {
        try {
            const response = await getAllPurchaseOrders();
            setPurchaseOrders(response);
        } catch (error) {
            console.log("Error Fetching Purchase Orders", error);
        }
    }, [setPurchaseOrders]);

    useEffect(() => {
        //! Already in localstorage, no need to fetch again
        if (purchaseOrders.length > 0) {
            return;
        }
        refreshPurchaseOrders();
    }, [])

    return { purchaseOrders, refreshPurchaseOrders };
}

export default usePurchaseOrderRegisterHook;
