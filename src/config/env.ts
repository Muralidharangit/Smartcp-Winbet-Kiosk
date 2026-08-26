/** API config for the Tauri kiosk — set in `kiosk/Kiosk-tauri/.env` before build. */

/** iccpanel API root including `/api` (no portal slug). Example: http://127.0.0.1:8000/api */
export const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api').replace(/\/$/, '')

/** Default portal slug when registration has not set one yet. */
export const DEFAULT_PORTAL_SLUG = (import.meta.env.VITE_PORTAL_SLUG as string | undefined)?.trim() || ''

const PORTAL_SLUG_KEY = 'kiosk-portal-slug'

export function getPortalSlug(): string {
  if (typeof window === 'undefined') return DEFAULT_PORTAL_SLUG
  return (
    localStorage.getItem(PORTAL_SLUG_KEY) ||
    sessionStorage.getItem(PORTAL_SLUG_KEY) ||
    DEFAULT_PORTAL_SLUG
  )
}

export function setPortalSlug(slug: string): void {
  const value = slug.trim()
  if (!value) return
  localStorage.setItem(PORTAL_SLUG_KEY, value)
  sessionStorage.setItem(PORTAL_SLUG_KEY, value)
}

export function clearPortalSlug(): void {
  localStorage.removeItem(PORTAL_SLUG_KEY)
  sessionStorage.removeItem(PORTAL_SLUG_KEY)
}

/** Full kiosk API base: /api/v1/{portal_slug}/kiosk */
export function getKioskApiBaseUrl(portalSlug = getPortalSlug()): string {
  const slug = portalSlug.trim()
  if (!slug) {
    return `${API_ORIGIN}/v1/_unset_/kiosk`
  }
  return `${API_ORIGIN}/v1/${encodeURIComponent(slug)}/kiosk`
}

/** @deprecated use getKioskApiBaseUrl — kept for older imports */
export const API_BASE_URL = getKioskApiBaseUrl()
