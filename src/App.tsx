import { useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import type { TerminalRegistration } from './api/client'
import {
  clearTerminal,
  isTauriApp,
  loadTerminal,
  saveTerminal,
  type StoredTerminal,
} from './lib/storage'
import { StaffExitGate } from './components/StaffExitGate'
import { ArenaApp } from './screens/ArenaApp'
import { RegistrationScreen } from './screens/RegistrationScreen'
import { RegistrationSuccessScreen } from './screens/RegistrationSuccessScreen'

export default function App() {
  const [terminal, setTerminal] = useState<StoredTerminal | null>(() => loadTerminal())
  const [justRegistered, setJustRegistered] = useState<TerminalRegistration | null>(null)

  function handleRegistered(result: TerminalRegistration) {
    const stored: StoredTerminal = {
      machineId: result.machine_id,
      siteName: result.site_name,
      pcName: result.pc_name,
      hostname: result.hostname,
    }
    saveTerminal(stored)
    setJustRegistered(result)
  }

  function handleContinueFromSuccess() {
    setTerminal(loadTerminal())
    setJustRegistered(null)
  }

  function handleResetRegistration() {
    clearTerminal()
    setTerminal(null)
    setJustRegistered(null)
  }

  if (justRegistered) {
    return (
      <>
        <StaffExitGate />
        <RegistrationSuccessScreen result={justRegistered} onContinue={handleContinueFromSuccess} />
      </>
    )
  }

  if (!terminal) {
    return (
      <>
        <StaffExitGate />
        <div className="app-shell">
          <header className="top-bar">
            <div className="brand">Betwise Kiosk Setup</div>
            <div className="meta">
              <span>{isTauriApp() ? 'Tauri + Rust — cabinet bind' : 'Browser dev mode'}</span>
            </div>
          </header>
          <RegistrationScreen onRegistered={handleRegistered} />
        </div>
      </>
    )
  }

  return (
    <BrowserRouter>
      <StaffExitGate />
      <ArenaApp terminal={terminal} onUnauthorized={handleResetRegistration} />
    </BrowserRouter>
  )
}
