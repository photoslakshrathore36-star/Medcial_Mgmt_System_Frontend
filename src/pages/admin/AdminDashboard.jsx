import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

function StatCard({ label, value, sub, color, icon, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-slate-800 border border-slate-700 rounded-2xl p-5 ${onClick ? 'cursor-pointer hover:border-slate-500 transition' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-xl`}>{icon}</div>
      </div>
      <div className="text-2xl font-bold text-white">{value ?? '—'}</div>
      <div className="text-slate-400 text-sm mt-0.5">{label}</div>
      {sub && <div className="text-slate-500 text-xs mt-1">{sub}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/reports/dashboard').then(r => { setStats(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      {/* Production Stats */}
      <div className="mb-2">
        <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Production</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Orders" value={stats?.orders?.total} color="bg-blue-600/20" icon="📦"
            sub={`${stats?.orders?.active} active`} onClick={() => navigate('/admin/orders')} />
          <StatCard label="Completed Orders" value={stats?.orders?.completed} color="bg-green-600/20" icon="✅"
            onClick={() => navigate('/admin/orders?status=completed')} />
          <StatCard label="Active Tasks" value={stats?.tasks?.in_progress} color="bg-yellow-600/20" icon="⚙️"
            sub={`${stats?.tasks?.pending} pending`} onClick={() => navigate('/admin/production-tasks')} />
          <StatCard label="Production Workers" value={stats?.workers?.production} color="bg-purple-600/20" icon="👷"
            onClick={() => navigate('/admin/workers?role=worker')} />
        </div>
      </div>

      {/* Field Stats */}
      <div className="mt-6 mb-2">
        <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Field Operations</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Field Workers" value={stats?.workers?.field} color="bg-cyan-600/20" icon="🏃"
            onClick={() => navigate('/admin/workers?role=field_worker')} />
          <StatCard label="Active Sessions" value={stats?.active_sessions} color="bg-emerald-600/20" icon="📍"
            sub="Live in field" onClick={() => navigate('/admin/field-tracking')} />
          <StatCard label="Visits Today" value={stats?.visits_today} color="bg-orange-600/20" icon="🤝"
            onClick={() => navigate('/admin/field-tracking')} />
          <StatCard label="Total Doctors" value={stats?.doctors} color="bg-pink-600/20" icon="👨‍⚕️"
            onClick={() => navigate('/admin/doctors')} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'New Order', icon: '➕', path: '/admin/orders' },
              { label: 'Assign Task', icon: '✅', path: '/admin/production-tasks' },
              { label: 'Plan Visit', icon: '📋', path: '/admin/visit-plans' },
              { label: 'Live Track', icon: '📍', path: '/admin/field-tracking' },
            ].map(a => (
              <button key={a.path} onClick={() => navigate(a.path)}
                className="bg-slate-700 hover:bg-slate-600 text-white text-sm py-2.5 px-3 rounded-xl flex items-center gap-2 transition">
                <span>{a.icon}</span>{a.label}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-3">Task Summary</h3>
          {stats?.tasks && (
            <div className="space-y-2">
              {[
                { label: 'Pending', value: stats.tasks.pending, color: 'bg-slate-600' },
                { label: 'In Progress', value: stats.tasks.in_progress, color: 'bg-yellow-600' },
                { label: 'Completed', value: stats.tasks.completed, color: 'bg-green-600' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-24 text-slate-400 text-sm">{item.label}</div>
                  <div className="flex-1 bg-slate-700 rounded-full h-2">
                    <div
                      className={`${item.color} h-2 rounded-full transition-all`}
                      style={{ width: `${stats.tasks.total ? (item.value / stats.tasks.total * 100) : 0}%` }}
                    />
                  </div>
                  <div className="w-8 text-right text-white text-sm font-medium">{item.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
