import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SplashScreen({ redirectTo }: { redirectTo?: string }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!redirectTo) return;
    const t = setTimeout(() => navigate(redirectTo), 1200);
    return () => clearTimeout(t);
  }, [navigate, redirectTo]);

  return (
    <main className="splash-screen-container">
      <div className="splash-content animate-pop-in">
        <div className="splash-logo animate-pulse">
          <span className="logo-glyph">🎰</span>
        </div>
        <div className="splash-brand-title">
          <span className="brand-win-part">BET</span>
          <span className="brand-bet-part">WISE</span>
        </div>
        <div className="splash-brand-sub">TERMINAL KIOSK SYSTEM</div>
        <div className="splash-loader-bar">
          <div className="loader-fill" />
        </div>
        <div className="splash-status-text">
          <span className="smart-pc-online-dot" />
          <span>INITIALIZING SECURE HARDWARE…</span>
        </div>
      </div>
    </main>
  );
}

