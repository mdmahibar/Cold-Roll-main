import { useCallback, useEffect } from "react";
import useInventoryTransferRequest from "../store/useInventoryTransferRequestStore";
import { getAllInventoryTransferRequest } from "../SAPB1/Inventory/inventoryRequestServices";

const useInventoryTransferRequestHook = () => {
    const inventoryTransferRequests = useInventoryTransferRequest((itr) => itr.inventoryTransferRequests);
    const setInventoryTransferRequests = useInventoryTransferRequest((itr) => itr.setInventoryTransferRequests);

    // One fetch path for both the first load and the refresh after a save.
    const refreshInventoryTransferRequests = useCallback(async () => {
        try {
            const response = await getAllInventoryTransferRequest();
            setInventoryTransferRequests(response);
        } catch (error) {
            console.log("Error Fetching Inventory Transfer Requests", error);
        }
    }, [setInventoryTransferRequests]);

    useEffect(() => {
        //! Already in localstorage, no need to fetch again
        if (inventoryTransferRequests.length > 0) {
            return;
        }
        refreshInventoryTransferRequests();
    }, [])

    return { inventoryTransferRequests, refreshInventoryTransferRequests };
}

export default useInventoryTransferRequestHook;
