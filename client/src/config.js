// src/config.js
let configData = null;

export async function loadConfig() {
  const defaults = {
    REACT_APP_API_ROOT: import.meta.env.VITE_API_ROOT || '',
    REACT_APP_NAME: import.meta.env.VITE_APP_NAME || 'SAP B1 Extension',
    REACT_APP_ACCESS_KEY: import.meta.env.VITE_ACCESS_KEY || '',
    REACT_APP_SAP_APPLICABLE: import.meta.env.VITE_SAP_APPLICABLE || 'N',
    REACT_APP_ENFORCE_PERMISSIONS: import.meta.env.VITE_ENFORCE_PERMISSIONS || 'Y',
  };

  try {
    const url = '/config.xml';
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('config.xml not found (status ' + res.status + ')');
    const text = await res.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'application/xml');

    const parsed = {};
    const children = xml.documentElement ? xml.documentElement.children : [];
    for (let i = 0; i < children.length; i += 1) {
      const node = children[i];
      parsed[node.nodeName] = (node.textContent || '').trim();
    }

    configData = { ...defaults, ...parsed };
    if (typeof window !== 'undefined') window.__APP_CONFIG__ = configData;
    return configData;
  } catch (err) {
    console.warn('Failed to load config.xml; using build-time envs', err);
    configData = { ...defaults };
    if (typeof window !== 'undefined') window.__APP_CONFIG__ = configData;
    return configData;
  }
}

export function getConfig(key, fallback = undefined) {
  if (!configData) {
    return fallback;
  }
  return configData[key] ?? fallback;
}
