import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { isTauriApp } from './storage'

export type HwDeviceStatus = {
  connected: boolean
  enabled: boolean
  mode: string
  detail: string
}

export type HardwareStatus = {
  bill: HwDeviceStatus
  printer: HwDeviceStatus
  barcode: HwDeviceStatus
}

export type KioskHwConfig = {
  API_URL: string
  Terminal_ID: string
  Printer_Name: string
  Printer_Device: string
  BillAcceptor_Port: string
  CoinAcceptor_Port: string
  Currency: string
  CurrencySymbol: string
  AdminPassword?: string
}

export async function startHardware(): Promise<HardwareStatus | null> {
  if (!isTauriApp()) return null
  return invoke<HardwareStatus>('hardware_start')
}

export async function fetchHardwareStatus(): Promise<HardwareStatus | null> {
  if (!isTauriApp()) return null
  return invoke<HardwareStatus>('hardware_status')
}

export type DiagnoseCheck = {
  id: string
  name: string
  ok: boolean
  detail: string
}

export type DiagnoseReport = {
  os: string
  user: string
  groups: string[]
  checks: DiagnoseCheck[]
}

export async function diagnoseHardware(): Promise<DiagnoseReport | null> {
  if (!isTauriApp()) return null
  return invoke<DiagnoseReport>('hardware_diagnose')
}

export async function printTestTicket(): Promise<void> {
  if (!isTauriApp()) {
    throw new Error('Printer only available in the kiosk app')
  }
  await invoke('print_test_ticket')
}

export async function fetchHwConfig(): Promise<KioskHwConfig | null> {
  if (!isTauriApp()) return null
  return invoke<KioskHwConfig>('get_kiosk_hw_config')
}

export async function setShopAvailableCoins(amount: number): Promise<void> {
  if (!isTauriApp()) return
  await invoke('set_shop_available_coins', { amount })
}

export async function printCashOutTicket(ticket: {
  code: string
  amount: number
  currency: string
  currencySymbol: string
  terminalId: string
}): Promise<void> {
  if (!isTauriApp()) {
    throw new Error('Printer only available in the kiosk app')
  }
  await invoke('print_cashout_ticket', {
    ticket: {
      code: ticket.code,
      amount: ticket.amount,
      currency: ticket.currency,
      currency_symbol: ticket.currencySymbol,
      terminal_id: ticket.terminalId,
    },
  })
}

export async function onNoteAccepted(
  handler: (payload: { amount: number; currency: string }) => void,
): Promise<UnlistenFn> {
  if (!isTauriApp()) return () => undefined
  return listen<{ amount: number; currency: string }>('note-accepted', (event) => {
    handler(event.payload)
  })
}

export async function onNoteRejected(
  handler: (payload: { reason: string }) => void,
): Promise<UnlistenFn> {
  if (!isTauriApp()) return () => undefined
  return listen<{ reason: string }>('note-rejected', (event) => {
    handler(event.payload)
  })
}

export async function onHardwareError(
  handler: (payload: { device: string; error: string }) => void,
): Promise<UnlistenFn> {
  if (!isTauriApp()) return () => undefined
  return listen<{ device: string; error: string }>('hardware-error', (event) => {
    handler(event.payload)
  })
}
