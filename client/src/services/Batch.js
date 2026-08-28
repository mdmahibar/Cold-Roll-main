import apiService from './apiService';
import { buildAuthHeaders } from '../common/Function';

/**
 * Controller : /api/Common
 * Endpoints  : WarehouseWiseBatchOfItem
 */

//Note: PData => { Division, Location, ItemCode, WareHouseCode, CompanyCode }
export function GetWarehouseWiseBatchOfItemData(PData, PCookies) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await apiService.get('/Common/WarehouseWiseBatchOfItem', {
                params: PData,
                headers: buildAuthHeaders(PCookies),
            });
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
}

// InDate arrives as dd-MM-yyyy ("19-08-2026"), which no Date parser reads
// correctly on its own. An undated batch sorts last so it is consumed only
// after every dated one.
function inDateTime(inDate) {
    const [day, month, year] = String(inDate ?? '').split('-');
    const time = Date.parse(`${year}-${month}-${day}`);
    return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

/**
 * Batch stock of ONE item in ONE warehouse, shaped the way the document lines
 * and the BatchPicker read it: { ItemCode, BatchNum, WhsCode, Quantity, InDate }.
 * A batch with nothing left is no use to a document, so it is dropped here.
 * Rows come back FIFO — oldest InDate first — so allocating a quantity always
 * consumes the earliest received batch before it touches a newer one.
 */
export async function getWarehouseWiseBatchOfItem(itemCode, wareHouseCode, PCookies) {
    if (!itemCode || !wareHouseCode) return [];
    const response = await GetWarehouseWiseBatchOfItemData(
        { ItemCode: itemCode, WareHouseCode: wareHouseCode },
        PCookies
    );
    const rows = Array.isArray(response?.data) ? response.data : [];
    return rows
        .map((row) => ({
            ItemCode: row.ItemCode,
            BatchNum: String(row.BatchNo ?? ''),
            WhsCode: row.WarehouseCode,
            Quantity: Number(row.Stock) || 0,
            InDate: row.InDate ?? '',
        }))
        .filter((row) => row.BatchNum && row.Quantity > 0)
        .sort((a, b) => inDateTime(a.InDate) - inDateTime(b.InDate));
}
