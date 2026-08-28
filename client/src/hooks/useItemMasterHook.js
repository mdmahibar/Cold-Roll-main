import { useCallback, useEffect } from 'react';
import { getAllItemMaster } from '../SAPB1/Utils/itemMaster';
import useItemMaster from '../store/itemMasterStore';

const useItemMasterHook = () => {
    const itemMaster = useItemMaster((state) => state.itemMaster);
    const setItemMaster = useItemMaster((state) => state.setItemMaster);

    // One fetch path for both the first load and the refresh after a save.
    const refreshItemMaster = useCallback(async () => {
        try {
            const response = await getAllItemMaster();
            setItemMaster(response);
            return response;
        } catch (error) {
            console.error("Error Fetching Item Master", error);
        }
    }, [setItemMaster]);

    useEffect(() => {
        // Fetch directly from API on mount, ignoring any cached data
        refreshItemMaster();
    }, [refreshItemMaster]);

    return { itemMaster, refreshItemMaster };
}

export default useItemMasterHook;
