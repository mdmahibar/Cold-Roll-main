import { useCallback, useEffect } from "react";
import useProductTreeStore from "../store/productTreeStore";
import { getAllProductTrees } from "../SAPB1/ProductTrees/ProductTreeServices";

const useProductTreeHook = () => {
    const productTrees = useProductTreeStore((pt) => pt.productTrees);
    const setProductTrees = useProductTreeStore((pt) => pt.setProductTrees);

    // One fetch path for both the first load and the refresh after a save.
    const refreshProductTrees = useCallback(async () => {
        try {
            const response = await getAllProductTrees();
            setProductTrees(response);
        } catch (error) {
            console.log("Error Fetching Product Trees", error);
        }
    }, [setProductTrees]);

    useEffect(() => {
        //! Already in localstorage, no need to fetch again
        if (productTrees.length > 0) {
            return;
        }
        refreshProductTrees();
    }, [])

    return { productTrees, refreshProductTrees };
}

export default useProductTreeHook;
