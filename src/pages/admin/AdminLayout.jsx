import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const ALL_NAV = [
  { path: '/admin',               label: 'Dashboard',        icon: '📊', end: true,  key: 'dashboard' },
  { path: '/admin/orders',        label: 'Production Orders', icon: '📦',             key: 'orders' },
  { path: '/admin/production-tasks', label: 'Tasks',         icon: '✅',             key: 'tasks' },
  { path: '/admin/departments',   label: 'Departments',      icon: '🏭',             key: 'departments' },
  { path: '/admin/workers',       label: 'Workers',          icon: '👷',             key: 'workers' },
  { divider: true, label: 'Field Operations' },
  { path: '/admin/doctors',       label: 'Doctors',          icon: '👨‍⚕️',            key: 'doctors' },
  { path: '/admin/areas',         label: 'Areas',            icon: '🗺️',             key: 'areas' },
  { path: '/admin/visit-plans',   label: 'Visit Plans',      icon: '📋',             key: 'visit-plans' },
  { path: '/admin/field-tracking',label: 'Live Tracking',    icon: '📍',             key: 'field-tracking' },
  { path: '/admin/visits',        label: 'Visits Table',     icon: '🗒️',             key: 'visits' },
  { divider: true, label: 'More' },
  { path: '/admin/reports',       label: 'Reports & Alerts', icon: '📈',             key: 'reports' },
  { path: '/admin/settings',      label: 'Settings',         icon: '⚙️',             key: 'settings' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [enabledMenus, setEnabledMenus] = useState(null); // null = loading
  const [licenseActive, setLicenseActive] = useState(true);

  useEffect(() => {
    api.get('/my/permissions')
      .then(r => {
        setEnabledMenus(r.data.menus);
        setLicenseActive(r.data.is_active);
      })
      .catch(() => {
        // Fallback: show all menus if API fails
        setEnabledMenus(ALL_NAV.filter(n => n.key).map(n => n.key));
      });
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  // Filter nav based on permissions
  const navItems = enabledMenus === null
    ? []
    : ALL_NAV.filter(item => item.divider || !item.key || enabledMenus.includes(item.key));

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-lg">🏥</div>
          <div>
            <div className="text-white font-bold text-sm">Medical Manager</div>
            <div className="text-slate-400 text-xs">Admin Panel</div>
          </div>
        </div>
      </div>

      {!licenseActive ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="text-4xl mb-3">🔒</div>
            <div className="text-red-400 font-semibold text-sm">License Inactive</div>
            <div className="text-slate-500 text-xs mt-1">Super admin se contact karo</div>
          </div>
        </div>
      ) : (
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {enabledMenus === null ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
            </div>
          ) : (
            navItems.map((item, i) => {
              if (item.divider) return (
                <div key={i} className="pt-4 pb-1 px-2">
                  <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{item.label}</span>
                </div>
              );
              return (
                <NavLink key={item.path} to={item.path} end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                      isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}>
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </NavLink>
              );
            })
          )}
        </nav>
      )}

      <div className="p-3 border-t border-slate-700">
        <div className="flex items-center justify-between px-2">
          <div>
            <div className="text-white text-sm font-medium">{user?.name}</div>
            <div className="text-slate-400 text-xs">Administrator</div>
          </div>
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-400 transition rounded-lg hover:bg-slate-700" title="Logout">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      <aside className="hidden md:flex w-56 flex-shrink-0 bg-slate-800 border-r border-slate-700 flex-col">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-slate-800 border-b border-slate-700">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-300 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-white font-semibold">Medical Manager</span>
        </header>
        <main className="flex-1 overflow-auto bg-slate-900 p-4 md:p-6">
          {!licenseActive
            ? <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-6xl mb-4">🔒</div>
                  <div className="text-red-400 text-xl font-semibold mb-2">License Inactive / Expired</div>
                  <div className="text-slate-400">Apne super admin se contact karein license activate karne ke liye.</div>
                </div>
              </div>
            : <Outlet />
          }
        </main>
      </div>
    </div>
  );
}
