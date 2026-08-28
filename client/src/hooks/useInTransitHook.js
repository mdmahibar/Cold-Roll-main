import { useCallback, useEffect, useRef, useState } from "react";
import { readInTransitLedger } from "../SAPB1/StockTransfers/StockTransferServices";

const EMPTY_LEDGER = { byStore: [], notes: [], totalPending: 0 };

/**
 * useInTransitHook — how much of the transit warehouse belongs to each
 * destination, and against which dispatch note.
 *
 * Deliberately NOT persisted to a zustand store like the other masters here.
 * Acting on a cached ledger means offering a store stock that another till
 * received a minute ago, so every mount re-reads: a receipt page must never
 * seed itself from a stale pending figure. `refreshing` says a background
 * re-read is running, so the page can show "⏳ Syncing…" instead of blanking.
 *
 * @param {{ enabled?: boolean }} [options] pass false to hold the read back
 *        until the page actually needs it.
 */
const useInTransitHook = ({ enabled = true } = {}) => {
    const [ledger, setLedger] = useState(EMPTY_LEDGER);
    // First load only — a background re-read must not blank the screen, so the
    // pages drive their blocking overlay off `loading` and never `refreshing`.
    const [loading, setLoading] = useState(enabled);
    const [refreshing, setRefreshing] = useState(false);
    const loadedOnce = useRef(false);

    // The first read lives in the effect below so nothing is set synchronously
    // during it; this one is for the explicit refreshes — the sync button, and
    // the reload after a receipt posts.
    const refreshLedger = useCallback(async () => {
        if (loadedOnce.current) setRefreshing(true);
        else setLoading(true);
        try {
            const next = await readInTransitLedger();
            setLedger(next ?? EMPTY_LEDGER);
            loadedOnce.current = true;
            return next ?? EMPTY_LEDGER;
        } catch (error) {
            console.log("Error building the in-transit ledger", error);
            return null;
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (!enabled) return undefined;

        let cancelled = false;
        const load = async () => {
            try {
                const next = await readInTransitLedger();
                if (cancelled) return;
                setLedger(next ?? EMPTY_LEDGER);
                loadedOnce.current = true;
            } catch (error) {
                console.log("Error building the in-transit ledger", error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();

        return () => {
            cancelled = true;
        };
    }, [enabled]);

    // The pending note behind one DocEntry — what the receipt page seeds from.
    const noteFor = useCallback(
        (docEntry) =>
            ledger.notes.find((note) => String(note.DocEntry) === String(docEntry)) ?? null,
        [ledger]
    );

    return {
        ledger,
        notes: ledger.notes,
        byStore: ledger.byStore,
        loading,
        refreshing,
        refreshLedger,
        noteFor,
    };
};

export default useInTransitHook;
