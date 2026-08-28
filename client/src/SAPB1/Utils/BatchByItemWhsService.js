import { getSapAll } from '../auth/login.js';

/**
 * Fetch batch numbers for a given item + warehouse using the SAP B1
 * SQL Query "GetBatchByItemWhs".
 *
 * GET /SQLQueries('GetBatchByItemWhs')/List?ItemCode='...'&whsCode='...'
 *
 * Each row in the response carries:
 *   { ItemCode, BatchNum, WhsCode, Quantity }
 *
 * @param {string} itemCode  The SAP item code.
 * @param {string} whsCode   The warehouse code.
 * @returns {Promise<Array>}  Array of batch rows.
 */
export async function getBatchByItemWhs(itemCode, whsCode) {
    const route = `/SQLQueries('GetBatchByItemWhs')/List?ItemCode='${itemCode}'&whsCode='${whsCode}'`;
    return getSapAll(route);
}
