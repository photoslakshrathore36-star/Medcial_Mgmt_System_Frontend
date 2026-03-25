import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const STATUS_COLOR = {
  planned: 'bg-blue-500/20 text-blue-400',
  completed: 'bg-green-500/20 text-green-400',
  skipped: 'bg-red-500/20 text-red-400',
  rescheduled: 'bg-yellow-500/20 text-yellow-400',
};

export default function VisitPlansPage() {
  const [plans, setPlans] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [areas, setAreas] = useState([]);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterWorker, setFilterWorker] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [form, setForm] = useState({ worker_id: '', doctor_id: '', planned_date: '', purpose: '', sample_products: '', admin_notes: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [p, w, d, a, s] = await Promise.all([
        api.get('/visit-plans', { params: { worker_id: filterWorker, date: filterDate, status: filterStatus } }),
        api.get('/workers', { params: { role: 'field_worker' } }),
        api.get('/doctors', { params: { area_id: filterArea } }),
        api.get('/areas'),
        api.get('/samples'),
      ]);
      setPlans(p.data); setWorkers(w.data); setDoctors(d.data); setAreas(a.data); setSamples(s.data);
    } catch { toast.error('Load failed'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterWorker, filterDate, filterStatus, filterArea]);

  const openCreate = () => {
    setEditing(null);
    setForm({ worker_id: '', doctor_id: '', planned_date: new Date().toISOString().split('T')[0], purpose: '', sample_products: '', admin_notes: '' });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({ worker_id: p.worker_id, doctor_id: p.doctor_id, planned_date: p.planned_date?.split('T')[0] || '', purpose: p.purpose || '', sample_products: p.sample_products || '', admin_notes: p.admin_notes || '' });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.worker_id || !form.doctor_id || !form.planned_date) return toast.error('Worker, Doctor aur Date required hain');
    try {
      if (editing) {
        await api.put(`/visit-plans/${editing.id}`, form);
        toast.success('Plan updated!');
      } else {
        await api.post('/visit-plans', form);
        toast.success('Visit plan created!');
      }
      setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Plan delete karna hai?')) return;
    await api.delete(`/visit-plans/${id}`);
    toast.success('Deleted'); load();
  };

  const handleStatusChange = async (id, status) => {
    await api.put(`/visit-plans/${id}`, { status });
    load();
  };

  // Filter doctors by area when area filter changes
  const filteredDoctors = filterArea ? doctors.filter(d => String(d.area_id) === String(filterArea)) : doctors;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Visit Plans</h1>
        <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition">
          <span>+</span> Plan Visit
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={filterWorker} onChange={e => setFilterWorker(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
          <option value="">All Workers</option>
          {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select value={filterArea} onChange={e => setFilterArea(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
          <option value="">All Areas</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
          <option value="">All Status</option>
          {['planned','completed','skipped','rescheduled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(filterWorker || filterDate || filterStatus || filterArea) && (
          <button onClick={() => { setFilterWorker(''); setFilterDate(''); setFilterStatus(''); setFilterArea(''); }}
            className="text-slate-400 hover:text-white text-sm px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl transition">
            Clear
          </button>
        )}
      </div>

      {/* Plans List */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {plans.length === 0 && <div className="text-slate-400 text-center py-12">Koi visit plan nahi mila</div>}
          {plans.map(p => (
            <div key={p.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-white font-medium">👨‍⚕️ {p.doctor_name}</span>
                    {p.clinic_name && <span className="text-slate-400 text-sm">{p.clinic_name}</span>}
                    {p.specialization && <span className="text-blue-400 text-xs bg-blue-500/10 px-2 py-0.5 rounded-full">{p.specialization}</span>}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400 flex-wrap">
                    <span>🏃 {p.worker_name}</span>
                    <span>·</span>
                    <span>📅 {new Date(p.planned_date).toLocaleDateString('en-IN')}</span>
                    {p.area_name && <><span>·</span><span>📍 {p.area_name}</span></>}
                    {p.doctor_phone && <><span>·</span><span>📞 {p.doctor_phone}</span></>}
                  </div>
                  {p.purpose && <p className="text-slate-400 text-xs mt-1.5">Purpose: {p.purpose}</p>}
                  {p.sample_products && <p className="text-slate-400 text-xs mt-0.5">Samples: {p.sample_products}</p>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={p.status}
                    onChange={e => handleStatusChange(p.id, e.target.value)}
                    className={`text-xs font-medium px-2.5 py-1.5 rounded-full border-0 focus:outline-none cursor-pointer ${STATUS_COLOR[p.status]}`}
                    style={{ background: 'transparent' }}
                  >
                    {['planned','completed','skipped','rescheduled'].map(s => (
                      <option key={s} value={s} style={{ background: '#1e293b', color: 'white' }}>{s}</option>
                    ))}
                  </select>
                  <button onClick={() => openEdit(p)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition text-sm">✏️</button>
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition text-sm">🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 p-5 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-white font-semibold text-lg">{editing ? 'Edit Visit Plan' : 'New Visit Plan'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Field Worker *</label>
                <select value={form.worker_id} onChange={e => setForm(p => ({ ...p, worker_id: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
                  <option value="">-- Select Worker --</option>
                  {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Filter by Area</label>
                <select value={filterArea} onChange={e => setFilterArea(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
                  <option value="">All Areas</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.name} - {a.city}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Doctor *</label>
                <select value={form.doctor_id} onChange={e => setForm(p => ({ ...p, doctor_id: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
                  <option value="">-- Select Doctor --</option>
                  {filteredDoctors.map(d => <option key={d.id} value={d.id}>{d.name} — {d.clinic_name || 'No clinic'} ({d.specialization || 'General'})</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Planned Date *</label>
                <input type="date" value={form.planned_date} onChange={e => setForm(p => ({ ...p, planned_date: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Purpose</label>
                <input type="text" value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))}
                  placeholder="e.g. Introduce new surgical kit"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Samples / Products to carry</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {samples.map(s => (
                    <button key={s.id} type="button"
                      onClick={() => {
                        const current = form.sample_products ? form.sample_products.split(', ').filter(Boolean) : [];
                        if (current.includes(s.name)) {
                          setForm(p => ({ ...p, sample_products: current.filter(x => x !== s.name).join(', ') }));
                        } else {
                          setForm(p => ({ ...p, sample_products: [...current, s.name].join(', ') }));
                        }
                      }}
                      className={`text-xs px-2.5 py-1 rounded-full border transition ${form.sample_products?.includes(s.name) ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-600 text-slate-300 hover:border-slate-400'}`}>
                      {s.name}
                    </button>
                  ))}
                </div>
                <textarea rows={2} value={form.sample_products} onChange={e => setForm(p => ({ ...p, sample_products: e.target.value }))}
                  placeholder="Ya manually type karo..."
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Admin Notes</label>
                <textarea rows={2} value={form.admin_notes} onChange={e => setForm(p => ({ ...p, admin_notes: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="p-5 border-t border-slate-700 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl text-sm transition">Cancel</button>
              <button onClick={handleSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium transition">{editing ? 'Update' : 'Create Plan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
