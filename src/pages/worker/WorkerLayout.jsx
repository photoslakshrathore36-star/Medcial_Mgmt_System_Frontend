import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function WorkerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">🏭</div>
          <div>
            <div className="text-white text-sm font-semibold">{user?.name}</div>
            <div className="text-slate-400 text-xs">Production Worker</div>
          </div>
        </div>
        <button onClick={() => { logout(); navigate('/login'); }}
          className="p-2 text-slate-400 hover:text-red-400 transition rounded-lg hover:bg-slate-700">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </header>
      <main className="flex-1 overflow-auto pb-20">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 flex">
        {[
          { path: '/worker', label: 'Home', icon: '🏠', end: true },
          { path: '/worker/tasks', label: 'My Tasks', icon: '✅' },
        ].map(link => (
          <NavLink key={link.path} to={link.path} end={link.end}
            className={({ isActive }) => `flex-1 flex flex-col items-center justify-center py-3 text-xs font-medium transition ${isActive ? 'text-blue-400' : 'text-slate-400'}`}>
            <span className="text-xl mb-0.5">{link.icon}</span>{link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
