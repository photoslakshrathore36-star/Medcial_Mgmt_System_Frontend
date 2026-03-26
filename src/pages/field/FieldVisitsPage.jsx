import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const OUTCOME_OPTIONS = [
  { value: 'sample_given',   label: '🧪 Sample Diya',    color: '#3b82f6' },
  { value: 'interested',     label: '✅ Interested',      color: '#22c55e' },
  { value: 'order_placed',   label: '🛒 Order Mila',      color: '#8b5cf6' },
  { value: 'follow_up',      label: '📅 Follow Up',       color: '#f59e0b' },
  { value: 'not_interested', label: '❌ Not Interested',  color: '#ef4444' },
  { value: 'not_available',  label: '🚪 Nahi Mile',       color: '#6b7280' },
  { value: 'failed',         label: '⚠️ Visit Failed',    color: '#dc2626' },
];

export default function FieldVisitsPage() {
  const { hasActiveSession, sessionId } = useOutletContext();
  const [visits, setVisits]       = useState([]);
  const [plans, setPlans]         = useState([]);
  const [doctors, setDoctors]     = useState([]);
  const [products, setProducts]   = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [activeVisit, setActiveVisit] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [arrivalTimer, setArrivalTimer] = useState('');
  const timerRef  = useRef(null);
  const cameraRef = useRef(null);
  const today     = new Date().toISOString().split('T')[0];

  const emptyForm = {
    doctor_id:'', visit_plan_id:'',
    visit_type:'doctor',
    product_id:'', samples_given:'',
    order_received:false, order_amount:'',
    outcome:'sample_given', failure_reason:'',
    doctor_feedback:'', notes:'',
    arrival_lat:'', arrival_lng:'',
    photo_url:'', photo_preview:'',
    distance_from_prev_km:'', travel_time_minutes:'',
  };
  const [form, setForm] = useState(emptyForm);

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
      const [v, p, d, pr] = await Promise.all([
        api.get('/field/visits', { params: { date_from: today, date_to: today } }),
        api.get('/visit-plans', { params: { date: today, status: 'planned' } }),
        api.get('/doctors'),
        api.get('/samples'),
      ]);
      setVisits(v.data); setPlans(p.data); setDoctors(d.data); setProducts(pr.data);
    } catch {}
    setLoading(false);
  };

  const startArrivalTimer = (arrivalTime) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const update = () => {
      const diff = Math.floor((Date.now() - arrivalTime.getTime()) / 1000);
      const m = Math.floor(diff/60), s = diff%60;
      setArrivalTimer(`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    update(); timerRef.current = setInterval(update, 1000);
  };

  const getLocation = () => new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({});
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  const calcDistanceKm = (lat1,lon1,lat2,lon2) => {
    const R=6371,dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180;
    const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return (R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))).toFixed(2);
  };

  const getRoadDistance = async (lat1,lng1,lat2,lng2) => {
    try {
      const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=false`);
      const d = await r.json();
      if (d.routes?.[0]) return { distance:(d.routes[0].distance/1000).toFixed(2), time:Math.floor(d.routes[0].duration/60) };
    } catch {}
    return { distance:calcDistanceKm(lat1,lng1,lat2,lng2), time:0 };
  };

  const handleTakePhoto = () => { if (cameraRef.current) cameraRef.current.click(); };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      setForm(p => ({ ...p, photo_preview: base64 }));
      setUploading(true);
      try {
        const r = await api.post('/field/upload-photo', { image_base64: base64 });
        setForm(p => ({ ...p, photo_url: r.data.url }));
        toast.success('Photo upload ho gayi ✅');
      } catch { toast.error('Photo upload failed'); }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleArrived = async (plan=null) => {
    if (!hasActiveSession) return toast.error('Pehle session start karo!');
    setGettingLocation(true);
    const loc = await getLocation();
    let distKm=0, travelMin=0;
    if (visits.length>0 && loc.lat) {
      const last=visits[0];
      if (last.arrival_lat) {
        const rd = await getRoadDistance(parseFloat(last.arrival_lat),parseFloat(last.arrival_lng),loc.lat,loc.lng);
        distKm=rd.distance;
        travelMin=rd.time>0?rd.time:Math.floor((Date.now()-new Date(last.departure_time||last.arrival_time))/60000);
      }
    }
    setForm({ ...emptyForm, doctor_id:plan?.doctor_id||'', visit_plan_id:plan?.id||'',
      samples_given:plan?.sample_products||'',
      arrival_lat:loc.lat||'', arrival_lng:loc.lng||'',
      distance_from_prev_km:distKm, travel_time_minutes:travelMin>0?travelMin:'',
    });
    setGettingLocation(false);
    setShowModal(true);
  };

  const handleRecordArrival = async () => {
    if (!form.doctor_id) return toast.error('Doctor/Chemist select karo');
    if (!form.photo_url && !form.photo_preview) return toast.error('Photo lena mandatory hai 📸');
    if (form.outcome==='failed' && !form.failure_reason) return toast.error('Failed visit ka reason batao');
    try {
      const r = await api.post('/field/visits', {
        session_id:sessionId, doctor_id:form.doctor_id,
        visit_plan_id:form.visit_plan_id||undefined,
        visit_type:form.visit_type,
        arrival_lat:form.arrival_lat, arrival_lng:form.arrival_lng,
        product_id:form.product_id||undefined, samples_given:form.samples_given,
        order_received:form.order_received, order_amount:form.order_amount||0,
        photo_url:form.photo_url,
        doctor_feedback:form.doctor_feedback, outcome:form.outcome,
        failure_reason:form.outcome==='failed'?form.failure_reason:undefined,
        notes:form.notes,
        distance_from_prev_km:form.distance_from_prev_km,
        travel_time_minutes:form.travel_time_minutes,
      });
      const doc = doctors.find(d => String(d.id)===String(form.doctor_id));
      setActiveVisit({ id:r.data.id, doctor_id:form.doctor_id, arrival_time:new Date().toISOString(),
        arrival_lat:form.arrival_lat, arrival_lng:form.arrival_lng, outcome:form.outcome,
        doctor_name:doc?.name, clinic_name:doc?.clinic_name });
      setShowModal(false);
      if (r.data.geo_verified===0 && r.data.distance_from_doctor_m>0) {
        toast.error(`⚠️ Location mismatch! Doctor se ${r.data.distance_from_doctor_m}m door ho`);
      } else {
        toast.success(`${doc?.name} ke paas pahunch gaye! ⏱ Timer shuru`);
      }
      loadData();
    } catch (err) { toast.error(err.response?.data?.message||'Error'); }
  };

  const handleDepart = async () => {
    if (!activeVisit) return;
    try {
      const r = await api.put(`/field/visits/${activeVisit.id}/depart`);
      toast.success(`Visit complete! ${r.data.duration_minutes} min ruke 👋`);
      setActiveVisit(null); loadData();
    } catch { toast.error('Error'); }
  };

  const handlePlanSelect = (planId) => {
    const plan = plans.find(p => String(p.id)===String(planId));
    if (plan) setForm(prev=>({...prev,visit_plan_id:planId,doctor_id:plan.doctor_id,samples_given:plan.sample_products||prev.samples_given}));
    else setForm(prev=>({...prev,visit_plan_id:planId}));
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-white mb-4">Doctor / Chemist Visits</h1>

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
            🚶 Nikal Raha Hoon
          </button>
        </div>
      )}

      {!activeVisit && (
        <div className="mb-5">
          <h2 className="text-slate-300 font-medium mb-3 text-sm">Aaj ke Plans</h2>
          {plans.length===0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center text-slate-400 text-sm mb-3">Aaj koi plan nahi hai</div>
          )}
          {plans.map(p => (
            <div key={p.id} className="bg-slate-800 border border-slate-700 rounded-xl p-3 mb-2 flex items-center justify-between">
              <div>
                <div className="text-white text-sm font-medium">👨‍⚕️ {p.doctor_name}</div>
                <div className="text-slate-400 text-xs">{p.clinic_name} · {p.area_name}</div>
              </div>
              <button onClick={()=>handleArrived(p)} disabled={gettingLocation||!hasActiveSession}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition">
                📍 Pahuncha
              </button>
            </div>
          ))}
          <button onClick={()=>handleArrived()} disabled={gettingLocation||!hasActiveSession}
            className="w-full bg-slate-800 border border-slate-700 hover:border-slate-500 disabled:opacity-40 text-white py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition mt-2">
            {gettingLocation?<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>:'➕'}
            Naya / Unplanned Visit Record Karo
          </button>
          {!hasActiveSession && <p className="text-yellow-400 text-xs text-center mt-2">⚠️ Visit record karne ke liye pehle session start karo</p>}
        </div>
      )}

      <div>
        <h2 className="text-slate-300 font-medium mb-3 text-sm">Aaj ke Visits ({visits.length})</h2>
        {loading
          ? <div className="flex justify-center py-4"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>
          : visits.length===0
            ? <div className="text-slate-400 text-sm text-center py-4">Abhi tak koi visit nahi</div>
            : <div className="space-y-2">
                {visits.map((v,i) => (
                  <div key={v.id} className="bg-slate-800 border border-slate-700 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
                          style={{background:getOutcomeColor(v.outcome)}}>{visits.length-i}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="text-white text-sm font-medium">{v.doctor_name}</div>
                            {v.visit_type==='chemist' && <span className="text-xs bg-orange-900/40 text-orange-300 px-1.5 py-0.5 rounded">Chemist</span>}
                          </div>
                          <div className="text-slate-400 text-xs">{v.clinic_name}</div>
                          <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-1">
                            <span>🕐 {new Date(v.arrival_time).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>
                            {v.duration_minutes>0 && <span>⏱ {v.duration_minutes} min</span>}
                            {v.distance_from_prev_km>0 && <span>📍 {v.distance_from_prev_km} km</span>}
                            {v.order_received?<span className="text-green-400">✅ Order</span>:null}
                            {!v.geo_verified && v.distance_from_doctor_m>0 && <span className="text-red-400">⚠️ {v.distance_from_doctor_m}m off</span>}
                          </div>
                          {(v.product_name||v.samples_given) && <div className="text-blue-400 text-xs mt-1">🧪 {v.product_name||v.samples_given}</div>}
                          {v.failure_reason && <div className="text-red-400 text-xs mt-0.5">Reason: {v.failure_reason}</div>}
                          {v.doctor_feedback && <div className="text-slate-300 text-xs italic mt-0.5">"{v.doctor_feedback}"</div>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-xs font-semibold" style={{color:getOutcomeColor(v.outcome)}}>
                          {OUTCOME_OPTIONS.find(o=>o.value===v.outcome)?.label||v.outcome}
                        </span>
                        {v.photo_url && (
                          <a href={`${process.env.REACT_APP_API_URL||'http://localhost:5000'}${v.photo_url}`}
                            target="_blank" rel="noreferrer"
                            className="text-xs text-slate-400 hover:text-blue-400">📸</a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
        }
      </div>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange}/>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="bg-slate-800 border border-slate-700 rounded-t-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 p-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-white font-semibold">Visit Record Karo</h2>
              <button onClick={()=>setShowModal(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-4 space-y-4">

              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Visit Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[{v:'doctor',l:'👨‍⚕️ Doctor'},{v:'chemist',l:'💊 Chemist'}].map(t=>(
                    <button key={t.v} type="button" onClick={()=>setForm(p=>({...p,visit_type:t.v}))}
                      className={`py-2.5 rounded-xl text-sm font-medium border transition ${form.visit_type===t.v?'bg-blue-600 border-blue-500 text-white':'bg-transparent border-slate-600 text-slate-300 hover:border-slate-400'}`}>
                      {t.l}
                    </button>
                  ))}
                </div>
              </div>

              {plans.length>0 && (
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1.5">Plan se Link Karo (optional)</label>
                  <select value={form.visit_plan_id} onChange={e=>handlePlanSelect(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
                    <option value="">-- Unplanned Visit --</option>
                    {plans.map(p=><option key={p.id} value={p.id}>{p.doctor_name} - {p.clinic_name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">{form.visit_type==='chemist'?'Chemist':'Doctor'} *</label>
                <select value={form.doctor_id} onChange={e=>setForm(p=>({...p,doctor_id:e.target.value}))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
                  <option value="">-- Select Karo --</option>
                  {doctors.map(d=><option key={d.id} value={d.id}>{d.name} — {d.clinic_name||'No clinic'}</option>)}
                </select>
              </div>

              {form.arrival_lat
                ? <div className="bg-green-900/20 border border-green-700/30 rounded-xl p-3 text-xs text-green-400">
                    📍 Location: {parseFloat(form.arrival_lat).toFixed(5)}, {parseFloat(form.arrival_lng).toFixed(5)}
                    {form.distance_from_prev_km>0 && ` · ${form.distance_from_prev_km} km from last`}
                  </div>
                : <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-xl p-3 text-xs text-yellow-400">
                    ⚠️ GPS nahi mili. Geo-verification nahi hogi.
                  </div>
              }

              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Selfie / Photo <span className="text-red-400">*</span></label>
                {form.photo_preview
                  ? <div className="relative">
                      <img src={form.photo_preview} alt="preview" className="w-full h-40 object-cover rounded-xl"/>
                      {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"/></div>}
                      <button type="button" onClick={handleTakePhoto} className="mt-2 w-full bg-slate-700 border border-slate-600 text-slate-300 py-2 rounded-xl text-sm hover:border-slate-400 transition">📸 Retake</button>
                    </div>
                  : <button type="button" onClick={handleTakePhoto}
                      className="w-full bg-slate-700 border-2 border-dashed border-slate-500 hover:border-blue-500 text-slate-300 py-8 rounded-xl text-sm flex flex-col items-center gap-2 transition">
                      <span className="text-3xl">📷</span>
                      <span>Photo Lo (Camera Khulega)</span>
                    </button>
                }
              </div>

              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Product</label>
                <select value={form.product_id} onChange={e=>setForm(p=>({...p,product_id:e.target.value}))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
                  <option value="">-- Product Select Karo --</option>
                  {products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="text" value={form.samples_given} onChange={e=>setForm(p=>({...p,samples_given:e.target.value}))}
                  placeholder="Ya manually likhein..."
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 mt-2"/>
              </div>

              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Order Mila?</label>
                <div className="grid grid-cols-2 gap-2">
                  {[{v:true,l:'✅ Haan, Mila'},{v:false,l:'❌ Nahi Mila'}].map(o=>(
                    <button key={String(o.v)} type="button" onClick={()=>setForm(p=>({...p,order_received:o.v}))}
                      className={`py-2.5 rounded-xl text-sm font-medium border transition ${form.order_received===o.v?(o.v?'bg-green-700 border-green-500 text-white':'bg-slate-600 border-slate-500 text-white'):'bg-transparent border-slate-600 text-slate-300 hover:border-slate-400'}`}>
                      {o.l}
                    </button>
                  ))}
                </div>
                {form.order_received && (
                  <input type="number" value={form.order_amount} onChange={e=>setForm(p=>({...p,order_amount:e.target.value}))}
                    placeholder="Order Amount (₹)"
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 mt-2"/>
                )}
              </div>

              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Visit Outcome *</label>
                <div className="grid grid-cols-2 gap-2">
                  {OUTCOME_OPTIONS.map(o=>(
                    <button key={o.value} type="button" onClick={()=>setForm(p=>({...p,outcome:o.value}))}
                      className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition ${form.outcome===o.value?'border-transparent text-white':'border-slate-600 text-slate-300 hover:border-slate-400 bg-transparent'}`}
                      style={form.outcome===o.value?{background:o.color+'33',borderColor:o.color,color:o.color}:{}}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.outcome==='failed' && (
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1.5">Failed Visit ka Reason <span className="text-red-400">*</span></label>
                  <textarea rows={2} value={form.failure_reason} onChange={e=>setForm(p=>({...p,failure_reason:e.target.value}))}
                    placeholder="Doctor nahi mile / Clinic band thi / Appointment nahi mila..."
                    className="w-full bg-slate-700 border border-red-600/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 resize-none"/>
                </div>
              )}

              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Doctor ka Feedback</label>
                <textarea rows={2} value={form.doctor_feedback} onChange={e=>setForm(p=>({...p,doctor_feedback:e.target.value}))}
                  placeholder="Doctor ne kya kaha..."
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"/>
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Notes</label>
                <textarea rows={2} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"/>
              </div>
            </div>
            <div className="p-4 border-t border-slate-700 flex gap-3">
              <button onClick={()=>setShowModal(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl text-sm transition">Cancel</button>
              <button onClick={handleRecordArrival} disabled={uploading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold transition">
                {uploading?'⏳ Upload...':'✅ Record Visit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getOutcomeColor(outcome) {
  const map={interested:'#22c55e',not_interested:'#ef4444',follow_up:'#f59e0b',sample_given:'#3b82f6',order_placed:'#8b5cf6',not_available:'#6b7280',failed:'#dc2626'};
  return map[outcome]||'#6b7280';
}
