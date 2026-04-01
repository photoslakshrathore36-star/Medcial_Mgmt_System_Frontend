import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function AIVisitSummaryPage() {
  const [visits, setVisits]         = useState([]);
  const [workers, setWorkers]       = useState([]);
  const [selected, setSelected]     = useState(null);
  const [summary, setSummary]       = useState('');
  const [generating, setGenerating] = useState(false);
  const [filterWorker, setFilterWorker] = useState('');
  const [dateFrom, setDateFrom]     = useState(new Date(Date.now() - 7*24*3600000).toISOString().split('T')[0]);
  const [dateTo, setDateTo]         = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading]       = useState(false);
  const [mode, setMode]             = useState('single'); // 'single' | 'bulk'
  const [bulkSummary, setBulkSummary] = useState('');

  useEffect(() => {
    api.get('/workers', { params: { role: 'field_worker' } }).then(r => setWorkers(r.data)).catch(() => {});
    loadVisits();
  }, []);

  const loadVisits = async () => {
    setLoading(true);
    try {
      const res = await api.get('/field/visits', {
        params: { date_from: dateFrom, date_to: dateTo, worker_id: filterWorker || undefined }
      });
      setVisits(res.data);
    } catch { toast.error('Visits load failed'); }
    setLoading(false);
  };

  const buildVisitContext = (visit) => {
    return `Visit Details:
- Doctor: ${visit.doctor_name || 'Unknown'} at ${visit.clinic_name || 'Unknown Clinic'}
- Area: ${visit.area_name || 'Unknown'}
- Visit Type: ${visit.visit_type || 'doctor'}
- Arrival: ${visit.arrival_time ? new Date(visit.arrival_time).toLocaleString('en-IN') : 'N/A'}
- Duration: ${visit.duration_minutes || 0} minutes
- Outcome: ${visit.outcome?.replace(/_/g, ' ') || 'N/A'}
- Order Received: ${visit.order_received ? 'Yes' : 'No'}${visit.order_amount > 0 ? ` (₹${visit.order_amount})` : ''}
- Samples Given: ${visit.samples_given || 'None'}
- Doctor Feedback: ${visit.doctor_feedback || 'None'}
- Notes: ${visit.notes || 'None'}
- Geo Verified: ${visit.geo_verified ? 'Yes' : 'No'}`;
  };

  const generateSingleSummary = async () => {
    if (!selected) return toast.error('Pehle ek visit chunein');
    setGenerating(true);
    setSummary('');
    try {
      const visitContext = buildVisitContext(selected);
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `You are a medical field force assistant. Generate a professional visit summary in 3-4 sentences for a manager. Be concise and highlight key outcomes, any orders, and next steps. Write in English.

${visitContext}

Generate a professional summary:`
          }]
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.content?.map(c => c.text || '').join('') || '';
      setSummary(text);
    } catch (e) {
      toast.error('AI summary failed: ' + (e.message || 'Unknown error'));
    }
    setGenerating(false);
  };

  const generateBulkSummary = async () => {
    if (visits.length === 0) return toast.error('Koi visits nahi hain');
    setGenerating(true);
    setBulkSummary('');
    try {
      const topVisits = visits.slice(0, 20);
      const context = topVisits.map((v, i) =>
        `${i+1}. ${v.worker_name || 'Worker'} → ${v.doctor_name || 'Doctor'} | Outcome: ${v.outcome?.replace(/_/g,' ')} | Order: ${v.order_received ? '₹'+v.order_amount : 'No'} | Duration: ${v.duration_minutes||0}min`
      ).join('\n');

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `You are a medical field force analytics assistant. Based on these ${topVisits.length} field visits, generate a concise management summary report. Include: overall performance, key wins, concerns, and recommendations. Be crisp and professional. Write in English.

Visit Data (${dateFrom} to ${dateTo}):
${context}

Generate management summary:`
          }]
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.content?.map(c => c.text || '').join('') || '';
      setBulkSummary(text);
    } catch (e) {
      toast.error('Bulk summary failed: ' + (e.message || 'Unknown error'));
    }
    setGenerating(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copied!')).catch(() => toast.error('Copy failed'));
  };

  const OUTCOME_COLORS = {
    interested: 'text-green-400', not_interested: 'text-red-400',
    follow_up: 'text-yellow-400', sample_given: 'text-blue-400',
    order_placed: 'text-purple-400', not_available: 'text-slate-400', failed: 'text-red-500'
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            🤖 AI Visit Summary
          </h1>
          <p className="text-slate-400 text-sm mt-1">Claude AI se automatic visit summaries aur reports generate karo</p>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-5">
        {[{ k: 'single', l: '📋 Single Visit Summary' }, { k: 'bulk', l: '📊 Bulk Report Summary' }].map(t => (
          <button key={t.k} onClick={() => setMode(t.k)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${mode === t.k ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-500'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-slate-400 text-xs block mb-1">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-slate-400 text-xs block mb-1">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-slate-400 text-xs block mb-1">Worker</label>
          <select value={filterWorker} onChange={e => setFilterWorker(e.target.value)}
            className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm">
            <option value="">All Workers</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <button onClick={loadVisits} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          Load Visits
        </button>
        {mode === 'bulk' && (
          <button onClick={generateBulkSummary} disabled={generating || visits.length === 0}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50 ml-auto">
            {generating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '🤖'}
            Generate Bulk Report
          </button>
        )}
      </div>

      {/* SINGLE MODE */}
      {mode === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Visit List */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center justify-between">
              <span>Visits ({visits.length})</span>
              {loading && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {visits.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-6">Koi visits nahi mili</p>
              ) : visits.map(v => (
                <div key={v.id}
                  onClick={() => { setSelected(v); setSummary(''); }}
                  className={`p-3 rounded-xl cursor-pointer transition border ${selected?.id === v.id ? 'bg-blue-900/30 border-blue-700' : 'bg-slate-700 border-slate-600 hover:border-slate-500'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{v.doctor_name}</div>
                      <div className="text-slate-400 text-xs">{v.worker_name} · {v.area_name}</div>
                    </div>
                    <span className={`text-xs font-medium ${OUTCOME_COLORS[v.outcome] || 'text-white'}`}>
                      {v.outcome?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-slate-500 text-xs mt-1">
                    {v.arrival_time ? new Date(v.arrival_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                    {v.duration_minutes ? ` · ${v.duration_minutes} min` : ''}
                    {v.order_received ? ` · 🛒 ₹${v.order_amount}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Panel */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3">AI Summary</h3>
            {!selected ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">👆</div>
                <p className="text-slate-400 text-sm">Left se ek visit click karo</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Visit quick info */}
                <div className="bg-slate-700 rounded-xl p-3 text-sm space-y-1">
                  <div className="text-white font-medium">{selected.doctor_name} — {selected.clinic_name}</div>
                  <div className="text-slate-400">{selected.worker_name} · {selected.area_name}</div>
                  <div className="flex gap-3 flex-wrap mt-1">
                    <span className={`text-xs font-medium ${OUTCOME_COLORS[selected.outcome] || 'text-white'}`}>
                      {selected.outcome?.replace(/_/g, ' ')}
                    </span>
                    {selected.order_received && <span className="text-purple-400 text-xs">🛒 ₹{selected.order_amount}</span>}
                    {selected.duration_minutes > 0 && <span className="text-slate-400 text-xs">⏱ {selected.duration_minutes} min</span>}
                  </div>
                </div>

                <button onClick={generateSingleSummary} disabled={generating}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2.5 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50">
                  {generating
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
                    : <><span>🤖</span> Generate AI Summary</>}
                </button>

                {summary && (
                  <div className="bg-slate-900 border border-slate-600 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-400 text-xs">AI Generated Summary</span>
                      <button onClick={() => copyToClipboard(summary)}
                        className="text-xs text-blue-400 hover:text-blue-300 transition">
                        📋 Copy
                      </button>
                    </div>
                    <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BULK MODE */}
      {mode === 'bulk' && (
        <div className="space-y-5">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3">Visits loaded: {visits.length}</h3>
            {visits.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total', value: visits.length, color: 'text-blue-400' },
                  { label: 'Orders', value: visits.filter(v => v.order_received).length, color: 'text-purple-400' },
                  { label: 'Interested', value: visits.filter(v => v.outcome === 'interested').length, color: 'text-green-400' },
                  { label: 'Order Value', value: `₹${visits.reduce((s, v) => s + (v.order_amount || 0), 0).toLocaleString('en-IN')}`, color: 'text-yellow-400' },
                ].map((s, i) => (
                  <div key={i} className="bg-slate-700 rounded-xl p-3 text-center">
                    <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-slate-400 text-xs mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {bulkSummary && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">🤖 AI Management Report</h3>
                <button onClick={() => copyToClipboard(bulkSummary)}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg text-xs transition">
                  📋 Copy Report
                </button>
              </div>
              <div className="bg-slate-900 border border-slate-600 rounded-xl p-4">
                <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{bulkSummary}</p>
              </div>
            </div>
          )}

          {generating && !bulkSummary && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
              <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: '3px' }} />
              <p className="text-slate-400 text-sm">Claude AI report generate kar raha hai...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
