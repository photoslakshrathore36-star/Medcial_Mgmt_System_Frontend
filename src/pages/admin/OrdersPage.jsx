import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  active: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  on_hold: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
};
const PRIORITY_COLORS = {
  urgent: 'text-red-400', high: 'text-orange-400', medium: 'text-yellow-400', low: 'text-slate-400',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState({ status: 'all', search: '' });
  const [form, setForm] = useState({ order_no: '', name: '', category_id: '', client_name: '', client_phone: '', priority: 'medium', order_date: '', deadline: '', description: '', notes: '' });
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const [o, c] = await Promise.all([
        api.get('/orders', { params: { status: filter.status, search: filter.search } }),
        api.get('/product-categories'),
      ]);
      setOrders(o.data); setCategories(c.data);
    } catch { toast.error('Load failed'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter.status]);

  const handleSearch = (e) => { if (e.key === 'Enter') load(); };

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error('Name required');
    try {
      await api.post('/orders', form);
      toast.success('Order created!');
      setShowModal(false);
      setForm({ order_no: '', name: '', category_id: '', client_name: '', client_phone: '', priority: 'medium', order_date: '', deadline: '', description: '', notes: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Production Orders</h1>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition">
          <span>+</span> New Order
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text" placeholder="Search orders..."
          value={filter.search}
          onChange={e => setFilter(p => ({ ...p, search: e.target.value }))}
          onKeyDown={handleSearch}
          className="bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500 w-full sm:w-64"
        />
        {['all','active','completed','on_hold','cancelled'].map(s => (
          <button key={s}
            onClick={() => setFilter(p => ({ ...p, status: s }))}
            className={`px-3 py-2 rounded-xl text-sm font-medium transition capitalize ${filter.status === s ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-500'}`}
          >{s === 'all' ? 'All' : s.replace('_', ' ')}</button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {orders.length === 0 && <div className="text-slate-400 text-center py-12">No orders found</div>}
          {orders.map(o => (
            <div key={o.id}
              onClick={() => navigate(`/admin/orders/${o.id}`)}
              className="bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-xl p-4 cursor-pointer transition"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-blue-400 text-sm font-mono">{o.order_no}</span>
                    <span className="text-white font-medium">{o.name}</span>
                    {o.category_name && <span className="text-slate-400 text-xs bg-slate-700 px-2 py-0.5 rounded-full">{o.category_name}</span>}
                  </div>
                  {o.client_name && <div className="text-slate-400 text-sm mt-1">Client: {o.client_name}</div>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    {o.deadline && <span>Due: {new Date(o.deadline).toLocaleDateString('en-IN')}</span>}
                    <span>{o.task_count} tasks ({o.tasks_done} done)</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold ${PRIORITY_COLORS[o.priority]}`}>{o.priority?.toUpperCase()}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[o.status]}`}>
                    {o.status?.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 p-5 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-white font-semibold text-lg">New Production Order</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {[
                { key: 'order_no', label: 'Order No (auto-generate khaali chhodo)', placeholder: 'e.g. MO-0001' },
                { key: 'name', label: 'Order Name *', placeholder: 'e.g. Surgical Instruments Batch' },
                { key: 'client_name', label: 'Client Name', placeholder: '' },
                { key: 'client_phone', label: 'Client Phone', placeholder: '' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-slate-300 text-sm font-medium block mb-1.5">{f.label}</label>
                  <input type="text" value={form[f.key]} placeholder={f.placeholder}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Category</label>
                <select value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
                  <option value="">-- Select Category --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1.5">Priority</label>
                  <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
                    {['low','medium','high','urgent'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1.5">Deadline</label>
                  <input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Description</label>
                <textarea rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="p-5 border-t border-slate-700 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl text-sm transition">Cancel</button>
              <button onClick={handleSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium transition">Create Order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
