import { useState } from 'react'
import { BettingLobby } from '../components/BettingLobby'
import { GamePlayPanel } from '../components/GamePlayPanel'
import { ProviderGamePanel } from '../components/ProviderGamePanel'
import type { GameDefinition } from '../games/catalog'
import { getLiveHardwareId } from '../lib/storage'
import { useMachine } from '../services/sessionStore'

export default function GamesLobby() {
  const { balance, machineId, showAlert, setBalance, setShowInsertMoneyModal } = useMachine()
  const [selected, setSelected] = useState<GameDefinition | null>(null)
  const [error, setError] = useState<string | null>(null)
  const locked = balance <= 0

  function selectGame(game: GameDefinition) {
    if (locked) {
      setShowInsertMoneyModal(true)
      return
    }
    setError(null)
    setSelected(game)
  }

  // If a game is launched, open it as a full-screen dedicated game page
  if (selected) {
    if (selected.kind === 'provider') {
      return (
        <ProviderGamePanel
          game={selected}
          machineId={machineId}
          balance={balance}
          disabled={locked}
          onBack={() => setSelected(null)}
          onError={(message) => {
            setError(message)
            showAlert({
              tone: 'error',
              title: 'Game launch failed',
              message,
              autoCloseMs: 0,
            })
          }}
          onClosed={() => setSelected(null)}
          getHardwareId={getLiveHardwareId}
        />
      )
    }

    return (
      <GamePlayPanel
        game={selected}
        machineId={machineId}
        balance={balance}
        disabled={locked}
        onBack={() => setSelected(null)}
        onBetComplete={(result) => setBalance(result.current_balance)}
        onError={(message) => {
          setError(message)
          showAlert({
            tone: 'error',
            title: 'Bet failed',
            message,
            autoCloseMs: 0,
          })
        }}
        getHardwareId={getLiveHardwareId}
      />
    )
  }

  return (
    <div className="arena-shop-lobby">
      {error ? <div className="play-error-banner">{error}</div> : null}
      <BettingLobby
        disabled={locked}
        waitingForCoins={locked}
        onSelect={selectGame}
        onLeaveGame={() => {
          setError(null)
          setSelected(null)
        }}
      />
    </div>
  )
}
