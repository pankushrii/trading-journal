import React, { useState, useEffect } from 'react';
import {
  Plus, TrendingUp, TrendingDown, IndianRupee, PieChart as PieIcon,
  Download, Upload, Trash2, Edit2, Check, X, FileText
} from 'lucide-react';
import supabase from './lib/supabaseClient';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const PHASES = ['put', 'assigned', 'call'];

const COLORS = ['#38bdf8', '#34d399', '#f59e42'];

const defaultTrade = {
  stock: '',
  strategy: 'cash-secured-put',
  strikePrice: '',
  premium: '',
  quantity: '',
  expiry: '',
  tradeDate: new Date().toISOString().split('T')[0],
  status: 'open',
  entryPrice: '',
  exitPrice: '',
  notes: ''
};
const calcEarnings = (trade) => {
  const entry = parseFloat(trade.entryPrice ?? trade.entry_price);
  const exit = parseFloat(trade.exitPrice ?? trade.exit_price);
  const qty = parseInt(trade.quantity, 10);
  if (!entry || !exit || !qty) return 0;
  return (exit - entry) * qty;
};

const getPhase = t =>
  t.strategy === 'cash-secured-put'
    ? (t.status === 'open' ? 'put' : (t.status === 'exercised' ? 'assigned' : 'put'))
    : (t.strategy === 'covered-call'
      ? (t.status === 'open' ? 'call' : (t.status === 'exercised' ? 'assigned' : 'call'))
      : 'other');

function StatCard({ title, value, icon, color }) {
  return (
    <div className={`rounded-lg shadow-md text-white p-5 flex items-center ${color}`}>
      <span className="mr-4">{icon}</span>
      <div>
        <div className="text-sm">{title}</div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
    </div>
  );
}

