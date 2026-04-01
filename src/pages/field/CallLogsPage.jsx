import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const OUTCOME_OPTIONS = [
  { value: 'discussed',      label: '💬 Discussed',      color: '#3b82f6' },
  { value: 'interested',     label: '✅ Interested',      color: '#22c55e' },
  { value: 'order_placed',   label: '🛒 Order Mila',      color: '#8b5cf6' },
  { value: 'follow_up',      label: '📅 Follow Up',       color: '#f59e0b' },
  { value: 'not_interested', label: '❌ Not Interested',  color: '#ef4444' },
  { value: 'not_available',  label: '🚪 Nahi Uthaya',     color: '#6b7280' },
];

export default function CallLogsPage() {
  const [logs, setLogs]       = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal]     = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo]     = useState(today);

  const emptyForm = { doctor_id:'', call_date: new Date().toISOString().slice(0,16), duration_minutes:'', outcome:'discussed', notes:'', follow_up_date:'' };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [l, d] = await Promise.all([
        api.get('/call-logs', { params: { date_from: dateFrom, date_to: dateTo } }),
        api.get('/doctors'),
      ]);
      setLogs(l.data); setDoctors(d.data);
    } catch { toast.error('Load failed'); }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.doctor_id) return toast.error('Doctor chunein');
    try {
      await api.post('/call-logs', form);
      toast.success('Call log save ho gaya!');
      setModal(false); setForm(emptyForm);
      // Auto-create reminder if follow_up
      if (form.outcome === 'follow_up' && form.follow_up_date) {
        await api.post('/reminders', { doctor_id: form.doctor_id, remind_date: form.follow_up_date, notes: `Follow up from call: ${form.notes}` }).catch(() => {});
        toast.success('Follow-up reminder bhi set ho gaya!', { icon: '📅' });
      }
      loadAll();
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/call-logs/${id}`); toast.success('Deleted'); loadAll(); }
    catch { toast.error('Delete failed'); }
  };

  const outcomeColor = (o) => OUTCOME_OPTIONS.find(x => x.value === o)?.color || '#6b7280';
  const outcomeLabel = (o) => OUTCOME_OPTIONS.find(x => x.value === o)?.label || o;

  return (
    <div className="pb-20">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Call Logs</h1>
          <p className="text-slate-400 text-sm">Phone call visits track karo</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setModal(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + Call Log Karo
        </button>
      </div>

      {/* Date filter */}
      <div className="flex gap-2 mb-4 flex-wrap bg-slate-800 border border-slate-700 rounded-xl p-3 items-end">
        <div>
          <label className="text-slate-400 text-xs block mb-1">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-slate-400 text-xs block mb-1">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm" />
        </div>
        <button onClick={loadAll} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">Search</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : logs.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">📞</div>
          <p className="text-slate-400 text-sm">Koi call log nahi mila</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map(l => (
            <div key={l.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-white font-medium">{l.doctor_name}</div>
                  <div className="text-slate-400 text-sm">{l.clinic_name} · {l.area_name}</div>
                  {l.doctor_phone && <div className="text-slate-500 text-xs mt-0.5">📞 {l.doctor_phone}</div>}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-medium" style={{ color: outcomeColor(l.outcome) }}>
                    {outcomeLabel(l.outcome)}
                  </div>
                  {l.duration_minutes > 0 && <div className="text-slate-500 text-xs">{l.duration_minutes} min</div>}
                </div>
              </div>
              {l.notes && <div className="text-slate-400 text-xs mt-2 italic">"{l.notes}"</div>}
              <div className="flex items-center justify-between mt-2">
                <div className="text-slate-500 text-xs">
                  {new Date(l.call_date).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                </div>
                {l.follow_up_date && (
                  <div className="text-yellow-400 text-xs">📅 Follow up: {new Date(l.follow_up_date).toLocaleDateString('en-IN')}</div>
                )}
                <button onClick={() => handleDelete(l.id)} className="text-slate-600 hover:text-red-400 text-xs transition">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-white font-bold text-lg mb-5">📞 Call Log Karo</h2>
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-sm block mb-1">Doctor *</label>
                <select value={form.doctor_id} onChange={e => setForm(f => ({ ...f, doctor_id: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="">Doctor chunein</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>{d.name} — {d.clinic_name || d.area_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-sm block mb-1">Date & Time</label>
                  <input type="datetime-local" value={form.call_date} onChange={e => setForm(f => ({ ...f, call_date: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-slate-400 text-sm block mb-1">Duration (min)</label>
                  <input type="number" min="0" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
                    placeholder="e.g. 5"
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-slate-400 text-sm block mb-1">Outcome</label>
                <div className="grid grid-cols-2 gap-2">
                  {OUTCOME_OPTIONS.map(o => (
                    <button key={o.value} onClick={() => setForm(f => ({ ...f, outcome: o.value }))}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition border ${form.outcome === o.value ? 'border-transparent' : 'border-slate-600 bg-slate-700 text-slate-400'}`}
                      style={form.outcome === o.value ? { background: o.color + '30', borderColor: o.color, color: o.color } : {}}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              {form.outcome === 'follow_up' && (
                <div>
                  <label className="text-slate-400 text-sm block mb-1">Follow-up Date</label>
                  <input type="date" value={form.follow_up_date} onChange={e => setForm(f => ({ ...f, follow_up_date: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm" />
                </div>
              )}
              <div>
                <label className="text-slate-400 text-sm block mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm resize-none" placeholder="Kya baat hui..." />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium text-sm">✅ Save</button>
              <button onClick={() => setModal(false)} className="flex-1 bg-slate-700 text-slate-300 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
