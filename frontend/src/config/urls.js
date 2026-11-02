/**
 * Single source of truth for API and server URLs.
 *
 * Override with `.env` / `.env.local` (optional), e.g. for local backend:
 *   VITE_API_BASE_URL=http://localhost:5000/api
 *   VITE_SERVER_ORIGIN=http://localhost:5000
 *
 * If only VITE_SERVER_ORIGIN is set, API base defaults to `${origin}/api`.
 * If VITE_API_BASE_URL is set, SERVER_ORIGIN defaults to stripping trailing `/api`.
 */

const trimEndSlash = (s) => String(s || "").replace(/\/+$/, "");

/** Local API host — used when no VITE_* vars are set */
const DEFAULT_SERVER_ORIGIN = "http://localhost:5000";

const rawServer = (import.meta.env.VITE_SERVER_ORIGIN || "").trim();
const rawApi = (import.meta.env.VITE_API_BASE_URL || "").trim();

let serverOrigin;
let apiBaseUrl;

if (rawApi) {
  apiBaseUrl = trimEndSlash(rawApi);
  serverOrigin = rawServer
    ? trimEndSlash(rawServer)
    : trimEndSlash(apiBaseUrl.replace(/\/api\/?$/i, "")) || DEFAULT_SERVER_ORIGIN;
} else if (rawServer) {
  serverOrigin = trimEndSlash(rawServer);
  apiBaseUrl = `${serverOrigin}/api`;
} else {
  serverOrigin = DEFAULT_SERVER_ORIGIN;
  apiBaseUrl = `${serverOrigin}/api`;
}

/** Axios `baseURL` — includes `/api` suffix */
export const API_BASE_URL = apiBaseUrl;

/** Backend origin without `/api` — static files, uploads, image URLs */
export const SERVER_ORIGIN = serverOrigin;

/** Vite app base path (e.g. `/` or `/app/`) */
export const APP_BASE_PATH = import.meta.env.BASE_URL || "/";

/** Current browser origin where the SPA is served (empty during SSR) */
export function getAppOrigin() {
  return typeof window !== "undefined" ? window.location.origin : "";
}

/**
 * Absolute URL under the API base.
 * @param {string} path - e.g. `customers` or `/customers` or `auth/login`
 */
export function apiUrl(path = "") {
  const base = trimEndSlash(API_BASE_URL);
  const p = String(path || "").replace(/^\/+/, "");
  return p ? `${base}/${p}` : base;
}

/**
 * Absolute URL on the server for paths like `/uploads/...` or relative logo paths.
 */
export function serverAssetUrl(path) {
  if (!path) return "";
  const s = String(path).trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  const withSlash = s.startsWith("/") ? s : `/${s}`;
  return `${trimEndSlash(SERVER_ORIGIN)}${withSlash}`;
}
