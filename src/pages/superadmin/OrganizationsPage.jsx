import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const ALL_MENUS = [
  { key: 'dashboard',      label: 'Dashboard',        icon: '📊' },
  { key: 'orders',         label: 'Production Orders', icon: '📦' },
  { key: 'tasks',          label: 'Tasks',             icon: '✅' },
  { key: 'departments',    label: 'Departments',       icon: '🏭' },
  { key: 'workers',        label: 'Workers',           icon: '👷' },
  { key: 'doctors',        label: 'Doctors',           icon: '👨‍⚕️' },
  { key: 'areas',          label: 'Areas',             icon: '🗺️' },
  { key: 'visit-plans',    label: 'Visit Plans',       icon: '📋' },
  { key: 'field-tracking', label: 'Live Tracking',     icon: '📍' },
  { key: 'visits',         label: 'Visits Table',      icon: '🗒️' },
  { key: 'reports',        label: 'Reports & Alerts',  icon: '📈' },
  { key: 'settings',       label: 'Settings',          icon: '⚙️' },
];

const emptyForm = {
  name: '', slug: '', owner_name: '', email: '', phone: '', address: '',
  license_expiry: '', max_users: 50,
  admin_name: '', admin_username: '', admin_password: '',
  enabled_menus: ALL_MENUS.map(m => m.key),
};

