import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  pending: 'bg-slate-700 text-slate-300',
  in_progress: 'bg-yellow-600/20 text-yellow-400',
  completed: 'bg-green-600/20 text-green-400',
  on_hold: 'bg-orange-600/20 text-orange-400',
  waiting: 'bg-purple-600/20 text-purple-400',
};
const PRIORITY_COLORS = { urgent: 'text-red-400', high: 'text-orange-400', medium: 'text-yellow-400', low: 'text-slate-400' };

export default function WorkerTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [activeSessions, setActiveSessions] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [progressForm, setProgressForm] = useState({ qty: '', status: '', notes: '' });

  useEffect(() => { loadTasks(); }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const r = await api.get('/tasks/my');
      setTasks(r.data);
      // check active sessions for each task
      const sessions = {};
      for (const t of r.data) {
        try {
          const s = await api.get(`/tasks/${t.id}/active-session`);
          if (s.data) sessions[t.id] = s.data;
        } catch {}
      }
      setActiveSessions(sessions);
    } catch { toast.error('Load failed'); }
    setLoading(false);
  };

  const handleClockIn = async (taskId) => {
    try {
      await api.post(`/tasks/${taskId}/clock-in`);
      toast.success('Clock In! Kaam shuru karo 💪');
      loadTasks();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const handleClockOut = async (taskId) => {
    try {
      await api.post(`/tasks/${taskId}/clock-out`);
      toast.success('Clock Out! Aaram karo 😊');
      loadTasks();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const handleProgress = async () => {
    try {
      await api.patch(`/tasks/${selectedTask.id}/progress`, {
        quantity_completed: progressForm.qty ? parseInt(progressForm.qty) : undefined,
        status: progressForm.status || undefined,
        worker_notes: progressForm.notes,
      });
      toast.success('Progress updated!');
      setSelectedTask(null);
      loadTasks();
    } catch { toast.error('Error'); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-white mb-4">My Tasks ({tasks.length})</h1>

      {tasks.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-2">🎉</div>
          <div className="text-white font-medium">Koi pending task nahi hai!</div>
          <div className="text-slate-400 text-sm mt-1">Sab kaam ho gaya</div>
        </div>
      )}

      <div className="space-y-3">
        {tasks.map(task => {
          const isClocked = !!activeSessions[task.id];
          return (
            <div key={task.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className={`text-xs font-semibold ${PRIORITY_COLORS[task.priority]}`}>{task.priority?.toUpperCase()}</span>
                    {task.dept_name && (
                      <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: task.dept_color + '33', border: `1px solid ${task.dept_color}66` }}>
                        {task.dept_name}
                      </span>
                    )}
                  </div>
                  <h3 className="text-white font-medium">{task.task_title}</h3>
                  <p className="text-slate-400 text-xs mt-0.5">{task.order_name} · {task.item_name}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[task.status]}`}>
                  {task.status?.replace('_', ' ')}
                </span>
              </div>

              {/* Progress */}
              {task.quantity_assigned > 1 && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Progress</span>
                    <span>{task.quantity_completed}/{task.quantity_assigned}</span>
                  </div>
                  <div className="bg-slate-700 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (task.quantity_completed / task.quantity_assigned) * 100)}%` }} />
                  </div>
                </div>
              )}

              {task.task_description && <p className="text-slate-400 text-xs mb-3">{task.task_description}</p>}
              {task.admin_notes && <p className="text-yellow-400 text-xs mb-3">📋 {task.admin_notes}</p>}
              {task.due_date && <p className="text-xs text-slate-500 mb-3">📅 Due: {new Date(task.due_date).toLocaleDateString('en-IN')}</p>}

              {/* Clock In/Out */}
              <div className="flex gap-2">
                {isClocked ? (
                  <button onClick={() => handleClockOut(task.id)}
                    className="flex-1 bg-red-600/20 border border-red-700/50 text-red-400 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition hover:bg-red-600/30">
                    ⏹ Clock Out
                  </button>
                ) : (
                  <button onClick={() => handleClockIn(task.id)} disabled={task.status === 'completed'}
                    className="flex-1 bg-green-600/20 border border-green-700/50 text-green-400 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition hover:bg-green-600/30 disabled:opacity-40">
                    ▶ Clock In
                  </button>
                )}
                <button onClick={() => { setSelectedTask(task); setProgressForm({ qty: task.quantity_completed, status: task.status, notes: task.worker_notes || '' }); }}
                  className="flex-1 bg-blue-600/20 border border-blue-700/50 text-blue-400 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition hover:bg-blue-600/30">
                  📊 Update
                </button>
              </div>

              {isClocked && (
                <div className="mt-2 text-center text-green-400 text-xs animate-pulse">
                  ⏱ Kaam chal raha hai...
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Update Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="bg-slate-800 border border-slate-700 rounded-t-2xl w-full max-w-lg">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-white font-semibold">Progress Update</h2>
              <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Quantity Completed</label>
                <input type="number" value={progressForm.qty}
                  onChange={e => setProgressForm(p => ({ ...p, qty: e.target.value }))}
                  max={selectedTask.quantity_assigned} min={0}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Status</label>
                <select value={progressForm.status} onChange={e => setProgressForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
                  {['pending','in_progress','completed','on_hold','waiting'].map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Notes / Problem</label>
                <textarea rows={3} value={progressForm.notes} onChange={e => setProgressForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Koi problem ho to yahan likhein..."
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-700 flex gap-3">
              <button onClick={() => setSelectedTask(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl text-sm transition">Cancel</button>
              <button onClick={handleProgress} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-semibold transition">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
