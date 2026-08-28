import apiService from './apiService';
import { buildAuthHeaders } from '../common/Function';

/**
 * Controller : /api/Role
 * Endpoints  : GetAllRole · GetRole?RoleId · InsertRole (POST)
 *              UpdateRole (PUT) · DeleteRole (DELETE ?RoleId)
 */

//Note: GET /api/Role/GetAllRole
export function GetAllRoleListData(type, PData, PCookies) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await apiService.get('/Role/' + type, {
                params: PData,
                headers: buildAuthHeaders(PCookies),
            });
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
}

//Note: GET /api/Role/GetRole?RoleId={id}
export function GetRoleData(type, PData, PCookies) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await apiService.get('/Role/' + type, {
                params: PData,
                headers: buildAuthHeaders(PCookies),
            });
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
}

//Note: POST /api/Role/InsertRole
export function InsertRoleData(type, PData, PCookies) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await apiService.post('/Role/' + type, PData, {
                headers: buildAuthHeaders(PCookies),
            });
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
}

//Note: PUT /api/Role/UpdateRole
export function UpdateRoleData(type, PData, PCookies) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await apiService.put('/Role/' + type, PData, {
                headers: buildAuthHeaders(PCookies),
            });
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
}

//Note: DELETE /api/Role/DeleteRole?RoleId={id}
export function DeleteRoleData(type, PData, PCookies) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await apiService.delete('/Role/' + type, {
                params: PData,
                headers: buildAuthHeaders(PCookies),
            });
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
}
