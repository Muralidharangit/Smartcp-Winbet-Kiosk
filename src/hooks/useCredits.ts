import { creditAdjust } from '../api/client'
import { getLiveHardwareId } from '../lib/storage'
import { useMachine } from '../services/sessionStore'
import { friendlyMessage } from '../utils/friendlyMessage'

export function useCredits() {
  const { balance, setBalance, setStatus, showAlert, config, machineId } = useMachine()
  const symbol = config?.CurrencySymbol ?? 'N$'

  async function debit(amount: number) {
    if (amount > balance) throw new Error('Insufficient credit')
    if (!machineId) throw new Error('Kiosk is not registered')
    const hardwareId = await getLiveHardwareId()
    const r = await creditAdjust(machineId, hardwareId, -amount, 'Game stake')
    setBalance(r.current_balance)
    return r.current_balance
  }

  async function win(amount: number) {
    if (amount <= 0) return balance
    if (!machineId) throw new Error('Kiosk is not registered')
    const hardwareId = await getLiveHardwareId()
    const r = await creditAdjust(machineId, hardwareId, amount, 'Game win')
    setBalance(r.current_balance)
    return r.current_balance
  }

  function toast(tone: 'ok' | 'warn' | 'error', text: string) {
    const clean = friendlyMessage(text, text)
    if (tone === 'error') {
      showAlert({
        tone: 'error',
        title: 'Unable to continue',
        message: clean,
        autoCloseMs: 0,
      })
      return
    }
    // Short status toast only — never a blocking modal mid-game
    setStatus({ tone, text: clean })
  }

  return { balance, symbol, debit, win, toast }
}
