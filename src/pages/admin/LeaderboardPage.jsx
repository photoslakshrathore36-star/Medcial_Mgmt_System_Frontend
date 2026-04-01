import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const RANK_STYLES = {
  1: { bg: 'bg-yellow-900/40 border-yellow-600/50', text: 'text-yellow-400', badge: '🥇' },
  2: { bg: 'bg-slate-700/60 border-slate-500/50',   text: 'text-slate-300',  badge: '🥈' },
  3: { bg: 'bg-orange-900/30 border-orange-700/40', text: 'text-orange-400', badge: '🥉' },
};

export default function LeaderboardPage() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  useEffect(() => { load(); }, [month, year]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/leaderboard', { params: { month, year } });
      setData(res.data);
    } catch { toast.error('Load failed'); }
    setLoading(false);
  };

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">🏆 Leaderboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">Field workers ki monthly ranking</p>
        </div>
        <button onClick={load} className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg text-sm border border-slate-600">
          🔄 Refresh
        </button>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <select value={month} onChange={e => setMonth(Number(e.target.value))}
          className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm">
          {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : !data || data.leaderboard.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-slate-400">Is mahine koi data nahi hai</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.leaderboard.map((w) => {
            const s = RANK_STYLES[w.rank] || { bg: 'bg-slate-800 border-slate-700', text: 'text-slate-400', badge: `#${w.rank}` };
            return (
              <div key={w.worker_id} className={`border rounded-xl p-4 ${s.bg}`}>
                <div className="flex items-start gap-4">
                  {/* Rank */}
                  <div className="text-2xl min-w-[2rem] text-center">{s.badge}</div>
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {w.worker_name?.charAt(0)}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-bold text-base ${s.text}`}>{w.worker_name}</span>
                      {w.badges.map((b, bi) => (
                        <span key={bi} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                          {b.emoji} {b.label}
                        </span>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                      {[
                        { label: 'Visits', value: w.visits, color: 'text-blue-400' },
                        { label: 'Orders', value: w.orders, color: 'text-purple-400' },
                        { label: 'Revenue', value: `₹${Number(w.revenue||0).toLocaleString('en-IN')}`, color: 'text-green-400' },
                        { label: 'Doctors', value: w.unique_doctors, color: 'text-yellow-400' },
                      ].map((stat, i) => (
                        <div key={i} className="bg-slate-800/60 rounded-lg p-2 text-center">
                          <div className={`font-bold text-base ${stat.color}`}>{stat.value}</div>
                          <div className="text-slate-500 text-xs">{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
