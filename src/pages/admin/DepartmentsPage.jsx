// DepartmentsPage.jsx
import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function DepartmentsPage() {
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', color: '#3B82F6', stage_order: '' });

  const load = async () => {
    setLoading(true);
    try { const r = await api.get('/departments'); setDepts(r.data); } catch { toast.error('Load failed'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: '', description: '', color: '#3B82F6', stage_order: '' }); setShowModal(true); };
  const openEdit = (d) => { setEditing(d); setForm({ name: d.name, description: d.description || '', color: d.color || '#3B82F6', stage_order: d.stage_order || '' }); setShowModal(true); };

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error('Name required');
    try {
      if (editing) { await api.put(`/departments/${editing.id}`, { ...form, is_active: editing.is_active }); toast.success('Updated!'); }
      else { await api.post('/departments', form); toast.success('Department added!'); }
      setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const handleToggle = async (d) => {
    await api.put(`/departments/${d.id}`, { ...d, is_active: d.is_active ? 0 : 1 });
    load();
  };

  const PRESET_COLORS = ['#EF4444','#F97316','#EAB308','#22C55E','#06B6D4','#3B82F6','#8B5CF6','#EC4899','#6B7280'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Departments</h1>
        <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition">+ Add</button>
      </div>
      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="space-y-2">
          {depts.map(d => (
            <div key={d.id} className={`bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-4 ${!d.is_active ? 'opacity-50' : ''}`}>
              <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: d.color }} />
              <div className="flex-shrink-0 text-slate-400 text-sm w-6 text-center">{d.stage_order}</div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium">{d.name}</div>
                {d.description && <div className="text-slate-400 text-sm truncate">{d.description}</div>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(d)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg text-sm transition">✏️</button>
                <button onClick={() => handleToggle(d)} className={`p-1.5 hover:bg-slate-700 rounded-lg text-sm transition ${d.is_active ? 'text-slate-400 hover:text-red-400' : 'text-green-400'}`}>
                  {d.is_active ? '🚫' : '✅'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md">
            <div className="p-5 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-white font-semibold">{editing ? 'Edit Department' : 'Add Department'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="text-slate-300 text-sm font-medium block mb-1.5">Name *</label>
                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" /></div>
              <div><label className="text-slate-300 text-sm font-medium block mb-1.5">Description</label>
                <input type="text" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" /></div>
              <div><label className="text-slate-300 text-sm font-medium block mb-1.5">Stage Order</label>
                <input type="number" value={form.stage_order} onChange={e => setForm(p => ({ ...p, stage_order: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" /></div>
              <div><label className="text-slate-300 text-sm font-medium block mb-1.5">Color</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(p => ({ ...p, color: c }))}
                      className={`w-8 h-8 rounded-full transition ${form.color === c ? 'ring-2 ring-white scale-110' : ''}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-slate-700 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl text-sm transition">Cancel</button>
              <button onClick={handleSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium transition">{editing ? 'Update' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
