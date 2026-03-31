import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function SampleInventoryPage() {
  const [inventory, setInventory]     = useState([]);
  const [workers, setWorkers]         = useState([]);
  const [products, setProducts]       = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [lowStock, setLowStock]       = useState([]);
  const [tab, setTab]                 = useState('overview');
  const [loading, setLoading]         = useState(false);
  const [modal, setModal]             = useState(null); // 'restock' | 'adjust' | 'txn'
  const [filterWorker, setFilterWorker] = useState('');
  const [txnFilter, setTxnFilter]     = useState({ worker_id: '', product_id: '' });

  const emptyForm = { worker_id: '', product_id: '', quantity: '', min_stock: '', notes: '' };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [inv, w, p, ls] = await Promise.all([
        api.get('/inventory'),
        api.get('/workers', { params: { role: 'field_worker' } }),
        api.get('/samples'),
        api.get('/inventory/low-stock'),
      ]);
      setInventory(inv.data);
      setWorkers(w.data);
      setProducts(p.data);
      setLowStock(ls.data);
    } catch { toast.error('Load failed'); }
    setLoading(false);
  };

  const loadTransactions = async () => {
    try {
      const res = await api.get('/inventory/transactions', {
        params: { worker_id: txnFilter.worker_id || undefined, product_id: txnFilter.product_id || undefined }
      });
      setTransactions(res.data);
    } catch { toast.error('Failed to load transactions'); }
  };

  useEffect(() => { if (tab === 'transactions') loadTransactions(); }, [tab, txnFilter]);

  const handleRestock = async () => {
    if (!form.worker_id || !form.product_id || !form.quantity)
      return toast.error('Worker, product aur quantity required hain');
    try {
      await api.post('/inventory/restock', { ...form, quantity: Number(form.quantity) });
      toast.success('Stock add ho gaya!');
      setModal(null); setForm(emptyForm); loadAll();
    } catch (e) { toast.error(e.response?.data?.message || 'Restock failed'); }
  };

  const handleAdjust = async () => {
    if (!form.worker_id || !form.product_id || form.quantity === '')
      return toast.error('Worker, product aur quantity required hain');
    try {
      await api.post('/inventory/adjust', { ...form, quantity: Number(form.quantity), min_stock: form.min_stock ? Number(form.min_stock) : undefined });
      toast.success('Stock adjust ho gaya!');
      setModal(null); setForm(emptyForm); loadAll();
    } catch (e) { toast.error(e.response?.data?.message || 'Adjust failed'); }
  };

  // Group inventory by worker
  const byWorker = {};
  inventory.forEach(row => {
    if (!byWorker[row.worker_id]) byWorker[row.worker_id] = { worker_name: row.worker_name, items: [] };
    byWorker[row.worker_id].items.push(row);
  });

  const filtered = filterWorker
    ? { [filterWorker]: byWorker[filterWorker] }
    : byWorker;

  const TYPE_COLORS = { restock: 'text-green-400', given: 'text-blue-400', returned: 'text-yellow-400', adjustment: 'text-purple-400' };
  const TYPE_LABELS = { restock: '📦 Restock', given: '💊 Diya', returned: '↩️ Wapas', adjustment: '✏️ Adjust' };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Sample Inventory</h1>
          {lowStock.length > 0 && (
            <p className="text-red-400 text-sm mt-1">⚠️ {lowStock.length} worker(s) ka stock low hai</p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { setForm(emptyForm); setModal('restock'); }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            + Restock Karo
          </button>
          <button onClick={() => { setForm(emptyForm); setModal('adjust'); }}
            className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition border border-slate-600">
            ✏️ Manual Adjust
          </button>
          <button onClick={loadAll}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg text-sm border border-slate-700">
            🔄
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { k: 'overview', l: '📊 Overview' },
          { k: 'low-stock', l: `🔴 Low Stock${lowStock.length > 0 ? ` (${lowStock.length})` : ''}` },
          { k: 'transactions', l: '📋 Transactions' },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${tab === t.k ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-500'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* OVERVIEW TAB */}
      {!loading && tab === 'overview' && (
        <div className="space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <label className="text-slate-400 text-sm">Filter worker:</label>
              <select value={filterWorker} onChange={e => setFilterWorker(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none">
                <option value="">Sab Workers</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            {Object.keys(filtered).length === 0 && (
              <p className="text-slate-400 text-sm text-center py-8">Koi inventory data nahi mila. Pehle restock karo.</p>
            )}

            {Object.entries(filtered).map(([wid, data]) => data && (
              <div key={wid} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-blue-900/50 border border-blue-700/50 flex items-center justify-center text-blue-300 text-xs font-bold">
                    {data.worker_name?.charAt(0)}
                  </div>
                  <h3 className="text-white font-medium">{data.worker_name}</h3>
                  {data.items.some(i => i.low_stock) && (
                    <span className="text-xs bg-red-900/40 text-red-300 px-2 py-0.5 rounded-full">Low Stock</span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {data.items.map(item => (
                    <div key={item.id}
                      className={`rounded-xl p-3 border ${item.low_stock ? 'bg-red-900/20 border-red-700/40' : 'bg-slate-700 border-slate-600'}`}>
                      <div className="text-white text-sm font-medium truncate">{item.product_name}</div>
                      {item.category && <div className="text-slate-400 text-xs mb-2">{item.category}</div>}
                      <div className={`text-2xl font-bold ${item.low_stock ? 'text-red-400' : 'text-green-400'}`}>
                        {item.quantity}
                      </div>
                      <div className="text-slate-500 text-xs">min: {item.min_stock}</div>
                      {item.low_stock && <div className="text-red-400 text-xs mt-1">⚠️ Restock needed</div>}
                      <div className="text-slate-500 text-xs mt-1">
                        {new Date(item.updated_at).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LOW STOCK TAB */}
      {!loading && tab === 'low-stock' && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-4">Low Stock Alerts</h3>
          {lowStock.length === 0 ? (
            <p className="text-green-400 text-sm">✅ Sab workers ka stock theek hai!</p>
          ) : (
            <div className="space-y-2">
              {lowStock.map((item, i) => (
                <div key={i} className="bg-red-900/20 border border-red-700/30 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-white font-medium">{item.product_name}</div>
                    <div className="text-slate-400 text-sm">{item.worker_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-red-400 font-bold text-lg">{item.quantity}</div>
                    <div className="text-slate-500 text-xs">min: {item.min_stock}</div>
                  </div>
                  <button
                    onClick={() => { setForm({ worker_id: String(item.worker_id || ''), product_id: '', quantity: '', min_stock: '', notes: '' }); setModal('restock'); }}
                    className="bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg transition">
                    Restock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TRANSACTIONS TAB */}
      {tab === 'transactions' && (
        <div className="space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex gap-3 flex-wrap mb-4">
              <select value={txnFilter.worker_id} onChange={e => setTxnFilter(f => ({ ...f, worker_id: e.target.value }))}
                className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none">
                <option value="">All Workers</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <select value={txnFilter.product_id} onChange={e => setTxnFilter(f => ({ ...f, product_id: e.target.value }))}
                className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none">
                <option value="">All Products</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {transactions.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">Koi transactions nahi mili</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 text-xs border-b border-slate-700">
                      <th className="text-left pb-2 pr-3">Type</th>
                      <th className="text-left pb-2 pr-3">Product</th>
                      <th className="text-left pb-2 pr-3">Worker</th>
                      <th className="text-right pb-2 pr-3">Qty</th>
                      <th className="text-left pb-2 pr-3">Notes</th>
                      <th className="text-left pb-2">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {transactions.map(t => (
                      <tr key={t.id}>
                        <td className={`py-2 pr-3 font-medium ${TYPE_COLORS[t.type] || 'text-white'}`}>
                          {TYPE_LABELS[t.type] || t.type}
                        </td>
                        <td className="py-2 pr-3 text-white">{t.product_name}</td>
                        <td className="py-2 pr-3 text-slate-300">{t.worker_name}</td>
                        <td className={`py-2 pr-3 text-right font-bold ${t.type === 'restock' ? 'text-green-400' : t.type === 'given' ? 'text-red-400' : 'text-white'}`}>
                          {t.type === 'restock' ? '+' : t.type === 'given' ? '-' : ''}{t.quantity}
                        </td>
                        <td className="py-2 pr-3 text-slate-400 text-xs max-w-xs truncate">{t.notes || '—'}</td>
                        <td className="py-2 text-slate-400 text-xs whitespace-nowrap">
                          {new Date(t.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RESTOCK MODAL */}
      {modal === 'restock' && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-white font-bold text-lg mb-5">Stock Add Karo (Restock)</h2>
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-sm block mb-1">Worker *</label>
                <select value={form.worker_id} onChange={e => setForm(f => ({ ...f, worker_id: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="">Worker chunein</option>
                  {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-sm block mb-1">Product *</label>
                <select value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="">Product chunein</option>
                  {products.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name}{p.category ? ` (${p.category})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-sm block mb-1">Quantity Add Karo *</label>
                <input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. 50" />
              </div>
              <div>
                <label className="text-slate-400 text-sm block mb-1">Notes (optional)</label>
                <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. Monthly batch delivery" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleRestock} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium text-sm transition">
                ✅ Restock Karo
              </button>
              <button onClick={() => setModal(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded-lg text-sm transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADJUST MODAL */}
      {modal === 'adjust' && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-white font-bold text-lg mb-1">Manual Adjustment</h2>
            <p className="text-slate-400 text-sm mb-5">Exact stock value set karo (override)</p>
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-sm block mb-1">Worker *</label>
                <select value={form.worker_id} onChange={e => setForm(f => ({ ...f, worker_id: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="">Worker chunein</option>
                  {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-sm block mb-1">Product *</label>
                <select value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="">Product chunein</option>
                  {products.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-sm block mb-1">New Quantity *</label>
                  <input type="number" min="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g. 30" />
                </div>
                <div>
                  <label className="text-slate-400 text-sm block mb-1">Min Stock Level</label>
                  <input type="number" min="0" value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                    placeholder="default: 5" />
                </div>
              </div>
              <div>
                <label className="text-slate-400 text-sm block mb-1">Reason / Notes</label>
                <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. Physical stock count" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleAdjust} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-medium text-sm transition">
                ✅ Save Adjustment
              </button>
              <button onClick={() => setModal(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded-lg text-sm transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
