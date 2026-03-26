import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const OUTCOME_COLORS = {
  interested:'#22c55e', not_interested:'#ef4444', follow_up:'#f59e0b',
  sample_given:'#3b82f6', order_placed:'#8b5cf6', not_available:'#6b7280', failed:'#dc2626'
};
const OUTCOME_LABELS = {
  interested:'Interested', not_interested:'Not Interested', follow_up:'Follow Up',
  sample_given:'Sample Diya', order_placed:'Order Mila', not_available:'Nahi Mile', failed:'Failed'
};

export default function DoctorHistoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  useEffect(() => { load(); }, [id]);

  const load = async (from=dateFrom, to=dateTo) => {
    setLoading(true);
    try {
      const params = {};
      if (from) params.date_from = from;
      if (to)   params.date_to   = to;
      const r = await api.get(`/doctors/${id}/visits`, { params });
      setData(r.data);
    } catch { toast.error('Load failed'); }
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>;
  if (!data) return <div className="text-slate-400 text-center py-20">Data nahi mila</div>;

  const { doctor, visits, stats } = data;

  return (
    <div>
      <button onClick={()=>navigate(-1)} className="text-slate-400 hover:text-white text-sm mb-4 flex items-center gap-1 transition">
        ← Wapas
      </button>

      {/* Doctor Header */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-900/50 flex items-center justify-center text-xl flex-shrink-0">
            👨‍⚕️
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">{doctor.name}</h1>
            {doctor.specialization && <div className="text-blue-400 text-sm">{doctor.specialization}</div>}
            {doctor.clinic_name && <div className="text-slate-300 text-sm">{doctor.clinic_name}</div>}
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
              {doctor.area_name && <span>📍 {doctor.area_name}</span>}
              {doctor.phone && <span>📞 {doctor.phone}</span>}
              {doctor.email && <span>✉️ {doctor.email}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          {label:'Total Visits',   val:stats.total_visits||0,    color:'#3b82f6'},
          {label:'Orders Mile',    val:stats.orders_received||0, color:'#8b5cf6'},
          {label:'Failed Visits',  val:stats.failed_visits||0,   color:'#ef4444'},
          {label:'Total Time (min)',val:stats.total_time_min||0, color:'#22c55e'},
        ].map(s=>(
          <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold" style={{color:s.color}}>{s.val}</div>
            <div className="text-slate-400 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Date Filter */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-slate-400 text-xs block mb-1">From</label>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
            className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none"/>
        </div>
        <div>
          <label className="text-slate-400 text-xs block mb-1">To</label>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
            className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none"/>
        </div>
        <button onClick={()=>load(dateFrom,dateTo)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          Filter
        </button>
        <button onClick={()=>{setDateFrom('');setDateTo('');load('','');}}
          className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded-lg text-sm transition">
          Clear
        </button>
      </div>

      {/* Visit History */}
      <h2 className="text-white font-semibold mb-3">Visit History ({visits.length})</h2>
      {visits.length===0
        ? <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center text-slate-400">Koi visits nahi</div>
        : <div className="space-y-3">
            {visits.map(v=>(
              <div key={v.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium">{v.worker_name}</span>
                      <span className="text-slate-400 text-xs">Staff #{v.staff_id||v.worker_id}</span>
                      {v.visit_type==='chemist' && <span className="text-xs bg-orange-900/40 text-orange-300 px-1.5 py-0.5 rounded">Chemist</span>}
                    </div>
                    <div className="text-slate-400 text-xs mt-1">
                      {new Date(v.arrival_time).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                      {v.duration_minutes>0 && ` · ${v.duration_minutes} min`}
                    </div>
                    {(v.product_name||v.samples_given) && <div className="text-blue-400 text-xs mt-1">🧪 {v.product_name||v.samples_given}</div>}
                    {v.order_received && <div className="text-green-400 text-xs mt-0.5">✅ Order Mila {v.order_amount>0?`— ₹${v.order_amount}`:''}</div>}
                    {v.failure_reason && <div className="text-red-400 text-xs mt-0.5">⚠️ {v.failure_reason}</div>}
                    {v.doctor_feedback && <div className="text-slate-300 text-xs italic mt-1">"{v.doctor_feedback}"</div>}
                    <div className="flex items-center gap-3 mt-2">
                      {v.arrival_lat && (
                        <span className={`text-xs ${v.geo_verified?'text-green-400':'text-red-400'}`}>
                          {v.geo_verified?'✅ GPS OK':`⚠️ ${v.distance_from_doctor_m}m off`}
                        </span>
                      )}
                      {v.photo_url && (
                        <a href={`${getPhotoUrl(v.photo_url)}`}
                          target="_blank" rel="noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300">📸 Photo</a>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className="text-xs font-semibold" style={{color:OUTCOME_COLORS[v.outcome]||'#6b7280'}}>
                      {OUTCOME_LABELS[v.outcome]||v.outcome}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  );
}

function getPhotoUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url; // Cloudinary ya koi bhi absolute URL
  return (process.env.REACT_APP_API_URL || 'http://localhost:5000') + url; // local dev
}

