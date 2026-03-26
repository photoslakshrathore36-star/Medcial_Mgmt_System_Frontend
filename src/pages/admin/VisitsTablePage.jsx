import React, { useState, useEffect } from 'react';
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

export default function VisitsTablePage() {
  const [visits, setVisits]   = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now()-30*24*3600000).toISOString().split('T')[0];

  const [filters, setFilters] = useState({
    date_from: today, date_to: today,
    worker_id: '', visit_type: '', outcome: '',
  });

  useEffect(() => {
    api.get('/workers', { params: { role:'field_worker' } }).then(r=>setWorkers(r.data)).catch(()=>{});
    loadVisits();
  }, []);

  const loadVisits = async (f=filters) => {
    setLoading(true);
    try {
      const params = {};
      if (f.date_from)  params.date_from  = f.date_from;
      if (f.date_to)    params.date_to    = f.date_to;
      if (f.worker_id)  params.worker_id  = f.worker_id;
      if (f.visit_type) params.visit_type = f.visit_type;
      if (f.outcome)    params.outcome    = f.outcome;
      const r = await api.get('/field/visits', { params });
      setVisits(r.data);
    } catch { toast.error('Load failed'); }
    setLoading(false);
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.date_from)  params.append('date_from', filters.date_from);
      if (filters.date_to)    params.append('date_to',   filters.date_to);
      if (filters.worker_id)  params.append('worker_id', filters.worker_id);
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL||'http://localhost:5000'}/api/export/visits?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `visits_${filters.date_from}_to_${filters.date_to}.csv`;
      a.click(); URL.revokeObjectURL(url);
      toast.success('Export ho gaya ✅');
    } catch { toast.error('Export failed'); }
  };

  const setFilter = (k,v) => setFilters(p=>({...p,[k]:v}));

  const orders    = visits.filter(v=>v.order_received).length;
  const failed    = visits.filter(v=>v.outcome==='failed').length;
  const geoFailed = visits.filter(v=>!v.geo_verified && v.distance_from_doctor_m>0).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Visits Table</h1>
        <button onClick={handleExport}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition">
          📥 Excel Export
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          {label:'Total Visits', val:visits.length, color:'#3b82f6'},
          {label:'Orders Mile',  val:orders,         color:'#8b5cf6'},
          {label:'Failed',       val:failed,         color:'#ef4444'},
          {label:'GPS Alert',    val:geoFailed,      color:'#f59e0b'},
        ].map(s=>(
          <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold" style={{color:s.color}}>{s.val}</div>
            <div className="text-slate-400 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-5">
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="text-slate-400 text-xs block mb-1">From</label>
            <input type="date" value={filters.date_from} onChange={e=>setFilter('date_from',e.target.value)}
              className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none"/>
          </div>
          <div>
            <label className="text-slate-400 text-xs block mb-1">To</label>
            <input type="date" value={filters.date_to} onChange={e=>setFilter('date_to',e.target.value)}
              className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none"/>
          </div>
          <div>
            <label className="text-slate-400 text-xs block mb-1">Staff</label>
            <select value={filters.worker_id} onChange={e=>setFilter('worker_id',e.target.value)}
              className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">All</option>
              {workers.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-xs block mb-1">Type</label>
            <select value={filters.visit_type} onChange={e=>setFilter('visit_type',e.target.value)}
              className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">All</option>
              <option value="doctor">Doctor</option>
              <option value="chemist">Chemist</option>
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-xs block mb-1">Outcome</label>
            <select value={filters.outcome} onChange={e=>setFilter('outcome',e.target.value)}
              className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">All</option>
              {Object.entries(OUTCOME_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={()=>loadVisits()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading
        ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>
        : <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    {['Staff ID','Staff Name','Doctor/Chemist','Area','Type','Product','Order?','Status','Location','Time','Photo'].map(h=>(
                      <th key={h} className="text-left text-slate-400 font-medium px-3 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visits.length===0
                    ? <tr><td colSpan={11} className="text-slate-400 text-center py-8">Koi visits nahi</td></tr>
                    : visits.map(v=>(
                        <tr key={v.id} onClick={()=>setSelectedVisit(v)}
                          className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition">
                          <td className="px-3 py-2 text-slate-400 font-mono text-xs">#{v.staff_id||v.worker_id}</td>
                          <td className="px-3 py-2 text-white whitespace-nowrap">{v.worker_name}</td>
                          <td className="px-3 py-2 text-white whitespace-nowrap">{v.doctor_name}</td>
                          <td className="px-3 py-2 text-slate-300 whitespace-nowrap">{v.area_name||'—'}</td>
                          <td className="px-3 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${v.visit_type==='chemist'?'bg-orange-900/40 text-orange-300':'bg-blue-900/40 text-blue-300'}`}>
                              {v.visit_type==='chemist'?'Chemist':'Doctor'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-300 whitespace-nowrap">{v.product_name||v.samples_given||'—'}</td>
                          <td className="px-3 py-2 text-center">
                            {v.order_received
                              ? <span className="text-green-400 font-bold">✅</span>
                              : <span className="text-slate-500">—</span>}
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-xs font-semibold" style={{color:OUTCOME_COLORS[v.outcome]||'#6b7280'}}>
                              {OUTCOME_LABELS[v.outcome]||v.outcome}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-400 text-xs whitespace-nowrap">
                            {v.arrival_lat?`${parseFloat(v.arrival_lat).toFixed(4)}, ${parseFloat(v.arrival_lng).toFixed(4)}`:'—'}
                            {!v.geo_verified&&v.distance_from_doctor_m>0&&<span className="text-red-400 ml-1">⚠️</span>}
                          </td>
                          <td className="px-3 py-2 text-slate-400 text-xs whitespace-nowrap">
                            {new Date(v.arrival_time).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {v.photo_url
                              ? <a href={`${process.env.REACT_APP_API_URL||'http://localhost:5000'}${v.photo_url}`}
                                  target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}
                                  className="text-blue-400 hover:text-blue-300 text-xs">📸</a>
                              : <span className="text-slate-600 text-xs">—</span>}
                          </td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
          </div>
      }

      {/* Detail Modal */}
      {selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-white font-semibold">Visit Detail</h2>
              <button onClick={()=>setSelectedVisit(null)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              {[
                ['Staff', `#${selectedVisit.staff_id||selectedVisit.worker_id} — ${selectedVisit.worker_name}`],
                ['Doctor/Chemist', selectedVisit.doctor_name],
                ['Clinic', selectedVisit.clinic_name||'—'],
                ['Area', selectedVisit.area_name||'—'],
                ['Visit Type', selectedVisit.visit_type==='chemist'?'💊 Chemist':'👨‍⚕️ Doctor'],
                ['Product', selectedVisit.product_name||selectedVisit.samples_given||'—'],
                ['Order Received', selectedVisit.order_received?`✅ Yes${selectedVisit.order_amount>0?' — ₹'+selectedVisit.order_amount:''}`:'❌ No'],
                ['Outcome', OUTCOME_LABELS[selectedVisit.outcome]||selectedVisit.outcome],
                selectedVisit.failure_reason && ['Failure Reason', selectedVisit.failure_reason],
                ['Arrival Time', new Date(selectedVisit.arrival_time).toLocaleString('en-IN')],
                selectedVisit.departure_time && ['Departure', new Date(selectedVisit.departure_time).toLocaleString('en-IN')],
                selectedVisit.duration_minutes && ['Duration', `${selectedVisit.duration_minutes} min`],
                ['GPS', selectedVisit.arrival_lat?`${parseFloat(selectedVisit.arrival_lat).toFixed(5)}, ${parseFloat(selectedVisit.arrival_lng).toFixed(5)}`:'Not captured'],
                ['Geo Verified', selectedVisit.geo_verified?'✅ Yes':`❌ No (${selectedVisit.distance_from_doctor_m}m off)`],
                selectedVisit.doctor_feedback && ['Doctor Feedback', selectedVisit.doctor_feedback],
                selectedVisit.notes && ['Notes', selectedVisit.notes],
              ].filter(Boolean).map(([k,v])=>(
                <div key={k} className="flex justify-between gap-3">
                  <span className="text-slate-400 flex-shrink-0">{k}</span>
                  <span className="text-white text-right">{v}</span>
                </div>
              ))}
              {selectedVisit.photo_url && (
                <div>
                  <div className="text-slate-400 mb-2">Photo</div>
                  <img src={`${process.env.REACT_APP_API_URL||'http://localhost:5000'}${selectedVisit.photo_url}`}
                    alt="visit" className="w-full rounded-xl object-cover max-h-48"/>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
