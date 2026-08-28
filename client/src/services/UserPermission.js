import apiService from './apiService';
import { buildAuthHeaders } from '../common/Function';

/**
 * Controller : /api/UserPermission
 * Endpoints  : PostPermission (POST, role + user in one payload)
 *              PostRolePermission (POST, array)
 *              PostUserPermission (POST, array)
 *              GetUserWiseMenu?UserId · GetRoleWiseMenu?RoleId
 */

//Note: POST /api/UserPermission/PostPermission
//      Body: { roleWiseMenus: [...], userWiseMenus: [...] }
export function PostPermissionData(type, PData, PCookies) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await apiService.post('/UserPermission/' + type, PData, {
                headers: buildAuthHeaders(PCookies),
            });
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
}

//Note: POST /api/UserPermission/PostRolePermission — Body: array of role rows
export function PostRolePermissionData(type, PData, PCookies) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await apiService.post('/UserPermission/' + type, PData, {
                headers: buildAuthHeaders(PCookies),
            });
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
}

//Note: POST /api/UserPermission/PostUserPermission — Body: array of user rows
export function PostUserPermissionData(type, PData, PCookies) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await apiService.post('/UserPermission/' + type, PData, {
                headers: buildAuthHeaders(PCookies),
            });
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
}

//Note: GET /api/UserPermission/GetUserWiseMenu?UserId={id}
export function GetUserWiseMenuData(type, PData, PCookies) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await apiService.get('/UserPermission/' + type, {
                params: PData,
                headers: buildAuthHeaders(PCookies),
            });
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
}

//Note: GET /api/UserPermission/GetRoleWiseMenu?RoleId={id}
export function GetRoleWiseMenuData(type, PData, PCookies) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await apiService.get('/UserPermission/' + type, {
                params: PData,
                headers: buildAuthHeaders(PCookies),
            });
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
}
