import { useNavigate } from 'react-router-dom';
import { useMachine } from '../services/sessionStore';

type GameTile = {
  id: string;
  title: string;
  blurb: string;
  path?: string;
  image: string;
  live?: boolean;
};

const GAMES: GameTile[] = [
  {
    id: 'wheel',
    title: 'Lucky Wheel',
    blurb: 'Spin up to 10×',
    path: '/play/wheel',
    image: '/arena/tile-wheel.png',
    live: true,
  },
  {
    id: 'slots',
    title: 'Neon Slots',
    blurb: '3-reel neon win',
    path: '/play/slots',
    image: '/arena/tile-slots.png',
    live: true,
  },
  {
    id: 'rb',
    title: 'Red / Black',
    blurb: 'Even money table',
    path: '/play/redblack',
    image: '/arena/tile-redblack.png',
    live: true,
  },
  {
    id: 'lucky6',
    title: 'e Lucky 6',
    blurb: 'Coming soon',
    image: '/arena/lucky6.png',
  },
  {
    id: 'bingo',
    title: 'Bingo',
    blurb: 'Coming soon',
    image: '/arena/bingo.png',
  },
  {
    id: 'goal',
    title: 'Goal Bonanza',
    blurb: 'Coming soon',
    image: '/arena/goal-bonanza.png',
  },
];

export default function HomeScreen() {
  const navigate = useNavigate();
  const { balance, showAlert } = useMachine();
  const locked = balance <= 0;

  function openGame(g: GameTile) {
    if (!g.path || !g.live) {
      showAlert({
        tone: 'warn',
        title: 'Coming soon',
        message: `${g.title} is not available on this kiosk yet.`,
        autoCloseMs: 0,
      });
      return;
    }
    if (locked) {
      showAlert({
        tone: 'warn',
        title: 'Games locked',
        message: 'Insert cash or scan a credit ticket to unlock games.',
        autoCloseMs: 0,
      });
      return;
    }
    navigate(g.path);
  }

  function openAviator() {
    showAlert({
      tone: 'warn',
      title: 'Coming soon',
      message: 'Aviator is not available on this kiosk yet.',
      autoCloseMs: 0,
    });
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
              <span>Tap a live game to start</span>
            </li>
          </ul>
        </section>
      )}

      {!locked && (
        <button type="button" className="arena-banner arena-banner-aviator" onClick={openAviator}>
          <div className="arena-banner-copy">
            <p className="arena-banner-kicker">Featured · Coming soon</p>
            <h1>Aviator</h1>
            <p>Crash-style flight game — featured on this kiosk soon.</p>
            <span className="arena-banner-cta">Coming soon</span>
          </div>
          <div className="arena-banner-media">
            <img src="/arena/aviator.png" alt="Aviator" />
          </div>
        </button>
      )}

      <section className="arena-row arena-row-fit">
        <div className="arena-row-head">
          <h2>{locked ? 'Preview' : 'Games'}</h2>
          <span>{locked ? 'Unlock with cash' : 'Live + coming soon'}</span>
        </div>
        <div className="arena-tiles arena-tiles-fit">
          {GAMES.map((g) => {
            const isLive = !!g.live;
            const tileLocked = locked || !isLive;
            return (
              <button
                key={g.id}
                type="button"
                className={`arena-tile arena-tile-card${tileLocked ? ' is-locked-tile' : ''}${
                  !isLive ? ' is-soon' : ''
                }`}
                onClick={() => openGame(g)}
                aria-disabled={tileLocked}
              >
                <span className="arena-tile-badge">
                  {locked && isLive ? 'Locked' : isLive ? 'Live' : 'Soon'}
                </span>
                <div className="arena-tile-media">
                  <img src={g.image} alt="" />
                </div>
                <div className="arena-tile-meta">
                  <strong>{g.title}</strong>
                  <em>{locked && isLive ? 'Insert cash to unlock' : g.blurb}</em>
                </div>
              </button>
            );
          })}
        </div>
      </section>

    </div>
  );
}
