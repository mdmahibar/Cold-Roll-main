import { useCallback, useEffect } from "react";
import useInventoryGenEntryStore from "../store/inventoryGenEntryStore";
import { getAllInventoryGenEntries } from "../SAPB1/InventoryGenEntries/InventoryGenEntryServices";

const useInventoryGenEntryHook = () => {
    const inventoryGenEntries = useInventoryGenEntryStore((ge) => ge.inventoryGenEntries);
    const setInventoryGenEntries = useInventoryGenEntryStore((ge) => ge.setInventoryGenEntries);

    // One fetch path for both the first load and the refresh after a save.
    const refreshInventoryGenEntries = useCallback(async () => {
        try {
            const response = await getAllInventoryGenEntries();
            setInventoryGenEntries(response);
        } catch (error) {
            console.log("Error Fetching Inventory Gen Entries", error);
        }
    }, [setInventoryGenEntries]);

    useEffect(() => {
        //! Already in localstorage, no need to fetch again
        if (inventoryGenEntries.length > 0) {
            return;
        }
        refreshInventoryGenEntries();
    }, [])

    return { inventoryGenEntries, refreshInventoryGenEntries };
}

export default useInventoryGenEntryHook;
