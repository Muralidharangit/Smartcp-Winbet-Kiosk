import { useState } from 'react'
import { HashRouter } from 'react-router-dom'
import type { TerminalRegistration } from './api/client'
import { clearPortalSlug, setPortalSlug } from './config/env'
import {
  clearTerminal,
  loadTerminal,
  saveTerminal,
  type StoredTerminal,
} from './lib/storage'
import { StaffExitGate } from './components/StaffExitGate'
import { HardwareTestGate } from './components/HardwareTestGate'
import { ArenaApp } from './screens/ArenaApp'
import { RegistrationScreen } from './screens/RegistrationScreen'
import { RegistrationSuccessScreen } from './screens/RegistrationSuccessScreen'

export default function App() {
  const [terminal, setTerminal] = useState<StoredTerminal | null>(() => {
    const stored = loadTerminal()
    if (stored?.portalSlug) {
      setPortalSlug(stored.portalSlug)
    }
    return stored
  })
  const [justRegistered, setJustRegistered] = useState<TerminalRegistration | null>(null)
  const [isReRegistering, setIsReRegistering] = useState(false)

  function handleRegistered(result: TerminalRegistration) {
    if (result.portal_slug) {
      setPortalSlug(result.portal_slug)
    }
    const stored: StoredTerminal = {
      machineId: result.machine_id,
      siteName: result.site_name,
      pcName: result.pc_name,
      hostname: result.hostname,
      portalSlug: result.portal_slug,
    }
    saveTerminal(stored)
    setJustRegistered(result)
    setIsReRegistering(false)
  }

  function handleContinueFromSuccess() {
    setTerminal(loadTerminal())
    setJustRegistered(null)
  }

  function handleResetRegistration() {
    clearTerminal()
    clearPortalSlug()
    setTerminal(null)
    setJustRegistered(null)
    setIsReRegistering(false)
  }

  function handleOpenRegistration() {
    setIsReRegistering(true)
  }

  function handleCancelRegistration() {
    setIsReRegistering(false)
  }

  if (justRegistered) {
    return (
      <>
        <StaffExitGate />
        <HardwareTestGate />
        <RegistrationSuccessScreen result={justRegistered} onContinue={handleContinueFromSuccess} />
      </>
    )
  }

  if (!terminal || isReRegistering) {
    return (
      <>
        <StaffExitGate />
        <HardwareTestGate />
        <div className="app-shell">
          <RegistrationScreen
            onRegistered={handleRegistered}
            onCancel={terminal ? handleCancelRegistration : undefined}
          />
        </div>
      </>
    )
  }

  return (
    <HashRouter>
      <StaffExitGate />
      <HardwareTestGate />
      <ArenaApp
        terminal={terminal}
        onUnauthorized={handleResetRegistration}
        onRegisterToken={handleOpenRegistration}
      />
    </HashRouter>
  )
}
