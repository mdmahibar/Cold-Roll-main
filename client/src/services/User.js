import apiService from './apiService';
import { buildAuthHeaders } from '../common/Function';

/**
 * Controller : /api/User
 * Endpoints  : GetAllUser · GetUser?UserId · InsertUser (POST)
 *              UpdateUser (PUT) · DeleteUser (DELETE ?UserId)
 *              ChangePassword (POST)
 */

//Note: GET /api/User/GetAllUser
export function GetAllUserListData(type, PData, PCookies) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await apiService.get('/User/' + type, {
                params: PData,
                headers: buildAuthHeaders(PCookies),
            });
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
}

//Note: GET /api/User/GetUser?UserId={id}
export function GetUserData(type, PData, PCookies) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await apiService.get('/User/' + type, {
                params: PData,
                headers: buildAuthHeaders(PCookies),
            });
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
}

//Note: POST /api/User/InsertUser
export function InsertUserData(type, PData, PCookies) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await apiService.post('/User/' + type, PData, {
                headers: buildAuthHeaders(PCookies),
            });
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
}

//Note: PUT /api/User/UpdateUser
export function UpdateUserData(type, PData, PCookies) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await apiService.put('/User/' + type, PData, {
                headers: buildAuthHeaders(PCookies),
            });
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
}

//Note: DELETE /api/User/DeleteUser?UserId={id}
export function DeleteUserData(type, PData, PCookies) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await apiService.delete('/User/' + type, {
                params: PData,
                headers: buildAuthHeaders(PCookies),
            });
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
}

//Note: POST /api/User/ChangePassword
export function ChangePasswordData(type, PData, PCookies) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await apiService.post('/User/' + type, PData, {
                headers: buildAuthHeaders(PCookies),
            });
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
}
