import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const LEVEL_STYLES = {
  Hot:  { bg: 'bg-green-900/30 border-green-700/40',  badge: 'bg-green-900/50 text-green-300',  dot: 'bg-green-500'  },
  Warm: { bg: 'bg-yellow-900/20 border-yellow-700/30', badge: 'bg-yellow-900/50 text-yellow-300', dot: 'bg-yellow-500' },
  Cool: { bg: 'bg-blue-900/20 border-blue-700/30',    badge: 'bg-blue-900/50 text-blue-300',    dot: 'bg-blue-500'   },
  Cold: { bg: 'bg-slate-800 border-slate-700',         badge: 'bg-slate-700 text-slate-400',     dot: 'bg-slate-500'  },
};

export default function DoctorEngagementPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter]   = useState('');
  const [search, setSearch]   = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/doctors/engagement/all');
      setDoctors(res.data);
    } catch { toast.error('Load failed'); }
    setLoading(false);
  };

  const filtered = doctors.filter(d => {
    const matchLevel  = !filter || d.level === filter;
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || (d.clinic_name||'').toLowerCase().includes(search.toLowerCase());
    return matchLevel && matchSearch;
  });

  const counts = { Hot: 0, Warm: 0, Cool: 0, Cold: 0 };
  doctors.forEach(d => { if (counts[d.level] !== undefined) counts[d.level]++; });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Doctor Engagement</h1>
          <p className="text-slate-400 text-sm mt-0.5">Har doctor ka relationship strength score</p>
        </div>
        <button onClick={load} className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg text-sm border border-slate-600">🔄 Refresh</button>
      </div>

      {/* Summary chips */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[['', 'All', `(${doctors.length})`], ['Hot', '🔥 Hot', `(${counts.Hot})`], ['Warm', '🌡️ Warm', `(${counts.Warm})`], ['Cool', '❄️ Cool', `(${counts.Cool})`], ['Cold', '🧊 Cold', `(${counts.Cold})`]].map(([val, label, cnt]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-3 py-1.5 rounded-full text-sm transition border ${filter === val ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'}`}>
            {label} {cnt}
          </button>
        ))}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Doctor ya clinic name search karo..."
        className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm mb-5 focus:outline-none focus:border-blue-500" />

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
          <p className="text-slate-400">Koi doctor nahi mila</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(doc => {
            const s = LEVEL_STYLES[doc.level] || LEVEL_STYLES.Cold;
            return (
              <div key={doc.id} className={`border rounded-xl p-4 ${s.bg}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold">{doc.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.badge}`}>{doc.level}</span>
                      {doc.days_since_visit > 60 && <span className="text-xs bg-red-900/40 text-red-400 px-2 py-0.5 rounded-full">⚠️ Dormant</span>}
                    </div>
                    {doc.clinic_name && <div className="text-slate-400 text-sm mt-0.5">{doc.clinic_name}</div>}
                    {doc.area_name && <div className="text-slate-500 text-xs mt-0.5">📍 {doc.area_name}</div>}
                  </div>
                  {/* Score circle */}
                  <div className="text-center flex-shrink-0">
                    <div className={`text-2xl font-bold ${doc.score >= 70 ? 'text-green-400' : doc.score >= 40 ? 'text-yellow-400' : 'text-slate-400'}`}>
                      {doc.score}
                    </div>
                    <div className="text-slate-500 text-xs">/ 100</div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-3 text-center text-xs">
                  <div className="bg-slate-800/60 rounded-lg p-2">
                    <div className="text-white font-medium">{doc.total_visits}</div>
                    <div className="text-slate-500">Visits</div>
                  </div>
                  <div className="bg-slate-800/60 rounded-lg p-2">
                    <div className="text-purple-400 font-medium">{doc.orders}</div>
                    <div className="text-slate-500">Orders</div>
                  </div>
                  <div className="bg-slate-800/60 rounded-lg p-2">
                    <div className="text-blue-400 font-medium">{doc.visits_last_30}</div>
                    <div className="text-slate-500">Last 30d</div>
                  </div>
                  <div className="bg-slate-800/60 rounded-lg p-2">
                    <div className={`font-medium ${doc.days_since_visit > 30 ? 'text-red-400' : 'text-green-400'}`}>
                      {doc.days_since_visit === 999 ? '—' : `${doc.days_since_visit}d`}
                    </div>
                    <div className="text-slate-500">Since visit</div>
                  </div>
                </div>
                {/* Score bar */}
                <div className="mt-3 w-full bg-slate-700 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full transition-all"
                    style={{ width: `${doc.score}%`, background: doc.score >= 70 ? '#22c55e' : doc.score >= 40 ? '#f59e0b' : '#6b7280' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
