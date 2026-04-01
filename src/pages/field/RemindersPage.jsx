import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function RemindersPage() {
  const [reminders, setReminders] = useState([]);
  const [doctors, setDoctors]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [modal, setModal]         = useState(false);
  const emptyForm = { doctor_id:'', remind_date:'', notes:'' };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [r, d] = await Promise.all([api.get('/reminders'), api.get('/doctors')]);
      setReminders(r.data); setDoctors(d.data);
    } catch { toast.error('Load failed'); }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.doctor_id || !form.remind_date) return toast.error('Doctor aur date chunein');
    try {
      await api.post('/reminders', form);
      toast.success('Reminder set ho gaya!');
      setModal(false); setForm(emptyForm); loadAll();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const markDone = async (id) => {
    try { await api.patch(`/reminders/${id}/done`); toast.success('Done!'); loadAll(); }
    catch { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/reminders/${id}`); loadAll(); }
    catch { toast.error('Failed'); }
  };

  const today = new Date().toISOString().split('T')[0];
  const overdue  = reminders.filter(r => r.overdue && r.status === 'pending');
  const dueToday = reminders.filter(r => r.remind_date === today && !r.overdue);
  const upcoming = reminders.filter(r => r.remind_date > today);

  const ReminderCard = ({ r }) => (
    <div className={`bg-slate-800 border rounded-xl p-4 ${r.overdue ? 'border-red-700/40' : r.remind_date === today ? 'border-yellow-700/40' : 'border-slate-700'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-white font-medium">{r.doctor_name}</div>
          <div className="text-slate-400 text-sm">{r.clinic_name}</div>
          <div className={`text-xs mt-1 font-medium ${r.overdue ? 'text-red-400' : r.remind_date === today ? 'text-yellow-400' : 'text-slate-400'}`}>
            📅 {new Date(r.remind_date + 'T00:00:00').toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
            {r.overdue && ' · Overdue'}
          </div>
          {r.notes && <div className="text-slate-500 text-xs mt-1 italic">"{r.notes}"</div>}
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0">
          <button onClick={() => markDone(r.id)} className="bg-green-800 hover:bg-green-700 text-green-300 text-xs px-2 py-1 rounded-lg transition">✓ Done</button>
          <button onClick={() => handleDelete(r.id)} className="text-slate-600 hover:text-red-400 text-xs py-1 transition">🗑️</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pb-20">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Follow-up Reminders</h1>
          {overdue.length > 0 && <p className="text-red-400 text-sm mt-0.5">⚠️ {overdue.length} overdue reminder(s)</p>}
        </div>
        <button onClick={() => { setForm(emptyForm); setModal(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + Reminder Set Karo
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-5">
          {overdue.length > 0 && (
            <div>
              <h2 className="text-red-400 font-semibold text-sm mb-2">🔴 Overdue ({overdue.length})</h2>
              <div className="space-y-2">{overdue.map(r => <ReminderCard key={r.id} r={r} />)}</div>
            </div>
          )}
          {dueToday.length > 0 && (
            <div>
              <h2 className="text-yellow-400 font-semibold text-sm mb-2">📅 Aaj ke ({dueToday.length})</h2>
              <div className="space-y-2">{dueToday.map(r => <ReminderCard key={r.id} r={r} />)}</div>
            </div>
          )}
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-slate-300 font-semibold text-sm mb-2">🗓️ Upcoming ({upcoming.length})</h2>
              <div className="space-y-2">{upcoming.map(r => <ReminderCard key={r.id} r={r} />)}</div>
            </div>
          )}
          {reminders.length === 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
              <div className="text-4xl mb-3">📅</div>
              <p className="text-slate-400 text-sm">Koi reminder nahi hai</p>
            </div>
          )}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-white font-bold text-lg mb-5">📅 Reminder Set Karo</h2>
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-sm block mb-1">Doctor *</label>
                <select value={form.doctor_id} onChange={e => setForm(f => ({ ...f, doctor_id: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="">Doctor chunein</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>{d.name} — {d.clinic_name||d.area_name||''}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-sm block mb-1">Follow-up Date *</label>
                <input type="date" value={form.remind_date} min={today} onChange={e => setForm(f => ({ ...f, remind_date: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-slate-400 text-sm block mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm resize-none"
                  placeholder="Kya discuss karna hai..." />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium text-sm">✅ Set Reminder</button>
              <button onClick={() => setModal(false)} className="flex-1 bg-slate-700 text-slate-300 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
