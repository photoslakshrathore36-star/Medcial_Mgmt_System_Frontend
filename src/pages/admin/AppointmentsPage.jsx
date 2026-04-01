import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  pending:     'bg-yellow-900/40 text-yellow-300 border-yellow-700/40',
  confirmed:   'bg-blue-900/40 text-blue-300 border-blue-700/40',
  completed:   'bg-green-900/40 text-green-300 border-green-700/40',
  cancelled:   'bg-red-900/40 text-red-300 border-red-700/40',
  rescheduled: 'bg-purple-900/40 text-purple-300 border-purple-700/40',
};
const STATUS_LABELS = { pending:'⏳ Pending', confirmed:'✅ Confirmed', completed:'✔️ Completed', cancelled:'❌ Cancelled', rescheduled:'🔄 Rescheduled' };

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [workers, setWorkers]           = useState([]);
  const [doctors, setDoctors]           = useState([]);
  const [loading, setLoading]           = useState(false);
  const [modal, setModal]               = useState(null); // 'add' | 'edit'
  const [selected, setSelected]         = useState(null);
  const [filters, setFilters]           = useState({ worker_id:'', status:'', date_from:'', date_to:'' });

  const empty = { doctor_id:'', worker_id:'', appointment_date:'', appointment_time:'', purpose:'', notes:'', status:'pending' };
  const [form, setForm] = useState(empty);
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [ap, w, d] = await Promise.all([
        api.get('/appointments', { params: filters }),
        api.get('/workers', { params: { role: 'field_worker' } }),
        api.get('/doctors'),
      ]);
      setAppointments(ap.data); setWorkers(w.data); setDoctors(d.data);
    } catch { toast.error('Load failed'); }
    setLoading(false);
  };

  const handleSearch = () => loadAll();

  const openAdd = () => { setForm(empty); setSelected(null); setModal('add'); };
  const openEdit = (ap) => {
    setForm({
      doctor_id: ap.doctor_id, worker_id: ap.worker_id,
      appointment_date: ap.appointment_date?.split('T')[0] || '',
      appointment_time: ap.appointment_time || '',
      purpose: ap.purpose || '', notes: ap.notes || '', status: ap.status,
    });
    setSelected(ap); setModal('edit');
  };

  const handleSave = async () => {
    if (!form.doctor_id || !form.appointment_date) return toast.error('Doctor aur date required hai');
    try {
      if (modal === 'add') {
        await api.post('/appointments', form);
        toast.success('Appointment book ho gayi!');
      } else {
        await api.put(`/appointments/${selected.id}`, form);
        toast.success('Appointment update ho gayi!');
      }
      setModal(null); loadAll();
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this appointment?')) return;
    try { await api.delete(`/appointments/${id}`); toast.success('Deleted'); loadAll(); }
    catch { toast.error('Delete failed'); }
  };

  const quickStatus = async (id, status) => {
    try { await api.put(`/appointments/${id}`, { status }); loadAll(); }
    catch { toast.error('Update failed'); }
  };

  const today = new Date().toISOString().split('T')[0];
  const upcoming = appointments.filter(a => a.appointment_date >= today && a.status !== 'cancelled' && a.status !== 'completed');
  const past     = appointments.filter(a => a.appointment_date < today || a.status === 'completed' || a.status === 'cancelled');

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Doctor Appointments</h1>
        <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          + New Appointment
        </button>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-slate-400 text-xs block mb-1">Worker</label>
          <select value={filters.worker_id} onChange={e => setFilters(f => ({...f, worker_id: e.target.value}))}
            className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm">
            <option value="">All Workers</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-slate-400 text-xs block mb-1">Status</label>
          <select value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))}
            className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm">
            <option value="">All Status</option>
            {Object.keys(STATUS_LABELS).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
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
        <button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Search</button>
      </div>

      {loading && <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}

      {!loading && (
        <div className="space-y-5">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
                📅 Upcoming <span className="text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full">{upcoming.length}</span>
              </h2>
              <div className="space-y-2">
                {upcoming.map(ap => <AppCard key={ap.id} ap={ap} onEdit={() => openEdit(ap)} onDelete={() => handleDelete(ap.id)} onStatus={quickStatus} />)}
              </div>
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div>
              <h2 className="text-slate-400 font-semibold mb-3 text-sm">Past / Completed</h2>
              <div className="space-y-2">
                {past.map(ap => <AppCard key={ap.id} ap={ap} onEdit={() => openEdit(ap)} onDelete={() => handleDelete(ap.id)} onStatus={quickStatus} past />)}
              </div>
            </div>
          )}

          {appointments.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <div className="text-4xl mb-3">📅</div>
              <p>Koi appointments nahi mili</p>
              <p className="text-sm mt-1">Upar "+ New Appointment" se add karo</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-white font-bold text-lg mb-5">{modal === 'add' ? '+ New Appointment' : 'Edit Appointment'}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-sm block mb-1">Doctor *</label>
                <select value={form.doctor_id} onChange={f('doctor_id')}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="">Doctor chunein</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>{d.name} — {d.clinic_name || d.specialization}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-sm block mb-1">Field Worker *</label>
                <select value={form.worker_id} onChange={f('worker_id')}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="">Worker chunein</option>
                  {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-sm block mb-1">Date *</label>
                  <input type="date" value={form.appointment_date} onChange={f('appointment_date')}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-slate-400 text-sm block mb-1">Time</label>
                  <input type="time" value={form.appointment_time} onChange={f('appointment_time')}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-slate-400 text-sm block mb-1">Purpose</label>
                <input type="text" value={form.purpose} onChange={f('purpose')} placeholder="e.g. Product demo, Follow-up"
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              {modal === 'edit' && (
                <div>
                  <label className="text-slate-400 text-sm block mb-1">Status</label>
                  <select value={form.status} onChange={f('status')}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm">
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-slate-400 text-sm block mb-1">Notes</label>
                <textarea value={form.notes} onChange={f('notes')} rows={3} placeholder="Koi extra information..."
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium text-sm transition">
                {modal === 'add' ? '✅ Book Appointment' : '✅ Update'}
              </button>
              <button onClick={() => setModal(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded-lg text-sm transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AppCard({ ap, onEdit, onDelete, onStatus, past }) {
  const dateStr = ap.appointment_date ? new Date(ap.appointment_date).toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' }) : '';
  return (
    <div className={`bg-slate-800 border rounded-xl p-4 ${past ? 'border-slate-700 opacity-75' : 'border-slate-600'}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-medium">{ap.doctor_name}</span>
            {ap.clinic_name && <span className="text-slate-400 text-sm">· {ap.clinic_name}</span>}
          </div>
          <div className="text-slate-400 text-sm mt-0.5">{ap.worker_name} · {ap.area_name}</div>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-blue-300 text-sm font-medium">📅 {dateStr}{ap.appointment_time ? ` at ${ap.appointment_time.slice(0,5)}` : ''}</span>
            {ap.purpose && <span className="text-slate-400 text-xs">📋 {ap.purpose}</span>}
            {ap.confirmation_code && <span className="text-slate-500 text-xs font-mono">{ap.confirmation_code}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[ap.status] || 'bg-slate-700 text-slate-300 border-slate-600'}`}>
            {STATUS_LABELS[ap.status] || ap.status}
          </span>
        </div>
      </div>
      {/* Quick Actions */}
      <div className="flex gap-2 mt-3 flex-wrap">
        {ap.status === 'pending' && <button onClick={() => onStatus(ap.id, 'confirmed')} className="text-xs bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 px-3 py-1 rounded-lg transition">Confirm</button>}
        {(ap.status === 'pending' || ap.status === 'confirmed') && <button onClick={() => onStatus(ap.id, 'completed')} className="text-xs bg-green-900/40 hover:bg-green-900/60 text-green-300 px-3 py-1 rounded-lg transition">Complete</button>}
        {ap.status !== 'cancelled' && ap.status !== 'completed' && <button onClick={() => onStatus(ap.id, 'cancelled')} className="text-xs bg-red-900/30 hover:bg-red-900/50 text-red-400 px-3 py-1 rounded-lg transition">Cancel</button>}
        <button onClick={onEdit} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded-lg transition">Edit</button>
        <button onClick={onDelete} className="text-xs text-slate-500 hover:text-red-400 px-2 py-1 transition">🗑</button>
      </div>
    </div>
  );
}
