import { useCallback, useEffect } from "react";
import usePurchaseDeliveryNoteStore from "../store/purchaseDeliveryNoteStore";
import { getAllPurchaseDeliveryNotes } from "../SAPB1/PurchaseDeliveryNotes/PurchaseDeliveryNotesServices";

const usePurchaseDeliveryNoteHook = () => {
    const purchaseDeliveryNotes = usePurchaseDeliveryNoteStore((pdn) => pdn.purchaseDeliveryNotes);
    const setPurchaseDeliveryNotes = usePurchaseDeliveryNoteStore((pdn) => pdn.setPurchaseDeliveryNotes);

    // One fetch path for both the first load and the refresh after a save.
    const refreshPurchaseDeliveryNotes = useCallback(async () => {
        try {
            const response = await getAllPurchaseDeliveryNotes();
            setPurchaseDeliveryNotes(response);
        } catch (error) {
            console.log("Error Fetching Purchase Delivery Notes", error);
        }
    }, [setPurchaseDeliveryNotes]);

    useEffect(() => {
        //! Already in localstorage, no need to fetch again
        if (purchaseDeliveryNotes.length > 0) {
            return;
        }
        refreshPurchaseDeliveryNotes();
    }, [])

    return { purchaseDeliveryNotes, refreshPurchaseDeliveryNotes };
}

export default usePurchaseDeliveryNoteHook;
