import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import {
  billIn,
  cancelCashOutTicket,
  cashOutTicket,
  fetchSession,
  isHardwareUnauthorized,
  sendHeartbeat,
  ticketIn,
} from '../api/client'
import ArenaShell from '../components/ArenaShell'
import { CashOutConfirmModal } from '../components/CashOutConfirmModal'
import { HardwareLabPanel } from '../components/HardwareLabPanel'
import KioskAlert from '../components/KioskAlert'
import { RequireCredit } from '../components/RequireCredit'
import StatusToast from '../components/StatusToast'
import { isHardwareSimulatorEnabled } from '../config/env'
import { downloadDemoTicket } from '../lib/demoTicket'
import { createBarcodeListener } from '../hardware/barcodeBridge'
import {
  fetchHardwareStatus,
  fetchHwConfig,
  onHardwareError,
  onNoteAccepted,
  onNoteRejected,
  printCashOutTicket,
  setShopAvailableCoins,
  startHardware,
} from '../lib/hardware'
import { getLiveHardwareId, type StoredTerminal } from '../lib/storage'
import { useTerminalRealtime } from '../lib/useTerminalRealtime'
import { useMachine } from '../services/sessionStore'
import { friendlyMessage } from '../utils/friendlyMessage'
import CashInsertedScreen from './CashInsertedScreen'
import CashOutScreen from './CashOutScreen'
import GamesLobby from './GamesLobby'
import HomeScreen from './HomeScreen'
import LuckyWheelGame from './games/LuckyWheelGame'
import AviatorGame from './games/AviatorGame'
import SplashScreen from './SplashScreen'
import { UnauthorizedScreen } from './UnauthorizedScreen'

type Props = {
  terminal: StoredTerminal
  onUnauthorized: () => void
  onRegisterToken?: () => void
}

const HEARTBEAT_MS = 60000

