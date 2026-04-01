import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const ACTION_COLORS = {
  LOGIN: 'text-blue-400', LOGOUT: 'text-slate-400',
  CREATE: 'text-green-400', UPDATE: 'text-yellow-400', DELETE: 'text-red-400',
  HIPAA_PURGE: 'text-red-400', HIPAA_DATA_EXPORT: 'text-purple-400',
  VIEW: 'text-slate-300', EXPORT: 'text-blue-300',
};

export default function AuditPage() {
  const [summary, setSummary]   = useState(null);
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [tab, setTab]           = useState('dashboard');
  const [purgeModal, setPurgeModal] = useState(false);
  const [purgeId, setPurgeId]   = useState('');
  const [exportUid, setExportUid] = useState('');
  const [filters, setFilters]   = useState({ entity_type:'', action:'', date_from:'', date_to:'' });

  useEffect(() => { loadSummary(); }, []);
  useEffect(() => { if (tab === 'logs') loadLogs(); }, [tab, filters]);

  const loadSummary = async () => {
    setLoading(true);
    try { const r = await api.get('/audit/summary'); setSummary(r.data); }
    catch { toast.error('Load failed'); }
    setLoading(false);
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      const r = await api.get('/audit/logs', { params: { ...filters, limit: 200 } });
      setLogs(r.data);
    } catch { toast.error('Logs load failed'); }
    setLoading(false);
  };

  const handlePurge = async () => {
    if (!purgeId) return toast.error('Doctor ID enter karo');
    if (!window.confirm(`Doctor ID ${purgeId} ka saara PII data permanently delete ho jaayega. Confirm?`)) return;
    try {
      await api.delete(`/hipaa/doctor/${purgeId}/purge`);
      toast.success('Doctor PII purge ho gaya (HIPAA compliant)');
      setPurgeModal(false); setPurgeId('');
    } catch (e) { toast.error(e.response?.data?.message || 'Purge failed'); }
  };

  const handleExport = async () => {
    if (!exportUid) return toast.error('User ID enter karo');
    try {
      const r = await api.get(`/hipaa/data-export/${exportUid}`);
      const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `user_${exportUid}_data_export.json`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Data export download ho raha hai');
    } catch (e) { toast.error(e.response?.data?.message || 'Export failed'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">HIPAA Compliance & Audit</h1>
          <p className="text-slate-400 text-sm mt-0.5">Data privacy, access logs, aur right-to-delete</p>
        </div>
        <button onClick={() => setPurgeModal(true)}
          className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          🗑 PII Purge (HIPAA)
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[{ k:'dashboard', l:'📊 Dashboard' }, { k:'logs', l:'📋 Audit Logs' }, { k:'tools', l:'🔧 HIPAA Tools' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${tab === t.k ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}

      {/* DASHBOARD TAB */}
      {!loading && tab === 'dashboard' && summary && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Events', val: summary.totals.total_events, color: 'text-blue-400' },
              { label: 'Unique Users', val: summary.totals.unique_users, color: 'text-green-400' },
              { label: 'Today', val: summary.totals.today, color: 'text-yellow-400' },
              { label: 'Last 7 Days', val: summary.totals.last_7_days, color: 'text-purple-400' },
            ].map((s, i) => (
              <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{s.val || 0}</div>
                <div className="text-slate-400 text-xs mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-3">Top Actions</h3>
              <div className="space-y-2">
                {summary.by_action.map((a, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`text-xs font-mono font-bold w-32 truncate ${ACTION_COLORS[a.action] || 'text-slate-300'}`}>{a.action}</span>
                    <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(a.cnt / (summary.by_action[0]?.cnt || 1)) * 100}%` }} />
                    </div>
                    <span className="text-slate-400 text-xs w-8 text-right">{a.cnt}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-3">Most Active Users</h3>
              <div className="space-y-2">
                {summary.by_user.map((u, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-slate-300 text-sm">{u.user_name}</span>
                    <span className="text-blue-400 text-sm font-medium">{u.cnt} actions</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3">Recent Activity</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-slate-400 text-xs border-b border-slate-700">
                  <th className="text-left pb-2 pr-3">Action</th>
                  <th className="text-left pb-2 pr-3">User</th>
                  <th className="text-left pb-2 pr-3">Entity</th>
                  <th className="text-left pb-2">Time</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-700">
                  {summary.recent.map(l => (
                    <tr key={l.id}>
                      <td className={`py-1.5 pr-3 font-mono text-xs font-bold ${ACTION_COLORS[l.action] || 'text-slate-300'}`}>{l.action}</td>
                      <td className="py-1.5 pr-3 text-slate-300 text-xs">{l.user_name || '—'}</td>
                      <td className="py-1.5 pr-3 text-slate-400 text-xs">{l.entity_type ? `${l.entity_type} #${l.entity_id}` : '—'}</td>
                      <td className="py-1.5 text-slate-500 text-xs whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* LOGS TAB */}
      {tab === 'logs' && (
        <div className="space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-slate-400 text-xs block mb-1">Entity Type</label>
              <input type="text" placeholder="e.g. doctor, user" value={filters.entity_type}
                onChange={e => setFilters(f => ({...f, entity_type: e.target.value}))}
                className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm w-32" />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Action</label>
              <input type="text" placeholder="e.g. DELETE" value={filters.action}
                onChange={e => setFilters(f => ({...f, action: e.target.value}))}
                className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm w-32" />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">From</label>
              <input type="date" value={filters.date_from} onChange={e => setFilters(f => ({...f, date_from: e.target.value}))}
                className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">To</label>
              <input type="date" value={filters.date_to} onChange={e => setFilters(f => ({...f, date_to: e.target.value}))}
                className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
            <button onClick={loadLogs} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Search</button>
          </div>

          {!loading && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-slate-400 text-xs border-b border-slate-700">
                  <th className="text-left pb-2 pr-3">Action</th>
                  <th className="text-left pb-2 pr-3">User</th>
                  <th className="text-left pb-2 pr-3">Entity</th>
                  <th className="text-left pb-2 pr-3">IP</th>
                  <th className="text-left pb-2">Timestamp</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-700">
                  {logs.length === 0
                    ? <tr><td colSpan={5} className="py-8 text-center text-slate-400">Koi logs nahi mili</td></tr>
                    : logs.map(l => (
                      <tr key={l.id}>
                        <td className={`py-1.5 pr-3 font-mono text-xs font-bold ${ACTION_COLORS[l.action] || 'text-slate-300'}`}>{l.action}</td>
                        <td className="py-1.5 pr-3 text-slate-300 text-xs">{l.user_name || '—'}</td>
                        <td className="py-1.5 pr-3 text-slate-400 text-xs">{l.entity_type ? `${l.entity_type}#${l.entity_id}` : '—'}</td>
                        <td className="py-1.5 pr-3 text-slate-500 text-xs font-mono">{l.ip_address || '—'}</td>
                        <td className="py-1.5 text-slate-500 text-xs whitespace-nowrap">
                          {new Date(l.created_at).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* HIPAA TOOLS TAB */}
      {tab === 'tools' && (
        <div className="space-y-5 max-w-xl">
          <div className="bg-slate-800 border border-red-800/40 rounded-xl p-5">
            <h3 className="text-red-400 font-semibold mb-2">🗑 Right to Delete (PII Purge)</h3>
            <p className="text-slate-400 text-sm mb-4">Doctor ka naam, phone, email, address aur GPS coordinates anonymize ho jaate hain. Aggregate data (visits, orders) preserve rehta hai.</p>
            <div className="flex gap-2">
              <input type="number" placeholder="Doctor ID" value={purgeId} onChange={e => setPurgeId(e.target.value)}
                className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm" />
              <button onClick={handlePurge} className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                Purge PII
              </button>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-2">📦 Data Export (Right to Access)</h3>
            <p className="text-slate-400 text-sm mb-4">Kisi bhi worker ka saara data JSON mein download karo — HIPAA/GDPR data portability requirement ke liye.</p>
            <div className="flex gap-2">
              <input type="number" placeholder="Worker User ID" value={exportUid} onChange={e => setExportUid(e.target.value)}
                className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm" />
              <button onClick={handleExport} className="bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                Export JSON
              </button>
            </div>
          </div>

          <div className="bg-slate-800 border border-green-800/40 rounded-xl p-5">
            <h3 className="text-green-400 font-semibold mb-3">✅ Compliance Checklist</h3>
            <div className="space-y-2">
              {[
                ['Audit logs har action ke liye', true],
                ['PII delete / anonymize capability', true],
                ['Data export (right to access)', true],
                ['Role-based access control', true],
                ['JWT authentication', true],
                ['HTTPS (Railway se auto-enabled)', true],
                ['Data at rest encryption', false],
                ['Breach notification system', false],
              ].map(([item, done], i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={done ? 'text-green-400' : 'text-slate-500'}>{done ? '✅' : '⬜'}</span>
                  <span className={`text-sm ${done ? 'text-slate-300' : 'text-slate-500'}`}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Purge Confirm Modal */}
      {purgeModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-red-700/50 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-red-400 font-bold text-lg mb-2">⚠️ PII Purge</h2>
            <p className="text-slate-400 text-sm mb-4">Doctor ID enter karo jiska PII delete karna hai:</p>
            <input type="number" placeholder="Doctor ID" value={purgeId} onChange={e => setPurgeId(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm mb-4" />
            <div className="flex gap-3">
              <button onClick={handlePurge} className="flex-1 bg-red-700 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-medium">Purge</button>
              <button onClick={() => { setPurgeModal(false); setPurgeId(''); }} className="flex-1 bg-slate-700 text-slate-300 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
