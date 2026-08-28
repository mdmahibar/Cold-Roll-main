import { useCallback, useEffect } from "react";
import useProductionOrderStore from "../store/productionOrderStore";
import { getAllProductionOrders } from "../SAPB1/ProductionOrders/ProductionOrderServices";

const useProductionOrderHook = () => {
    const productionOrders = useProductionOrderStore((po) => po.productionOrders);
    const setProductionOrders = useProductionOrderStore((po) => po.setProductionOrders);

    // One fetch path for both the first load and the refresh after a save.
    const refreshProductionOrders = useCallback(async () => {
        try {
            const response = await getAllProductionOrders();
            setProductionOrders(response);
        } catch (error) {
            console.log("Error Fetching Production Orders", error);
        }
    }, [setProductionOrders]);

    useEffect(() => {
        //! Already in localstorage, no need to fetch again
        if (productionOrders.length > 0) {
            return;
        }
        refreshProductionOrders();
    }, [])

    return { productionOrders, refreshProductionOrders };
}

export default useProductionOrderHook;
