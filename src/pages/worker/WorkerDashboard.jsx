import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export function WorkerDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/tasks/my').then(r => { setTasks(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const pending = tasks.filter(t => t.status === 'pending').length;

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-white mb-1">Namaste, {user?.name?.split(' ')[0]}! 👋</h1>
      <p className="text-slate-400 text-sm mb-5">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-yellow-600/20 border border-yellow-600/30 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-yellow-400">{inProgress}</div>
          <div className="text-slate-400 text-xs mt-0.5">In Progress</div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-white">{pending}</div>
          <div className="text-slate-400 text-xs mt-0.5">Pending Tasks</div>
        </div>
      </div>
      {user?.departments?.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
          <div className="text-slate-400 text-xs mb-2">My Departments</div>
          <div className="flex flex-wrap gap-2">
            {user.departments.map(d => (
              <span key={d.id} className="text-xs px-2.5 py-1 rounded-full text-white font-medium" style={{ background: d.color + '33', border: `1px solid ${d.color}66` }}>
                {d.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkerDashboard;