export default function OrganizationsPage() {
  const [searchParams] = useSearchParams();
  const [orgs, setOrgs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editOrg, setEditOrg]     = useState(null);  // null = create, obj = edit
  const [form, setForm]           = useState(emptyForm);
  const [permissions, setPermissions] = useState({});
  const [showPermsModal, setShowPermsModal] = useState(false);
  const [activePermsOrg, setActivePermsOrg] = useState(null);
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    loadOrgs();
    const editId = searchParams.get('edit');
    if (editId) openEdit(editId);
  }, []);

  const loadOrgs = async () => {
    setLoading(true);
    try { const r = await api.get('/super/organizations'); setOrgs(r.data); }
    catch { toast.error('Load failed'); }
    setLoading(false);
  };

  const openCreate = () => { setEditOrg(null); setForm(emptyForm); setShowModal(true); };

  const openEdit = async (id) => {
    const org = orgs.find(o => String(o.id) === String(id));
    if (!org) {
      try {
        const r = await api.get('/super/organizations');
        const found = r.data.find(o => String(o.id) === String(id));
        if (found) { setEditOrg(found); setForm({ ...emptyForm, ...found, admin_name:'', admin_username:'', admin_password:'' }); setShowModal(true); }
      } catch {}
      return;
    }
    setEditOrg(org);
    setForm({ ...emptyForm, ...org, admin_name:'', admin_username:'', admin_password:'' });
    setShowModal(true);
  };

  const openPermissions = async (org) => {
    setActivePermsOrg(org);
    try {
      const r = await api.get(`/super/organizations/${org.id}/permissions`);
      const map = {};
      r.data.forEach(p => { map[p.key] = !!p.is_enabled; });
      setPermissions(map);
    } catch { toast.error('Load failed'); }
    setShowPermsModal(true);
  };

  const handleToggleLicense = async (org) => {
    try {
      const r = await api.patch(`/super/organizations/${org.id}/toggle`);
      toast.success(r.data.message);
      loadOrgs();
    } catch { toast.error('Failed'); }
  };

  const handleDeleteOrg = async (org) => {
    if (!window.confirm(`"${org.name}" and ALL its data will be permanently deleted!\n\nAre you sure?`)) return;
    if (!window.confirm(`Please confirm again — "${org.name}" delete?`)) return;
    try {
      await api.delete(`/super/organizations/${org.id}`);
      toast.success('Organization deleted successfully ✅');
      loadOrgs();
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  const handleSavePermissions = async () => {
    setSaving(true);
    try {
      await api.put(`/super/organizations/${activePermsOrg.id}/permissions`, { permissions });
      toast.success('Permissions saved ✅');
      setShowPermsModal(false);
    } catch { toast.error('Failed'); }
    setSaving(false);
  };

  const handleSaveOrg = async () => {
    if (!form.name || !form.slug) return toast.error('Name and Slug are required');
    if (!editOrg && (!form.admin_name || !form.admin_username || !form.admin_password)) {
      return toast.error('Admin details are required for a new organization');
    }
    setSaving(true);
    try {
      if (editOrg) {
        await api.put(`/super/organizations/${editOrg.id}`, form);
        toast.success('Organization updated ✅');
      } else {
        await api.post('/super/organizations', form);
        toast.success('Organization created ✅');
      }
      setShowModal(false);
      loadOrgs();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    setSaving(false);
  };

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleMenu = (key) => {
    setForm(p => ({
      ...p,
      enabled_menus: p.enabled_menus.includes(key)
        ? p.enabled_menus.filter(m => m !== key)
        : [...p.enabled_menus, key]
    }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Organizations</h1>
        <button onClick={openCreate}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
          + New Organization
        </button>
      </div>

      {loading
        ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
        : orgs.length === 0
          ? <div className="bg-slate-800 border border-slate-700 rounded-xl p-10 text-center text-slate-400">No organizations found</div>
          : <div className="space-y-3">
              {orgs.map(org => (
                <div key={org.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-semibold text-lg">{org.name}</span>
                        <span className="text-slate-500 text-sm">@{org.slug}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${org.is_active ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                          {org.is_active ? '✅ Active' : '❌ Inactive'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-400">
                        {org.owner_name && <span>👤 {org.owner_name}</span>}
                        {org.email && <span>✉️ {org.email}</span>}
                        {org.phone && <span>📞 {org.phone}</span>}
                        <span>👥 {org.user_count || 0} users</span>
                        <span>Max: {org.max_users}</span>
                      </div>
                      {org.license_expiry && (
                        <div className={`text-xs mt-1 ${new Date(org.license_expiry) < new Date() ? 'text-red-400' : 'text-green-400'}`}>
                          🗓 License: {new Date(org.license_expiry).toLocaleDateString('en-IN')}
                          {new Date(org.license_expiry) < new Date() ? ' — EXPIRED' : ''}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                      <button onClick={() => openPermissions(org)}
                        className="bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 text-xs px-3 py-1.5 rounded-lg transition">
                        🔐 Menus
                      </button>
                      <button onClick={() => openEdit(org.id)}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-3 py-1.5 rounded-lg transition">
                        ✏️ Edit
                      </button>
                      <button onClick={() => handleToggleLicense(org)}
                        className={`text-xs px-3 py-1.5 rounded-lg transition ${org.is_active ? 'bg-red-900/40 hover:bg-red-800/60 text-red-400' : 'bg-green-900/40 hover:bg-green-800/60 text-green-400'}`}>
                        {org.is_active ? '🔒 Deactivate' : '🔓 Activate'}
                      </button>
                      <button onClick={() => handleDeleteOrg(org)}
                        className="text-xs px-3 py-1.5 rounded-lg transition bg-red-900/20 hover:bg-red-900/60 text-red-500 hover:text-red-300">
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
      }

      {/* Create/Edit Org Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 p-0 md:p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-t-2xl md:rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-white font-semibold">{editOrg ? 'Edit Organization' : 'New Organization'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-4 space-y-4">

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-slate-300 text-xs font-medium block mb-1">Organization Name *</label>
                  <input value={form.name} onChange={e => setF('name', e.target.value)} placeholder="e.g. ABC Pharma"
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"/>
                </div>
                <div>
                  <label className="text-slate-300 text-xs font-medium block mb-1">Slug (URL key) *</label>
                  <input value={form.slug} onChange={e => setF('slug', e.target.value.toLowerCase().replace(/\s/g,'-'))} placeholder="abc-pharma"
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    disabled={!!editOrg}/>
                </div>
                <div>
                  <label className="text-slate-300 text-xs font-medium block mb-1">Max Users</label>
                  <input type="number" value={form.max_users} onChange={e => setF('max_users', e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"/>
                </div>
                <div>
                  <label className="text-slate-300 text-xs font-medium block mb-1">Owner Name</label>
                  <input value={form.owner_name} onChange={e => setF('owner_name', e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"/>
                </div>
                <div>
                  <label className="text-slate-300 text-xs font-medium block mb-1">Phone</label>
                  <input value={form.phone} onChange={e => setF('phone', e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"/>
                </div>
                <div className="col-span-2">
                  <label className="text-slate-300 text-xs font-medium block mb-1">Email</label>
                  <input value={form.email} onChange={e => setF('email', e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"/>
                </div>
                <div>
                  <label className="text-slate-300 text-xs font-medium block mb-1">License Expiry</label>
                  <input type="date" value={form.license_expiry || ''} onChange={e => setF('license_expiry', e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"/>
                </div>
              </div>

              {/* Admin credentials — only for new org */}
              {!editOrg && (
                <>
                  <div className="border-t border-slate-700 pt-4">
                    <div className="text-slate-300 text-sm font-medium mb-3">Admin Account (is org ke liye)</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-slate-300 text-xs font-medium block mb-1">Admin Name *</label>
                        <input value={form.admin_name} onChange={e => setF('admin_name', e.target.value)} placeholder="Admin ka naam"
                          className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"/>
                      </div>
                      <div>
                        <label className="text-slate-300 text-xs font-medium block mb-1">Username *</label>
                        <input value={form.admin_username} onChange={e => setF('admin_username', e.target.value)} placeholder="login username"
                          className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"/>
                      </div>
                      <div>
                        <label className="text-slate-300 text-xs font-medium block mb-1">Password *</label>
                        <input type="password" value={form.admin_password} onChange={e => setF('admin_password', e.target.value)} placeholder="••••••••"
                          className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"/>
                      </div>
                    </div>
                  </div>

                  {/* Menu permissions for new org */}
                  <div className="border-t border-slate-700 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-slate-300 text-sm font-medium">Enabled Menus</div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setForm(p=>({...p, enabled_menus: ALL_MENUS.map(m=>m.key)}))}
                          className="text-xs text-blue-400 hover:text-blue-300">All</button>
                        <button type="button" onClick={() => setForm(p=>({...p, enabled_menus:[]}))}
                          className="text-xs text-slate-400 hover:text-slate-300">None</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {ALL_MENUS.map(m => (
                        <button key={m.key} type="button" onClick={() => toggleMenu(m.key)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition text-left ${
                            form.enabled_menus.includes(m.key)
                              ? 'bg-purple-900/40 border-purple-600/50 text-purple-300'
                              : 'bg-slate-700 border-slate-600 text-slate-400'
                          }`}>
                          <span>{m.icon}</span>
                          <span className="text-xs">{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="p-4 border-t border-slate-700 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl text-sm transition">Cancel</button>
              <button onClick={handleSaveOrg} disabled={saving}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold transition">
                {saving ? '⏳ Saving...' : editOrg ? '✅ Update' : '✅ Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermsModal && activePermsOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-white font-semibold">Menu Permissions — {activePermsOrg.name}</h2>
              <button onClick={() => setShowPermsModal(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-4">
              <div className="flex gap-2 mb-4">
                <button onClick={() => { const m={}; ALL_MENUS.forEach(x=>m[x.key]=true); setPermissions(m); }}
                  className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg transition">All On</button>
                <button onClick={() => { const m={}; ALL_MENUS.forEach(x=>m[x.key]=false); setPermissions(m); }}
                  className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg transition">All Off</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ALL_MENUS.map(m => (
                  <button key={m.key} type="button"
                    onClick={() => setPermissions(p => ({ ...p, [m.key]: !p[m.key] }))}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition text-left ${
                      permissions[m.key]
                        ? 'bg-green-900/40 border-green-600/50 text-green-300'
                        : 'bg-slate-700 border-slate-600 text-slate-500'
                    }`}>
                    <span className={`w-4 h-4 rounded flex items-center justify-center text-xs flex-shrink-0 ${permissions[m.key] ? 'bg-green-600' : 'bg-slate-600'}`}>
                      {permissions[m.key] ? '✓' : ''}
                    </span>
                    <span>{m.icon}</span>
                    <span className="text-xs">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-slate-700 flex gap-3">
              <button onClick={() => setShowPermsModal(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl text-sm transition">Cancel</button>
              <button onClick={handleSavePermissions} disabled={saving}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold transition">
                {saving ? '⏳...' : '✅ Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
