import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function RoutePlannerPage() {
  const [route, setRoute]             = useState([]);
  const [summary, setSummary]         = useState(null);
  const [loading, setLoading]         = useState(false);
  const [locating, setLocating]       = useState(false);
  const [myLocation, setMyLocation]   = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [nearbyDoctors, setNearbyDoctors] = useState([]);
  const [showNearby, setShowNearby]   = useState(false);

  useEffect(() => { loadRoute(); }, [selectedDate]);

  const getMyLocation = () => new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setLocating(false); const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }; setMyLocation(loc); resolve(loc); },
      ()  => { setLocating(false); resolve(null); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });

  const loadRoute = async (loc) => {
    setLoading(true);
    try {
      const params = { date: selectedDate };
      if (loc || myLocation) {
        params.start_lat = (loc || myLocation).lat;
        params.start_lng = (loc || myLocation).lng;
      }
      const res = await api.get('/route/optimize', { params });
      setRoute(res.data.optimized_route || []);
      setSummary({
        total_distance_km: res.data.total_distance_km,
        total_stops: res.data.total_stops,
        completed: res.data.completed,
        remaining: res.data.remaining,
        message: res.data.message,
      });
    } catch (e) { toast.error(e.response?.data?.message || 'Route load failed'); }
    setLoading(false);
  };

  const handleOptimize = async () => {
    const loc = await getMyLocation();
    await loadRoute(loc);
    if (!loc) toast('Location nahi mila — default order use ho raha hai', { icon: 'ℹ️' });
    else toast.success('GPS se optimized route ban gaya!');
  };

  const loadNearby = async () => {
    const loc = myLocation || await getMyLocation();
    if (!loc) return toast.error('Location allow karo pehle');
    try {
      const res = await api.get('/route/doctors-near', { params: { lat: loc.lat, lng: loc.lng, radius_km: 5 } });
      setNearbyDoctors(res.data);
      setShowNearby(true);
    } catch { toast.error('Nearby doctors fetch failed'); }
  };

  const openMaps = (doctor) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${doctor.latitude},${doctor.longitude}`;
    window.open(url, '_blank');
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Route Planner</h1>
          <p className="text-slate-400 text-sm mt-0.5">Aaj ke visit plans ka best route</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadNearby} disabled={locating}
            className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg text-sm border border-slate-600 transition">
            📍 Nearby
          </button>
          <button onClick={handleOptimize} disabled={loading || locating}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50">
            {(loading || locating) ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '🗺️'}
            Optimize Route
          </button>
        </div>
      </div>

      {/* Date picker */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4 flex items-center gap-3">
        <label className="text-slate-400 text-sm">Date:</label>
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
          className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none" />
        {selectedDate === today && (
          <span className="text-green-400 text-xs bg-green-900/30 px-2 py-1 rounded-full">Today</span>
        )}
      </div>

      {/* Summary Cards */}
      {summary && !summary.message && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total Stops', value: summary.total_stops, color: 'text-blue-400' },
            { label: 'Completed', value: summary.completed, color: 'text-green-400' },
            { label: 'Remaining', value: summary.remaining, color: 'text-yellow-400' },
            { label: 'Total Distance', value: `${summary.total_distance_km} km`, color: 'text-purple-400' },
          ].map((s, i) => (
            <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-slate-400 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* No plans message */}
      {summary?.message && !loading && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">🗓️</div>
          <p className="text-slate-300 text-sm">{summary.message}</p>
          <p className="text-slate-500 text-xs mt-1">Admin se visit plans assign karwao is date ke liye</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Route List */}
      {!loading && route.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-white font-semibold text-sm mb-2">Optimized Visit Order</h2>
          {route.map((stop, i) => (
            <div key={stop.plan_id}
              className={`bg-slate-800 border rounded-xl p-4 transition ${stop.already_visited ? 'border-green-700/40 opacity-70' : 'border-slate-700'}`}>
              <div className="flex items-start gap-3">
                {/* Step number */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                  stop.already_visited ? 'bg-green-800 text-green-300' : 'bg-blue-900 text-blue-300 border border-blue-700'
                }`}>
                  {stop.already_visited ? '✓' : stop.order}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className={`font-medium ${stop.already_visited ? 'text-green-400 line-through' : 'text-white'}`}>
                        {stop.doctor_name}
                      </div>
                      {stop.clinic_name && (
                        <div className="text-slate-400 text-sm truncate">{stop.clinic_name}</div>
                      )}
                      <div className="text-slate-500 text-xs mt-0.5">{stop.area_name || 'Unknown area'}</div>
                    </div>

                    {/* Distance badge */}
                    {i > 0 && (
                      <div className="flex-shrink-0 text-right">
                        <div className="text-blue-400 text-xs font-medium">{stop.distance_from_prev_km} km</div>
                        <div className="text-slate-500 text-xs">from prev</div>
                      </div>
                    )}
                    {i === 0 && myLocation && (
                      <div className="flex-shrink-0 text-right">
                        <div className="text-blue-400 text-xs font-medium">{stop.distance_from_prev_km} km</div>
                        <div className="text-slate-500 text-xs">from you</div>
                      </div>
                    )}
                  </div>

                  {/* Visit purpose */}
                  {stop.purpose && (
                    <div className="text-slate-400 text-xs mt-1.5 bg-slate-700 px-2 py-1 rounded-lg inline-block">
                      📋 {stop.purpose}
                    </div>
                  )}

                  {/* Phone + Navigation */}
                  <div className="flex gap-2 mt-3">
                    {stop.phone && (
                      <a href={`tel:${stop.phone}`}
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-1 transition">
                        📞 Call
                      </a>
                    )}
                    {stop.latitude && stop.longitude && (
                      <button onClick={() => openMaps(stop)}
                        className="text-xs bg-blue-900/50 hover:bg-blue-900 text-blue-300 border border-blue-800 px-3 py-1.5 rounded-lg flex items-center gap-1 transition">
                        🗺️ Navigate
                      </button>
                    )}
                    {stop.address && (
                      <div className="text-xs text-slate-500 px-1 py-1.5 truncate max-w-xs">
                        📍 {stop.address}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Connector line */}
              {i < route.length - 1 && (
                <div className="ml-4 mt-2 flex items-center gap-2">
                  <div className="w-0.5 h-4 bg-slate-700 mx-3.5" />
                  <span className="text-slate-600 text-xs">↓ {route[i+1].distance_from_prev_km} km aage</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Nearby Doctors Modal */}
      {showNearby && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-5 py-4 flex items-center justify-between">
              <h2 className="text-white font-bold">📍 5km ke andar ke Doctors</h2>
              <button onClick={() => setShowNearby(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-4 space-y-3">
              {nearbyDoctors.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-6">5km ke andar koi doctor nahi mila</p>
              ) : nearbyDoctors.map(doc => (
                <div key={doc.id} className="bg-slate-700 border border-slate-600 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-white font-medium text-sm">{doc.name}</div>
                      {doc.clinic_name && <div className="text-slate-400 text-xs">{doc.clinic_name}</div>}
                      <div className="text-slate-500 text-xs">{doc.area_name || ''}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-blue-400 font-bold text-sm">{doc.distance_km} km</div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {doc.phone && (
                      <a href={`tel:${doc.phone}`} className="text-xs bg-slate-600 hover:bg-slate-500 text-slate-300 px-3 py-1.5 rounded-lg transition">
                        📞 Call
                      </a>
                    )}
                    {doc.latitude && (
                      <button onClick={() => openMaps(doc)}
                        className="text-xs bg-blue-900/50 hover:bg-blue-900 text-blue-300 border border-blue-800 px-3 py-1.5 rounded-lg transition">
                        🗺️ Navigate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
