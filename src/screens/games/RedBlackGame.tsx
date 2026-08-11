import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BetStrip } from '../../components/BetStrip';
import { useCredits } from '../../hooks/useCredits';

export default function RedBlackGame() {
  const navigate = useNavigate();
  const { balance, symbol, debit, win, toast } = useCredits();
  const [bet, setBet] = useState(10);
  const [pick, setPick] = useState<'red' | 'black'>('red');
  const [spinning, setSpinning] = useState(false);
  const [ballAt, setBallAt] = useState(0);
  const [result, setResult] = useState('');

  async function play() {
    if (spinning) return;
    try {
      await debit(bet);
      setSpinning(true);
      setResult('');
      const number = Math.floor(Math.random() * 13);
      const color = number === 0 ? 'green' : number % 2 === 0 ? 'red' : 'black';
      const spins = 360 * 4 + number * (360 / 13);
      setBallAt((prev) => prev + spins);

      window.setTimeout(async () => {
        const won = color === pick;
        const payout = won ? Number((bet * 2).toFixed(2)) : 0;
        if (payout > 0) await win(payout);
        setResult(
          number === 0
            ? `Ball ${number} (green) · Lost ${symbol}${bet.toFixed(2)}`
            : won
              ? `Ball ${number} (${color}) · Won ${symbol}${payout.toFixed(2)}`
              : `Ball ${number} (${color}) · Lost ${symbol}${bet.toFixed(2)}`,
        );
        toast(won ? 'ok' : 'warn', won ? 'Colour hit' : 'Missed');
        setSpinning(false);
      }, 3800);
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
          <h1>Red / Black</h1>
          <p className="kx-sub">Even money. Green zero loses both colours.</p>
        </div>
        <div className="kx-rb-table">
          <div className="kx-rb-wheel" style={{ transform: `rotate(${ballAt}deg)` }}>
            {Array.from({ length: 13 }, (_, n) => (
              <i
                key={n}
                className={n === 0 ? 'green' : n % 2 === 0 ? 'red' : 'black'}
                style={{ transform: `rotate(${n * (360 / 13)}deg)` }}
              />
            ))}
          </div>
          <div className="kx-rb-marker" />
        </div>
        <div className="kx-rb-picks">
          <button
            type="button"
            className={`kx-rb-pick red ${pick === 'red' ? 'active' : ''}`}
            onClick={() => setPick('red')}
            disabled={spinning}
          >
            Red · 2×
          </button>
          <button
            type="button"
            className={`kx-rb-pick black ${pick === 'black' ? 'active' : ''}`}
            onClick={() => setPick('black')}
            disabled={spinning}
          >
            Black · 2×
          </button>
        </div>
      </div>

      <div className="kx-game-dock">
        {result && <div className="kx-result">{result}</div>}
        <BetStrip bet={bet} setBet={setBet} max={balance} symbol={symbol} />
        <button
          type="button"
          className="kx-btn kx-btn-primary kx-btn-block"
          onClick={() => void play()}
          disabled={spinning || balance < 5}
        >
          {spinning ? 'Ball rolling…' : 'Place bet'}
        </button>
      </div>
    </main>
  );
}