export function ArenaApp({ terminal, onUnauthorized, onRegisterToken }: Props) {
  const navigate = useNavigate()
  const {
    setConfig,
    setMachineId,
    setBalance,
    showAlert,
    clearAlert,
    setLastCash,
    setLastTicket,
    setCreditSource,
    setPrinterWarning,
    balance,
    config,
  } = useMachine()
  const [ready, setReady] = useState(false)
  const [machineDbId, setMachineDbId] = useState<number | undefined>()
  const [playerId, setPlayerId] = useState<number | null>(null)
  const [hardwareBlocked, setHardwareBlocked] = useState(false)
  const [printerReady, setPrinterReady] = useState(false)
  /** Ignore a second bill-in for the same note (StrictMode double listener / GBA escrow+stack). */
  const lastBillInAt = useRef(0)
  const lastBillInAmount = useRef<number | null>(null)
  const redeemBusy = useRef(false)
  const [showCashOutConfirm, setShowCashOutConfirm] = useState(false)
  const [cashOutBusy, setCashOutBusy] = useState(false)

  useEffect(() => {
    setMachineId(terminal.machineId)
    setPrinterWarning(null)
    setConfig({
      API_URL: '',
      Terminal_ID: terminal.pcName || terminal.hostname || terminal.machineId,
      Printer_Name: 'EPSON TM-T88V',
      BillAcceptor_Port: '/dev/ttyUSB0',
      CoinAcceptor_Port: '',
      AdminPassword: 'admin123',
      Currency: 'NAD',
      CurrencySymbol: 'N$',
      SessionTimeoutSeconds: 120,
      DepositRetryIntervalMs: 5000,
      DepositMaxRetries: 12,
      KioskLockdown: false,
    })
  }, [terminal, setConfig, setMachineId, setPrinterWarning])

  // Connect real bill acceptor + printer from config.json
  useEffect(() => {
    let cancelled = false
    async function bootHw() {
      try {
        const hwCfg = await fetchHwConfig()
        if (hwCfg && !cancelled) {
          setConfig({
            API_URL: hwCfg.API_URL || '',
            Terminal_ID: terminal.pcName || terminal.hostname || terminal.machineId,
            Printer_Name: hwCfg.Printer_Name,
            BillAcceptor_Port: hwCfg.BillAcceptor_Port,
            CoinAcceptor_Port: hwCfg.CoinAcceptor_Port,
            AdminPassword: 'admin123',
            Currency: hwCfg.Currency || 'NAD',
            CurrencySymbol: hwCfg.CurrencySymbol || 'N$',
            SessionTimeoutSeconds: 120,
            DepositRetryIntervalMs: 5000,
            DepositMaxRetries: 12,
            KioskLockdown: false,
          })
        }
        const status = await startHardware()
        if (status && !cancelled) {
          setPrinterReady(!!status.printer.connected)
          console.info('Hardware:', status.bill.detail, '|', status.printer.detail)
        }
      } catch (err) {
        console.warn('Hardware start failed', err)
        if (!cancelled) setPrinterReady(false)
      }
    }
    void bootHw()

    const poll = window.setInterval(() => {
      void fetchHardwareStatus()
        .then((status) => {
          if (!cancelled && status) setPrinterReady(!!status.printer.connected)
        })
        .catch(() => {
          if (!cancelled) setPrinterReady(false)
        })
    }, 5000)

    return () => {
      cancelled = true
      window.clearInterval(poll)
    }
  }, [terminal, setConfig])

  useEffect(() => {
    let cancelled = false

    async function sync() {
      try {
        const hardwareId = await getLiveHardwareId()
        const session = await fetchSession(terminal.machineId, hardwareId)
        if (cancelled) return
        setMachineDbId(session.id)
        setPlayerId(session.player_id ?? null)
        setBalance(session.current_balance)
        if (session.available_coins != null) {
          void setShopAvailableCoins(session.available_coins)
        }
        setHardwareBlocked(false)
        setReady(true)
      } catch (err) {
        if (cancelled) return
        if (isHardwareUnauthorized(err)) {
          setHardwareBlocked(true)
          return
        }
        setReady(true)
      }
    }

    void sync()
    return () => {
      cancelled = true
    }
  }, [terminal.machineId, setBalance])

  useTerminalRealtime(
    machineDbId,
    terminal.machineId,
    {
      onConnected: () => undefined,
      onApproved: (payload) => {
        const next = Number(payload.current_balance)
        setBalance(Number.isFinite(next) ? next : 0)
      },
      onRejected: () => undefined,
      onLoadSuccess: (payload) => {
        const next = Number(payload.current_balance)
        if (Number.isFinite(next)) {
          const currentBal = useMachine.getState().balance
          const diff = next - currentBal
          if (diff > 0) {
            useMachine.getState().setLastCash(diff)
            useMachine.getState().setCreditSource('cash')
          }
          setBalance(next)
        }
        void getLiveHardwareId()
          .then((hardwareId) => fetchSession(terminal.machineId, hardwareId))
          .then((session) => {
            setPlayerId(session.player_id ?? null)
          })
          .catch(() => undefined)
      },
      onPlayerBalance: (chips) => {
        setBalance(chips)
      },
    },
    playerId,
  )

  useEffect(() => {
    async function heartbeat() {
      try {
        const hardwareId = await getLiveHardwareId()
        const beat = await sendHeartbeat(terminal.machineId, hardwareId, 'ONLINE')
        if (beat.available_coins != null) {
          void setShopAvailableCoins(beat.available_coins)
        }
      } catch (err) {
        if (isHardwareUnauthorized(err)) setHardwareBlocked(true)
      }
    }
    void heartbeat()
    const timer = window.setInterval(() => void heartbeat(), HEARTBEAT_MS)
    return () => window.clearInterval(timer)
  }, [terminal.machineId])

  // Real bill acceptor events from Rust
  useEffect(() => {
    let cancelled = false
    const unsubs: Array<() => void> = []

    function keepUnlisten(unlisten: () => void) {
      if (cancelled) {
        unlisten()
        return
      }
      unsubs.push(unlisten)
    }

    void onNoteAccepted((payload) => {
      void acceptCash(payload.amount)
    }).then(keepUnlisten)
    void onNoteRejected((payload) => {
      const reason = payload.reason || ''
      const shopTooLow = reason === 'shop_balance_too_low'
      const message = shopTooLow
        ? 'Shop balance too low'
        : reason.startsWith('code_2')
          ? 'This note was not recognised. Use a clean NAD 10 / 20 / 50 / 100 note.'
          : reason.startsWith('code_3')
            ? 'Note was rejected in the feeder. Insert flat, follow the arrow, and release.'
            : reason.startsWith('code_4') || reason.startsWith('code_5')
              ? 'This note type is not accepted on this machine.'
              : 'Note rejected. Please try another NAD bill.'
      showAlert({
        tone: shopTooLow ? 'error' : 'warn',
        title: shopTooLow ? 'Shop balance too low' : 'Cash not accepted',
        message,
        autoCloseMs: 0,
      })
    }).then(keepUnlisten)
    void onHardwareError((payload) => {
      const err = (payload.error || '').toLowerCase()
      // Ignore missing serial/printer paths on lab machines (no cabinet attached).
      if (
        err.includes('no such file') ||
        err.includes('not found') ||
        err.includes('enoent')
      ) {
        console.warn('Hardware offline (expected without cabinet):', payload)
        return
      }
      showAlert({
        tone: 'error',
        title: 'Device problem',
        message: friendlyMessage(payload.error, `${payload.device} needs attention.`),
        autoCloseMs: 0,
      })
    }).then(keepUnlisten)
    return () => {
      cancelled = true
      unsubs.forEach((u) => u())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminal.machineId])

  useEffect(() => {
    return createBarcodeListener(
      (code) => {
        void redeemTicket(code)
      },
      {
        onWakeMiss: () => {
          showAlert({
            tone: 'warn',
            title: 'Scan again',
            message: 'Scanner is waking up — please scan the ticket once more.',
            autoCloseMs: 3500,
          })
        },
      },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminal.machineId])

  // Keyboard Policy:
  // 1. In Lobby with 0 Balance (balance <= 0): Block general keyboard typing/navigation
  //    to prevent tampering on public kiosk screens.
  //    (Staff shortcuts Ctrl+Shift+K/D/R/H/L, staff password gates, and barcode scanner still work).
  // 2. When Balance is updated (balance > 0): Keyboard is fully enabled for gameplay.
  useEffect(() => {
    function handleKioskKeyboardPolicy(e: KeyboardEvent) {
      const currentBal = useMachine.getState().balance
      // When balance > 0, keyboard is fully enabled for games
      if (currentBal > 0) return

      // Allow staff hotkeys (Ctrl+Shift+...)
      if (e.ctrlKey && e.shiftKey) return

      // Allow typing in active input/textarea fields (e.g. staff password modals)
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.closest('.winbet-modal-card') ||
          target.closest('.pending-card') ||
          target.closest('.hw-diag-modal'))
      ) {
        return
      }

      // If user is inside an active game (like Lucky Wheel or Aviator), allow game controls
      if (document.body.classList.contains('is-game-active')) {
        return
      }

      // Block non-staff browser/kiosk keys when in zero-balance lobby
      if (
        e.key === 'Tab' ||
        e.key === ' ' ||
        e.key === 'Spacebar' ||
        e.key === 'Backspace' ||
        e.key === 'Escape' ||
        e.key.startsWith('Arrow') ||
        (e.key.startsWith('F') && e.key.length <= 3) ||
        e.key === 'Home' ||
        e.key === 'End' ||
        e.key === 'PageUp' ||
        e.key === 'PageDown'
      ) {
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKioskKeyboardPolicy, false)
    return () => window.removeEventListener('keydown', handleKioskKeyboardPolicy, false)
  }, [])

  // Ctrl+Shift+R shortcut:
  // When balance is zero (<= 0), redirect to register page.
  // When balance > 0, block reload and inform user to cash out first.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
        e.preventDefault()
        e.stopPropagation()
        const currentBal = useMachine.getState().balance
        if (currentBal <= 0) {
          if (onRegisterToken) {
            onRegisterToken()
          } else {
            onUnauthorized()
          }
        } else {
          showAlert({
            tone: 'warn',
            title: 'Active Credit',
            message: `Cannot open registration while balance is active (${config?.CurrencySymbol ?? 'N$'}${currentBal.toFixed(2)}). Please cash out first.`,
            autoCloseMs: 4000,
          })
        }
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onRegisterToken, onUnauthorized, showAlert, config?.CurrencySymbol])

  async function acceptCash(amount: number): Promise<boolean> {
    if (useMachine.getState().installTestActive) {
      return false
    }
    const now = Date.now()
    if (
      lastBillInAmount.current === amount &&
      now - lastBillInAt.current < 2000
    ) {
      return false
    }
    lastBillInAmount.current = amount
    lastBillInAt.current = now

    try {
      const hardwareId = await getLiveHardwareId()
      const previousBal = useMachine.getState().balance
      const result = await billIn(terminal.machineId, hardwareId, amount)
      clearAlert()
      const creditedAmount = result.amount > 0 
        ? result.amount 
        : (result.current_balance > previousBal ? result.current_balance - previousBal : amount)
      const bal = result.current_balance > 0 ? result.current_balance : previousBal + creditedAmount
      setBalance(bal)
      if (result.available_coins != null) {
        void setShopAvailableCoins(result.available_coins)
      }
      setLastCash(creditedAmount > 0 ? creditedAmount : amount)
      setCreditSource('cash')

      void fetchSession(terminal.machineId, hardwareId)
        .then((s) => {
          if (s.current_balance != null && Number.isFinite(s.current_balance)) {
            setBalance(s.current_balance)
          }
          if (s.available_coins != null) {
            void setShopAvailableCoins(s.available_coins)
          }
        })
        .catch(() => undefined)

      navigate('/cash-in')
      return true
    } catch (err) {
      lastBillInAmount.current = null
      lastBillInAt.current = 0
      if (isHardwareUnauthorized(err)) {
        setHardwareBlocked(true)
        return false
      }
      const cashMessage = friendlyMessage(err)
      const isShopLow = cashMessage.toLowerCase().includes('shop balance')
      showAlert({
        tone: 'error',
        title: isShopLow ? 'Shop balance low' : 'Cash not accepted',
        message: cashMessage,
        autoCloseMs: 0,
      })
      return false
    }
  }

  async function redeemTicket(code: string): Promise<boolean> {
    if (useMachine.getState().installTestActive) {
      console.warn('[Barcode] Scan ignored: install test is active')
      return false
    }
    if (redeemBusy.current) {
      console.warn('[Barcode] Scan ignored: already processing a ticket')
      return false
    }
    const barcode = code.trim().toUpperCase()
    if (!barcode) return false

    console.info('[Barcode] Scanning ticket:', barcode)
    redeemBusy.current = true
    try {
      const hardwareId = await getLiveHardwareId()
      const previousBal = useMachine.getState().balance
      const result = await ticketIn(terminal.machineId, hardwareId, barcode)
      console.info('[Barcode] Ticket credited successfully:', result)
      clearAlert()
      const creditedAmount = result.amount > 0 
        ? result.amount 
        : (result.current_balance > previousBal ? result.current_balance - previousBal : 0)
      const bal = result.current_balance > 0 ? result.current_balance : previousBal + (creditedAmount > 0 ? creditedAmount : 0)
      setBalance(bal)
      setLastCash(creditedAmount > 0 ? creditedAmount : (result.amount > 0 ? result.amount : (bal > 0 ? bal : null)))
      setLastTicket(result.barcode || barcode)
      setCreditSource('ticket')

      void fetchSession(terminal.machineId, hardwareId)
        .then((s) => {
          if (s.current_balance != null && Number.isFinite(s.current_balance)) {
            setBalance(s.current_balance)
          }
          if (s.available_coins != null) {
            void setShopAvailableCoins(s.available_coins)
          }
        })
        .catch(() => undefined)

      navigate('/cash-in')
      return true
    } catch (err) {
      console.error('[Barcode] Ticket redemption failed:', err)
      if (isHardwareUnauthorized(err)) {
        setHardwareBlocked(true)
        return false
      }
      const ticketMessage = friendlyMessage(err)
      const lowMsg = ticketMessage.toLowerCase()
      const isShopLow = lowMsg.includes('shop balance')
      const isVoid =
        lowMsg.includes('void') ||
        lowMsg.includes('invalid') ||
        lowMsg.includes('used') ||
        lowMsg.includes('redeemed') ||
        lowMsg.includes('not found')
      showAlert({
        tone: 'error',
        title: isShopLow ? 'Shop balance low' : isVoid ? 'Ticket Void / Invalid' : 'Ticket not accepted',
        message: ticketMessage || 'This ticket could not be validated. Please check the ticket or ask staff.',
        autoCloseMs: 0,
      })
      return false
    } finally {
      redeemBusy.current = false
    }
  }

  async function cashOut(opts?: { simulatePrintFail?: boolean }) {
    const lab = isHardwareSimulatorEnabled()
    const symbol = config?.CurrencySymbol ?? 'N$'

    if (balance <= 0) {
      showAlert({
        tone: 'warn',
        title: 'No credit',
        message: 'There is no credit to cash out. Insert cash or scan a ticket first.',
        autoCloseMs: 0,
      })
      return null
    }

    if (!lab) {
      // Cash-out requires a live printer — same rule as Electron kiosk
      try {
        const hw = await fetchHardwareStatus()
        if (!hw?.printer.connected) {
          showAlert({
            tone: 'error',
            title: 'Printer not connected',
            message:
              'Connect the Epson printer (USB + 24V power) before cash-out. Your credit stays on this machine.',
            autoCloseMs: 0,
          })
          return null
        }
      } catch {
        showAlert({
          tone: 'error',
          title: 'Printer not connected',
          message: 'Cannot reach the printer. Fix the printer connection, then try cash-out again.',
          autoCloseMs: 0,
        })
        return null
      }
    }

    let issuedBarcode: string | null = null
    try {
      const hardwareId = await getLiveHardwareId()
      const ticket = await cashOutTicket(terminal.machineId, hardwareId)
      issuedBarcode = ticket.barcode
      setLastTicket(ticket.barcode)
      setLastCash(ticket.amount)

      const demoTicket = {
        barcode: ticket.barcode,
        amount: ticket.amount,
        currencySymbol: symbol,
        kioskName: config?.Terminal_ID ?? terminal.pcName,
        issuedAt: new Date().toLocaleString(),
      }

      async function restoreAfterPrintFail(barcode: string, printErr?: unknown) {
        try {
          const restored = await cancelCashOutTicket(terminal.machineId, hardwareId, barcode)
          setBalance(restored.current_balance)
          setLastTicket(null)
          setPrinterWarning(null)
          showAlert({
            tone: 'error',
            title: 'Cash-out cancelled',
            message:
              restored.message ||
              friendlyMessage(
                printErr,
                'Could not print the ticket. Credit stays on this machine — fix the printer and try again.',
              ),
            autoCloseMs: 0,
          })
        } catch (restoreErr) {
          const restoreMessage = friendlyMessage(restoreErr)
          const blocked = restoreMessage.toLowerCase().includes('too low to restore')
          setBalance(0)
          setLastTicket(barcode)
          setPrinterWarning(null)
          showAlert({
            tone: 'error',
            title: blocked ? 'Shop coins too low to restore ticket' : 'Cash-out cancelled',
            message: blocked
              ? restoreMessage
              : friendlyMessage(
                  printErr ?? restoreErr,
                  'Could not print the ticket. Credit may stay at 0 — ask the cashier.',
                ),
            autoCloseMs: 0,
          })
        }
      }

      if (lab && opts?.simulatePrintFail) {
        await restoreAfterPrintFail(ticket.barcode)
        return null
      }

      if (lab) {
        downloadDemoTicket(demoTicket)
        setBalance(0)
        setPrinterWarning(null)
        navigate('/cash-out')
        return demoTicket
      }

      try {
        await printCashOutTicket({
          code: ticket.barcode,
          amount: ticket.amount,
          currency: config?.Currency ?? 'NAD',
          currencySymbol: symbol,
          terminalId: config?.Terminal_ID ?? terminal.pcName,
        })
        setBalance(0)
        setPrinterWarning(null)
        navigate('/cash-out')
        return demoTicket
      } catch (printErr) {
        await restoreAfterPrintFail(ticket.barcode, printErr)
        return null
      }
    } catch (err) {
      if (issuedBarcode) {
        try {
          const hardwareId = await getLiveHardwareId()
          const restored = await cancelCashOutTicket(
            terminal.machineId,
            hardwareId,
            issuedBarcode,
          )
          setBalance(restored.current_balance)
          setLastTicket(null)
          setPrinterWarning(null)
        } catch (restoreErr) {
          const restoreMessage = friendlyMessage(restoreErr)
          const blocked = restoreMessage.toLowerCase().includes('too low to restore')
          setBalance(0)
          setLastTicket(issuedBarcode)
          setPrinterWarning(null)
          showAlert({
            tone: 'error',
            title: blocked ? 'Shop coins too low to restore ticket' : 'Cash-out cancelled',
            message: blocked
              ? restoreMessage
              : friendlyMessage(err, 'Could not print the ticket. Credit may stay at 0 — ask the cashier.'),
            autoCloseMs: 0,
          })
          return null
        }
        showAlert({
          tone: 'error',
          title: 'Cash-out cancelled',
          message: friendlyMessage(err, 'Could not print the ticket. Credit stays on this machine.'),
          autoCloseMs: 0,
        })
        return null
      }
      if (isHardwareUnauthorized(err)) {
        setHardwareBlocked(true)
        return null
      }
      showAlert({
        tone: 'error',
        title: 'Cash out failed',
        message: friendlyMessage(err),
        autoCloseMs: 0,
      })
      return null
    }
  }

  if (hardwareBlocked) {
    return <UnauthorizedScreen />
  }

  const handleRequestCashOut = () => {
    if (balance <= 0) {
      showAlert({
        tone: 'warn',
        title: 'No credit',
        message: 'There is no credit to cash out. Insert cash or scan a ticket first.',
        autoCloseMs: 0,
      })
      return
    }
    setShowCashOutConfirm(true)
  }

  const handleConfirmCashOut = async () => {
    setCashOutBusy(true)
    try {
      setShowCashOutConfirm(false)
      await cashOut()
    } finally {
      setCashOutBusy(false)
    }
  }

  const labEnabled = isHardwareSimulatorEnabled()

  function withArena(node: ReactNode, opts?: { creditPanel?: boolean; hideHeader?: boolean }) {
    return (
      <ArenaShell
        onCashOut={handleRequestCashOut}
        showCreditPanel={opts?.creditPanel !== false}
        hideHeader={opts?.hideHeader}
        printerReady={printerReady || labEnabled}
        onRegisterToken={onRegisterToken || onUnauthorized}
      >
        {node}
      </ArenaShell>
    )
  }

  return (
    <div className="app-shell">
      <StatusToast />
      <KioskAlert />
      <CashOutConfirmModal
        isOpen={showCashOutConfirm}
        loading={cashOutBusy}
        onConfirm={() => void handleConfirmCashOut()}
        onCancel={() => setShowCashOutConfirm(false)}
      />
      <HardwareLabPanel
        balance={balance}
        currencySymbol={config?.CurrencySymbol ?? 'N$'}
        kioskName={config?.Terminal_ID ?? terminal.pcName}
        adminPassword={config?.AdminPassword ?? 'admin123'}
        onBillIn={(amount) => acceptCash(amount)}
        onTicketIn={(code) => redeemTicket(code)}
        onCashOut={(simulatePrintFail) => cashOut({ simulatePrintFail })}
      />
      {!ready ? (
        <SplashScreen />
      ) : (
      <Routes>
        <Route path="/" element={<SplashScreen redirectTo="/home" />} />
        <Route path="/home" element={withArena(<HomeScreen />)} />
        <Route path="/play" element={withArena(<GamesLobby />)} />
        <Route
          path="/play/aviator"
          element={withArena(
            <RequireCredit>
              <AviatorGame />
            </RequireCredit>,
            { creditPanel: false, hideHeader: true },
          )}
        />
        <Route
          path="/play/wheel"
          element={withArena(
            <RequireCredit>
              <LuckyWheelGame />
            </RequireCredit>,
            { creditPanel: false, hideHeader: true },
          )}
        />
        <Route path="/cash-in" element={withArena(<CashInsertedScreen />, { creditPanel: false })} />
        <Route path="/cash-out" element={withArena(<CashOutScreen />, { creditPanel: false })} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
      )}
    </div>
  )
}
