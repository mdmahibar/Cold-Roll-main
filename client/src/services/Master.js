import apiService from './apiService';
import { buildAuthHeaders } from '../common/Function';

/**
 * Controller : /api/Master
 * Endpoints  : GetAllDivision · GetAllLocation · GetAllSAPUser
 */

//Note: Generic master GET — pass the endpoint name as `type`
export function GetMasterData(type, PData, PCookies) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await apiService.get('/Master/' + type, {
                params: PData,
                headers: buildAuthHeaders(PCookies),
            });
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
}

//Note: Named convenience wrappers
export const GetAllDivisionListData = (PData, PCookies) => GetMasterData('GetAllDivision', PData, PCookies);
export const GetAllLocationListData = (PData, PCookies) => GetMasterData('GetAllLocation', PData, PCookies);
export const GetAllSAPUserListData = (PData, PCookies) => GetMasterData('GetAllSAPUser', PData, PCookies);
