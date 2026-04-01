import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
  { code: 'NPR', symbol: 'रू', name: 'Nepalese Rupee' },
  { code: 'LKR', symbol: 'රු', name: 'Sri Lankan Rupee' },
];

const TAX_TYPES = [
  { value: 'none',  label: 'No Tax' },
  { value: 'gst',   label: 'GST (India)' },
  { value: 'vat',   label: 'VAT' },
  { value: 'sales', label: 'Sales Tax' },
];

const LANGUAGES = [
  { code: 'en', label: 'English',           flag: '🇬🇧' },
  { code: 'hi', label: 'हिंदी (Hindi)',      flag: '🇮🇳' },
  { code: 'ar', label: 'العربية (Arabic)',   flag: '🇸🇦' },
];

const TIMEZONES = [
  'Asia/Kolkata','Asia/Dubai','Asia/Karachi','Asia/Dhaka',
  'Asia/Colombo','Asia/Kathmandu','Europe/London',
  'America/New_York','America/Los_Angeles','Australia/Sydney',
];

export default function SettingsPage() {
  const [settings, setSettings]     = useState({});
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [categories, setCategories] = useState([]);
  const [samples, setSamples]       = useState([]);
  const [catForm, setCatForm]       = useState('');
  const [sampleForm, setSampleForm] = useState({ name: '', category: '' });
  const [tab, setTab]               = useState('general');

  useEffect(() => {
    Promise.all([api.get('/settings'), api.get('/product-categories'), api.get('/samples')])
      .then(([s, c, sp]) => { setSettings(s.data); setCategories(c.data); setSamples(sp.data); setLoading(false); })
      .catch(() => { toast.error('Load failed'); setLoading(false); });
  }, []);

  const set = (k, v) => setSettings(p => ({ ...p, [k]: v }));

  const saveSettings = async () => {
    setSaving(true);
    try { await api.put('/settings', settings); toast.success('Settings saved!'); }
    catch { toast.error('Save failed'); }
    setSaving(false);
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

  const toggleSample = async (s) => {
    await api.put(`/samples/${s.id}`, { ...s, is_active: s.is_active ? 0 : 1 });
    const r = await api.get('/samples'); setSamples(r.data);
  };

  const sym = settings['currency_symbol'] || '₹';
  const rate = Number(settings['tax_rate'] || 18);
  const taxPreview = settings['tax_type'] && settings['tax_type'] !== 'none'
    ? (10000 * (1 + rate / 100)).toLocaleString('en-IN')
    : null;

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  const TABS = [
    { k: 'general',  l: '⚙️ General'         },
    { k: 'currency', l: '💰 Currency & Tax'   },
    { k: 'language', l: '🌍 Language'         },
    { k: 'field',    l: '📍 Field Worker'     },
    { k: 'products', l: '📦 Products'         },
  ];

  const inputCls = 'w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500';
  const SaveBtn = () => (
    <button onClick={saveSettings} disabled={saving}
      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition mt-2">
      {saving ? 'Saving...' : '💾 Save'}
    </button>
  );

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${tab === t.k ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-500'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* GENERAL */}
      {tab === 'general' && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
          <h2 className="text-white font-semibold">General Settings</h2>
          <div>
            <label className="text-slate-300 text-sm font-medium block mb-1.5">Company Name</label>
            <input className={inputCls} value={settings['company_name'] || ''} onChange={e => set('company_name', e.target.value)} />
          </div>
          <div>
            <label className="text-slate-300 text-sm font-medium block mb-1.5">Timezone</label>
            <select className={inputCls} value={settings['timezone'] || 'Asia/Kolkata'} onChange={e => set('timezone', e.target.value)}>
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <SaveBtn />
        </div>
      )}

      {/* CURRENCY & TAX */}
      {tab === 'currency' && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-5">
          <div>
            <h2 className="text-white font-semibold">Currency & Tax</h2>
            <p className="text-slate-400 text-sm mt-0.5">Orders, reports, invoices mein yahi currency dikhhegi.</p>
          </div>

          <div>
            <label className="text-slate-300 text-sm font-medium block mb-2">Select Currency</label>
            <div className="grid grid-cols-2 gap-2">
              {CURRENCIES.map(c => (
                <button key={c.code}
                  onClick={() => { set('currency_code', c.code); set('currency_symbol', c.symbol); set('currency_name', c.name); }}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${settings['currency_code'] === c.code ? 'border-blue-500 bg-blue-900/20' : 'border-slate-600 bg-slate-700 hover:border-slate-500'}`}>
                  <span className="text-lg font-bold w-7 text-center text-slate-300">{c.symbol}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium">{c.code}</div>
                    <div className="text-slate-400 text-xs truncate">{c.name}</div>
                  </div>
                  {settings['currency_code'] === c.code && <span className="text-blue-400 text-xs">✓</span>}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-slate-300 text-sm font-medium block mb-1.5">Custom Symbol (override)</label>
            <input className="w-28 bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              value={settings['currency_symbol'] || '₹'} onChange={e => set('currency_symbol', e.target.value)} />
          </div>

          <div>
            <label className="text-slate-300 text-sm font-medium block mb-2">Tax Type</label>
            <div className="flex gap-2 flex-wrap">
              {TAX_TYPES.map(t => (
                <button key={t.value} onClick={() => set('tax_type', t.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${settings['tax_type'] === t.value ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {settings['tax_type'] && settings['tax_type'] !== 'none' && (
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1.5">
                {settings['tax_type'] === 'gst' ? 'GST Rate' : settings['tax_type'] === 'vat' ? 'VAT Rate' : 'Tax Rate'} (%)
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <input type="number" min="0" max="100" step="0.5"
                  className="w-24 bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  value={settings['tax_rate'] || '18'} onChange={e => set('tax_rate', e.target.value)} />
                <span className="text-slate-400">%</span>
                {settings['tax_type'] === 'gst' && ['5','12','18','28'].map(r => (
                  <button key={r} onClick={() => set('tax_rate', r)}
                    className={`px-2.5 py-1 rounded-lg text-xs transition border ${settings['tax_rate'] === r ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'}`}>
                    {r}%
                  </button>
                ))}
              </div>
              {settings['tax_type'] === 'gst' && (
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input type="checkbox" checked={settings['tax_inclusive'] === '1'} onChange={e => set('tax_inclusive', e.target.checked ? '1' : '0')} />
                  <span className="text-slate-300 text-sm">Amount inclusive of GST</span>
                </label>
              )}
            </div>
          )}

          {/* Live preview */}
          <div className="bg-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-xs mb-1">Preview (for {sym}10,000 order):</p>
            <div className="text-white text-sm">
              Base: <span className="font-bold text-white">{sym}10,000</span>
              {taxPreview && (
                <> + {settings['tax_type']?.toUpperCase()} {rate}% = <span className="font-bold text-green-400">{sym}{taxPreview}</span></>
              )}
              {!taxPreview && <span className="text-slate-400 ml-1">(no tax)</span>}
            </div>
          </div>

          <SaveBtn />
        </div>
      )}

      {/* LANGUAGE */}
      {tab === 'language' && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="text-white font-semibold">Language / भाषा / اللغة</h2>
            <p className="text-slate-400 text-sm mt-0.5">App ki default language. Field workers apni language khud bhi choose kar sakte hain.</p>
          </div>
          <div className="space-y-2">
            {LANGUAGES.map(lang => (
              <button key={lang.code} onClick={() => set('default_language', lang.code)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition ${(settings['default_language'] || 'en') === lang.code ? 'border-blue-500 bg-blue-900/20' : 'border-slate-600 bg-slate-700 hover:border-slate-500'}`}>
                <span style={{ fontSize: 26 }}>{lang.flag}</span>
                <div className="flex-1">
                  <div className="text-white font-medium text-sm">{lang.label}</div>
                  <div className="text-slate-400 text-xs">API: /api/i18n/{lang.code}</div>
                </div>
                {(settings['default_language'] || 'en') === lang.code && <span className="text-blue-400 text-sm font-medium">✓ Active</span>}
              </button>
            ))}
          </div>
          <div className="bg-slate-700 rounded-xl p-3 text-xs text-slate-400">
            ℹ️ Language strings fetch karo: <code className="text-blue-300">GET /api/i18n/hi</code> — Hindi, English, Arabic available hain.
          </div>
          <SaveBtn />
        </div>
      )}

      {/* FIELD WORKER */}
      {tab === 'field' && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
          <h2 className="text-white font-semibold">Field Worker Settings</h2>
          {[
            ['location_ping_interval', 'Location Ping Interval (seconds)', 'Kitni seconds mein GPS ping save ho (default: 60)', '60'],
            ['geofence_radius_m',      'Geo-fence Radius (meters)',         'Doctor se kitna door hone par visit allow ho (default: 500m)', '500'],
            ['no_movement_alert_minutes','No Movement Alert (minutes)',     'Alert if no GPS ping received for N minutes (default: 30)', '30'],
          ].map(([k, label, hint, def]) => (
            <div key={k}>
              <label className="text-slate-300 text-sm font-medium block mb-1.5">{label}</label>
              <input type="number" className={inputCls} value={settings[k] || def} onChange={e => set(k, e.target.value)} />
              <p className="text-slate-500 text-xs mt-1">{hint}</p>
            </div>
          ))}
          <SaveBtn />
        </div>
      )}

      {/* PRODUCTS */}
      {tab === 'products' && (
        <div className="space-y-5">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4">Product Categories</h2>
            <div className="flex gap-2 mb-3">
              <input type="text" value={catForm} onChange={e => setCatForm(e.target.value)} placeholder="e.g. Surgical Instruments"
                onKeyDown={e => e.key === 'Enter' && addCategory()}
                className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
              <button onClick={addCategory} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => <span key={c.id} className="text-sm px-3 py-1 bg-slate-700 text-slate-300 rounded-full">{c.name}</span>)}
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4">Sample Products</h2>
            <div className="flex gap-2 mb-3 flex-wrap">
              <input type="text" value={sampleForm.name} onChange={e => setSampleForm(p => ({ ...p, name: e.target.value }))} placeholder="Sample name *"
                className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500 min-w-0" />
              <input type="text" value={sampleForm.category} onChange={e => setSampleForm(p => ({ ...p, category: e.target.value }))} placeholder="Category (optional)"
                className="w-40 bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
              <button onClick={addSample} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {samples.map(s => (
                <button key={s.id} onClick={() => toggleSample(s)}
                  title={s.is_active ? 'Click to deactivate' : 'Click to activate'}
                  className={`text-xs px-2.5 py-1 rounded-full transition ${s.is_active !== 0 ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-800 text-slate-500 line-through'}`}>
                  {s.name}{s.category ? ` (${s.category})` : ''}
                </button>
              ))}
            </div>
            <p className="text-slate-600 text-xs mt-2">Click any sample to toggle active/inactive</p>
          </div>
        </div>
      )}
    </div>
  );
}
