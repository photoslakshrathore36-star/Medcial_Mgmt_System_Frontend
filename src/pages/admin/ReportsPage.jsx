import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const API_BASE = process.env.REACT_APP_API_URL || 'https://medcialmgmtsystembackend-production.up.railway.app/api';

export default function ReportsPage() {
  const [fieldReport, setFieldReport]       = useState(null);
  const [productionReport, setProductionReport] = useState(null);
  const [alertsData, setAlertsData]         = useState(null);
  const [workers, setWorkers]               = useState([]);
  const [filterWorker, setFilterWorker]     = useState('');
  const [dateFrom, setDateFrom]             = useState(new Date(Date.now() - 30*24*3600000).toISOString().split('T')[0]);
  const [dateTo, setDateTo]                 = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading]               = useState(false);
  const [exporting, setExporting]           = useState(false);
  const [tab, setTab]                       = useState('field');

  useEffect(() => {
    api.get('/workers', { params: { role: 'field_worker' } }).then(r => setWorkers(r.data)).catch(() => {});
    loadReports();
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const [nm, fg] = await Promise.all([api.get('/alerts/no-movement'), api.get('/alerts/fake-gps')]);
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

  // ─── CSV Export (browser-side download via API) ──────────────────────────
  const exportCSV = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo, format: 'csv' });
      if (filterWorker) params.append('worker_id', filterWorker);
      const res = await fetch(`${API_BASE}/export/report/field-summary?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `field_report_${dateFrom}_to_${dateTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV download ho raha hai!');
    } catch { toast.error('Export failed'); }
    setExporting(false);
  };

  // ─── PDF Export (client-side via print) ──────────────────────────────────
  const printRef = useRef(null);
  const exportPDF = async () => {
    // Fetch full summary data first
    setExporting(true);
    try {
      const res = await api.get('/export/report/field-summary', {
        params: { date_from: dateFrom, date_to: dateTo, worker_id: filterWorker || undefined }
      });
      const data = res.data;

      // Build a print-ready HTML in a new window
      const OUTCOME_COLORS_PRINT = {
        interested: '#22c55e', not_interested: '#ef4444', follow_up: '#f59e0b',
        sample_given: '#3b82f6', order_placed: '#8b5cf6', not_available: '#6b7280', failed: '#dc2626'
      };

      const html = `<!DOCTYPE html><html><head>
        <meta charset="utf-8"/>
        <title>Field Report ${data.period.from} to ${data.period.to}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: #fff; padding: 20px; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .subtitle { color: #555; font-size: 13px; margin-bottom: 20px; }
          .section { margin-bottom: 24px; }
          .section h2 { font-size: 14px; font-weight: bold; margin-bottom: 8px; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; color: #1d4ed8; }
          .kpi-grid { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
          .kpi { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 16px; min-width: 120px; }
          .kpi-val { font-size: 22px; font-weight: bold; color: #1d4ed8; }
          .kpi-label { font-size: 11px; color: #6b7280; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #f3f4f6; text-align: left; padding: 6px 8px; font-weight: 600; border: 1px solid #e5e7eb; }
          td { padding: 5px 8px; border: 1px solid #e5e7eb; }
          tr:nth-child(even) td { background: #f9fafb; }
          .outcome-badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: bold; }
          .trend-bar { background: #e5e7eb; border-radius: 4px; height: 8px; margin-top: 2px; }
          .trend-fill { background: #3b82f6; border-radius: 4px; height: 8px; }
          .low-stock { color: #dc2626; font-weight: bold; }
          .footer { margin-top: 30px; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 8px; }
          @media print { body { padding: 10px; } }
        </style>
      </head><body>
        <h1>Field Report</h1>
        <div class="subtitle">Period: ${data.period.from} to ${data.period.to} &nbsp;|&nbsp; Generated: ${new Date(data.generated_at).toLocaleString('en-IN')}</div>

        <div class="section">
          <h2>Summary</h2>
          <div class="kpi-grid">
            <div class="kpi"><div class="kpi-val">${data.totals.total_visits || 0}</div><div class="kpi-label">Total Visits</div></div>
            <div class="kpi"><div class="kpi-val">${data.totals.active_workers || 0}</div><div class="kpi-label">Active Workers</div></div>
            <div class="kpi"><div class="kpi-val">${data.totals.doctors_visited || 0}</div><div class="kpi-label">Doctors Visited</div></div>
            <div class="kpi"><div class="kpi-val">${data.totals.total_orders || 0}</div><div class="kpi-label">Orders Placed</div></div>
            <div class="kpi"><div class="kpi-val">₹${Number(data.totals.total_order_value || 0).toLocaleString('en-IN')}</div><div class="kpi-label">Order Value</div></div>
            <div class="kpi"><div class="kpi-val">${data.totals.avg_visit_duration || 0} min</div><div class="kpi-label">Avg Visit Time</div></div>
          </div>
        </div>

        <div class="section">
          <h2>Worker-wise Performance</h2>
          <table>
            <thead><tr>
              <th>Worker</th><th>Visits</th><th>Orders</th><th>Interested</th>
              <th>Samples Given</th><th>Follow Ups</th><th>Order Value (₹)</th><th>Avg Duration</th>
            </tr></thead>
            <tbody>
              ${data.visits_by_worker.map(r => `<tr>
                <td>${r.worker_name}</td>
                <td style="text-align:center;font-weight:bold">${r.total_visits}</td>
                <td style="text-align:center;color:#7c3aed;font-weight:bold">${r.orders}</td>
                <td style="text-align:center;color:#16a34a">${r.interested}</td>
                <td style="text-align:center">${r.samples_given}</td>
                <td style="text-align:center">${r.follow_ups}</td>
                <td style="text-align:right">₹${Number(r.total_order_value || 0).toLocaleString('en-IN')}</td>
                <td style="text-align:center">${r.avg_duration_min || 0} min</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Visit Outcomes</h2>
          <table>
            <thead><tr><th>Outcome</th><th>Count</th></tr></thead>
            <tbody>
              ${data.outcome_summary.map(o => `<tr>
                <td style="color:${OUTCOME_COLORS_PRINT[o.outcome] || '#111'};font-weight:bold">
                  ${o.outcome?.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())}
                </td>
                <td style="text-align:center;font-weight:bold">${o.cnt}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Area-wise Visits</h2>
          <table>
            <thead><tr><th>Area</th><th>Visits</th><th>Orders</th></tr></thead>
            <tbody>
              ${data.visits_by_area.map(r => `<tr>
                <td>${r.area_name}</td>
                <td style="text-align:center;font-weight:bold">${r.visits}</td>
                <td style="text-align:center;color:#7c3aed">${r.orders}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Top Doctors by Visit Count</h2>
          <table>
            <thead><tr><th>#</th><th>Doctor</th><th>Clinic</th><th>Area</th><th>Visits</th><th>Orders</th><th>Order Value (₹)</th></tr></thead>
            <tbody>
              ${data.top_doctors.map((r, i) => `<tr>
                <td style="text-align:center;color:#6b7280">${i + 1}</td>
                <td>${r.doctor_name}</td>
                <td>${r.clinic_name || '—'}</td>
                <td>${r.area_name}</td>
                <td style="text-align:center;font-weight:bold">${r.visits}</td>
                <td style="text-align:center;color:#7c3aed">${r.orders}</td>
                <td style="text-align:right">₹${Number(r.total_order_value || 0).toLocaleString('en-IN')}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>

        ${data.low_stock_alerts.length > 0 ? `
        <div class="section">
          <h2 style="color:#dc2626">⚠️ Low Stock Alerts</h2>
          <table>
            <thead><tr><th>Product</th><th>Worker</th><th>Current Stock</th><th>Min Stock</th></tr></thead>
            <tbody>
              ${data.low_stock_alerts.map(r => `<tr>
                <td>${r.product_name}</td>
                <td>${r.worker_name}</td>
                <td class="low-stock" style="text-align:center">${r.quantity}</td>
                <td style="text-align:center">${r.min_stock}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>` : ''}

        <div class="footer">
          Generated by Medical Field Management System &nbsp;|&nbsp; ${new Date().toLocaleString('en-IN')}
        </div>
      </body></html>`;

      const win = window.open('', '_blank');
      win.document.write(html);
      win.document.close();
      win.onload = () => { win.print(); };
      toast.success('Print/PDF window khul rahi hai!');
    } catch { toast.error('PDF export failed'); }
    setExporting(false);
  };

  const OUTCOME_COLORS = {
    interested: '#22c55e', not_interested: '#ef4444', follow_up: '#f59e0b',
    sample_given: '#3b82f6', order_placed: '#8b5cf6', not_available: '#6b7280', failed: '#dc2626'
  };
  const alertCount = (alertsData?.noMovement?.alerts?.length || 0) + (alertsData?.fakeGps?.suspicious_visits?.length || 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Reports</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { k: 'field',      l: '🏃 Field Report' },
          { k: 'production', l: '🏭 Production Report' },
          { k: 'alerts',     l: `🚨 Alerts${alertCount > 0 ? ` (${alertCount})` : ''}` },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${tab === t.k ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-500'}${t.k === 'alerts' && alertCount > 0 ? ' border-red-700/50' : ''}`}>
            {t.l}
          </button>
        ))}
      </div>

      {tab === 'field' && (
        <div>
          {/* Filters + Export Buttons */}
          <div className="flex flex-wrap gap-3 mb-5 bg-slate-800 border border-slate-700 rounded-xl p-4 items-end">
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
            <button onClick={loadReports}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
              Search
            </button>

            {/* Export Buttons */}
            <div className="flex gap-2 ml-auto flex-wrap">
              <button onClick={exportCSV} disabled={exporting}
                className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50">
                {exporting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '📊'}
                Excel/CSV
              </button>
              <button onClick={exportPDF} disabled={exporting}
                className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50">
                {exporting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '📄'}
                PDF Print
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : fieldReport && (
            <div className="space-y-5">
              {/* Worker-wise */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-4">Worker-wise Performance</h3>
                {fieldReport.visits_by_worker.length === 0 ? (
                  <p className="text-slate-400 text-sm">No data available</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-slate-400 text-xs border-b border-slate-700">
                          <th className="text-left pb-2 pr-3">Worker</th>
                          <th className="text-right pb-2 pr-3">Visits</th>
                          <th className="text-right pb-2 pr-3">Time (min)</th>
                          <th className="text-right pb-2 pr-3">Orders</th>
                          <th className="text-right pb-2">Interested</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {fieldReport.visits_by_worker.map((r, i) => (
                          <tr key={i}>
                            <td className="py-2 pr-3 text-white">{r.worker_name}</td>
                            <td className="py-2 pr-3 text-right text-white font-medium">{r.visits}</td>
                            <td className="py-2 pr-3 text-right text-slate-300">{r.total_time || 0}</td>
                            <td className="py-2 pr-3 text-right text-purple-400 font-medium">{r.orders}</td>
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
                      <div className="text-slate-400 text-xs mt-0.5 capitalize">{o.outcome?.replace(/_/g, ' ')}</div>
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
            <button onClick={loadAlerts} className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg text-sm transition">
              🔄 Refresh
            </button>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              📍 No Movement Alert
              <span className="text-xs bg-yellow-900/40 text-yellow-300 px-2 py-0.5 rounded-full">
                {alertsData?.noMovement?.threshold_minutes || 30} min se zyada idle
              </span>
            </h3>
            {!alertsData ? <div className="text-slate-400 text-sm">Loading...</div>
              : alertsData.noMovement.alerts.length === 0
                ? <div className="text-green-400 text-sm">✅ No alerts — all staff are active</div>
                : (
                  <div className="space-y-2">
                    {alertsData.noMovement.alerts.map(a => (
                      <div key={a.session_id} className="bg-yellow-900/20 border border-yellow-700/30 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <div className="text-white font-medium">{a.worker_name}</div>
                          <div className="text-slate-400 text-xs">
                            {a.last_ping
                              ? `Last ping: ${new Date(a.last_ping).toLocaleTimeString('en-IN')} (${a.minutes_since_ping} min ago)`
                              : 'No ping received'}
                          </div>
                        </div>
                        <span className="text-yellow-400 text-sm font-bold">⚠️</span>
                      </div>
                    ))}
                  </div>
                )}
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              🛰 Suspicious GPS / Fake Location
              <span className="text-xs bg-red-900/40 text-red-300 px-2 py-0.5 rounded-full">Last 7 days</span>
            </h3>
            {!alertsData ? <div className="text-slate-400 text-sm">Loading...</div>
              : alertsData.fakeGps.suspicious_visits.length === 0
                ? <div className="text-green-400 text-sm">✅ No suspicious visits found</div>
                : (
                  <div className="space-y-2">
                    {alertsData.fakeGps.suspicious_visits.map(v => (
                      <div key={v.id} className="bg-red-900/20 border border-red-700/30 rounded-xl p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-white font-medium">{v.worker_name}</div>
                            <div className="text-slate-300 text-sm">{v.doctor_name} · {v.area_name}</div>
                            <div className="text-slate-400 text-xs mt-1">{new Date(v.arrival_time).toLocaleString('en-IN')}</div>
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
