import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function DoctorsPage() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [form, setForm] = useState({ name: '', specialization: '', clinic_name: '', phone: '', email: '', address: '', area_id: '', latitude: '', longitude: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [d, a] = await Promise.all([
        api.get('/doctors', { params: { search, area_id: filterArea } }),
        api.get('/areas'),
      ]);
      setDoctors(d.data); setAreas(a.data);
    } catch { toast.error('Load failed'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterArea]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', specialization: '', clinic_name: '', phone: '', email: '', address: '', area_id: '', latitude: '', longitude: '' });
    setShowModal(true);
  };

  const openEdit = (doc) => {
    setEditing(doc);
    setForm({ name: doc.name, specialization: doc.specialization || '', clinic_name: doc.clinic_name || '', phone: doc.phone || '', email: doc.email || '', address: doc.address || '', area_id: doc.area_id || '', latitude: doc.latitude || '', longitude: doc.longitude || '' });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error('Doctor name required');
    try {
      if (editing) {
        await api.put(`/doctors/${editing.id}`, { ...form, is_active: 1 });
        toast.success('Doctor updated!');
      } else {
        await api.post('/doctors', form);
        toast.success('Doctor added!');
      }
      setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this doctor?')) return;
    await api.delete(`/doctors/${id}`);
    toast.success('Deactivated');
    load();
  };

  const filtered = doctors.filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.clinic_name?.toLowerCase().includes(search.toLowerCase()) || d.specialization?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Doctors</h1>
        <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition">
          <span>+</span> Add Doctor
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text" placeholder="Search doctors..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500 w-full sm:w-64"
        />
        <select value={filterArea} onChange={e => setFilterArea(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500">
          <option value="">All Areas</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.name} - {a.city}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 && <div className="col-span-3 text-slate-400 text-center py-12">No doctors found</div>}
          {filtered.map(doc => (
            <div key={doc.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-xl">👨‍⚕️</div>
                <div className="flex gap-1">
                  <button onClick={() => navigate(`/admin/doctors/${doc.id}/history`)} className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-slate-700 rounded-lg transition" title="Visit History">📋</button>
                  <button onClick={() => openEdit(doc)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition">✏️</button>
                  <button onClick={() => handleDelete(doc.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition">🗑️</button>
                </div>
              </div>
              <h3 className="text-white font-semibold">{doc.name}</h3>
              {doc.specialization && <p className="text-blue-400 text-sm">{doc.specialization}</p>}
              {doc.clinic_name && <p className="text-slate-400 text-sm mt-1">{doc.clinic_name}</p>}
              <div className="mt-2 space-y-1 text-xs text-slate-500">
                {doc.phone && <div>📞 {doc.phone}</div>}
                {doc.area_name && <div>📍 {doc.area_name}, {doc.city}</div>}
                {doc.address && <div className="truncate">🏠 {doc.address}</div>}
                {doc.latitude && <div className="text-slate-600">GPS: {parseFloat(doc.latitude).toFixed(4)}, {parseFloat(doc.longitude).toFixed(4)}</div>}
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
              <h2 className="text-white font-semibold text-lg">{editing ? 'Edit Doctor' : 'Add Doctor'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {[
                { key: 'name', label: 'Doctor Name *' },
                { key: 'specialization', label: 'Specialization' },
                { key: 'clinic_name', label: 'Clinic / Hospital Name' },
                { key: 'phone', label: 'Phone' },
                { key: 'email', label: 'Email' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-slate-300 text-sm font-medium block mb-1.5">{f.label}</label>
                  <input type={f.key === 'email' ? 'email' : 'text'} value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Area</label>
                <select value={form.area_id} onChange={e => setForm(p => ({ ...p, area_id: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
                  <option value="">-- Select Area --</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.name} - {a.city}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Address</label>
                <textarea rows={2} value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1.5">Latitude (optional)</label>
                  <input type="number" step="0.000001" value={form.latitude} onChange={e => setForm(p => ({ ...p, latitude: e.target.value }))}
                    placeholder="e.g. 26.9124"
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1.5">Longitude (optional)</label>
                  <input type="number" step="0.000001" value={form.longitude} onChange={e => setForm(p => ({ ...p, longitude: e.target.value }))}
                    placeholder="e.g. 75.7873"
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-slate-700 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl text-sm transition">Cancel</button>
              <button onClick={handleSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium transition">{editing ? 'Update' : 'Add Doctor'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
