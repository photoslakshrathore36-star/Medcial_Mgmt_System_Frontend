import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [fieldReport, setFieldReport] = useState(null);
  const [productionReport, setProductionReport] = useState(null);
  const [alertsData, setAlertsData] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [filterWorker, setFilterWorker] = useState('');
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30*24*3600000).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('field');

  useEffect(() => {
    api.get('/workers', { params: { role: 'field_worker' } }).then(r => setWorkers(r.data)).catch(() => {});
    loadReports();
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const [nm, fg] = await Promise.all([
        api.get('/alerts/no-movement'),
        api.get('/alerts/fake-gps'),
      ]);
      setAlertsData({ noMovement: nm.data, fakeGps: fg.data });
    } catch {}
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const [f, p] = await Promise.all([
        api.get('/reports/field', { params: { date_from: dateFrom, date_to: dateTo, worker_id: filterWorker } }),
        api.get('/reports/production'),
      ]);
      setFieldReport(f.data); setProductionReport(p.data);
    } catch { toast.error('Load failed'); }
    setLoading(false);
  };

  const OUTCOME_COLORS = { interested: '#22c55e', not_interested: '#ef4444', follow_up: '#f59e0b', sample_given: '#3b82f6', order_placed: '#8b5cf6', not_available: '#6b7280', failed: '#dc2626' };
  const alertCount = (alertsData?.noMovement?.alerts?.length || 0) + (alertsData?.fakeGps?.suspicious_visits?.length || 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Reports</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          {k:'field',      l:'🏃 Field Report'},
          {k:'production', l:'🏭 Production Report'},
          {k:'alerts',     l:`🚨 Alerts${alertCount>0?` (${alertCount})`:''}`,},
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${tab === t.k ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-500'}${t.k==='alerts'&&alertCount>0?' border-red-700/50':''}`}>
            {t.l}
          </button>
        ))}
      </div>

      {tab === 'field' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-5 bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div>
              <label className="text-slate-400 text-xs block mb-1">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Worker</label>
              <select value={filterWorker} onChange={e => setFilterWorker(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none">
                <option value="">All Workers</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={loadReports} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Search</button>
            </div>
          </div>

          {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div> : fieldReport && (
            <div className="space-y-5">
              {/* Worker-wise */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-4">Worker-wise Performance</h3>
                {fieldReport.visits_by_worker.length === 0 ? <p className="text-slate-400 text-sm">Koi data nahi</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-slate-400 text-xs">
                        <th className="text-left pb-2">Worker</th>
                        <th className="text-right pb-2">Visits</th>
                        <th className="text-right pb-2">Time (min)</th>
                        <th className="text-right pb-2">Orders</th>
                        <th className="text-right pb-2">Interested</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-700">
                        {fieldReport.visits_by_worker.map((r, i) => (
                          <tr key={i}>
                            <td className="py-2 text-white">{r.worker_name}</td>
                            <td className="py-2 text-right text-white font-medium">{r.visits}</td>
                            <td className="py-2 text-right text-slate-300">{r.total_time || 0}</td>
                            <td className="py-2 text-right text-purple-400 font-medium">{r.orders}</td>
                            <td className="py-2 text-right text-green-400">{r.interested}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Outcome Summary */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-4">Visit Outcomes</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {fieldReport.outcome_summary.map((o, i) => (
                    <div key={i} className="bg-slate-700 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold" style={{ color: OUTCOME_COLORS[o.outcome] }}>{o.cnt}</div>
                      <div className="text-slate-400 text-xs mt-0.5 capitalize">{o.outcome?.replace('_', ' ')}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Area-wise */}
              {fieldReport.visits_by_area.length > 0 && (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <h3 className="text-white font-semibold mb-4">Area-wise Visits</h3>
                  <div className="space-y-2">
                    {fieldReport.visits_by_area.map((a, i) => {
                      const max = Math.max(...fieldReport.visits_by_area.map(x => x.visits));
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-32 text-slate-300 text-sm truncate">{a.area_name || 'Unknown'}</div>
                          <div className="flex-1 bg-slate-700 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(a.visits / max) * 100}%` }} />
                          </div>
                          <div className="w-8 text-right text-white text-sm font-medium">{a.visits}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'production' && !loading && productionReport && (
        <div className="space-y-5">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-4">Department-wise Tasks</h3>
            <div className="space-y-3">
              {productionReport.by_dept.map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-36 text-slate-300 text-sm truncate">{d.dept_name}</div>
                  <div className="flex-1 bg-slate-700 rounded-full h-2.5">
                    <div className="h-2.5 rounded-full" style={{ width: `${d.tasks ? (d.done / d.tasks) * 100 : 0}%`, background: d.color || '#3b82f6' }} />
                  </div>
                  <div className="text-slate-400 text-xs w-20 text-right">{d.done}/{d.tasks}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-4">Recent Orders</h3>
            <div className="space-y-2">
              {productionReport.recent_orders.map(o => (
                <div key={o.order_no} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                  <div>
                    <span className="text-blue-400 text-xs font-mono">{o.order_no}</span>
                    <span className="text-white text-sm ml-2">{o.name}</span>
                  </div>
                  <span className="text-slate-400 text-xs">{o.done}/{o.tasks}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ALERTS TAB */}
      {tab === 'alerts' && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <button onClick={loadAlerts}
              className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg text-sm transition">
              🔄 Refresh
            </button>
          </div>

          {/* No Movement Alerts */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              📍 No Movement Alert
              <span className="text-xs bg-yellow-900/40 text-yellow-300 px-2 py-0.5 rounded-full">
                {alertsData?.noMovement?.threshold_minutes || 30} min se zyada idle
              </span>
            </h3>
            {!alertsData ? (
              <div className="text-slate-400 text-sm">Loading...</div>
            ) : alertsData.noMovement.alerts.length === 0 ? (
              <div className="text-green-400 text-sm">✅ Koi alert nahi — sabhi staff active hain</div>
            ) : (
              <div className="space-y-2">
                {alertsData.noMovement.alerts.map(a => (
                  <div key={a.session_id} className="bg-yellow-900/20 border border-yellow-700/30 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">{a.worker_name}</div>
                      <div className="text-slate-400 text-xs">
                        {a.last_ping
                          ? `Last ping: ${new Date(a.last_ping).toLocaleTimeString('en-IN')} (${a.minutes_since_ping} min ago)`
                          : 'Koi ping nahi mili'}
                      </div>
                    </div>
                    <span className="text-yellow-400 text-sm font-bold">⚠️</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fake GPS Alerts */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              🛰 Suspicious GPS / Fake Location
              <span className="text-xs bg-red-900/40 text-red-300 px-2 py-0.5 rounded-full">Last 7 days</span>
            </h3>
            {!alertsData ? (
              <div className="text-slate-400 text-sm">Loading...</div>
            ) : alertsData.fakeGps.suspicious_visits.length === 0 ? (
              <div className="text-green-400 text-sm">✅ Koi suspicious visit nahi mili</div>
            ) : (
              <div className="space-y-2">
                {alertsData.fakeGps.suspicious_visits.map(v => (
                  <div key={v.id} className="bg-red-900/20 border border-red-700/30 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-white font-medium">{v.worker_name}</div>
                        <div className="text-slate-300 text-sm">{v.doctor_name} · {v.area_name}</div>
                        <div className="text-slate-400 text-xs mt-1">
                          {new Date(v.arrival_time).toLocaleString('en-IN')}
                        </div>
                        {v.arrival_lat && (
                          <div className="text-slate-400 text-xs">
                            GPS: {parseFloat(v.arrival_lat).toFixed(5)}, {parseFloat(v.arrival_lng).toFixed(5)}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-red-400 font-bold text-sm">{v.distance_from_doctor_m}m off</div>
                        <div className="text-slate-400 text-xs">from doctor</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
