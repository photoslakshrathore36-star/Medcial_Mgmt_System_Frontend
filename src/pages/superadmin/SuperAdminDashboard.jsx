import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

export default function SuperAdminDashboard() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const r = await api.get('/super/organizations');
      setOrgs(r.data);
    } catch {}
    setLoading(false);
  };

  const total     = orgs.length;
  const active    = orgs.filter(o => o.is_active).length;
  const inactive  = orgs.filter(o => !o.is_active).length;
  const expired   = orgs.filter(o => o.license_expiry && new Date(o.license_expiry) < new Date()).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Super Admin Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Total Orgs',    val: total,    color: '#3b82f6' },
          { label: 'Active',        val: active,   color: '#22c55e' },
          { label: 'Inactive',      val: inactive, color: '#6b7280' },
          { label: 'License Expired', val: expired, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold" style={{ color: s.color }}>{s.val}</div>
            <div className="text-slate-400 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold">All Organizations</h2>
        <button onClick={() => navigate('/superadmin/organizations')}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
          + New Organization
        </button>
      </div>

      {loading
        ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
        : orgs.length === 0
          ? <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center text-slate-400">Koi organization nahi hai — pehle ek banao</div>
          : <div className="space-y-3">
              {orgs.map(org => (
                <div key={org.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${org.is_active ? 'bg-purple-900/50' : 'bg-slate-700'}`}>
                      🏢
                    </div>
                    <div>
                      <div className="text-white font-medium">{org.name}</div>
                      <div className="text-slate-400 text-xs">@{org.slug} · {org.admin_count || 0} admins · {org.user_count || 0} users</div>
                      {org.license_expiry && (
                        <div className={`text-xs mt-0.5 ${new Date(org.license_expiry) < new Date() ? 'text-red-400' : 'text-green-400'}`}>
                          License: {new Date(org.license_expiry).toLocaleDateString('en-IN')}
                          {new Date(org.license_expiry) < new Date() ? ' ⚠️ Expired' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${org.is_active ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                      {org.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button onClick={() => navigate(`/superadmin/organizations?edit=${org.id}`)}
                      className="text-slate-400 hover:text-white text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition">
                      Manage
                    </button>
                  </div>
                </div>
              ))}
            </div>
      }
    </div>
  );
}
