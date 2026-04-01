import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function FieldLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const locationInterval = useRef(null);

  useEffect(() => {
    checkActiveSession();
    return () => { if (locationInterval.current) clearInterval(locationInterval.current); };
  }, []);

  const checkActiveSession = async () => {
    try {
      const r = await api.get('/field/session/active');
      if (r.data) {
        setHasActiveSession(true);
        setSessionId(r.data.id);
        startLocationTracking(r.data.id);
      }
    } catch {}
  };

  const startLocationTracking = (sid) => {
    if (locationInterval.current) clearInterval(locationInterval.current);
    const pingLocation = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition((pos) => {
        api.post('/field/location', {
          session_id: sid,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
        }).catch(() => {});
      }, () => {}, { enableHighAccuracy: true, timeout: 10000 });
    };
    pingLocation(); // immediate first ping
    locationInterval.current = setInterval(pingLocation, 60000); // every 60s
  };

  const handleLogout = () => {
    if (locationInterval.current) clearInterval(locationInterval.current);
    logout();
    navigate('/login');
  };

  const navLinks = [
    { path: '/field', label: 'Home', icon: '🏠', end: true },
    { path: '/field/session', label: 'Session', icon: hasActiveSession ? '🟢' : '📍' },
    { path: '/field/visits', label: 'Visits', icon: '🤝' },
    { path: '/field/route', label: 'Route', icon: '🗺️' },
    { path: '/field/call-logs', label: 'Calls', icon: '📞' },
    { path: '/field/reminders', label: 'Reminders', icon: '🔔' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Top Bar */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-sm">🏥</div>
          <div>
            <div className="text-white text-sm font-semibold">{user?.name}</div>
            <div className="text-slate-400 text-xs flex items-center gap-1">
              {hasActiveSession ? (
                <><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" /> Session Active</>
              ) : 'Field Worker'}
            </div>
          </div>
        </div>
        <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-400 transition rounded-lg hover:bg-slate-700">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto pb-20">
        <Outlet context={{ hasActiveSession, setHasActiveSession, sessionId, setSessionId, startLocationTracking }} />
      </main>

      {/* Bottom Nav (Mobile-first) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 flex">
        {navLinks.map(link => (
          <NavLink key={link.path} to={link.path} end={link.end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-3 text-xs font-medium transition ${isActive ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'}`
            }>
            <span className="text-xl mb-0.5">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
