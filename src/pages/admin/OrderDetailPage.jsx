import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(false);
  const [orderForm, setOrderForm] = useState({});
  const [itemForm, setItemForm] = useState({ item_name: '', item_code: '', quantity: 1, unit: 'pcs', unit_price: '' });
  const [taskForm, setTaskForm] = useState({ item_id: '', assign_type: 'worker', worker_id: '', department_id: '', task_title: '', task_description: '', quantity_assigned: 1, priority: 'medium', due_date: '', admin_notes: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [o, w, d] = await Promise.all([
        api.get('/orders/' + id),
        api.get('/workers', { params: { role: 'worker' } }),
        api.get('/departments'),
      ]);
      setOrder(o.data);
      setOrderForm(o.data);
      setWorkers(w.data);
      setDepartments(d.data);
    } catch { toast.error('Load failed'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const addItem = async () => {
    if (!itemForm.item_name.trim()) return toast.error('Item name required');
    try {
      await api.post('/orders/' + id + '/items', itemForm);
      toast.success('Item added!');
      setShowItemModal(false);
      setItemForm({ item_name: '', item_code: '', quantity: 1, unit: 'pcs', unit_price: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const deleteItem = async (itemId) => {
    if (!window.confirm('Item delete karna hai?')) return;
    await api.delete('/orders/' + id + '/items/' + itemId);
    toast.success('Deleted'); load();
  };

  const addTask = async () => {
    if (!taskForm.task_title.trim()) return toast.error('Task title required');
    try {
      await api.post('/tasks', { order_id: parseInt(id), ...taskForm });
      toast.success('Task assigned!');
      setShowTaskModal(false);
      setTaskForm({ item_id: '', assign_type: 'worker', worker_id: '', department_id: '', task_title: '', task_description: '', quantity_assigned: 1, priority: 'medium', due_date: '', admin_notes: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const updateOrderStatus = async (status) => {
    await api.put('/orders/' + id, { ...order, status });
    toast.success('Status updated!'); load();
  };

  const STATUS_BADGE = {
    active: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    on_hold: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  const TASK_STATUS = {
    pending: 'bg-slate-700 text-slate-300',
    in_progress: 'bg-yellow-600/20 text-yellow-400',
    completed: 'bg-green-600/20 text-green-400',
    on_hold: 'bg-orange-600/20 text-orange-400',
    waiting: 'bg-purple-600/20 text-purple-400',
  };
  const PRIORITY_COLORS = { urgent: 'text-red-400', high: 'text-orange-400', medium: 'text-yellow-400', low: 'text-slate-400' };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!order) return <div className="text-slate-400 text-center py-12">Order not found</div>;

  const totalTasks = order.tasks?.length || 0;
  const completedTasks = order.tasks?.filter(t => t.status === 'completed').length || 0;
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="max-w-4xl">
      {/* Back */}
      <button onClick={() => navigate('/admin/orders')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-5 text-sm transition">
        ← Back to Orders
      </button>

      {/* Order Header */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-blue-400 font-mono text-sm font-semibold">{order.order_no}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_BADGE[order.status]}`}>
                {order.status?.replace('_', ' ')}
              </span>
              {order.category_name && <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{order.category_name}</span>}
            </div>
            <h1 className="text-xl font-bold text-white">{order.name}</h1>
            {order.client_name && <p className="text-slate-400 text-sm">Client: {order.client_name} {order.client_phone && `· ${order.client_phone}`}</p>}
          </div>
          <div className="flex gap-2 flex-wrap">
            {['active','on_hold','completed','cancelled'].map(s => s !== order.status && (
              <button key={s} onClick={() => updateOrderStatus(s)}
                className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition capitalize">
                → {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
        {order.description && <p className="text-slate-400 text-sm mb-3">{order.description}</p>}

        {/* Stats row */}
        <div className="flex flex-wrap gap-4 text-sm">
          {order.deadline && <span className="text-slate-400">📅 Due: {new Date(order.deadline).toLocaleDateString('en-IN')}</span>}
          {order.total_amount > 0 && <span className="text-white font-medium">₹{parseFloat(order.total_amount).toLocaleString('en-IN')}</span>}
          <span className="text-slate-400">{order.items?.length} items · {totalTasks} tasks</span>
        </div>

        {/* Progress Bar */}
        {totalTasks > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Overall Progress</span>
              <span>{completedTasks}/{totalTasks} tasks ({progressPct}%)</span>
            </div>
            <div className="bg-slate-700 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: progressPct + '%' }} />
            </div>
          </div>
        )}
      </div>

      {/* Production Items */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-lg">Production Items ({order.items?.length || 0})</h2>
          <button onClick={() => setShowItemModal(true)}
            className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition">
            + Add Item
          </button>
        </div>
        <div className="space-y-2">
          {order.items?.length === 0 && <p className="text-slate-400 text-sm text-center py-6 bg-slate-800 border border-slate-700 rounded-xl">Koi item nahi. Pehle items add karo.</p>}
          {order.items?.map(item => (
            <div key={item.id} className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <span className="text-white text-sm font-medium">{item.item_name}</span>
                {item.item_code && <span className="text-slate-400 text-xs ml-2">({item.item_code})</span>}
              </div>
              <span className="text-slate-400 text-sm">{item.quantity} {item.unit}</span>
              {item.unit_price > 0 && <span className="text-slate-400 text-sm">₹{parseFloat(item.unit_price).toLocaleString()}</span>}
              <button onClick={() => deleteItem(item.id)} className="p-1 text-slate-500 hover:text-red-400 transition text-sm">🗑️</button>
            </div>
          ))}
        </div>
      </div>

      {/* Task Assignments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-lg">Task Assignments ({totalTasks})</h2>
          <button onClick={() => setShowTaskModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition">
            + Assign Task
          </button>
        </div>
        <div className="space-y-2">
          {order.tasks?.length === 0 && <p className="text-slate-400 text-sm text-center py-6 bg-slate-800 border border-slate-700 rounded-xl">Koi task assign nahi hua</p>}
          {order.tasks?.map(t => (
            <div key={t.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-semibold ${PRIORITY_COLORS[t.priority]}`}>{t.priority?.toUpperCase()}</span>
                    {t.dept_name && (
                      <span className="text-xs px-2 py-0.5 rounded-full text-white"
                        style={{ background: t.dept_color + '33', border: `1px solid ${t.dept_color}55` }}>
                        {t.dept_name}
                      </span>
                    )}
                  </div>
                  <div className="text-white font-medium">{t.task_title}</div>
                  {t.task_description && <div className="text-slate-400 text-xs mt-0.5">{t.task_description}</div>}
                  <div className="flex gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                    {t.worker_name && <span>👷 {t.worker_name}</span>}
                    {t.item_name && <span>📦 {t.item_name}</span>}
                    <span>{t.quantity_completed}/{t.quantity_assigned} done</span>
                    {t.due_date && <span>📅 {new Date(t.due_date).toLocaleDateString('en-IN')}</span>}
                  </div>
                  {t.worker_notes && (
                    <div className="mt-1.5 text-xs text-slate-300 italic bg-slate-700 px-2 py-1 rounded-lg">
                      Worker: "{t.worker_notes}"
                    </div>
                  )}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${TASK_STATUS[t.status]}`}>
                  {t.status?.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md">
            <div className="p-5 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-white font-semibold">Add Production Item</h2>
              <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-5 space-y-3">
              {[
                { k: 'item_name', l: 'Item Name *', t: 'text' },
                { k: 'item_code', l: 'Item Code (optional)', t: 'text' },
                { k: 'quantity', l: 'Quantity', t: 'number' },
                { k: 'unit', l: 'Unit (pcs, kg, box...)', t: 'text' },
                { k: 'unit_price', l: 'Unit Price ₹', t: 'number' },
              ].map(({ k, l, t }) => (
                <div key={k}>
                  <label className="text-slate-300 text-xs font-medium block mb-1">{l}</label>
                  <input type={t} value={itemForm[k] || ''} onChange={e => setItemForm(p => ({ ...p, [k]: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-slate-700 flex gap-3">
              <button onClick={() => setShowItemModal(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl text-sm transition">Cancel</button>
              <button onClick={addItem} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium transition">Add Item</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 p-5 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-white font-semibold">Assign Task</h2>
              <button onClick={() => setShowTaskModal(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Task Title *</label>
                <input type="text" value={taskForm.task_title} onChange={e => setTaskForm(p => ({ ...p, task_title: e.target.value }))}
                  placeholder="e.g. CNC Machining - Lot 1"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Description</label>
                <textarea rows={2} value={taskForm.task_description} onChange={e => setTaskForm(p => ({ ...p, task_description: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Production Item (optional)</label>
                <select value={taskForm.item_id} onChange={e => setTaskForm(p => ({ ...p, item_id: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
                  <option value="">-- No specific item --</option>
                  {order.items?.map(i => <option key={i.id} value={i.id}>{i.item_name} ({i.quantity} {i.unit})</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Assign To</label>
                <div className="flex gap-2 mb-2">
                  {['worker', 'department'].map(t => (
                    <button key={t} type="button" onClick={() => setTaskForm(p => ({ ...p, assign_type: t }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${taskForm.assign_type === t ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                      {t === 'worker' ? '👷 Worker' : '🏭 Department'}
                    </button>
                  ))}
                </div>
                {taskForm.assign_type === 'worker' ? (
                  <select value={taskForm.worker_id} onChange={e => setTaskForm(p => ({ ...p, worker_id: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
                    <option value="">-- Select Worker --</option>
                    {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                ) : (
                  <select value={taskForm.department_id} onChange={e => setTaskForm(p => ({ ...p, department_id: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
                    <option value="">-- Select Department --</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1.5">Quantity</label>
                  <input type="number" value={taskForm.quantity_assigned} onChange={e => setTaskForm(p => ({ ...p, quantity_assigned: e.target.value }))} min={1}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1.5">Priority</label>
                  <select value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
                    {['low','medium','high','urgent'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Due Date</label>
                <input type="date" value={taskForm.due_date} onChange={e => setTaskForm(p => ({ ...p, due_date: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Notes for Worker</label>
                <textarea rows={2} value={taskForm.admin_notes} onChange={e => setTaskForm(p => ({ ...p, admin_notes: e.target.value }))}
                  placeholder="Worker ko kya karna hai, special instructions..."
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
              </div>
            </div>
            <div className="p-5 border-t border-slate-700 flex gap-3">
              <button onClick={() => setShowTaskModal(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl text-sm transition">Cancel</button>
              <button onClick={addTask} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium transition">Assign Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