const App = () => {
  const [trades, setTrades] = useState([]);
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [newTrade, setNewTrade] = useState(defaultTrade);
  const [editTrade, setEditTrade] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Dashboard derived stats
  const stats = React.useMemo(() => {
    if (!trades.length) return {};
    let premium = 0, wins = 0, losses = 0, openRisk = 0;
    let largestWin = null, largestLoss = null;
    trades.forEach(t => {
      premium += (t.premium ?? 0) * (t.quantity ?? 0);
      if (t.status === 'closed') {
        const earn = t.earnings ?? calcEarnings(t);
        if (earn > 0) wins++; else if (earn < 0) losses++;
        if (largestWin === null || earn > largestWin) largestWin = earn;
        if (largestLoss === null || earn < largestLoss) largestLoss = earn;
      }
      if (t.status === 'open') {
        openRisk += (parseFloat(t.strikePrice ?? t.strike_price) * (t.quantity ?? 0) || 0);
      }
    });
    const winRate = ((wins / (wins + losses)) * 100).toFixed(0);
    const putCount = trades.filter(t => getPhase(t) === 'put').length;
    const assignCount = trades.filter(t => getPhase(t) === 'assigned').length;
    const callCount = trades.filter(t => getPhase(t) === 'call').length;
    return {
      totalPremium: premium,
      winRate: isNaN(winRate) ? 0 : winRate,
      largestWin: largestWin ?? 0,
      largestLoss: largestLoss ?? 0,
      openRisk,
      count: { put: putCount, assigned: assignCount, call: callCount }
    };
  }, [trades]);

  // Area chart (cumulative P&L over time)
  const pnlChartData = React.useMemo(() => {
    let sum = 0;
    // use closed trades (sorted oldest to newest)
    const closes = trades.filter(t => t.status === 'closed')
      .sort((a, b) => new Date(a.expiry) - new Date(b.expiry));
    return closes.map(t => {
      sum += (t.earnings ?? calcEarnings(t) ?? 0) + ((t.premium ?? 0) * (t.quantity ?? 0));
      return {
        date: t.expiry,
        value: parseFloat(sum.toFixed(2))
      };
    });
  }, [trades]);

  // Pie chart (phase distribution)
  const pieChartData = [
    {name: 'PUT', value: stats?.count?.put ?? 0},
    {name: 'ASSIGNED', value: stats?.count?.assigned ?? 0},
    {name: 'CC', value: stats?.count?.call ?? 0}
  ];

  useEffect(() => {
    const fetchTrades = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .order('trade_date', { ascending: false });
      if (error) {
        alert('Error fetching trades.');
      } else {
        const enrichedTrades = data.map(trade => ({
          ...trade,
          strikePrice: trade.strike_price,
          entryPrice: trade.entry_price,
          exitPrice: trade.exit_price,
          totalPremium: (trade.premium || 0) * (trade.quantity || 0),
          earnings: calcEarnings(trade)
        }));
        setTrades(enrichedTrades);
      }
      setLoading(false);
    };
    fetchTrades();
  }, []);

  const addTrade = async () => {
    if (!newTrade.stock || !newTrade.strikePrice || !newTrade.premium || !newTrade.quantity || !newTrade.expiry) {
      alert('Please fill all required fields');
      return;
    }
    setLoading(true);
    const trade = {
      stock: newTrade.stock,
      strategy: newTrade.strategy,
      strike_price: parseFloat(newTrade.strikePrice),
      premium: parseFloat(newTrade.premium),
      quantity: parseInt(newTrade.quantity),
      expiry: newTrade.expiry,
      trade_date: newTrade.tradeDate,
      status: newTrade.status,
      entry_price: newTrade.entryPrice ? parseFloat(newTrade.entryPrice) : null,
      exit_price: newTrade.exitPrice ? parseFloat(newTrade.exitPrice) : null,
      notes: newTrade.notes || ""
    };
    try {
      const { data, error } = await supabase.from('trades').insert([trade]).select();
      setLoading(false);
      if (error) {
        alert('Error saving trade. Please try again.');
        return;
      }
      const t = data[0];
      const enrichedTrade = {
        ...t,
        strikePrice: t.strike_price,
        entryPrice: t.entry_price,
        exitPrice: t.exit_price,
        totalPremium: (t.premium || 0) * (t.quantity || 0),
        earnings: calcEarnings(t)
      };
      setTrades([enrichedTrade, ...trades]);
      setNewTrade(defaultTrade);
      setShowAddTrade(false);
    } catch (err) {
      setLoading(false);
      alert('Unexpected error while saving trade.');
    }
  };

  const handleEditTrade = async () => {
    setLoading(true);
    const updatePayload = {
      stock: editTrade.stock,
      strategy: editTrade.strategy,
      strike_price: parseFloat(editTrade.strikePrice || editTrade.strike_price),
      premium: parseFloat(editTrade.premium),
      quantity: parseInt(editTrade.quantity, 10),
      expiry: editTrade.expiry,
      trade_date: editTrade.tradeDate || editTrade.trade_date,
      status: editTrade.status,
      entry_price: editTrade.entryPrice ? parseFloat(editTrade.entryPrice) : null,
      exit_price: editTrade.exitPrice ? parseFloat(editTrade.exitPrice) : null,
      notes: editTrade.notes || ''
    };
    const { error } = await supabase.from('trades').update(updatePayload).eq('id', editTrade.id);
    setLoading(false);
    if (error) {
      alert('Failed to update trade!');
      return;
    }
    setTrades(trades =>
      trades.map(tr =>
        tr.id === editTrade.id
          ? {
            ...tr,
            ...updatePayload,
            strikePrice: updatePayload.strike_price,
            entryPrice: updatePayload.entry_price,
            exitPrice: updatePayload.exit_price,
            totalPremium: updatePayload.premium * updatePayload.quantity,
            earnings:
              (updatePayload.exit_price && updatePayload.entry_price && updatePayload.quantity)
                ? (updatePayload.exit_price - updatePayload.entry_price) * updatePayload.quantity
                : 0
          }
          : tr
      )
    );
    setShowEditModal(false);
    setEditTrade(null);
  };

  const deleteTrade = async (id) => {
    if (!window.confirm('Are you sure you want to delete this trade?')) return;
    setLoading(true);
    const { error } = await supabase.from('trades').delete().eq('id', id);
    setLoading(false);
    if (error) {
      alert('Failed to delete trade.');
      return;
    }
    setTrades(trades.filter(trade => trade.id !== id));
  };

  const exportData = () => {
    const dataStr = JSON.stringify(trades, null, 2);
    const link = document.createElement('a');
    link.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    link.download = 'wheel-strategy-trades.json';
    link.click();
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          setTrades(imported);
          alert('Data imported successfully!');
        } catch {
          alert('Error importing data. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen dark:bg-gray-900 px-2 py-6">
      <main className="sm:w-3/4 md:w-5/6 max-w-5xl mx-auto bg-white dark:bg-gray-800 shadow rounded-lg pt-6 pb-8 px-3 sm:px-8">

        <header>
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900 dark:text-white">Wheel Strategy Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">Track, analyze, and optimize your options trades.</p>
        </header>

        {/* DASHBOARD */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-3">
          <StatCard
            title="Total Premium"
            value={`₹${(stats?.totalPremium ?? 0).toLocaleString()}`}
            icon={<IndianRupee />}
            color="bg-cyan-900"
          />
          <StatCard
            title="Win Rate"
            value={`${stats?.winRate ?? 0}%`}
            icon={<Check />}
            color="bg-green-800"
          />
          <StatCard
            title="Open Risk"
            value={`₹${stats?.openRisk?.toLocaleString?.() ?? 0}`}
            icon={<TrendingDown />}
            color="bg-red-900"
          />
        </section>
        <section className="mt-4 grid md:grid-cols-3 gap-4">
          <StatCard
            title="Largest Win"
            value={`₹${stats?.largestWin ?? 0}`}
            icon={<TrendingUp />}
            color="bg-green-600"
          />
          <StatCard
            title="Largest Loss"
            value={`₹${stats?.largestLoss ?? 0}`}
            icon={<TrendingDown />}
            color="bg-red-700"
          />
          <div className="rounded-md bg-blue-50 p-4 flex flex-col items-center justify-center h-full">
            <div className="font-semibold text-blue-800">Phase Breakdown</div>
            <PieChart width={180} height={120}>
              <Pie data={pieChartData}
                   cx="50%"
                   cy="50%"
                   outerRadius={50}
                   dataKey="value"
                   startAngle={90}
                   endAngle={-270}
                   label={({ name, percent }) =>
                     `${name} ${(percent * 100).toFixed(0)}%`
                   }>
                {pieChartData.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
            </PieChart>
          </div>
        </section>
        {/* P&L Chart */}
        <section className="my-5 bg-gray-100 px-4 py-3 rounded shadow">
          <div className="text-gray-700 mb-2 font-bold flex items-center gap-1">
            <TrendingUp /> Cumulative P&amp;L
          </div>
          <div style={{ width: "100%", height: 210 }}>
            <ResponsiveContainer>
              <AreaChart data={pnlChartData}>
                <XAxis dataKey="date" hide />
                <YAxis domain={['auto', 'auto']} tickFormatter={n => n.toLocaleString()} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#06b6d4" fill="#e0f2fe" isAnimationActive />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="my-4 flex items-center justify-between">
          <button
            className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
            aria-label="Add Trade"
            onClick={() => setShowAddTrade(true)}>
            <Plus aria-hidden="true" size={18} /> Add Trade
          </button>
        </section>

        {/* Add Form */}
        {showAddTrade && (
          <form
            aria-label="Add a new trade"
            className="bg-gray-100 border p-3 rounded mb-4"
            onSubmit={e => { e.preventDefault(); addTrade(); }}>
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="text-gray-700 text-sm">Stock Symbol</label>
                <input type="text" className="input input-bordered"
                  value={newTrade.stock} required
                  onChange={e => setNewTrade(t => ({ ...t, stock: e.target.value.toUpperCase() }))} />
              </div>
              <div>
                <label className="text-gray-700 text-sm">Strategy</label>
                <select className="input"
                  value={newTrade.strategy}
                  onChange={e => setNewTrade(t => ({ ...t, strategy: e.target.value }))}>
                  <option value="cash-secured-put">Put (CSP)</option>
                  <option value="covered-call">Call (CC)</option>
                </select>
              </div>
              <div>
                <label className="text-gray-700 text-sm">Strike Price</label>
                <input type="number" className="input"
                  value={newTrade.strikePrice} required
                  onChange={e => setNewTrade(t => ({ ...t, strikePrice: e.target.value }))} />
              </div>
              <div>
                <label className="text-gray-700 text-sm">Premium (₹/sh)</label>
                <input type="number" className="input"
                  value={newTrade.premium} required
                  onChange={e => setNewTrade(t => ({ ...t, premium: e.target.value }))} />
              </div>
              <div>
                <label className="text-gray-700 text-sm">Quantity</label>
                <input type="number" className="input"
                  value={newTrade.quantity} required
                  onChange={e => setNewTrade(t => ({ ...t, quantity: e.target.value }))} />
              </div>
              <div>
                <label className="text-gray-700 text-sm">Expiry</label>
                <input type="date" className="input"
                  value={newTrade.expiry} required
                  onChange={e => setNewTrade(t => ({ ...t, expiry: e.target.value }))} />
              </div>
              <div>
                <label className="text-gray-700 text-sm">Trade Date</label>
                <input type="date" className="input"
                  value={newTrade.tradeDate}
                  onChange={e => setNewTrade(t => ({ ...t, tradeDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-gray-700 text-sm">Entry Price</label>
                <input type="number" className="input"
                  value={newTrade.entryPrice}
                  onChange={e => setNewTrade(t => ({ ...t, entryPrice: e.target.value }))} />
              </div>
              <div>
                <label className="text-gray-700 text-sm">Exit Price</label>
                <input type="number" className="input"
                  value={newTrade.exitPrice}
                  onChange={e => setNewTrade(t => ({ ...t, exitPrice: e.target.value }))} />
              </div>
              <div>
                <label className="text-gray-700 text-sm">Status</label>
                <select className="input"
                  value={newTrade.status}
                  onChange={e => setNewTrade(t => ({ ...t, status: e.target.value }))}>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="exercised">Exercised</option>
                </select>
              </div>
              <div className="w-full">
                <label className="text-gray-700 text-sm">Notes</label>
                <textarea
                  className="input input-bordered w-full"
                  style={{ maxWidth: 320 }}
                  value={newTrade.notes}
                  onChange={e => setNewTrade(t => ({ ...t, notes: e.target.value }))}
                  placeholder="Optionally add trade notes or tags"
                />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-green-300"
                aria-label="Save Trade"
              >
                <Check className="inline" size={16} /> Save
              </button>
              <button
                type="button"
                onClick={() => setShowAddTrade(false)}
                className="bg-gray-300 hover:bg-gray-500 text-gray-800 px-4 py-2 rounded focus:outline-none"
                aria-label="Cancel"
              >
                <X className="inline" size={16} /> Cancel
              </button>
            </div>
          </form>
        )}

        {/* Edit Modal */}
        {showEditModal && editTrade && (
          <div className="fixed z-40 left-0 top-0 w-full h-full bg-black bg-opacity-30 flex items-center justify-center">
            <form
              className="bg-white p-6 rounded shadow-md w-full max-w-lg"
              onSubmit={async e => {
                e.preventDefault();
                await handleEditTrade();
              }}
              aria-label="Edit trade modal"
            >
              <h2 className="text-lg font-bold mb-3">Edit Trade</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-700 text-sm">Stock Symbol</label>
                  <input type="text" className="input input-bordered w-full"
                    value={editTrade.stock}
                    required
                    onChange={e => setEditTrade(t => ({ ...t, stock: e.target.value.toUpperCase() }))}
                  />
                </div>
                <div>
                  <label className="text-gray-700 text-sm">Strategy</label>
                  <select className="input w-full"
                    value={editTrade.strategy}
                    onChange={e => setEditTrade(t => ({ ...t, strategy: e.target.value }))}
                  >
                    <option value="cash-secured-put">Put (CSP)</option>
                    <option value="covered-call">Call (CC)</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-700 text-sm">Strike Price</label>
                  <input type="number" className="input w-full"
                    value={editTrade.strikePrice ?? editTrade.strike_price ?? ""}
                    required
                    onChange={e => setEditTrade(t => ({ ...t, strikePrice: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-gray-700 text-sm">Premium (₹/sh)</label>
                  <input type="number" className="input w-full"
                    value={editTrade.premium}
                    required
                    onChange={e => setEditTrade(t => ({ ...t, premium: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-gray-700 text-sm">Quantity</label>
                  <input type="number" className="input w-full"
                    value={editTrade.quantity}
                    required
                    onChange={e => setEditTrade(t => ({ ...t, quantity: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-gray-700 text-sm">Expiry</label>
                  <input type="date" className="input w-full"
                    value={editTrade.expiry}
                    required
                    onChange={e => setEditTrade(t => ({ ...t, expiry: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-gray-700 text-sm">Trade Date</label>
                  <input type="date" className="input w-full"
                    value={editTrade.tradeDate ?? editTrade.trade_date ?? ""}
                    onChange={e => setEditTrade(t => ({ ...t, tradeDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-gray-700 text-sm">Entry Price</label>
                  <input type="number" className="input w-full"
                    value={editTrade.entryPrice ?? editTrade.entry_price ?? ""}
                    onChange={e => setEditTrade(t => ({ ...t, entryPrice: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-gray-700 text-sm">Exit Price</label>
                  <input type="number" className="input w-full"
                    value={editTrade.exitPrice ?? editTrade.exit_price ?? ""}
                    onChange={e => setEditTrade(t => ({ ...t, exitPrice: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-gray-700 text-sm">Status</label>
                  <select className="input w-full"
                    value={editTrade.status}
                    onChange={e => setEditTrade(t => ({ ...t, status: e.target.value }))}
                  >
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                    <option value="exercised">Exercised</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-gray-700 text-sm">Notes</label>
                  <textarea
                    className="input input-bordered w-full"
                    value={editTrade.notes ?? ""}
                    onChange={e => setEditTrade(t => ({ ...t, notes: e.target.value }))}
                    placeholder="Add trade notes or tags"
                  />
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-green-300"
                  aria-label="Update Trade"
                >
                  <Check className="inline" size={16} /> Update
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="bg-gray-300 hover:bg-gray-500 text-gray-800 px-4 py-2 rounded focus:outline-none"
                  aria-label="Cancel"
                >
                  <X className="inline" size={16} /> Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================== [TRADES TABLE] ================= */}
        <section role="table" aria-label="Trades Table">
          <div className="overflow-x-auto">
            <table className="min-w-full text-gray-900 dark:text-gray-50 border-separate border-spacing-y-2" aria-label="trades">
              <thead>
                <tr>
                  <th>Stock</th>
                  <th>Strategy</th>
                  <th>Earnings</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>Strike</th>
                  <th>Premium</th>
                  <th>Qty</th>
                  <th>Expiry</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading && trades.length === 0 && (
                  <tr>
                    <td colSpan={12} className="text-center text-gray-600 py-8">
                      <PieIcon className="inline mb-0.5 mr-2" /> No trades yet. Add one!
                    </td>
                  </tr>
                )}
                {trades.map(trade => (
                  <tr key={trade.id} className="transition hover:bg-gray-100 dark:hover:bg-gray-700">
                    <td>{trade.stock}</td>
                    <td>
                      <span className="capitalize">{trade.strategy.replace('-', ' ')}</span>
                    </td>
                    <td>
                      <span className={parseFloat(trade.earnings ?? 0) >= 0 ? "text-green-700 font-semibold" : "text-red-700 font-semibold"}>
                        ₹{(trade.earnings ?? 0).toLocaleString()}
                      </span>
                    </td>
                    <td>{trade.entryPrice}</td>
                    <td>{trade.exitPrice}</td>
                    <td>{trade.strikePrice}</td>
                    <td>₹{trade.premium}</td>
                    <td>{trade.quantity}</td>
                    <td>
                      <time dateTime={trade.expiry}>{trade.expiry}</time>
                    </td>
                    <td>
                      <span className={`rounded px-2 py-1 text-xs font-semibold ${
                        trade.status === 'open' ? 'bg-blue-100 text-blue-800'
                        : trade.status === 'closed' ? 'bg-green-100 text-green-800'
                        : trade.status === 'exercised' ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                      }`} aria-label={`status ${trade.status}`}>{trade.status}</span>
                    </td>
                    <td>
                      {trade.notes ? <span title={trade.notes}><FileText size={16} className="inline text-blue-700" /></span> : ''}
                    </td>
                    <td className="flex gap-2">
                      <button
                        aria-label="Edit"
                        className="bg-yellow-200 hover:bg-yellow-300 text-yellow-900 px-2 py-1 rounded"
                        onClick={() => {
                          setEditTrade(trade);
                          setShowEditModal(true);
                        }}
                      >
                        <Edit2 size={16} aria-hidden="true" />
                      </button>
                      <button aria-label="Delete" className="bg-red-200 hover:bg-red-400 text-red-900 px-2 py-1 rounded"
                        onClick={() => deleteTrade(trade.id)}>
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex gap-2 mt-5" aria-label="Import/export">
          <button
            className="flex items-center gap-2 px-4 py-2 text-blue-900 bg-blue-100 hover:bg-blue-200 rounded focus:ring-2 focus:ring-blue-300"
            aria-label="Export as JSON"
            onClick={exportData}>
            <Download size={16} /> Export
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded cursor-pointer">
            <Upload size={16} /> Import
            <input
              type="file"
              accept="application/json"
              className="hidden"
              aria-label="Import JSON"
              onChange={importData}
            />
          </label>
        </section>
        {loading && <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"><div className="bg-white text-blue-600 px-8 py-5 rounded shadow-lg text-xl">Loading...</div></div>}
      </main>
    </div>
  );
};

export default App;
