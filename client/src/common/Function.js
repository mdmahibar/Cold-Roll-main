import CryptoJS from 'crypto-js';
import { COOKIE, STORAGE } from '../constants/auth';

const secretKey = '11BBW2VOY0vWcZSX6qAg3u_EWXXkgZBpX54Cmd94PT5WcEJJ3ARmURpV3RrbqnrnmI45KMBB2MBX29f1dz';

/* ═══════════════════════════════════════════════════════════════
   Encryption helpers
   ═══════════════════════════════════════════════════════════════ */

export function encryptData(data) {
    if (data === undefined || data === null) return '';
    const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(data), secretKey).toString();
    return ciphertext;
}

export function decryptData(encryptedData) {
    if (!encryptedData) return null;
    const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    return decryptedData;
}

/**
 * decryptData() throws when the cookie is tampered with or was written by an
 * older build. Services must never crash the whole page because of that, so
 * every read inside this app goes through safeDecrypt().
 */
export function safeDecrypt(encryptedData, fallback = '') {
    try {
        const value = decryptData(encryptedData);
        return value === null || value === undefined ? fallback : value;
    } catch {
        return fallback;
    }
}

/* ═══════════════════════════════════════════════════════════════
   Auth header builder — the single source of truth for the four
   headers every secured endpoint of this API requires:
   AccessKey / UserId / AuthToken / SAPApplicable
   ═══════════════════════════════════════════════════════════════ */

export function buildAuthHeaders(PCookies = {}) {
    const pAccessKey = safeDecrypt(PCookies[COOKIE.ACCESS_KEY], '');
    const pUserId = parseInt(PCookies[COOKIE.USER_ID], 10) || 0;
    const pAuthToken = safeDecrypt(PCookies[COOKIE.AUTH_TOKEN], '');
    const pSAPApplicable = safeDecrypt(PCookies[COOKIE.SAP_APPLICABLE], 'N');

    return {
        AccessKey: pAccessKey,
        UserId: pUserId,
        AuthToken: pAuthToken,
        SAPApplicable: pSAPApplicable,
    };
}

/**
 * Returns true when the cookie jar carries a usable session. Used by the
 * AuthContext bootstrap and by ProtectedRoute.
 */
export function hasAuthCookies(PCookies = {}) {
    const { UserId, AuthToken } = buildAuthHeaders(PCookies);
    return Boolean(UserId) && Boolean(AuthToken);
}

/* ═══════════════════════════════════════════════════════════════
   Encrypted sessionStorage — for payloads too large for a cookie
   (permission matrix, login-wise master data, user profile)
   ═══════════════════════════════════════════════════════════════ */

export function setSecureItem(key, value) {
    try {
        sessionStorage.setItem(key, encryptData(value));
    } catch {
        /* storage full / disabled — session simply won't be restorable */
    }
}

export function getSecureItem(key, fallback = null) {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return fallback;
        return safeDecrypt(raw, fallback);
    } catch {
        return fallback;
    }
}

export function clearSecureStorage() {
    Object.values(STORAGE).forEach((key) => {
        try {
            sessionStorage.removeItem(key);
        } catch {
            /* ignore */
        }
    });
}

/* ═══════════════════════════════════════════════════════════════
   Misc helpers
   ═══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════
   Date conversion — SAP B1 ⇄ UI

   SAP side  : 'YYYY-MM-DD' (what the Service Layer accepts in a
               payload). Reading, it also hands back full ISO
               stamps, OData '/Date(ms)/' epochs and compact
               'YYYYMMDD' from SQL queries — all are understood.
   UI side   : 'DD-MM-YYYY' — the format tables and printed docs
               show throughout this app.
   ═══════════════════════════════════════════════════════════════ */

const pad2 = (value) => String(value).padStart(2, '0');

/** Rejects impossible calendar dates ('2026-02-30') instead of silently rolling them over. */
const buildDateParts = (year, month, day) => {
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;

    const probe = new Date(Date.UTC(y, m - 1, d));
    if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) {
        return null;
    }
    return { y: String(y).padStart(4, '0'), m: pad2(m), d: pad2(d) };
};

/** A Date built by app code carries local wall-clock intent (e.g. `new Date()`). */
const partsFromLocalDate = (date) =>
    Number.isNaN(date.getTime())
        ? null
        : buildDateParts(date.getFullYear(), date.getMonth() + 1, date.getDate());

/** SAP epochs are always UTC midnight, so read them back in UTC. */
const partsFromUtcDate = (date) =>
    Number.isNaN(date.getTime())
        ? null
        : buildDateParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());

