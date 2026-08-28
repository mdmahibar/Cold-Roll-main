import apiService from './apiService';
import { buildAuthHeaders } from '../common/Function';

/**
 * Controller : /api/Menu
 * Endpoints  : GetAllMenu · GetMenu?MenuId · InsertMenu (POST)
 *              UpdateMenu (PUT) · DeleteMenu (DELETE ?MenuId)
 */

//Note: GET /api/Menu/GetAllMenu
export function GetAllMenuListData(type, PData, PCookies) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await apiService.get('/Menu/' + type, {
                params: PData,
                headers: buildAuthHeaders(PCookies),
            });
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
}

//Note: GET /api/Menu/GetMenu?MenuId={id}
export function GetMenuData(type, PData, PCookies) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await apiService.get('/Menu/' + type, {
                params: PData,
                headers: buildAuthHeaders(PCookies),
            });
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
}

//Note: POST /api/Menu/InsertMenu
export function InsertMenuData(type, PData, PCookies) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await apiService.post('/Menu/' + type, PData, {
                headers: buildAuthHeaders(PCookies),
            });
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
}

//Note: PUT /api/Menu/UpdateMenu
export function UpdateMenuData(type, PData, PCookies) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await apiService.put('/Menu/' + type, PData, {
                headers: buildAuthHeaders(PCookies),
            });
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
}

//Note: DELETE /api/Menu/DeleteMenu?MenuId={id}
export function DeleteMenuData(type, PData, PCookies) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await apiService.delete('/Menu/' + type, {
                params: PData,
                headers: buildAuthHeaders(PCookies),
            });
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
}
