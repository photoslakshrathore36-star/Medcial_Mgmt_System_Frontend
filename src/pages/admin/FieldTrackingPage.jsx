import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

// Leaflet map ko dynamically load karte hain
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}
function loadCSS(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = href;
  document.head.appendChild(l);
}

const OUTCOME_COLORS = {
  interested: '#22c55e', not_interested: '#ef4444', follow_up: '#f59e0b',
  sample_given: '#3b82f6', order_placed: '#8b5cf6', not_available: '#6b7280',
};

export default function FieldTrackingPage() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [filterWorker, setFilterWorker] = useState('');
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [tab, setTab] = useState('sessions'); // sessions | live
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);

  useEffect(() => {
    loadCSS(LEAFLET_CSS);
    loadScript(LEAFLET_JS).then(() => setMapReady(true));
    loadWorkers();
    loadSessions();
  }, []);

  useEffect(() => {
    if (mapReady && mapRef.current && !leafletMapRef.current) {
      initMap();
    }
  }, [mapReady, sessionDetail]);

  const loadWorkers = async () => {
    try {
      const r = await api.get('/workers', { params: { role: 'field_worker' } });
      setWorkers(r.data);
    } catch {}
  };

  const loadSessions = async () => {
    setLoading(true);
    try {
      const r = await api.get('/field/sessions', { params: { worker_id: filterWorker, date_from: dateFrom, date_to: dateTo } });
      setSessions(r.data);
    } catch { toast.error('Load failed'); }
    setLoading(false);
  };

  const loadSessionDetail = async (session) => {
    setSelectedSession(session);
    try {
      const r = await api.get(`/field/sessions/${session.id}`);
      setSessionDetail(r.data);
      setTimeout(() => plotOnMap(r.data), 300);
    } catch { toast.error('Detail load failed'); }
  };

  const initMap = () => {
    if (!window.L || !mapRef.current) return;
    const L = window.L;
    leafletMapRef.current = L.map(mapRef.current, { zoomControl: true }).setView([26.9124, 75.7873], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(leafletMapRef.current);
  };

  const plotOnMap = useCallback((detail) => {
    if (!window.L || !leafletMapRef.current) return;
    const L = window.L;
    const map = leafletMapRef.current;

    // clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null; }

    const points = [];

    // Route path from pings
    if (detail.pings?.length > 0) {
      const latlngs = detail.pings.map(p => [parseFloat(p.latitude), parseFloat(p.longitude)]);
      polylineRef.current = L.polyline(latlngs, { color: '#3b82f6', weight: 3, opacity: 0.7 }).addTo(map);
      points.push(...latlngs);
    }

    // Start marker
    if (detail.start_location_lat) {
      const startIcon = L.divIcon({
        html: `<div style="background:#22c55e;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
        className: '', iconAnchor: [7, 7]
      });
      const m = L.marker([parseFloat(detail.start_location_lat), parseFloat(detail.start_location_lng)], { icon: startIcon })
        .addTo(map).bindPopup(`<b>Session Start</b><br>${new Date(detail.start_time).toLocaleTimeString('en-IN')}`);
      markersRef.current.push(m);
    }

    // Visit markers
    detail.visits?.forEach((v, i) => {
      if (!v.arrival_lat) return;
      const color = OUTCOME_COLORS[v.outcome] || '#3b82f6';
      const icon = L.divIcon({
        html: `<div style="background:${color};color:white;width:26px;height:26px;border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:11px">${i + 1}</div>`,
        className: '', iconAnchor: [13, 13]
      });
      const lat = parseFloat(v.arrival_lat);
      const lng = parseFloat(v.arrival_lng);
      const popup = `
        <div style="min-width:160px">
          <b>${v.doctor_name}</b><br>
          <span style="color:#94a3b8;font-size:12px">${v.clinic_name || ''}</span><br>
          <span style="color:#94a3b8;font-size:12px">Area: ${v.area_name || '-'}</span><br>
          <span style="color:${color};font-size:12px;font-weight:600">${v.outcome?.replace('_', ' ').toUpperCase()}</span><br>
          ${v.duration_minutes ? `<span style="font-size:12px">Time: ${v.duration_minutes} min</span><br>` : ''}
          ${v.distance_from_prev_km ? `<span style="font-size:12px">Distance: ${v.distance_from_prev_km} km</span>` : ''}
        </div>`;
      const m = L.marker([lat, lng], { icon }).addTo(map).bindPopup(popup);
      markersRef.current.push(m);
      points.push([lat, lng]);
    });

    // End marker
    if (detail.end_location_lat) {
      const endIcon = L.divIcon({
        html: `<div style="background:#ef4444;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
        className: '', iconAnchor: [7, 7]
      });
      const m = L.marker([parseFloat(detail.end_location_lat), parseFloat(detail.end_location_lng)], { icon: endIcon })
        .addTo(map).bindPopup('<b>Session End</b>');
      markersRef.current.push(m);
    }

    if (points.length > 0) map.fitBounds(points, { padding: [30, 30] });
  }, []);

  const fmtDuration = (min) => {
    if (!min) return '—';
    const h = Math.floor(min / 60), m = min % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Field Tracking</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {['sessions', 'live'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition capitalize ${tab === t ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-500'}`}>
            {t === 'live' ? '🔴 Live Locations' : '📋 Session History'}
          </button>
        ))}
      </div>

      {tab === 'sessions' && (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left - Session List */}
          <div className="lg:w-80 flex-shrink-0">
            {/* Filters */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-3 space-y-3">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Worker</label>
                <select value={filterWorker} onChange={e => setFilterWorker(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                  <option value="">All Field Workers</option>
                  {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">From</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">To</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <button onClick={loadSessions} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition">
                Search
              </button>
            </div>

            {/* Sessions */}
            <div className="space-y-2 max-h-[calc(100vh-350px)] overflow-y-auto">
              {loading && <div className="text-center py-8"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>}
              {!loading && sessions.length === 0 && <div className="text-slate-400 text-sm text-center py-8">Koi session nahi mila</div>}
              {sessions.map(s => (
                <div key={s.id}
                  onClick={() => loadSessionDetail(s)}
                  className={`bg-slate-800 border rounded-xl p-3 cursor-pointer transition ${selectedSession?.id === s.id ? 'border-blue-500' : 'border-slate-700 hover:border-slate-500'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-medium">{s.worker_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                      {s.status === 'active' ? '🟢 Live' : 'Done'}
                    </span>
                  </div>
                  <div className="text-slate-400 text-xs">
                    {new Date(s.start_time).toLocaleDateString('en-IN')} {new Date(s.start_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    {s.end_time && ` → ${new Date(s.end_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-slate-500">
                    <span>🤝 {s.visit_count} visits</span>
                    {s.duration_minutes > 0 && <span>⏱ {fmtDuration(s.duration_minutes)}</span>}
                    {s.total_distance_km > 0 && <span>📍 {s.total_distance_km} km</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Map + Detail */}
          <div className="flex-1 min-w-0">
            {/* Map */}
            <div ref={mapRef} className="w-full rounded-xl overflow-hidden border border-slate-700" style={{ height: '400px', background: '#1e293b' }}>
              {!mapReady && <div className="flex items-center justify-center h-full text-slate-400 text-sm">Map load ho raha hai...</div>}
            </div>

            {/* Session Detail */}
            {sessionDetail && (
              <div className="mt-4 bg-slate-800 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-white font-semibold">{sessionDetail.worker_name}</h3>
                    <p className="text-slate-400 text-sm">
                      {new Date(sessionDetail.start_time).toLocaleString('en-IN')}
                      {sessionDetail.end_time && ` → ${new Date(sessionDetail.end_time).toLocaleString('en-IN')}`}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-white">{fmtDuration(sessionDetail.duration_minutes)}</div>
                    {sessionDetail.total_distance_km > 0 && <div className="text-slate-400">{sessionDetail.total_distance_km} km</div>}
                  </div>
                </div>

                {/* Visits Timeline */}
                <h4 className="text-slate-300 text-sm font-semibold mb-3">Visit Timeline</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {sessionDetail.visits?.length === 0 && <p className="text-slate-500 text-sm">Koi visit nahi</p>}
                  {sessionDetail.visits?.map((v, i) => (
                    <div key={v.id} className="flex gap-3 items-start">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: OUTCOME_COLORS[v.outcome] || '#3b82f6' }}>{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white text-sm font-medium">{v.doctor_name}</span>
                          <span className="text-slate-400 text-xs">{v.clinic_name}</span>
                        </div>
                        <div className="flex gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                          <span>{new Date(v.arrival_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                          {v.duration_minutes > 0 && <span>⏱ {v.duration_minutes} min</span>}
                          {v.distance_from_prev_km > 0 && <span>📍 {v.distance_from_prev_km} km</span>}
                          {v.travel_time_minutes > 0 && <span>🚗 {v.travel_time_minutes} min travel</span>}
                          <span style={{ color: OUTCOME_COLORS[v.outcome] }} className="font-medium">{v.outcome?.replace('_', ' ')}</span>
                        </div>
                        {v.samples_given && <div className="text-xs text-slate-400 mt-0.5">Samples: {v.samples_given}</div>}
                        {v.doctor_feedback && <div className="text-xs text-slate-400 italic">"{v.doctor_feedback}"</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'live' && (
        <LiveTrackingTab workers={workers} mapReady={mapReady} />
      )}
    </div>
  );
}

function LiveTrackingTab({ workers, mapReady }) {
  const [liveData, setLiveData] = useState([]);
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    loadCSS(LEAFLET_CSS);
    loadScript(LEAFLET_JS).then(() => {
      if (mapRef.current && !leafletMapRef.current) {
        const L = window.L;
        leafletMapRef.current = L.map(mapRef.current).setView([26.9124, 75.7873], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(leafletMapRef.current);
      }
    });
    loadLive();
    const interval = setInterval(loadLive, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadLive = async () => {
    try {
      const r = await api.get('/field/location/live');
      setLiveData(r.data);
      updateMapMarkers(r.data);
    } catch {}
  };

  const updateMapMarkers = (data) => {
    if (!window.L || !leafletMapRef.current) return;
    const L = window.L;
    const map = leafletMapRef.current;
    data.forEach(w => {
      const lat = parseFloat(w.latitude), lng = parseFloat(w.longitude);
      if (isNaN(lat) || isNaN(lng)) return;
      const icon = L.divIcon({
        html: `<div style="background:#22c55e;color:white;padding:4px 8px;border-radius:20px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.4);border:2px solid white">🟢 ${w.worker_name}</div>`,
        className: '', iconAnchor: [40, 15]
      });
      if (markersRef.current[w.worker_id]) {
        markersRef.current[w.worker_id].setLatLng([lat, lng]);
      } else {
        markersRef.current[w.worker_id] = L.marker([lat, lng], { icon }).addTo(map)
          .bindPopup(`<b>${w.worker_name}</b><br>Last update: ${new Date(w.recorded_at).toLocaleTimeString('en-IN')}`);
      }
    });
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-green-400 text-sm font-medium">{liveData.length} worker(s) currently in field</span>
        <span className="text-slate-500 text-xs">(auto-refresh: 30s)</span>
      </div>
      <div ref={mapRef} className="w-full rounded-xl overflow-hidden border border-slate-700 mb-4" style={{ height: '500px', background: '#1e293b' }}>
        {!mapReady && <div className="flex items-center justify-center h-full text-slate-400">Map load ho raha hai...</div>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {liveData.length === 0 && <p className="text-slate-400 text-sm col-span-3 text-center py-4">Abhi koi field worker active nahi hai</p>}
        {liveData.map(w => (
          <div key={w.worker_id} className="bg-slate-800 border border-slate-700 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-white font-medium text-sm">{w.worker_name}</span>
            </div>
            <div className="text-slate-400 text-xs">Last ping: {new Date(w.recorded_at).toLocaleTimeString('en-IN')}</div>
            <div className="text-slate-500 text-xs">{parseFloat(w.latitude).toFixed(5)}, {parseFloat(w.longitude).toFixed(5)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
