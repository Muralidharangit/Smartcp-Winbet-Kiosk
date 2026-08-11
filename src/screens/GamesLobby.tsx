import { useNavigate } from 'react-router-dom';
import { useCredits } from '../hooks/useCredits';
import { useMachine } from '../services/sessionStore';

const GAMES = [
  {
    id: 'wheel',
    title: 'Lucky Wheel',
    blurb: 'Spin for multipliers up to 10×',
    path: '/play/wheel',
    image: '/arena/tile-wheel.png',
  },
  {
    id: 'slots',
    title: 'Neon Slots',
    blurb: 'Three-reel neon casino slots',
    path: '/play/slots',
    image: '/arena/tile-slots.png',
  },
  {
    id: 'redblack',
    title: 'Red / Black',
    blurb: 'Classic even-money colour bet',
    path: '/play/redblack',
    image: '/arena/tile-redblack.png',
  },
] as const;

export default function GamesLobby() {
  const navigate = useNavigate();
  const { balance } = useCredits();
  const { showAlert } = useMachine();
  const locked = balance <= 0;

  return (
    <div className={`arena-home arena-lobby-fit${locked ? ' is-locked' : ''}`}>
      {locked ? (
        <section className="arena-unlock">
          <div className="arena-unlock-glow" aria-hidden />
          <p className="arena-unlock-kicker">Popular · Locked</p>
          <h2>Insert cash to unlock games</h2>
          <p>Feed a NAD note or scan a credit ticket. Live games open when credit is available.</p>
        </section>
      ) : (
        <section
          className="arena-banner arena-banner-sm"
          style={{
            backgroundImage:
              'linear-gradient(100deg, rgba(7,7,10,0.92) 0%, rgba(7,7,10,0.55) 100%), url(/arena/banner-777.png)',
          }}
        >
          <div>
            <p className="arena-banner-kicker">Popular</p>
            <h1>Choose your game</h1>
            <p>Live games on this kiosk. Credit ready.</p>
          </div>
        </section>
      )}

      <div className="arena-tiles arena-tiles-lg">
        {GAMES.map((g) => (
          <button
            key={g.id}
            type="button"
            className={`arena-tile arena-tile-card${locked ? ' is-locked-tile' : ''}`}
            onClick={() => {
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
            }}
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
    </div>
  );
}
