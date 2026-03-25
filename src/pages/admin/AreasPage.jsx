import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function AreasPage() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', city: '', state: 'Rajasthan', description: '' });

  const load = async () => {
    setLoading(true);
    try { const r = await api.get('/areas'); setAreas(r.data); } catch { toast.error('Load failed'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: '', city: '', state: 'Rajasthan', description: '' }); setShowModal(true); };
  const openEdit = (a) => { setEditing(a); setForm({ name: a.name, city: a.city || '', state: a.state || '', description: a.description || '' }); setShowModal(true); };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.city.trim()) return toast.error('Name aur City required hain');
    try {
      if (editing) { await api.put(`/areas/${editing.id}`, { ...form, is_active: 1 }); toast.success('Updated!'); }
      else { await api.post('/areas', form); toast.success('Area added!'); }
      setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Area delete karna hai?')) return;
    await api.delete(`/areas/${id}`);
    toast.success('Deleted'); load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Areas / Territories</h1>
        <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition">+ Add Area</button>
      </div>
      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {areas.map(a => (
            <div key={a.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="w-9 h-9 bg-blue-600/20 rounded-xl flex items-center justify-center text-lg">🗺️</div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(a)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg text-sm transition">✏️</button>
                  <button onClick={() => handleDelete(a.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg text-sm transition">🗑️</button>
                </div>
              </div>
              <h3 className="text-white font-semibold">{a.name}</h3>
              <p className="text-slate-400 text-sm">{a.city}, {a.state}</p>
              {a.description && <p className="text-slate-500 text-xs mt-1">{a.description}</p>}
            </div>
          ))}
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md">
            <div className="p-5 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-white font-semibold">{editing ? 'Edit Area' : 'Add Area'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {[{key:'name',label:'Area Name *'},{key:'city',label:'City *'},{key:'state',label:'State'},{key:'description',label:'Description'}].map(f => (
                <div key={f.key}><label className="text-slate-300 text-sm font-medium block mb-1.5">{f.label}</label>
                  <input type="text" value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" /></div>
              ))}
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
