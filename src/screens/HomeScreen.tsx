import { useNavigate } from 'react-router-dom';
import { useMachine } from '../services/sessionStore';

type GameTile = {
  id: string;
  title: string;
  blurb: string;
  path: string;
  image: string;
};

const GAMES: GameTile[] = [
  {
    id: 'wheel',
    title: 'Lucky Wheel',
    blurb: 'Spin up to 10×',
    path: '/play/wheel',
    image: '/arena/tile-wheel.png',
  },
];

export default function HomeScreen() {
  const navigate = useNavigate();
  const { balance, showAlert } = useMachine();
  const locked = balance <= 0;

  function openGame(path: string) {
    if (locked) {
      showAlert({
        tone: 'warn',
        title: 'Games locked',
        message: 'Insert cash or scan a credit ticket to unlock games.',
        autoCloseMs: 0,
      });
      return;
    }
    navigate(path);
  }

  return (
    <div className={`arena-home arena-home-fit${locked ? ' is-locked' : ''}`}>
      {locked && (
        <section className="arena-unlock" aria-live="polite">
          <div className="arena-unlock-glow" aria-hidden />
          <p className="arena-unlock-kicker">Games locked</p>
          <h2>Insert cash to play</h2>
          <p>
            Feed a NAD note into the bill acceptor, or scan a credit ticket.
            Games unlock as soon as credit appears.
          </p>
          <ul className="arena-unlock-steps">
            <li>
              <strong>1</strong>
              <span>Insert N$10 / 20 / 50 / 100</span>
            </li>
            <li>
              <strong>2</strong>
              <span>Credit shows on the right</span>
            </li>
            <li>
              <strong>3</strong>
              <span>Tap Aviator or Lucky Wheel</span>
            </li>
          </ul>
        </section>
      )}

      {!locked && (
        <button
          type="button"
          className="arena-banner arena-banner-aviator"
          onClick={() => openGame('/play/aviator')}
        >
          <div className="arena-banner-copy">
            <p className="arena-banner-kicker">Featured · Live</p>
            <h1>Aviator</h1>
            <p>Crash-style flight game — same live Aviator as SmartPC.</p>
            <span className="arena-banner-cta">Play Aviator</span>
          </div>
          <div className="arena-banner-media">
            <img src="/arena/aviator.png" alt="Aviator" />
          </div>
        </button>
      )}

      <section className="arena-row arena-row-fit">
        <div className="arena-row-head">
          <h2>{locked ? 'Preview' : 'Games'}</h2>
          <span>{locked ? 'Unlock with cash' : 'Lucky Wheel'}</span>
        </div>
        <div className="arena-tiles arena-tiles-fit">
          {GAMES.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`arena-tile arena-tile-card${locked ? ' is-locked-tile' : ''}`}
              onClick={() => openGame(g.path)}
              aria-disabled={locked}
            >
              <span className="arena-tile-badge">{locked ? 'Locked' : 'Live'}</span>
              <div className="arena-tile-media">
                <img src={g.image} alt="" />
              </div>
              <div className="arena-tile-meta">
                <strong>{g.title}</strong>
                <em>{locked ? 'Insert cash to unlock' : g.blurb}</em>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
