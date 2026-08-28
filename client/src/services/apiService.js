import axios from 'axios';
import { AUTH_EVENT } from '../constants/auth';

/**
 * Single axios instance for the whole app.
 * baseURL is injected at bootstrap from /public/config.xml
 * (see main.jsx -> setApiBaseURL) so the same build can be dropped on
 * DEV / UAT / PROD without a rebuild.
 */
const apiService = axios.create({
    timeout: 60000,
    headers: { 'Content-Type': 'application/json' },
});

export function setApiBaseURL(url) {
    apiService.defaults.baseURL = url;
}

/* ── Request interceptor ────────────────────────────────────────
   Services always pass their own headers (house style). This only
   guarantees Content-Type and strips undefined header values that
   would otherwise make axios send the literal string "undefined".
   ─────────────────────────────────────────────────────────────── */
apiService.interceptors.request.use(
    (config) => {
        if (config.headers) {
            Object.keys(config.headers).forEach((key) => {
                if (config.headers[key] === undefined || config.headers[key] === null) {
                    delete config.headers[key];
                }
            });
        }
        return config;
    },
    (error) => Promise.reject(error)
);

/* ── Response interceptor ───────────────────────────────────────
   401 / 403 from the API means the AuthToken is dead (expired,
   logged out elsewhere, or revoked). We cannot call React hooks
   here, so we raise a window event that AuthContext listens for.
   ─────────────────────────────────────────────────────────────── */
apiService.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
            window.dispatchEvent(
                new CustomEvent(AUTH_EVENT.SESSION_EXPIRED, {
                    detail: { status, url: error?.config?.url || '' },
                })
            );
        }
        return Promise.reject(error);
    }
);

export default apiService;