const parseSapDate = (value) => {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date) return partsFromLocalDate(value);

    const raw = String(value).trim();
    if (!raw) return null;

    // OData v2 epoch stamp: '/Date(1753574400000)/'
    const epoch = raw.match(/^\/Date\((-?\d+)/);
    if (epoch) return partsFromUtcDate(new Date(Number(epoch[1])));

    // '2026-07-27', '2026-07-27T00:00:00Z', '2026/07/27'
    const iso = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (iso) return buildDateParts(iso[1], iso[2], iso[3]);

    // Compact form returned by raw SQL / HANA views: '20260727'
    const compactIso = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (compactIso) return buildDateParts(compactIso[1], compactIso[2], compactIso[3]);

    return null;
};

/**
 * SAP → UI. Returns 'DD-MM-YYYY', or '' when there is nothing sensible to
 * show, so it can be dropped straight into JSX.
 *
 *   sapToUiDate('2026-07-27T00:00:00Z')  // '27-07-2026'
 *   sapToUiDate('20260727')              // '27-07-2026'
 *   sapToUiDate(null)                    // ''
 */
export const sapToUiDate = (value) => {
    const parts = parseSapDate(value);
    return parts ? `${parts.d}-${parts.m}-${parts.y}` : '';
};

/**
 * UI → SAP. Returns 'YYYY-MM-DD', or `undefined` when the input is blank or
 * unparseable — that way compact()/spread drops the key rather than POSTing
 * an empty string, which B1 rejects.
 *
 * Also accepts values already in SAP shape (ISO stamps, `<input type="date">`
 * values), so it is safe to call on a field of unknown provenance.
 *
 *   uiToSapDate('27-07-2026')            // '2026-07-27'
 *   uiToSapDate('2026-07-27')            // '2026-07-27'
 *   uiToSapDate('')                      // undefined
 */
export const uiToSapDate = (value) => {
    let parts = null;

    if (typeof value === 'string') {
        // '27-07-2026' / '27/07/2026' — day-first, which parseSapDate won't touch.
        const ui = value.trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
        if (ui) parts = buildDateParts(ui[3], ui[2], ui[1]);
    }
    if (!parts) parts = parseSapDate(value);

    return parts ? `${parts.y}-${parts.m}-${parts.d}` : undefined;
};

/** @deprecated Use sapToUiDate() — it handles ISO stamps and epochs too. */
export const reverseDateString = (dateString) => sapToUiDate(dateString);

/** '/Users/' -> '/users'  ·  'users' -> '/users' — used for permission lookups */
export const normalizePath = (path) => {
    if (!path) return '';
    let p = String(path).trim().toLowerCase();
    if (!p.startsWith('/')) p = `/${p}`;
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p;
};

/** Backend sends 'Y' / 'N' strings — normalise them to real booleans. */
export const toBool = (flag) => flag === true || flag === 'Y' || flag === 'y' || flag === 1 || flag === '1';

/** Reverse of toBool, for request payloads. */
export const toFlag = (value) => (value ? 'Y' : 'N');

/**
 * The API sometimes replies with an array, sometimes with a bare object,
 * and sometimes with { Table: [...] }. This normalises all three.
 */
export const unwrapResponse = (response) => {
    const data = response?.data ?? response;
    if (Array.isArray(data)) return data[0] ?? null;
    if (data && Array.isArray(data.Table)) return data.Table[0] ?? null;
    return data ?? null;
};

export const unwrapList = (response) => {
    const data = response?.data ?? response;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.Table)) return data.Table;
    return [];
};


//! Unique sequence for batch & serial numbers generation

export function getTimestamp() {
  const now = new Date();

  const pad = (n) => String(n).padStart(2, "0");

  return (
    pad(now.getDate()) +
    pad(now.getMonth() + 1) +
    now.getFullYear() +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

export function generateBatchNumber(timestamp, lineNum) {
  return `Batch-${timestamp}@${lineNum}`;
}

export function generateSerialNumber(timestamp, lineNum) {
  return `Serial-${timestamp}@${lineNum}`;
}

export function generateBatchNumber2(sequence) {
  const now = new Date();

  const year = now.getFullYear();

  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = `${day}${month}${year}`;

  const seq = String(sequence).padStart(3, '0');

  return [`Batch-${year}-${date}-${seq}`];
}

console.log(generateBatchNumber(1));
// Batch-2026-10082026-001

console.log(generateBatchNumber(2));
// Batch-2026-10082026-002


export function generateSerialNumber2(sequence) {
  const now = new Date();

  const year = now.getFullYear();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const date = `${day}${month}${year}`;
  const seq = String(sequence).padStart(3, '0');

  return [`Serial-${year}-${date}-${seq}`];
}

console.log(generateSerialNumber(1));
// Serial-2026-10082026-001

console.log(generateSerialNumber(2));
// Serial-2026-10082026-002