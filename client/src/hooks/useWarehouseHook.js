import { useEffect } from "react";
import useWarehouseStore from '../store/warehouseStore';
import { getAllWarehouses } from "../SAPB1/warehouse/warehouseServices";

const useWarehouseHook = () => {
    const warehouses = useWarehouseStore((wh) => wh.warehouses);
    const setWarehouses = useWarehouseStore((wh) => wh.setWarehouses);

    useEffect(() => {
        if(warehouses.length > 0) {
            return;
        }
        const fetchData = async () => {
            try {
                const response = await getAllWarehouses();
                setWarehouses(response);
            } catch (error) {
                console.log("Error Fetching warehouses", error);
            }
        }
        fetchData();
    }, [warehouses.length, setWarehouses])

    return { warehouses, setWarehouses };
}

export default useWarehouseHook;