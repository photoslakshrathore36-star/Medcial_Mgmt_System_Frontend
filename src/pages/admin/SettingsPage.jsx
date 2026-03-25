import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [samples, setSamples] = useState([]);
  const [catForm, setCatForm] = useState('');
  const [sampleForm, setSampleForm] = useState({ name: '', category: '' });

  useEffect(() => {
    Promise.all([
      api.get('/settings'),
      api.get('/product-categories'),
      api.get('/samples'),
    ]).then(([s, c, sp]) => { setSettings(s.data); setCategories(c.data); setSamples(sp.data); setLoading(false); });
  }, []);

  const saveSettings = async () => {
    try { await api.put('/settings', settings); toast.success('Settings saved!'); } catch { toast.error('Error'); }
  };

  const addCategory = async () => {
    if (!catForm.trim()) return;
    await api.post('/product-categories', { name: catForm });
    const r = await api.get('/product-categories'); setCategories(r.data); setCatForm('');
    toast.success('Category added!');
  };

  const addSample = async () => {
    if (!sampleForm.name.trim()) return;
    await api.post('/samples', sampleForm);
    const r = await api.get('/samples'); setSamples(r.data); setSampleForm({ name: '', category: '' });
    toast.success('Sample added!');
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>
      <div className="space-y-6">
        {/* General */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">General Settings</h2>
          <div className="space-y-4">
            {[['company_name','Company Name'],['currency_symbol','Currency Symbol'],['timezone','Timezone']].map(([k, l]) => (
              <div key={k}>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">{l}</label>
                <input type="text" value={settings[k] || ''} onChange={e => setSettings(p => ({ ...p, [k]: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>
            ))}
            <button onClick={saveSettings} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition">Save Settings</button>
          </div>
        </div>

        {/* Product Categories */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">Product Categories</h2>
          <div className="flex gap-2 mb-3">
            <input type="text" value={catForm} onChange={e => setCatForm(e.target.value)} placeholder="e.g. Surgical Instruments"
              className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            <button onClick={addCategory} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => <span key={c.id} className="text-sm px-3 py-1 bg-slate-700 text-slate-300 rounded-full">{c.name}</span>)}
          </div>
        </div>

        {/* Sample Products */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">Sample Products</h2>
          <div className="flex gap-2 mb-3 flex-wrap">
            <input type="text" value={sampleForm.name} onChange={e => setSampleForm(p => ({ ...p, name: e.target.value }))} placeholder="Sample name"
              className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500 min-w-0" />
            <input type="text" value={sampleForm.category} onChange={e => setSampleForm(p => ({ ...p, category: e.target.value }))} placeholder="Category (optional)"
              className="w-40 bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            <button onClick={addSample} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {samples.map(s => <span key={s.id} className="text-xs px-2.5 py-1 bg-slate-700 text-slate-300 rounded-full">{s.name} {s.category && `(${s.category})`}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
