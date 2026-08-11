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
    <main className="screen splash">
      <div>
        <div className="splash-mark">NAD Arena</div>
        <p className="splash-sub">Kiosk terminal</p>
        <div className="pulse-bar" aria-hidden />
      </div>
    </main>
  );
}
