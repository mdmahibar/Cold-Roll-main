import { useEffect } from "react";
import { useCookies } from "react-cookie";
import useLoginWiseStore from "../store/loginWiseDataStore";
import { GetLoginWiseData } from "../services/Auth";
import { AUTH_COOKIE_LIST, COOKIE } from "../constants/auth";

const useLoginWiseHook = () => {
    const [cookies] = useCookies(AUTH_COOKIE_LIST);
    const loginWiseData = useLoginWiseStore((s) => s.loginWiseData);
    const setLoginWiseData = useLoginWiseStore((s) => s.setLoginWiseData);

    const jar = cookies;                    // cookie jar buildAuthHeaders() reads
    const userId = cookies[COOKIE.USER_ID]; // UserId stored in clear text

    useEffect(() => {
        if (loginWiseData.length > 0) return;
        if (!userId) return; // no session yet — nothing to fetch

        const fetchData = async () => {
            try {
                const data = await GetLoginWiseData("LoginWiseData", { UserId: userId }, jar);
                setLoginWiseData(data);
            } catch (error) {
                console.error("Error fetching login-wise data:", error);
            }
        };
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);
};

export default useLoginWiseHook;
