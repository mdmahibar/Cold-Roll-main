import { useEffect }  from "react";
import { getAllStates } from "../SAPB1/Utils/states.js";
import useStateMasterStore from "../store/stateMasterStore.js";

const useStateMaster = () => {
    const statesMaster = useStateMasterStore((state) => state.stateMasters);
    const setStatesMaster = useStateMasterStore((state) => state.setStateMasters);

    useEffect(() => {
        if(statesMaster.length > 0) {
            return;
        }
        const fetchData = async () => {
            try {
                const response = await getAllStates();
                setStatesMaster(response);
            } catch (error) {
                console.error("Error fetching business partners:", error);
            }
        }
        fetchData();
    }, [])
}

export default useStateMaster;