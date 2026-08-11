/** API config for the Tauri terminal — set in `tauri-client/.env` before build. */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api'

export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '')
