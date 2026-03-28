import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function ProductionTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterWorker, setFilterWorker] = useState('');
  const [filterDept, setFilterDept] = useState('');

  useEffect(() => {
    Promise.all([api.get('/workers', { params: { role: 'worker' } }), api.get('/departments')])
      .then(([w, d]) => { setWorkers(w.data); setDepartments(d.data); });
    loadTasks();
  }, []);

  useEffect(() => { loadTasks(); }, [filterStatus, filterWorker, filterDept]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const r = await api.get('/tasks/all', { params: { status: filterStatus !== 'all' ? filterStatus : undefined, worker_id: filterWorker || undefined, department_id: filterDept || undefined } });
      setTasks(r.data);
    } catch {}
    setLoading(false);
  };

  const TASK_STATUS = { pending: 'bg-slate-700 text-slate-300', in_progress: 'bg-yellow-600/20 text-yellow-400', completed: 'bg-green-600/20 text-green-400', on_hold: 'bg-orange-600/20 text-orange-400', waiting: 'bg-purple-600/20 text-purple-400' };
  const PRIORITY_COLORS = { urgent: 'text-red-400', high: 'text-orange-400', medium: 'text-yellow-400', low: 'text-slate-400' };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Production Tasks</h1>
      <div className="flex flex-wrap gap-2 mb-4">
        {['all','pending','in_progress','completed','on_hold'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-2 rounded-xl text-sm font-medium transition capitalize ${filterStatus === s ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-500'}`}>
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
        <select value={filterWorker} onChange={e => setFilterWorker(e.target.value)} className="bg-slate-800 border border-slate-700 text-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none">
          <option value="">All Workers</option>
          {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="bg-slate-800 border border-slate-700 text-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none">
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="space-y-2">
          {tasks.length === 0 && <div className="text-slate-400 text-center py-12">No tasks found</div>}
          {tasks.map(t => (
            <div key={t.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-semibold ${PRIORITY_COLORS[t.priority]}`}>{t.priority?.toUpperCase()}</span>
                    {t.dept_name && <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: t.dept_color + '33', border: `1px solid ${t.dept_color}55` }}>{t.dept_name}</span>}
                  </div>
                  <div className="text-white font-medium">{t.task_title}</div>
                  <div className="text-slate-400 text-sm">{t.order_name}{t.item_name ? ` · ${t.item_name}` : ''}</div>
                  <div className="flex gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                    {t.worker_name && <span>👷 {t.worker_name}</span>}
                    <span>{t.quantity_completed}/{t.quantity_assigned} done</span>
                    {t.due_date && <span>📅 {new Date(t.due_date).toLocaleDateString('en-IN')}</span>}
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${TASK_STATUS[t.status]}`}>{t.status?.replace('_', ' ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
