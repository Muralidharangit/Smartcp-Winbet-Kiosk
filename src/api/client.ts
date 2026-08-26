import { getKioskApiBaseUrl, getPortalSlug, setPortalSlug } from '../config/env'
import { loadTerminal } from '../lib/storage'

function resolvePortalSlug(explicit?: string): string {
  const fromArg = explicit?.trim()
  if (fromArg) return fromArg
  const fromStore = getPortalSlug().trim()
  if (fromStore) return fromStore
  const stored = loadTerminal()?.portalSlug?.trim()
  if (stored) {
    setPortalSlug(stored)
    return stored
  }
  return ''
}

function apiBase(portalSlug?: string): string {
  return getKioskApiBaseUrl(resolvePortalSlug(portalSlug))
}

export type TerminalRegistration = {
  success: boolean
  message: string
  machine_id: string
  hostname: string
  pc_name: string
  site_id: number
  site_name: string
  status: string
  portal_slug?: string
}

export type TerminalSession = {
  machine_id: string
  hostname: string
  pc_name: string
  site_id: number
  site_name: string
  status: string
  current_balance: number
  loaded_amount: number
  portal_slug?: string
}

type ApiSuccess<T> = { success: true; data: T; message?: string }
type ApiError = {
  success: false
  message: string
  errors?: { code?: string; device_fingerprint?: string | string[] }
}

function firstErrorValue(value: unknown): string | undefined {
  if (typeof value === 'string' && value) return value
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0]) return value[0]
  return undefined
}

export class TerminalApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'TerminalApiError'
    this.status = status
    this.code = code
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.json()
  if (!response.ok) {
    let message =
      typeof body === 'object' && body !== null && 'message' in body
        ? String((body as { message: unknown }).message)
        : `Request failed (${response.status})`

    if (
      typeof body === 'object' &&
      body !== null &&
      'errors' in body &&
      typeof (body as ApiError).errors === 'object' &&
      (body as ApiError).errors !== null
    ) {
      const firstFieldError = Object.values((body as ApiError).errors as Record<string, string[]>)
        .flat()
        .find(Boolean)
      if (firstFieldError) {
        message = firstFieldError
      }
    }

    const errors =
      typeof body === 'object' &&
      body !== null &&
      'errors' in body &&
      typeof (body as ApiError).errors === 'object' &&
      (body as ApiError).errors !== null
        ? (body as ApiError).errors
        : undefined
    const code =
      errors?.code ||
      firstErrorValue(errors?.device_fingerprint) ||
      undefined
    throw new TerminalApiError(message, response.status, code)
  }
  return body as T
}

type RegisterApiData = {
  machine_id: string
  hostname?: string
  terminal_name?: string
  pc_name?: string
  site_id?: number
  shop_id?: number
  site_name?: string
  shop_name?: string
  status: string
}

export async function registerTerminal(input: {
  registration_token: string
  device_fingerprint: string
  operating_system: string
  portal_slug: string
}): Promise<TerminalRegistration> {
  const portalSlug = input.portal_slug.trim()
  setPortalSlug(portalSlug)

  const response = await fetch(`${apiBase(portalSlug)}/kiosks/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      registration_token: input.registration_token,
      device_fingerprint: input.device_fingerprint,
      operating_system: input.operating_system,
    }),
  })

  const body = await parseJson<ApiSuccess<RegisterApiData> & { message?: string }>(response)
  if (!body.success || !body.data) {
    throw new TerminalApiError(body.message || 'Registration failed', response.status)
  }

  const data = body.data
  const hostname = data.hostname || data.terminal_name || data.pc_name || data.machine_id
  const siteName = data.site_name || data.shop_name || ''

  return {
    success: true,
    message: body.message || 'Registration successful',
    machine_id: data.machine_id,
    hostname,
    pc_name: hostname,
    site_id: data.site_id ?? data.shop_id ?? 0,
    site_name: siteName,
    status: data.status,
    portal_slug: portalSlug,
  }
}

export async function fetchSession(
  machineId: string,
  hardwareId: string,
): Promise<TerminalSession> {
  const params = new URLSearchParams({
    machine_id: machineId,
    device_fingerprint: hardwareId,
  })
  const response = await fetch(`${apiBase()}/kiosks/session?${params}`, {
    headers: { Accept: 'application/json' },
  })

  const body = await parseJson<
    ApiSuccess<TerminalSession & { shop_name?: string; terminal_name?: string }> | ApiError
  >(response)
  if (!body.success) {
    throw new TerminalApiError(body.message, response.status)
  }

  const data = body.data
  if (data.portal_slug) {
    setPortalSlug(data.portal_slug)
  }

  return {
    ...data,
    hostname: data.hostname || data.terminal_name || data.pc_name,
    pc_name: data.pc_name || data.hostname || data.terminal_name || data.machine_id,
    site_name: data.site_name || data.shop_name || '',
  }
}

export async function sendHeartbeat(
  machineId: string,
  hardwareId: string,
  status: 'ONLINE' | 'OFFLINE',
): Promise<void> {
  const response = await fetch(`${apiBase()}/kiosks/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      machine_id: machineId,
      device_fingerprint: hardwareId,
      status,
    }),
  })

  const body = await parseJson<ApiSuccess<{ portal_slug?: string }>>(response)
  if (body.data?.portal_slug) {
    setPortalSlug(body.data.portal_slug)
  }
}

