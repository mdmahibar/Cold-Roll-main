import { useCallback, useEffect } from "react";
import useStockTransferStore from "../store/stockTransferStore";
import { getAllStockTransfers } from "../SAPB1/StockTransfers/StockTransferServices";

const useStockTransferHook = () => {
    const stockTransfers = useStockTransferStore((st) => st.stockTransfers);
    const setStockTransfers = useStockTransferStore((st) => st.setStockTransfers);

    // One fetch path for both the first load and the refresh after a save.
    const refreshStockTransfers = useCallback(async () => {
        try {
            const response = await getAllStockTransfers();
            setStockTransfers(response);
        } catch (error) {
            console.log("Error Fetching Stock Transfers", error);
        }
    }, [setStockTransfers]);

    useEffect(() => {
        //! Already in localstorage, no need to fetch again
        if (stockTransfers.length > 0) {
            return;
        }
        refreshStockTransfers();
    }, [])

    return { stockTransfers, refreshStockTransfers };
}

export default useStockTransferHook;
