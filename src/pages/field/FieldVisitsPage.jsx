import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const OUTCOME_OPTIONS = [
  { value: 'sample_given', label: '🧪 Sample Diya', color: '#3b82f6' },
  { value: 'interested', label: '✅ Interested', color: '#22c55e' },
  { value: 'order_placed', label: '🛒 Order Mila', color: '#8b5cf6' },
  { value: 'follow_up', label: '📅 Follow Up', color: '#f59e0b' },
  { value: 'not_interested', label: '❌ Not Interested', color: '#ef4444' },
  { value: 'not_available', label: '🚪 Nahi Mile', color: '#6b7280' },
];

export default function FieldVisitsPage() {
  const { hasActiveSession, sessionId } = useOutletContext();
  const [visits, setVisits] = useState([]);
  const [plans, setPlans] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [activeVisit, setActiveVisit] = useState(null); // visit that has arrived but not departed
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [arrivalTimer, setArrivalTimer] = useState('');
  const timerRef = useRef(null);
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    doctor_id: '', visit_plan_id: '',
    samples_given: '', outcome: 'sample_given',
    doctor_feedback: '', notes: '',
    arrival_lat: '', arrival_lng: '',
    distance_from_prev_km: '', travel_time_minutes: '',
  });

  useEffect(() => {
    loadData();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [sessionId]);

  useEffect(() => {
    if (activeVisit) startArrivalTimer(new Date(activeVisit.arrival_time));
    else { if (timerRef.current) clearInterval(timerRef.current); setArrivalTimer(''); }
  }, [activeVisit]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [v, p, d] = await Promise.all([
        api.get('/field/visits', { params: { date_from: today, date_to: today } }),
        api.get('/visit-plans', { params: { date: today, status: 'planned' } }),
        api.get('/doctors'),
      ]);
      setVisits(v.data); setPlans(p.data); setDoctors(d.data);
    } catch {}
    setLoading(false);
  };

  const startArrivalTimer = (arrivalTime) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const update = () => {
      const diff = Math.floor((Date.now() - arrivalTime.getTime()) / 1000);
      const m = Math.floor(diff / 60), s = diff % 60;
      setArrivalTimer(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    update(); timerRef.current = setInterval(update, 1000);
  };

  const getLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return resolve({});
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  const calcDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2);
  };

  const handleArrived = async (plan = null) => {
    if (!hasActiveSession) return toast.error('Pehle session start karo!');
    setGettingLocation(true);
    const loc = await getLocation();

    // calculate distance from last visit
    let distKm = 0, travelMin = 0;
    if (visits.length > 0 && loc.lat) {
      const last = visits[0];
      if (last.arrival_lat) {
        distKm = calcDistanceKm(parseFloat(last.arrival_lat), parseFloat(last.arrival_lng), loc.lat, loc.lng);
        const lastDepTime = last.departure_time ? new Date(last.departure_time) : new Date(last.arrival_time);
        travelMin = Math.floor((Date.now() - lastDepTime.getTime()) / 60000);
      }
    }

    setForm(prev => ({
      ...prev,
      doctor_id: plan?.doctor_id || '',
      visit_plan_id: plan?.id || '',
      arrival_lat: loc.lat || '',
      arrival_lng: loc.lng || '',
      distance_from_prev_km: distKm,
      travel_time_minutes: travelMin > 0 ? travelMin : '',
      samples_given: plan?.sample_products || '',
    }));
    setGettingLocation(false);
    setShowModal(true);
  };

  const handleRecordArrival = async () => {
    if (!form.doctor_id) return toast.error('Doctor select karo');
    try {
      const r = await api.post('/field/visits', {
        session_id: sessionId,
        ...form,
      });
      const newVisit = { id: r.data.id, doctor_id: form.doctor_id, arrival_time: new Date().toISOString(), arrival_lat: form.arrival_lat, arrival_lng: form.arrival_lng, outcome: form.outcome };
      const doc = doctors.find(d => String(d.id) === String(form.doctor_id));
      if (doc) { newVisit.doctor_name = doc.name; newVisit.clinic_name = doc.clinic_name; }
      setActiveVisit(newVisit);
      setShowModal(false);
      toast.success(`${doc?.name} ke paas pahunch gaye! ⏱ Timer shuru`);
      loadData();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const handleDepart = async () => {
    if (!activeVisit) return;
    try {
      const r = await api.put(`/field/visits/${activeVisit.id}/depart`);
      toast.success(`Visit complete! ${r.data.duration_minutes} min ruke 👋`);
      setActiveVisit(null);
      loadData();
    } catch (err) { toast.error('Error'); }
  };

  // Prefill from plan
  const handlePlanSelect = (planId) => {
    const plan = plans.find(p => String(p.id) === String(planId));
    if (plan) {
      setForm(prev => ({
        ...prev,
        visit_plan_id: planId,
        doctor_id: plan.doctor_id,
        samples_given: plan.sample_products || prev.samples_given,
      }));
    } else {
      setForm(prev => ({ ...prev, visit_plan_id: planId }));
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-white mb-4">Doctor Visits</h1>

      {/* Active Visit Timer */}
      {activeVisit && (
        <div className="bg-blue-900/30 border border-blue-700/50 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-blue-400 font-semibold text-sm">Abhi yahan hain:</div>
              <div className="text-white font-bold">{activeVisit.doctor_name}</div>
              <div className="text-slate-400 text-xs">{activeVisit.clinic_name}</div>
            </div>
            <div className="text-center">
              <div className="text-blue-300 font-mono text-2xl font-bold">{arrivalTimer}</div>
              <div className="text-slate-400 text-xs">Time spent</div>
            </div>
          </div>
          <button onClick={handleDepart}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition mt-2">
            <span className="text-xl">🚶</span> Nikal Raha Hoon
          </button>
        </div>
      )}

      {/* Record New Visit */}
      {!activeVisit && (
        <div className="mb-5">
          <h2 className="text-slate-300 font-medium mb-3 text-sm">Aaj ke Plans</h2>
          {plans.length === 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center text-slate-400 text-sm mb-3">
              Aaj koi plan nahi hai
            </div>
          )}
          {plans.map(p => (
            <div key={p.id} className="bg-slate-800 border border-slate-700 rounded-xl p-3 mb-2 flex items-center justify-between">
              <div>
                <div className="text-white text-sm font-medium">👨‍⚕️ {p.doctor_name}</div>
                <div className="text-slate-400 text-xs">{p.clinic_name} · {p.area_name}</div>
              </div>
              <button onClick={() => handleArrived(p)} disabled={gettingLocation || !hasActiveSession}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition">
                📍 Pahuncha
              </button>
            </div>
          ))}
          <button onClick={() => handleArrived()} disabled={gettingLocation || !hasActiveSession}
            className="w-full bg-slate-800 border border-slate-700 hover:border-slate-500 disabled:opacity-40 text-white py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition mt-2">
            {gettingLocation ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '➕'}
            Naya / Unplanned Visit Record Karo
          </button>
          {!hasActiveSession && <p className="text-yellow-400 text-xs text-center mt-2">⚠️ Visit record karne ke liye pehle session start karo</p>}
        </div>
      )}

      {/* Today's Visits History */}
      <div>
        <h2 className="text-slate-300 font-medium mb-3 text-sm">Aaj ke Visits ({visits.length})</h2>
        {loading ? (
          <div className="flex justify-center py-4"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : visits.length === 0 ? (
          <div className="text-slate-400 text-sm text-center py-4">Abhi tak koi visit nahi</div>
        ) : (
          <div className="space-y-2">
            {visits.map((v, i) => (
              <div key={v.id} className="bg-slate-800 border border-slate-700 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
                      style={{ background: getOutcomeColor(v.outcome) }}>{visits.length - i}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium">{v.doctor_name}</div>
                      <div className="text-slate-400 text-xs">{v.clinic_name}</div>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-1">
                        <span>🕐 {new Date(v.arrival_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        {v.duration_minutes > 0 && <span>⏱ {v.duration_minutes} min</span>}
                        {v.distance_from_prev_km > 0 && <span>📍 {v.distance_from_prev_km} km</span>}
                        {v.travel_time_minutes > 0 && <span>🚗 {v.travel_time_minutes} min travel</span>}
                      </div>
                      {v.samples_given && <div className="text-blue-400 text-xs mt-1">🧪 {v.samples_given}</div>}
                      {v.doctor_feedback && <div className="text-slate-300 text-xs italic mt-0.5">"{v.doctor_feedback}"</div>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-semibold" style={{ color: getOutcomeColor(v.outcome) }}>
                      {OUTCOME_OPTIONS.find(o => o.value === v.outcome)?.label || v.outcome}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Visit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="bg-slate-800 border border-slate-700 rounded-t-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 p-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-white font-semibold">Visit Record Karo</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-4 space-y-4">
              {/* Link to plan */}
              {plans.length > 0 && (
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1.5">Plan se Link Karo (optional)</label>
                  <select value={form.visit_plan_id} onChange={e => handlePlanSelect(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
                    <option value="">-- Unplanned Visit --</option>
                    {plans.map(p => <option key={p.id} value={p.id}>{p.doctor_name} - {p.clinic_name}</option>)}
                  </select>
                </div>
              )}

              {/* Doctor Select */}
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Doctor *</label>
                <select value={form.doctor_id} onChange={e => setForm(p => ({ ...p, doctor_id: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
                  <option value="">-- Doctor Select Karo --</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>{d.name} — {d.clinic_name || 'No clinic'}</option>)}
                </select>
              </div>

              {/* Location info */}
              {form.arrival_lat && (
                <div className="bg-green-900/20 border border-green-700/30 rounded-xl p-3 text-xs text-green-400">
                  📍 Location: {parseFloat(form.arrival_lat).toFixed(5)}, {parseFloat(form.arrival_lng).toFixed(5)}
                  {form.distance_from_prev_km > 0 && ` · ${form.distance_from_prev_km} km from last`}
                </div>
              )}

              {/* Samples */}
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Samples Diye</label>
                <input type="text" value={form.samples_given} onChange={e => setForm(p => ({ ...p, samples_given: e.target.value }))}
                  placeholder="e.g. Surgical Kit, Implant Sample"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Outcome */}
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Visit Outcome *</label>
                <div className="grid grid-cols-2 gap-2">
                  {OUTCOME_OPTIONS.map(o => (
                    <button key={o.value} type="button"
                      onClick={() => setForm(p => ({ ...p, outcome: o.value }))}
                      className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition ${form.outcome === o.value ? 'border-transparent text-white' : 'border-slate-600 text-slate-300 hover:border-slate-400 bg-transparent'}`}
                      style={form.outcome === o.value ? { background: o.color + '33', borderColor: o.color, color: o.color } : {}}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Doctor Feedback */}
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Doctor ka Feedback</label>
                <textarea rows={2} value={form.doctor_feedback} onChange={e => setForm(p => ({ ...p, doctor_feedback: e.target.value }))}
                  placeholder="Doctor ne kya kaha..."
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-700 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl text-sm transition">Cancel</button>
              <button onClick={handleRecordArrival} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-sm font-semibold transition">
                ✅ Pahunch Gaya - Timer Start
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getOutcomeColor(outcome) {
  const map = { interested: '#22c55e', not_interested: '#ef4444', follow_up: '#f59e0b', sample_given: '#3b82f6', order_placed: '#8b5cf6', not_available: '#6b7280' };
  return map[outcome] || '#6b7280';
}
