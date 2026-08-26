import { useNavigate } from 'react-router-dom'
import { fetchSession } from '../../api/client'
import { ProviderGamePanel } from '../../components/ProviderGamePanel'
import { getLiveHardwareId } from '../../lib/storage'
import { useMachine } from '../../services/sessionStore'
import { friendlyMessage } from '../../utils/friendlyMessage'

export default function AviatorGame() {
  const navigate = useNavigate()
  const { machineId, balance, setBalance, showAlert } = useMachine()

  async function refreshBalance() {
    if (!machineId) return
    try {
      const hardwareId = await getLiveHardwareId()
      const session = await fetchSession(machineId, hardwareId)
      setBalance(session.current_balance)
    } catch {
      /* session poll will catch up */
    }
  }

  return (
    <ProviderGamePanel
      gameId="aviator"
      gameName="Aviator"
      machineId={machineId}
      balance={balance}
      getHardwareId={getLiveHardwareId}
      onBack={() => navigate('/home')}
      onClosed={() => void refreshBalance()}
      onError={(message) =>
        showAlert({
          tone: 'error',
          title: 'Aviator',
          message: friendlyMessage(message, 'Could not launch Aviator.'),
          autoCloseMs: 0,
        })
      }
    />
  )
}
