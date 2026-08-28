/**
 * warehouseTypes.js — WHICH WAREHOUSE IS WHICH?
 *
 * The in-transit flow needs to know three things about the warehouse master:
 * which warehouse goods sit in while they are on the truck, which one damaged
 * goods are written off to, and which ones are real destinations. None of that
 * is hardcoded — it is read from the U_TYPE UDF on the warehouse master, so a
 * new destination is a value in a field rather than a code change.
 *
 *   SIS    a destination / store counter     many
 *   IN     the in-transit warehouse          exactly one
 *   DM     the damaged-goods warehouse       exactly one
 *   blank  an ordinary warehouse (HO, raw)   many
 */

// U_TYPE is typed by hand in SAP, so "in", " IN " and "In" are all the same tag.
const wType = (warehouse) => String(warehouse?.U_TYPE ?? '').trim().toUpperCase();

export const WAREHOUSE_TYPE = { TRANSIT: 'IN', DAMAGED: 'DM', DESTINATION: 'SIS' };

/**
 * True when the warehouse master is actually serving U_TYPE. If NOT ONE
 * warehouse carries a tag the field is not being served (an older server build,
 * or the UDF was never created) — and treating "no tags" as "no destinations"
 * would leave every dropdown in the flow blank with no explanation.
 */
export const hasWarehouseTypes = (warehouses = []) => warehouses.some((wh) => wType(wh) !== '');

/** The single in-transit warehouse, or null when none is tagged. */
export const findTransitWarehouse = (warehouses = []) =>
    warehouses.find((wh) => wType(wh) === WAREHOUSE_TYPE.TRANSIT) ?? null;

/** The single damaged-goods warehouse, or null when none is tagged. */
export const findDamagedWarehouse = (warehouses = []) =>
    warehouses.find((wh) => wType(wh) === WAREHOUSE_TYPE.DAMAGED) ?? null;

/**
 * The warehouses a dispatch may be addressed to. Transit and damaged are never
 * destinations — a note addressed to transit is a note addressed to nowhere.
 * Untagged companies fall back to every warehouse (see hasWarehouseTypes).
 */
export const destinationWarehouses = (warehouses = []) => {
    if (!hasWarehouseTypes(warehouses)) return warehouses;
    return warehouses.filter(
        (wh) => wType(wh) !== WAREHOUSE_TYPE.TRANSIT && wType(wh) !== WAREHOUSE_TYPE.DAMAGED
    );
};

/** [{ value, label }] for the Modal's Select / SearchableSelect fields. */
export const toWarehouseOptions = (warehouses = []) =>
    warehouses.map((warehouse) => ({
        value: warehouse.WarehouseCode,
        label: `${warehouse.WarehouseCode} — ${warehouse.WarehouseName}`,
    }));
