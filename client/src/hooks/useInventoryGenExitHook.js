import { useCallback, useEffect } from "react";
import useInventoryGenExitStore from "../store/inventoryGenExitStore";
import { getAllInventoryGenExits } from "../SAPB1/InventoryGenExits/InventoryGenExitServices";

const useInventoryGenExitHook = () => {
    const inventoryGenExits = useInventoryGenExitStore((ge) => ge.inventoryGenExits);
    const setInventoryGenExits = useInventoryGenExitStore((ge) => ge.setInventoryGenExits);

    // One fetch path for both the first load and the refresh after a save.
    const refreshInventoryGenExits = useCallback(async () => {
        try {
            const response = await getAllInventoryGenExits();
            setInventoryGenExits(response);
        } catch (error) {
            console.log("Error Fetching Inventory Gen Exits", error);
        }
    }, [setInventoryGenExits]);

    useEffect(() => {
        //! Already in localstorage, no need to fetch again
        if (inventoryGenExits.length > 0) {
            return;
        }
        refreshInventoryGenExits();
    }, [])

    return { inventoryGenExits, refreshInventoryGenExits };
}

export default useInventoryGenExitHook;
