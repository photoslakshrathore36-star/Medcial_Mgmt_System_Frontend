import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function FieldDashboard() {
  const { user } = useAuth();
  const { hasActiveSession, sessionId } = useOutletContext();
  const [todayPlans, setTodayPlans] = useState([]);
  const [todayVisits, setTodayVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [p, v] = await Promise.all([
          api.get('/visit-plans', { params: { status: 'planned' } }),
          api.get('/field/visits', { params: { date_from: today, date_to: today } }),
        ]);
        setTodayPlans(p.data);
        setTodayVisits(v.data);
      } catch {}
      setLoading(false);
    };
    load();
  }, [today]);

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Namaste, {user?.name?.split(' ')[0]}! 👋</h1>
        <p className="text-slate-400 text-sm">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* Session Status Card */}
      <div className={`rounded-2xl p-5 mb-5 ${hasActiveSession ? 'bg-green-900/30 border border-green-700/50' : 'bg-slate-800 border border-slate-700'}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {hasActiveSession ? (
                <><span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse inline-block" /><span className="text-green-400 font-semibold">Session Active</span></>
              ) : (
                <><span className="text-3xl">📍</span><span className="text-white font-semibold">No Active Session</span></>
              )}
            </div>
            <p className="text-slate-400 text-sm">
              {hasActiveSession ? 'GPS tracking chal raha hai' : 'Field pe jaane ke liye session start karo'}
            </p>
          </div>
          <button onClick={() => navigate('/field/session')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${hasActiveSession ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
            {hasActiveSession ? 'View' : 'Start'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-white">{todayVisits.length}</div>
          <div className="text-slate-400 text-xs mt-0.5">Aaj ke Visits</div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-white">{todayPlans.length}</div>
          <div className="text-slate-400 text-xs mt-0.5">Pending Plans</div>
        </div>
      </div>

      {/* Today's Visit Plans */}
      <div className="mb-5">
        <h2 className="text-white font-semibold mb-3">Aaj ke Plans</h2>
        {loading ? (
          <div className="flex justify-center py-4"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : todayPlans.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-slate-400 text-sm">Aaj ke liye koi plan nahi hai</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayPlans.map(p => (
              <div key={p.id} className="bg-slate-800 border border-slate-700 rounded-xl p-3">
                <div className="font-medium text-white text-sm">👨‍⚕️ {p.doctor_name}</div>
                <div className="text-slate-400 text-xs mt-0.5">{p.clinic_name} · {p.area_name}</div>
                {p.sample_products && <div className="text-blue-400 text-xs mt-1">🧪 {p.sample_products}</div>}
                {p.purpose && <div className="text-slate-400 text-xs mt-0.5 italic">{p.purpose}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Today's completed visits */}
      {todayVisits.length > 0 && (
        <div>
          <h2 className="text-white font-semibold mb-3">Aaj ke Visits ✅</h2>
          <div className="space-y-2">
            {todayVisits.map(v => (
              <div key={v.id} className="bg-slate-800 border border-slate-700 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-white text-sm">👨‍⚕️ {v.doctor_name}</div>
                  <span className="text-xs font-medium" style={{ color: getOutcomeColor(v.outcome) }}>
                    {v.outcome?.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-slate-400 text-xs mt-0.5">
                  {new Date(v.arrival_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  {v.duration_minutes > 0 && ` · ${v.duration_minutes} min`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getOutcomeColor(outcome) {
  const map = { interested: '#22c55e', not_interested: '#ef4444', follow_up: '#f59e0b', sample_given: '#3b82f6', order_placed: '#8b5cf6', not_available: '#6b7280' };
  return map[outcome] || '#6b7280';
}
