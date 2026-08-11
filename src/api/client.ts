import { API_BASE_URL } from '../config/env'

const API_BASE = API_BASE_URL

export type TerminalRegistration = {
  success: boolean
  message: string
  machine_id: string
  hostname: string
  pc_name: string
  site_id: number
  site_name: string
  status: string
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
}

type ApiSuccess<T> = { success: true; data: T; message?: string }
type ApiError = { success: false; message: string; errors?: { code?: string } }

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

    const code =
      typeof body === 'object' &&
      body !== null &&
      'errors' in body &&
      typeof (body as ApiError).errors === 'object' &&
      (body as ApiError).errors !== null &&
      'code' in ((body as ApiError).errors as object)
        ? (body as ApiError).errors?.code
        : undefined
    throw new TerminalApiError(message, response.status, code)
  }
  return body as T
}

export async function registerTerminal(input: {
  registration_token: string
  device_fingerprint: string
  operating_system: string
}): Promise<TerminalRegistration> {
  const response = await fetch(`${API_BASE}/kiosks/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(input),
  })

  const body = await parseJson<TerminalRegistration & { message?: string }>(response)
  return body
}

export async function fetchSession(
  machineId: string,
  hardwareId: string,
): Promise<TerminalSession> {
  const params = new URLSearchParams({
    machine_id: machineId,
    device_fingerprint: hardwareId,
  })
  const response = await fetch(`${API_BASE}/kiosks/session?${params}`, {
    headers: { Accept: 'application/json' },
  })

  const body = await parseJson<ApiSuccess<TerminalSession> | ApiError>(response)
  if (!body.success) {
    throw new TerminalApiError(body.message, response.status)
  }
  return body.data
}

export async function sendHeartbeat(
  machineId: string,
  hardwareId: string,
  status: 'ONLINE' | 'OFFLINE',
): Promise<void> {
  const response = await fetch(`${API_BASE}/kiosks/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      machine_id: machineId,
      device_fingerprint: hardwareId,
      status,
    }),
  })

  await parseJson(response)
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
  const response = await fetch(`${API_BASE}/kiosks/games`, {
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
  const response = await fetch(`${API_BASE}/kiosks/place-bet`, {
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

export type CashOutRequest = {
  id: number | string
  machine_id: string
  terminal_name?: string
  pc_name?: string
  site_name?: string
  requested_amount: number
  approved_amount?: number | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  remarks?: string | null
  requested_at?: string
  processed_at?: string
}

export type TerminalTurnover = {
  target: number
  wagered: number
  bonus: number
  completed: boolean
  locked_bonus: number
  cashable: number
  remaining_to_wager: number
  balance: number
}

export type CashOutTerminalStatus = {
  pending: CashOutRequest | null
  latest: CashOutRequest | null
  turnover?: TerminalTurnover | null
}

export async function requestCashOut(
  machineId: string,
  hardwareId: string,
  requestedAmount: number,
): Promise<CashOutRequest> {
  const response = await fetch(`${API_BASE}/cashout/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      machine_id: machineId,
      device_fingerprint: hardwareId,
      requested_amount: requestedAmount,
    }),
  })

  const body = await parseJson<ApiSuccess<CashOutRequest> | ApiError>(response)
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
  const response = await fetch(`${API_BASE}/kiosks/bill-in`, {
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
  const response = await fetch(`${API_BASE}/kiosks/cashout-ticket`, {
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
  const response = await fetch(`${API_BASE}/kiosks/cashout-ticket/cancel`, {
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
  const response = await fetch(`${API_BASE}/kiosks/ticket-in`, {
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
  const response = await fetch(`${API_BASE}/kiosks/credit-adjust`, {
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

export async function fetchCashOutTerminalStatus(
  machineId: string,
  hardwareId: string,
): Promise<CashOutTerminalStatus> {
  const params = new URLSearchParams({
    machine_id: machineId,
    device_fingerprint: hardwareId,
  })
  const response = await fetch(`${API_BASE}/cashout/terminal-status?${params}`, {
    headers: { Accept: 'application/json' },
  })

  const body = await parseJson<ApiSuccess<CashOutTerminalStatus> | ApiError>(response)
  if (!body.success) {
    throw new TerminalApiError(body.message, response.status)
  }
  return body.data
}

export type TerminalLoadRequest = {
  id: number | string
  machine_id: string
  terminal_name?: string
  pc_name?: string
  balance_at_request: number
  status: 'PENDING' | 'FULFILLED' | 'CANCELLED'
  requested_at?: string
  fulfilled_at?: string
}

export type LoadRequestTerminalStatus = {
  pending: TerminalLoadRequest | null
  latest: TerminalLoadRequest | null
}

export async function requestLoadCash(
  machineId: string,
  hardwareId: string,
): Promise<TerminalLoadRequest> {
  const response = await fetch(`${API_BASE}/terminals/load-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      machine_id: machineId,
      device_fingerprint: hardwareId,
    }),
  })

  const body = await parseJson<ApiSuccess<TerminalLoadRequest> | ApiError>(response)
  if (!body.success) {
    throw new TerminalApiError(body.message, response.status)
  }
  return body.data
}

export async function fetchLoadRequestTerminalStatus(
  machineId: string,
  hardwareId: string,
): Promise<LoadRequestTerminalStatus> {
  const params = new URLSearchParams({
    machine_id: machineId,
    device_fingerprint: hardwareId,
  })
  const response = await fetch(`${API_BASE}/terminals/load-request/status?${params}`, {
    headers: { Accept: 'application/json' },
  })

  const body = await parseJson<ApiSuccess<LoadRequestTerminalStatus> | ApiError>(response)
  if (!body.success) {
    throw new TerminalApiError(body.message, response.status)
  }
  return body.data
}

export function formatCurrency(amount: number): string {
  return `N$ ${amount.toLocaleString('en-NA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function isHardwareUnauthorized(error: unknown): boolean {
  return (
    error instanceof TerminalApiError &&
    error.status === 403 &&
    (error.code === 'HARDWARE_MISMATCH' ||
      error.message.toLowerCase().includes('hardware') ||
      error.message.toLowerCase().includes('not authorized'))
  )
}
