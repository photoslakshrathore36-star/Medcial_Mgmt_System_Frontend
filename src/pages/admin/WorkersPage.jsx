import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function WorkersPage() {
  const [workers, setWorkers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [roleFilter, setRoleFilter] = useState('all');
  const [form, setForm] = useState({ name: '', username: '', password: '', phone: '', role: 'worker', hourly_rate: '', department_ids: [], area_ids: [] });

  const load = async () => {
    setLoading(true);
    try {
      const [w, d, a] = await Promise.all([api.get('/workers'), api.get('/departments'), api.get('/areas')]);
      setWorkers(w.data); setDepartments(d.data); setAreas(a.data);
    } catch { toast.error('Load failed'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', username: '', password: '', phone: '', role: 'worker', hourly_rate: '', department_ids: [], area_ids: [] });
    setShowModal(true);
  };

  const openEdit = (w) => {
    setEditing(w);
    setForm({
      name: w.name, username: w.username, password: '', phone: w.phone || '',
      role: w.role, hourly_rate: w.hourly_rate || '',
      department_ids: w.departments?.map(d => d.id) || [],
      area_ids: w.areas?.map(a => a.id) || [],
    });
    setShowModal(true);
  };

  const toggleArr = (arr, val) => arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  const handleSubmit = async () => {
    if (!form.name.trim() || (!editing && !form.username.trim())) return toast.error('Name and Username are required');
    try {
      if (editing) {
        await api.put(`/workers/${editing.id}`, { ...form });
        toast.success('Worker updated!');
      } else {
        if (!form.password.trim()) return toast.error('Password is required');
        await api.post('/workers', form);
        toast.success('Worker added successfully!');
      }
      setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const handleToggleActive = async (w) => {
    await api.put(`/workers/${w.id}`, { ...w, is_active: w.is_active ? 0 : 1 });
    load();
  };

  const handleDelete = async (w) => {
    if (!window.confirm(`Delete "${w.name}" permanently? This cannot be undone.`)) return;
    try {
      await api.delete(`/workers/${w.id}`);
      toast.success('Worker deleted');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  const ROLE_LABEL = { worker: '🏭 Production', field_worker: '🏃 Field', admin: '⚙️ Admin' };
  const filtered = workers.filter(w => roleFilter === 'all' || w.role === roleFilter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Workers</h1>
        <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition">
          <span>+</span> Add Worker
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'worker', 'field_worker'].map(r => (
          <button key={r} onClick={() => setRoleFilter(r)}
            className={`px-3 py-2 rounded-xl text-sm font-medium transition capitalize ${roleFilter === r ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-500'}`}>
            {r === 'all' ? 'All' : r === 'worker' ? '🏭 Production' : '🏃 Field'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(w => (
            <div key={w.id} className={`bg-slate-800 border rounded-2xl p-4 ${w.is_active ? 'border-slate-700' : 'border-slate-700/50 opacity-60'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-xl">
                  {w.role === 'field_worker' ? '🏃' : '👷'}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(w)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg text-sm transition">✏️</button>
                  <button onClick={() => handleToggleActive(w)} className={`p-1.5 hover:bg-slate-700 rounded-lg text-sm transition ${w.is_active ? 'text-slate-400 hover:text-yellow-400' : 'text-green-400'}`}>
                    {w.is_active ? '🚫' : '✅'}
                  </button>
                  <button onClick={() => handleDelete(w)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg text-sm transition">🗑️</button>
                </div>
              </div>
              <h3 className="text-white font-semibold">{w.name}</h3>
              <p className="text-slate-400 text-sm">@{w.username}</p>
              <div className="mt-2 space-y-1 text-xs text-slate-500">
                <div>{ROLE_LABEL[w.role]}</div>
                {w.phone && <div>📞 {w.phone}</div>}
                {w.hourly_rate > 0 && <div>💰 ₹{w.hourly_rate}/hr</div>}
              </div>
              {w.departments?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {w.departments.map(d => (
                    <span key={d.id} className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: d.color + '33', border: `1px solid ${d.color}55` }}>{d.name}</span>
                  ))}
                </div>
              )}
              {w.areas?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {w.areas.map(a => <span key={a.id} className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full">{a.name}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 p-5 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-white font-semibold text-lg">{editing ? 'Edit Worker' : 'Add Worker'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {[
                { key: 'name', label: 'Full Name *' },
                { key: 'username', label: 'Username *', disabled: !!editing },
                { key: 'phone', label: 'Phone' },
                { key: 'hourly_rate', label: 'Hourly Rate (₹)', type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-slate-300 text-sm font-medium block mb-1.5">{f.label}</label>
                  <input type={f.type || 'text'} value={form[f.key]} disabled={f.disabled}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                </div>
              ))}
              {!editing && (
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1.5">Password *</label>
                  <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Role</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
                  <option value="worker">🏭 Production Worker</option>
                  <option value="field_worker">🏃 Field Worker</option>
                </select>
              </div>
              {form.role === 'worker' && (
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1.5">Departments</label>
                  <div className="flex flex-wrap gap-2">
                    {departments.map(d => (
                      <button key={d.id} type="button"
                        onClick={() => setForm(p => ({ ...p, department_ids: toggleArr(p.department_ids, d.id) }))}
                        className={`text-xs px-2.5 py-1.5 rounded-full border transition ${form.department_ids.includes(d.id) ? 'text-white' : 'border-slate-600 text-slate-300'}`}
                        style={form.department_ids.includes(d.id) ? { background: d.color + '33', borderColor: d.color } : {}}>
                        {d.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {form.role === 'field_worker' && (
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1.5">Assigned Areas</label>
                  <div className="flex flex-wrap gap-2">
                    {areas.map(a => (
                      <button key={a.id} type="button"
                        onClick={() => setForm(p => ({ ...p, area_ids: toggleArr(p.area_ids, a.id) }))}
                        className={`text-xs px-2.5 py-1.5 rounded-full border transition ${form.area_ids.includes(a.id) ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-600 text-slate-300 hover:border-slate-400'}`}>
                        {a.name} - {a.city}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-slate-700 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl text-sm transition">Cancel</button>
              <button onClick={handleSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium transition">{editing ? 'Update' : 'Add Worker'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