export type BetResult = {
  game: string
  game_name: string
  choice: string
  result: string
  won: boolean
  stake: number
  payout: number
  multiplier: number
  current_balance: number
  message: string
  /** Game round number shown on terminal and Account Statement Desc (not DB id). */
  round_id: string
  transaction_id?: number
}

export type GameCatalogItem = {
  id: string
  name: string
  category: string
  description: string
  payout_label: string
  choices: string[]
}

export async function fetchGames(): Promise<GameCatalogItem[]> {
  const response = await fetch(`${apiBase()}/kiosks/games`, {
    headers: { Accept: 'application/json' },
  })
  const body = await parseJson<ApiSuccess<GameCatalogItem[]> | ApiError>(response)
  if (!body.success) {
    throw new TerminalApiError(body.message, response.status)
  }
  return body.data
}

export async function placeBet(
  machineId: string,
  hardwareId: string,
  game: string,
  choice: string,
  stake: number,
): Promise<BetResult> {
  const response = await fetch(`${apiBase()}/kiosks/place-bet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      machine_id: machineId,
      device_fingerprint: hardwareId,
      game,
      choice,
      stake,
    }),
  })

  const body = await parseJson<ApiSuccess<BetResult> | ApiError>(response)
  if (!body.success) {
    throw new TerminalApiError(body.message, response.status)
  }
  return body.data
}

export type BillInResult = {
  machine_id: string
  amount: number
  current_balance: number
  status: string
}

export type CashOutTicketResult = {
  ticket_id: number
  barcode: string
  amount: number
  issued_at?: string
  print_lines: string[]
  current_balance: number
}

export type TicketInResult = {
  barcode: string
  amount: number
  current_balance: number
  status: string
  message: string
}

/** Bill acceptor cash-in (real note accepted). */
export async function billIn(
  machineId: string,
  hardwareId: string,
  amount: number,
): Promise<BillInResult> {
  const response = await fetch(`${apiBase()}/kiosks/bill-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      machine_id: machineId,
      device_fingerprint: hardwareId,
      amount,
    }),
  })

  const body = await parseJson<ApiSuccess<BillInResult> | ApiError>(response)
  if (!body.success) {
    throw new TerminalApiError(body.message, response.status)
  }
  return body.data
}

/** Cash-out: clear balance and issue a printable barcode ticket. */
export async function cashOutTicket(
  machineId: string,
  hardwareId: string,
): Promise<CashOutTicketResult> {
  const response = await fetch(`${apiBase()}/kiosks/cashout-ticket`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      machine_id: machineId,
      device_fingerprint: hardwareId,
    }),
  })

  const body = await parseJson<ApiSuccess<CashOutTicketResult> | ApiError>(response)
  if (!body.success) {
    throw new TerminalApiError(body.message, response.status)
  }
  return body.data
}

/** Print failed — void ticket and restore credit to the kiosk. */
export async function cancelCashOutTicket(
  machineId: string,
  hardwareId: string,
  barcode: string,
): Promise<{ barcode: string; amount: number; current_balance: number; message: string }> {
  const response = await fetch(`${apiBase()}/kiosks/cashout-ticket/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      machine_id: machineId,
      device_fingerprint: hardwareId,
      barcode,
    }),
  })

  const body = await parseJson<
    | ApiSuccess<{ barcode: string; amount: number; current_balance: number; message: string }>
    | ApiError
  >(response)
  if (!body.success) {
    throw new TerminalApiError(body.message, response.status)
  }
  return body.data
}

/** Ticket-in: scan barcode on kiosk scanner → credit this kiosk. */
export async function ticketIn(
  machineId: string,
  hardwareId: string,
  barcode: string,
): Promise<TicketInResult> {
  const response = await fetch(`${apiBase()}/kiosks/ticket-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      machine_id: machineId,
      device_fingerprint: hardwareId,
      barcode,
    }),
  })

  const body = await parseJson<ApiSuccess<TicketInResult> | ApiError>(response)
  if (!body.success) {
    throw new TerminalApiError(body.message, response.status)
  }
  return body.data
}

export type CreditAdjustResult = {
  current_balance: number
  delta: number
  status: string
}

/** Arena game stake (negative) or win (positive). */
export async function creditAdjust(
  machineId: string,
  hardwareId: string,
  delta: number,
  remarks = '',
): Promise<CreditAdjustResult> {
  const response = await fetch(`${apiBase()}/kiosks/credit-adjust`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      machine_id: machineId,
      device_fingerprint: hardwareId,
      delta,
      remarks,
    }),
  })

  const body = await parseJson<ApiSuccess<CreditAdjustResult> | ApiError>(response)
  if (!body.success) {
    throw new TerminalApiError(body.message, response.status)
  }
  return body.data
}

export function formatCurrency(amount: number): string {
  return `N$ ${amount.toLocaleString('en-NA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function isHardwareUnauthorized(error: unknown): boolean {
  if (!(error instanceof TerminalApiError)) {
    return false
  }

  const hardwareCodes = ['HARDWARE_MISMATCH', 'HARDWARE_UNBOUND']
  if (hardwareCodes.includes(error.code ?? '') || hardwareCodes.includes(error.message)) {
    return error.status === 403 || error.status === 422
  }

  if (error.status !== 403) {
    return false
  }

  const message = error.message.toLowerCase()
  return (
    message.includes('hardware') ||
    message.includes('not authorized') ||
    message.includes('not hardware-bound')
  )
}
