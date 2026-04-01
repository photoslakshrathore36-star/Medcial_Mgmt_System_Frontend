import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const [settings, setSettings] = useState(null);
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [tab, setTab]           = useState('send');
  const [workers, setWorkers]   = useState([]);
  const [form, setForm]         = useState({ phone: '', message: '', type: 'manual' });
  const [sending, setSending]   = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, l, w] = await Promise.all([
        api.get('/notifications/settings'),
        api.get('/notifications/logs'),
        api.get('/workers'),
      ]);
      setSettings(s.data); setLogs(l.data); setWorkers(w.data);
    } catch { toast.error('Load failed'); }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!form.phone || !form.message) return toast.error('Phone aur message required hain');
    setSending(true);
    try {
      const res = await api.post('/notifications/send', form);
      if (res.data.result?.skipped) {
        toast('SMS skipped — MSG91_AUTH_KEY .env mein set nahi hai', { icon: 'ℹ️' });
      } else {
        toast.success('Notification bheja gaya!');
      }
      setForm(f => ({ ...f, phone: '', message: '' }));
      loadAll();
    } catch (e) { toast.error(e.response?.data?.message || 'Send failed'); }
    setSending(false);
  };

  const fillWorkerPhone = (workerId) => {
    const w = workers.find(w => String(w.id) === String(workerId));
    if (w?.phone) setForm(f => ({ ...f, phone: w.phone }));
  };

  const TEMPLATES = [
    { label: 'Low Stock Alert', msg: 'Alert: Aapka sample stock low ho gaya hai. Admin se restock request karein.' },
    { label: 'Visit Reminder', msg: 'Reminder: Aaj ke visit plans complete karein aur session active rakhein.' },
    { label: 'Target Warning', msg: 'Alert: Is mahine ka target achieve nahi ho raha. Performance improve karein.' },
    { label: 'Good Performance', msg: 'Congratulations! Aapki is mahine ki performance excellent hai. Keep it up!' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">SMS Notifications</h1>
          {settings && (
            <div className={`flex items-center gap-1.5 mt-1 text-sm ${settings.configured ? 'text-green-400' : 'text-yellow-400'}`}>
              <span className={`w-2 h-2 rounded-full inline-block ${settings.configured ? 'bg-green-500' : 'bg-yellow-500'}`} />
              {settings.configured ? 'MSG91 Connected' : 'MSG91 not configured'}
            </div>
          )}
        </div>
        <button onClick={loadAll} className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg text-sm border border-slate-600">🔄</button>
      </div>

      {/* Setup banner if not configured */}
      {settings && !settings.configured && (
        <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-4 mb-5">
          <div className="text-yellow-300 font-medium mb-1">⚙️ SMS Setup Required</div>
          <p className="text-yellow-200/70 text-sm">Railway environment variables mein yeh add karo:</p>
          <div className="bg-slate-900/60 rounded-lg p-3 mt-2 font-mono text-xs text-green-400 space-y-1">
            <div>MSG91_AUTH_KEY=your_auth_key_here</div>
            <div>MSG91_SENDER_ID=MEDMGR</div>
          </div>
          <p className="text-yellow-200/50 text-xs mt-2">MSG91 par free account bana sakte ho — msg91.com</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[{ k:'send', l:'📤 Send SMS' }, { k:'logs', l:`📋 Sent Logs (${logs.length})` }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${tab === t.k ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {tab === 'send' && (
        <div className="space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">Message Bhejo</h3>
            <div className="space-y-3">
              {/* Worker quick-fill */}
              <div>
                <label className="text-slate-400 text-xs block mb-1">Worker se phone fill karo (optional)</label>
                <select onChange={e => fillWorkerPhone(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="">Worker chunein...</option>
                  {workers.map(w => <option key={w.id} value={w.id}>{w.name} {w.phone ? `— ${w.phone}` : '(no phone)'}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">Phone Number *</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="manual">Manual</option>
                  <option value="low_stock">Low Stock Alert</option>
                  <option value="target_warning">Target Warning</option>
                  <option value="appreciation">Appreciation</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">Message *</label>
                <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  rows={3} placeholder="Message likhein..."
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm resize-none" />
                <div className="text-slate-500 text-xs mt-1 text-right">{form.message.length} chars</div>
              </div>
            </div>
            <button onClick={handleSend} disabled={sending}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium text-sm transition disabled:opacity-50 flex items-center justify-center gap-2">
              {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '📤'}
              {settings?.configured ? 'SMS Bhejo' : 'Test (SMS skip hoga — MSG91 not set)'}
            </button>
          </div>

          {/* Templates */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-slate-300 font-medium mb-3 text-sm">Quick Templates</h3>
            <div className="space-y-2">
              {TEMPLATES.map((t, i) => (
                <button key={i} onClick={() => setForm(f => ({ ...f, message: t.msg }))}
                  className="w-full text-left bg-slate-700 hover:bg-slate-600 rounded-xl p-3 transition">
                  <div className="text-slate-300 text-sm font-medium">{t.label}</div>
                  <div className="text-slate-500 text-xs mt-0.5 truncate">{t.msg}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'logs' && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          {logs.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">Koi logs nahi</p>
          ) : (
            <div className="space-y-2">
              {logs.map(l => (
                <div key={l.id} className="bg-slate-700 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-white text-sm font-medium">📞 {l.phone}</div>
                      <div className="text-slate-400 text-xs mt-0.5">{l.message}</div>
                      <div className="text-slate-500 text-xs mt-1">
                        {l.sent_by_name || 'System'} · {new Date(l.created_at).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                      </div>
                    </div>
                    <span className={`text-xs flex-shrink-0 ${l.status === 'sent' ? 'text-green-400' : l.status === 'skipped' ? 'text-yellow-400' : 'text-red-400'}`}>
                      {l.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
