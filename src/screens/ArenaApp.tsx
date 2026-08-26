import { useEffect, useState, type ReactNode } from 'react'
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
  startHardware,
} from '../lib/hardware'
import { getLiveHardwareId, type StoredTerminal } from '../lib/storage'
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
}

const SESSION_MS = 5000
const HEARTBEAT_MS = 60000

export function ArenaApp({ terminal, onUnauthorized: _onUnauthorized }: Props) {
  const navigate = useNavigate()
  const {
    setConfig,
    setMachineId,
    setBalance,
    showAlert,
    setLastCash,
    setLastTicket,
    setCreditSource,
    setPrinterWarning,
    balance,
    config,
  } = useMachine()
  const [ready, setReady] = useState(false)
  const [hardwareBlocked, setHardwareBlocked] = useState(false)
  const [printerReady, setPrinterReady] = useState(false)

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
        setBalance(session.current_balance)
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
    const timer = window.setInterval(() => void sync(), SESSION_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [terminal.machineId, setBalance])

  useEffect(() => {
    async function heartbeat() {
      try {
        const hardwareId = await getLiveHardwareId()
        await sendHeartbeat(terminal.machineId, hardwareId, 'ONLINE')
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
    const unsubs: Array<() => void> = []
    void onNoteAccepted((payload) => {
      void acceptCash(payload.amount)
    }).then((u) => unsubs.push(u))
    void onNoteRejected((payload) => {
      const reason = payload.reason || ''
      const message = reason.startsWith('code_2')
        ? 'This note was not recognised. Use a clean NAD 10 / 20 / 50 / 100 note.'
        : reason.startsWith('code_3')
          ? 'Note was rejected in the feeder. Insert flat, follow the arrow, and release.'
          : reason.startsWith('code_4') || reason.startsWith('code_5')
            ? 'This note type is not accepted on this machine.'
            : 'Note rejected. Please try another NAD bill.'
      showAlert({ tone: 'warn', title: 'Cash not accepted', message, autoCloseMs: 0 })
    }).then((u) => unsubs.push(u))
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
    }).then((u) => unsubs.push(u))
    return () => unsubs.forEach((u) => u())
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

  async function acceptCash(amount: number): Promise<boolean> {
    try {
      const hardwareId = await getLiveHardwareId()
      const result = await billIn(terminal.machineId, hardwareId, amount)
      setBalance(result.current_balance)
      setLastCash(amount)
      setCreditSource('cash')
      navigate('/cash-in')
      return true
    } catch (err) {
      if (isHardwareUnauthorized(err)) {
        setHardwareBlocked(true)
        return false
      }
      showAlert({
        tone: 'error',
        title: 'Cash not accepted',
        message: friendlyMessage(err),
        autoCloseMs: 0,
      })
      return false
    }
  }

  async function redeemTicket(code: string): Promise<boolean> {
    const barcode = code.trim().toUpperCase()
    if (!barcode) return false
    if (!(barcode.startsWith('T') || barcode.startsWith('TKT'))) {
      showAlert({
        tone: 'warn',
        title: 'Not a credit ticket',
        message: 'That is not a credit ticket. Insert cash, or scan a cash-out ticket.',
        autoCloseMs: 0,
      })
      return false
    }
    try {
      const hardwareId = await getLiveHardwareId()
      const result = await ticketIn(terminal.machineId, hardwareId, barcode)
      setBalance(result.current_balance)
      setLastCash(result.amount)
      setLastTicket(result.barcode)
      setCreditSource('ticket')
      navigate('/cash-in')
      return true
    } catch (err) {
      if (isHardwareUnauthorized(err)) {
        setHardwareBlocked(true)
        return false
      }
      showAlert({
        tone: 'error',
        title: 'Ticket not accepted',
        message: friendlyMessage(err),
        autoCloseMs: 0,
      })
      return false
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
            title: 'Printer required',
            message:
              'Connect the Epson printer (USB + 24V power) before cash-out. Your credit stays on this machine.',
            autoCloseMs: 0,
          })
          return null
        }
      } catch {
        showAlert({
          tone: 'error',
          title: 'Printer required',
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

      if (lab && opts?.simulatePrintFail) {
        try {
          const restored = await cancelCashOutTicket(
            terminal.machineId,
            hardwareId,
            ticket.barcode,
          )
          setBalance(restored.current_balance)
          setLastTicket(null)
          setPrinterWarning(null)
        } catch {
          setBalance(0)
        }
        showAlert({
          tone: 'error',
          title: 'Cash-out cancelled',
          message: 'Print failed (lab). Credit stays on this machine.',
          autoCloseMs: 0,
        })
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
        // Print failed → void ticket and put credit back (Electron behaviour)
        try {
          const restored = await cancelCashOutTicket(
            terminal.machineId,
            hardwareId,
            ticket.barcode,
          )
          setBalance(restored.current_balance)
          setLastTicket(null)
          setPrinterWarning(null)
        } catch {
          setBalance(0)
        }
        showAlert({
          tone: 'error',
          title: 'Cash-out cancelled',
          message: friendlyMessage(
            printErr,
            'Could not print the ticket. Credit stays on this machine — fix the printer and try again.',
          ),
          autoCloseMs: 0,
        })
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
        } catch {
          /* keep UI; staff can help */
        }
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

  const doCashOut = () => void cashOut()
  const labEnabled = isHardwareSimulatorEnabled()

  function withArena(node: ReactNode, opts?: { creditPanel?: boolean }) {
    return (
      <ArenaShell
        onCashOut={doCashOut}
        showCreditPanel={opts?.creditPanel !== false}
        printerReady={printerReady || labEnabled}
      >
        {node}
      </ArenaShell>
    )
  }

  return (
    <div className="app-shell">
      <StatusToast />
      <KioskAlert />
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
            { creditPanel: false },
          )}
        />
        <Route
          path="/play/wheel"
          element={withArena(
            <RequireCredit>
              <LuckyWheelGame />
            </RequireCredit>,
            { creditPanel: false },
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
