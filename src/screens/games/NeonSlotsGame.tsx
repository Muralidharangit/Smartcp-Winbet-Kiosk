import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BetStrip } from '../../components/BetStrip';
import { useCredits } from '../../hooks/useCredits';

const ICONS = ['◆', '●', '▲', '★', '7', '❖'];

export default function NeonSlotsGame() {
  const navigate = useNavigate();
  const { balance, symbol, debit, win, toast } = useCredits();
  const [bet, setBet] = useState(10);
  const [reels, setReels] = useState(['◆', '●', '▲']);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState('');

  async function spin() {
    if (spinning) return;
    try {
      await debit(bet);
      setSpinning(true);
      setResult('');

      let ticks = 0;
      const timer = window.setInterval(() => {
        setReels([
          ICONS[Math.floor(Math.random() * ICONS.length)],
          ICONS[Math.floor(Math.random() * ICONS.length)],
          ICONS[Math.floor(Math.random() * ICONS.length)],
        ]);
        ticks += 1;
        if (ticks > 14) {
          window.clearInterval(timer);
          const final = [
            ICONS[Math.floor(Math.random() * ICONS.length)],
            ICONS[Math.floor(Math.random() * ICONS.length)],
            ICONS[Math.floor(Math.random() * ICONS.length)],
          ];
          setReels(final);

          let mult = 0;
          if (final[0] === final[1] && final[1] === final[2]) {
            mult = final[0] === '★' ? 20 : final[0] === '7' ? 12 : 6;
          } else if (final[0] === final[1] || final[1] === final[2] || final[0] === final[2]) {
            mult = 1.5;
          }

          const payout = Number((bet * mult).toFixed(2));
          void (async () => {
            if (payout > 0) await win(payout);
            setResult(
              payout > 0
                ? `${final.join('  ')} · Won ${symbol}${payout.toFixed(2)}`
                : `${final.join('  ')} · No win`,
            );
            toast(payout > 0 ? 'ok' : 'warn', payout > 0 ? 'Slots win' : 'No line');
            setSpinning(false);
          })();
        }
      }, 90);
    } catch (err) {
      toast('error', String(err).replace(/^Error:\s*/, ''));
      setSpinning(false);
    }
  }

  return (
    <main className="screen screen--arena-fit kx-gamepage kx-gamepage-fit">
      <header className="kx-gamepage-top">
        <button type="button" className="kx-btn kx-btn-ghost kx-btn-sm" onClick={() => navigate('/play')}>
          ← Games
        </button>
        <div className="kx-lobby-credit">
          <span>Credit</span>
          <strong>
            {symbol}
            {balance.toFixed(2)}
          </strong>
        </div>
      </header>

      <div className="kx-game-stage">
        <div className="kx-game-copy">
          <h1>Neon Slots</h1>
          <p className="kx-sub">Match two for 1.5×. Triple for 6×–20×.</p>
        </div>
        <div className={`kx-slots ${spinning ? 'is-spinning' : ''}`}>
          {reels.map((r, i) => (
            <div key={i} className="kx-slot-reel">
              <span>{r}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="kx-game-dock">
        {result && <div className="kx-result">{result}</div>}
        <BetStrip bet={bet} setBet={setBet} max={balance} symbol={symbol} />
        <button
          type="button"
          className="kx-btn kx-btn-primary kx-btn-block"
          onClick={() => void spin()}
          disabled={spinning || balance < 5}
        >
          {spinning ? 'Spinning…' : 'Spin reels'}
        </button>
      </div>
    </main>
  );
}
