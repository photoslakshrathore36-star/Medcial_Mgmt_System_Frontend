import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function FieldSessionPage() {
  const { hasActiveSession, setHasActiveSession, sessionId, setSessionId, startLocationTracking } = useOutletContext();
  const [sessionDetail, setSessionDetail] = useState(null);
  const [visits, setVisits] = useState([]);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [elapsed, setElapsed] = useState('');
  const [startTime, setStartTime] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (hasActiveSession && sessionId) {
      loadSessionDetail();
      loadVisits();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [hasActiveSession, sessionId]);

  const loadSessionDetail = async () => {
    try {
      const r = await api.get(`/field/sessions/${sessionId}`);
      setSessionDetail(r.data);
      const st = new Date(r.data.start_time);
      setStartTime(st);
      startTimer(st);
    } catch {}
  };

  const loadVisits = async () => {
    if (!sessionId) return;
    try {
      const r = await api.get(`/field/sessions/${sessionId}`);
      setVisits(r.data.visits || []);
    } catch {}
  };

  const startTimer = (st) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const update = () => {
      const diff = Math.floor((Date.now() - st.getTime()) / 1000);
      const h = Math.floor(diff / 3600), m = Math.floor((diff % 3600) / 60), s = diff % 60;
      setElapsed(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    update();
    timerRef.current = setInterval(update, 1000);
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        reject,
        { enableHighAccuracy: true, timeout: 15000 }
      );
    });
  };

  const handleStartSession = async () => {
    setGettingLocation(true);
    try {
      const loc = await getCurrentLocation();
      setCurrentLocation(loc);
      const r = await api.post('/field/session/start', loc);
      setHasActiveSession(true);
      setSessionId(r.data.session_id);
      startLocationTracking(r.data.session_id);
      toast.success('Session shuru ho gayi! 🚀');
      setTimeout(() => loadSessionDetail(), 500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Please allow location access and try again');
    }
    setGettingLocation(false);
  };

  const handleEndSession = async () => {
    if (!window.confirm('End session? All GPS tracks will be saved.')) return;
    setGettingLocation(true);
    try {
      const loc = await getCurrentLocation().catch(() => ({}));
      await api.post('/field/session/end', { ...loc, notes: '' });
      setHasActiveSession(false);
      setSessionId(null);
      setSessionDetail(null);
      setElapsed('');
      if (timerRef.current) clearInterval(timerRef.current);
      toast.success('Session samaapt! 👋');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
    setGettingLocation(false);
  };

  if (!hasActiveSession) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <h1 className="text-xl font-bold text-white mb-2">Field Session</h1>
        <p className="text-slate-400 text-sm mb-6">Start a session before heading out</p>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center">
          <div className="text-6xl mb-4">📍</div>
          <h2 className="text-white font-semibold text-lg mb-2">Session Start Karo</h2>
          <p className="text-slate-400 text-sm mb-6">GPS tracking will start automatically and admin can view your live location</p>
          <button
            onClick={handleStartSession}
            disabled={gettingLocation}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition"
          >
            {gettingLocation ? (
              <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Getting location...</>
            ) : (
              <><span className="text-2xl">🚀</span> Session Start</>
            )}
          </button>
        </div>

        <div className="mt-4 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <h3 className="text-slate-300 text-sm font-medium mb-2">📋 What a session does:</h3>
          <ul className="space-y-1.5 text-slate-400 text-sm">
            <li>✅ GPS tracking begins</li>
            <li>✅ Admin can see your live location</li>
            <li>✅ Every doctor visit is automatically recorded</li>
            <li>✅ Travel time and distance are automatically calculated</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Active Session Banner */}
      <div className="bg-green-900/30 border border-green-700/50 rounded-2xl p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse inline-block" />
            <span className="text-green-400 font-semibold">Session Active</span>
          </div>
          <div className="text-green-300 font-mono text-lg font-bold">{elapsed}</div>
        </div>
        {sessionDetail && (
          <p className="text-slate-400 text-xs">
            Start: {new Date(sessionDetail.start_time).toLocaleTimeString('en-IN')} · {visits.length} visits today
          </p>
        )}
      </div>

      {/* Visits in this session */}
      <div className="mb-5">
        <h2 className="text-white font-semibold mb-3">Is Session ke Visits ({visits.length})</h2>
        {visits.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center text-slate-400 text-sm">
            No visits yet. Go to the Visits page.
          </div>
        ) : (
          <div className="space-y-2">
            {visits.map((v, i) => (
              <div key={v.id} className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: getOutcomeColor(v.outcome) }}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium">{v.doctor_name}</div>
                  <div className="text-slate-400 text-xs">{v.clinic_name}</div>
                  <div className="flex gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                    <span>{new Date(v.arrival_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    {v.duration_minutes > 0 && <span>⏱ {v.duration_minutes} min</span>}
                    {v.distance_from_prev_km > 0 && <span>📍 {v.distance_from_prev_km} km</span>}
                  </div>
                </div>
                <span className="text-xs font-medium flex-shrink-0" style={{ color: getOutcomeColor(v.outcome) }}>
                  {v.outcome?.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* End Session */}
      <button
        onClick={handleEndSession}
        disabled={gettingLocation}
        className="w-full bg-red-600/20 hover:bg-red-600/40 border border-red-700/50 disabled:opacity-50 text-red-400 py-4 rounded-xl font-semibold flex items-center justify-center gap-3 transition"
      >
        {gettingLocation ? (
          <><div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /> Please wait...</>
        ) : (
          <><span className="text-2xl">🏁</span> Session End Karo</>
        )}
      </button>
      <p className="text-slate-500 text-xs text-center mt-2">End session when you return to the office</p>
    </div>
  );
}

function getOutcomeColor(outcome) {
  const map = { interested: '#22c55e', not_interested: '#ef4444', follow_up: '#f59e0b', sample_given: '#3b82f6', order_placed: '#8b5cf6', not_available: '#6b7280' };
  return map[outcome] || '#6b7280';
}
