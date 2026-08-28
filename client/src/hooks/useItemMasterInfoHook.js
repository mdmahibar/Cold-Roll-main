import { useCallback, useEffect, useMemo, useState } from 'react';

import { getItemMasterInfo } from '../SAPB1/Items/ItemServices';

/**
 * Answers "is this item batch / serial managed?" for codes the cached item
 * master cannot answer for.
 *
 * The cache (SAPB1/Utils/itemMaster.js) is loaded with
 * `$filter=PurchaseItem eq 'tYES'`, so anything produced in-house — a finished
 * good above all, and any semi-finished component — is simply NOT in it.
 * Reading ManageBatchNumbers off a row that is not there gives:
 *
 *     undefined?.ManageBatchNumbers === 'tYES'   // false
 *
 * …which reads as "not batch managed". The line is then posted with no
 * BatchNumbers and SAP answers -4014 "Cannot add row without complete
 * selection of batch/serial numbers" — for an item that is very much batch
 * managed. So every code the cache misses is read on its own.
 *
 * Production Issue and Production Receipt both depend on this, which is why it
 * lives here instead of being copied into each page.
 *
 * @param {string[]} itemCodes  every code the screen currently shows
 * @param {Map} itemByCode      the cached item master, ItemCode -> row
 */
const useItemMasterInfoHook = (itemCodes = [], itemByCode = new Map()) => {
    // Codes read one at a time. A failed read caches `{}` so the effect cannot
    // loop on its own miss.
    const [itemInfo, setItemInfo] = useState({});

    // A string, not an array, so the fetch only re-runs when the set of UNKNOWN
    // codes really changes. It shrinks to '' once they are all resolved, which
    // is what stops the effect re-firing on its own result.
    const unresolvedKey = useMemo(
        () =>
            [
                ...new Set(
                    (itemCodes ?? []).filter(
                        (itemCode) =>
                            itemCode && !itemByCode.has(itemCode) && !(itemCode in itemInfo)
                    )
                ),
            ]
                .sort()
                .join('|'),
        [itemCodes, itemByCode, itemInfo]
    );

    useEffect(() => {
        const codes = unresolvedKey ? unresolvedKey.split('|') : [];
        if (codes.length === 0) return undefined;

        let cancelled = false;
        (async () => {
            const results = await Promise.all(
                // One bad code must not stall the rest — it just resolves to nothing.
                codes.map((itemCode) => getItemMasterInfo(itemCode).catch(() => null))
            );
            if (cancelled) return;
            const resolved = {};
            codes.forEach((itemCode, index) => {
                resolved[itemCode] = results[index] ?? {};
            });
            setItemInfo((prev) => ({ ...prev, ...resolved }));
        })();

        return () => {
            cancelled = true;
        };
    }, [unresolvedKey]);

    // The cache first, then whatever was read on demand.
    const itemMasterOf = useCallback(
        (itemCode) => itemByCode.get(itemCode) ?? itemInfo[itemCode],
        [itemByCode, itemInfo]
    );

    // Only a batch managed item may carry BatchNumbers — B1 rejects the line
    // outright if a non-managed item is sent with a batch collection.
    const isBatchManaged = useCallback(
        (itemCode) => itemMasterOf(itemCode)?.ManageBatchNumbers === 'tYES',
        [itemMasterOf]
    );

    // Serial numbers are a different collection no page here builds. Saying so
    // plainly beats letting SAP answer with the same cryptic -4014.
    const isSerialManaged = useCallback(
        (itemCode) => itemMasterOf(itemCode)?.ManageSerialNumbers === 'tYES',
        [itemMasterOf]
    );

    return { itemInfo, itemMasterOf, isBatchManaged, isSerialManaged };
};

export default useItemMasterInfoHook;
