import apiService from './apiService';
import { getConfig } from '../config';
import { buildAuthHeaders } from '../common/Function';

/**
 * Controller : /api/LoginData
 * Endpoints  : UserLogin (POST) · LoginWiseData (GET) · UserLogOut (GET)
 */

/**
 * Bootstrap headers used by UserLogin only.
 * At login time there is no session yet, so AccessKey / SAPApplicable come
 * from config.xml and UserId / AuthToken are sent empty as the API expects.
 */
function buildBootstrapHeaders() {
    return {
        AccessKey: getConfig('REACT_APP_ACCESS_KEY', ''),
        SAPApplicable: getConfig('REACT_APP_SAP_APPLICABLE', 'N'),
        UserId: 0,
        AuthToken: '',
    };
}

//Note: POST /api/LoginData/UserLogin
export function LoginData(type, PData) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await apiService.post('/LoginData/' + type, PData, {
                headers: buildBootstrapHeaders(),
            });
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
}

//Note: GET /api/LoginData/LoginWiseData?UserId={id}
export function GetLoginWiseData(type, PData, PCookies) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await apiService.get('/LoginData/' + type, {
                params: PData,
                headers: buildAuthHeaders(PCookies),
            });
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
}

//Note: GET /api/LoginData/UserLogOut
export function UserLogOutData(type, PData, PCookies) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await apiService.get('/LoginData/' + type, {
                params: PData,
                headers: buildAuthHeaders(PCookies),
            });
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
}
