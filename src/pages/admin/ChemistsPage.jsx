import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const TYPE_LABELS = { chemist: '💊 Chemist', stockist: '📦 Stockist', distributor: '🚚 Distributor' };
const PAYMENT_COLORS = { pending: 'text-red-400', partial: 'text-yellow-400', paid: 'text-green-400' };

export default function ChemistsPage() {
  const [chemists, setChemists] = useState([]);
  const [areas, setAreas]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterType, setFilterType] = useState('');
  const [modal, setModal]       = useState(null); // 'add'|'edit'|'orders'
  const [selected, setSelected] = useState(null);
  const [orders, setOrders]     = useState([]);
  const [orderModal, setOrderModal] = useState(false);

  const emptyForm = { name:'', owner_name:'', type:'chemist', phone:'', email:'', address:'', area_id:'', latitude:'', longitude:'', credit_limit:'', payment_terms:'immediate' };
  const [form, setForm] = useState(emptyForm);
  const emptyOrder = { amount:'', items:'', order_date:'', payment_status:'pending', notes:'' };
  const [orderForm, setOrderForm] = useState(emptyOrder);

  useEffect(() => { loadAll(); }, [filterArea, filterType]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [c, a] = await Promise.all([
        api.get('/chemists', { params: { search, area_id: filterArea, type: filterType } }),
        api.get('/areas'),
      ]);
      setChemists(c.data); setAreas(a.data);
    } catch { toast.error('Load failed'); }
    setLoading(false);
  };

  const openAdd = () => { setSelected(null); setForm(emptyForm); setModal('form'); };
  const openEdit = (c) => {
    setSelected(c);
    setForm({ name:c.name, owner_name:c.owner_name||'', type:c.type, phone:c.phone||'', email:c.email||'', address:c.address||'', area_id:c.area_id||'', latitude:c.latitude||'', longitude:c.longitude||'', credit_limit:c.credit_limit||'', payment_terms:c.payment_terms||'immediate' });
    setModal('form');
  };

  const openOrders = async (c) => {
    setSelected(c);
    try {
      const res = await api.get(`/chemists/${c.id}/orders`);
      setOrders(res.data);
    } catch { setOrders([]); }
    setModal('orders');
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Name required');
    try {
      if (selected) { await api.put(`/chemists/${selected.id}`, form); toast.success('Updated!'); }
      else { await api.post('/chemists', form); toast.success('Chemist add ho gaya!'); }
      setModal(null); loadAll();
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate karein?')) return;
    try { await api.delete(`/chemists/${id}`); toast.success('Deactivated'); loadAll(); }
    catch { toast.error('Failed'); }
  };

  const handleOrderSave = async () => {
    try {
      await api.post(`/chemists/${selected.id}/orders`, orderForm);
      toast.success('Order recorded!');
      setOrderModal(false); setOrderForm(emptyOrder);
      const res = await api.get(`/chemists/${selected.id}/orders`);
      setOrders(res.data);
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const filtered = chemists.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.owner_name||'').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone||'').includes(search)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Chemists & Stockists</h1>
        <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          + Add Chemist
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap bg-slate-800 border border-slate-700 rounded-xl p-4">
        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key==='Enter' && loadAll()}
          placeholder="Search name, owner, phone..." className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm flex-1 min-w-[180px]" />
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm">
          <option value="">All Types</option>
          <option value="chemist">Chemist</option>
          <option value="stockist">Stockist</option>
          <option value="distributor">Distributor</option>
        </select>
        <select value={filterArea} onChange={e => setFilterArea(e.target.value)} className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm">
          <option value="">All Areas</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button onClick={loadAll} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">Search</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
          <p className="text-slate-400">Koi chemist nahi mila</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <div key={c.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="text-white font-semibold">{c.name}</div>
                  <div className="text-slate-400 text-xs mt-0.5">{TYPE_LABELS[c.type] || c.type}</div>
                  {c.owner_name && <div className="text-slate-400 text-xs">👤 {c.owner_name}</div>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(c)} className="bg-slate-700 hover:bg-slate-600 text-slate-300 p-1.5 rounded-lg text-xs">✏️</button>
                  <button onClick={() => handleDelete(c.id)} className="bg-red-900/30 hover:bg-red-900/60 text-red-400 p-1.5 rounded-lg text-xs">🗑️</button>
                </div>
              </div>
              {c.area_name && <div className="text-slate-400 text-xs mb-1">📍 {c.area_name}</div>}
              {c.phone && <div className="text-slate-400 text-xs mb-2">📞 {c.phone}</div>}
              <div className="flex gap-2 text-xs mb-3">
                <div className="bg-slate-700 rounded-lg px-2 py-1">
                  <span className="text-slate-400">Orders: </span><span className="text-white font-medium">{c.total_orders||0}</span>
                </div>
                <div className="bg-slate-700 rounded-lg px-2 py-1">
                  <span className="text-slate-400">Revenue: </span><span className="text-green-400 font-medium">₹{Number(c.total_revenue||0).toLocaleString('en-IN')}</span>
                </div>
              </div>
              {c.last_order_date && (
                <div className="text-slate-500 text-xs mb-3">Last order: {new Date(c.last_order_date).toLocaleDateString('en-IN')}</div>
              )}
              <button onClick={() => openOrders(c)} className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded-lg text-xs font-medium transition">
                📋 Orders Dekho / Add Karo
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {modal === 'form' && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-white font-bold text-lg mb-5">{selected ? 'Edit Chemist' : 'Naya Chemist Add Karo'}</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-slate-400 text-xs block mb-1">Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs block mb-1">Owner Name</label>
                  <input value={form.owner_name} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs block mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm">
                    <option value="chemist">Chemist</option>
                    <option value="stockist">Stockist</option>
                    <option value="distributor">Distributor</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-xs block mb-1">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs block mb-1">Area</label>
                  <select value={form.area_id} onChange={e => setForm(f => ({ ...f, area_id: e.target.value }))} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm">
                    <option value="">Area chunein</option>
                    {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-slate-400 text-xs block mb-1">Address</label>
                  <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs block mb-1">Credit Limit (₹)</label>
                  <input type="number" value={form.credit_limit} onChange={e => setForm(f => ({ ...f, credit_limit: e.target.value }))} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs block mb-1">Payment Terms</label>
                  <select value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm">
                    <option value="immediate">Immediate</option>
                    <option value="7 days">7 Days</option>
                    <option value="15 days">15 Days</option>
                    <option value="30 days">30 Days</option>
                    <option value="45 days">45 Days</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium text-sm">✅ Save</button>
              <button onClick={() => setModal(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Orders Modal */}
      {modal === 'orders' && selected && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-white font-bold">{selected.name}</h2>
                <p className="text-slate-400 text-xs">{TYPE_LABELS[selected.type]}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setOrderModal(true)} className="bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg">+ Order</button>
                <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white text-xl px-2">✕</button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {orders.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-6">Koi orders nahi</p>
              ) : orders.map(o => (
                <div key={o.id} className="bg-slate-700 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-white font-medium">₹{Number(o.amount||0).toLocaleString('en-IN')}</div>
                      {o.items && <div className="text-slate-400 text-xs mt-0.5">{o.items}</div>}
                      <div className="text-slate-500 text-xs mt-1">{new Date(o.order_date).toLocaleDateString('en-IN')} · {o.worker_name || 'Unknown'}</div>
                    </div>
                    <span className={`text-xs font-medium capitalize ${PAYMENT_COLORS[o.payment_status]}`}>{o.payment_status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Order Modal */}
      {orderModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-bold mb-4">New Order — {selected?.name}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-slate-400 text-xs block mb-1">Amount (₹) *</label>
                <input type="number" value={orderForm.amount} onChange={e => setOrderForm(f => ({ ...f, amount: e.target.value }))} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">Items</label>
                <input value={orderForm.items} onChange={e => setOrderForm(f => ({ ...f, items: e.target.value }))} placeholder="e.g. Paracetamol x10, Azithro x5" className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">Payment Status</label>
                <select value={orderForm.payment_status} onChange={e => setOrderForm(f => ({ ...f, payment_status: e.target.value }))} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleOrderSave} className="flex-1 bg-green-700 hover:bg-green-600 text-white py-2 rounded-lg text-sm font-medium">Save</button>
              <button onClick={() => setOrderModal(false)} className="flex-1 bg-slate-700 text-slate-300 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
