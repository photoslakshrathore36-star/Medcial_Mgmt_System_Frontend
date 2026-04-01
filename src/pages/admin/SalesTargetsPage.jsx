import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function SalesTargetsPage() {
  const [targets, setTargets]   = useState([]);
  const [workers, setWorkers]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState(null);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());
  const emptyForm = { worker_id:'', target_visits:'', target_orders:'', target_revenue:'', target_new_doctors:'' };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { loadAll(); }, [month, year]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [t, w] = await Promise.all([
        api.get('/targets', { params: { month, year } }),
        api.get('/workers', { params: { role: 'field_worker' } }),
      ]);
      setTargets(t.data); setWorkers(w.data);
    } catch { toast.error('Load failed'); }
    setLoading(false);
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = (t) => {
    setEditing(t);
    setForm({ worker_id: t.worker_id, target_visits: t.target_visits, target_orders: t.target_orders, target_revenue: t.target_revenue, target_new_doctors: t.target_new_doctors });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.worker_id) return toast.error('Worker chunein');
    try {
      await api.post('/targets', { ...form, month, year });
      toast.success('Target save ho gaya!');
      setModal(false); loadAll();
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Target delete karein?')) return;
    try { await api.delete(`/targets/${id}`); toast.success('Deleted'); loadAll(); }
    catch { toast.error('Delete failed'); }
  };

  const pct = (actual, target) => target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;
  const pctColor = (p) => p >= 100 ? '#22c55e' : p >= 60 ? '#f59e0b' : '#ef4444';

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Sales Targets</h1>
        <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          + Target Set Karo
        </button>
      </div>

      {/* Month/Year selector */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <select value={month} onChange={e => setMonth(Number(e.target.value))}
          className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm">
          {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="text-slate-400 text-sm self-center">{MONTHS[month-1]} {year} ke targets</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : targets.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">🎯</div>
          <p className="text-slate-300">Is mahine ke liye koi target set nahi hai</p>
          <button onClick={openCreate} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
            Pehla Target Set Karo
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {targets.map(t => (
            <div key={t.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-900/50 border border-blue-700/40 flex items-center justify-center text-blue-300 text-sm font-bold">
                    {t.worker_name?.charAt(0)}
                  </div>
                  <div>
                    <div className="text-white font-semibold">{t.worker_name}</div>
                    <div className="text-slate-400 text-xs">{MONTHS[month-1]} {year}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(t)} className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg text-xs transition">✏️ Edit</button>
                  <button onClick={() => handleDelete(t.id)} className="bg-red-900/40 hover:bg-red-900/70 text-red-400 px-3 py-1.5 rounded-lg text-xs transition">🗑️</button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Visits', actual: t.actual_visits, target: t.target_visits, icon: '🤝' },
                  { label: 'Orders', actual: t.actual_orders, target: t.target_orders, icon: '🛒' },
                  { label: 'Revenue (₹)', actual: Number(t.actual_revenue||0).toLocaleString('en-IN'), target: Number(t.target_revenue||0).toLocaleString('en-IN'), icon: '💰', isRevenue: true, pctRaw: pct(t.actual_revenue, t.target_revenue) },
                  { label: 'New Doctors', actual: t.actual_new_doctors, target: t.target_new_doctors, icon: '👨‍⚕️' },
                ].map((item, i) => {
                  const p = item.isRevenue ? item.pctRaw : pct(item.actual, item.target);
                  return (
                    <div key={i} className="bg-slate-700/50 rounded-xl p-3">
                      <div className="text-slate-400 text-xs mb-1">{item.icon} {item.label}</div>
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-white font-bold text-lg">{item.actual}</span>
                        <span className="text-slate-500 text-xs">/ {item.target}</span>
                      </div>
                      <div className="w-full bg-slate-600 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${p}%`, background: pctColor(p) }} />
                      </div>
                      <div className="text-right text-xs mt-1" style={{ color: pctColor(p) }}>{p}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-white font-bold text-lg mb-5">{editing ? 'Target Edit Karo' : 'Naya Target Set Karo'}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-sm block mb-1">Worker *</label>
                <select value={form.worker_id} onChange={e => setForm(f => ({ ...f, worker_id: e.target.value }))}
                  disabled={!!editing}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm disabled:opacity-50">
                  <option value="">Worker chunein</option>
                  {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'target_visits', label: 'Visit Target', placeholder: 'e.g. 30' },
                  { key: 'target_orders', label: 'Order Target', placeholder: 'e.g. 10' },
                  { key: 'target_revenue', label: 'Revenue Target (₹)', placeholder: 'e.g. 50000' },
                  { key: 'target_new_doctors', label: 'New Doctors Target', placeholder: 'e.g. 5' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-slate-400 text-xs block mb-1">{f.label}</label>
                    <input type="number" min="0" value={form[f.key]} onChange={e => setForm(fm => ({ ...fm, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium text-sm transition">
                ✅ Save
              </button>
              <button onClick={() => setModal(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded-lg text-sm transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
