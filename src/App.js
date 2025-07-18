import React, { useState, useEffect } from 'react';
import {
  Plus, TrendingUp, TrendingDown, IndianRupee, Calendar, PieChart,
  Download, Upload, Trash2, Edit2, Check, X
} from 'lucide-react';
import supabase from './supabaseClient'; // uses your provided config

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
  exitPrice: ''
};

const statusBadge = (status) => {
  let color;
  if (status === 'open') color = 'bg-blue-100 text-blue-800';
  else if (status === 'closed') color = 'bg-green-100 text-green-800';
  else if (status === 'exercised') color = 'bg-yellow-100 text-yellow-800';
  else color = 'bg-gray-100 text-gray-800';
  return (
    <span className={`rounded px-2 py-1 text-xs font-semibold ${color}`} aria-label={`status ${status}`}>{status}</span>
  );
};

const App = () => {
  const [trades, setTrades] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTrade, setNewTrade] = useState(defaultTrade);
  const [loading, setLoading] = useState(false);
  const [focusSave, setFocusSave] = useState(false);

  // Helper calculations
  const calcEarnings = (t) => {
    if (!t.entryPrice || !t.exitPrice || !t.quantity) return 0;
    return ((t.exitPrice - t.entryPrice) * t.quantity);
  };

  useEffect(() => {
    // fetch trades from Supabase
    const fetchTrades = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .order('trade_date', { ascending: false });
      if (!error && data) {
        const mapped = data.map(t => ({
          ...t,
          strikePrice: t.strike_price,
          entryPrice: t.entry_price,
          exitPrice: t.exit_price,
          totalPremium: (t.premium || 0) * (t.quantity || 0),
          earnings: calcEarnings(t)
        }));
        setTrades(mapped);
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
    const dbTrade = {
      stock: newTrade.stock,
      strategy: newTrade.strategy,
      strike_price: parseFloat(newTrade.strikePrice),
      premium: parseFloat(newTrade.premium),
      quantity: parseInt(newTrade.quantity, 10),
      expiry: newTrade.expiry,
      trade_date: newTrade.tradeDate,
      status: newTrade.status,
      entry_price: newTrade.entryPrice ? parseFloat(newTrade.entryPrice) : null,
      exit_price: newTrade.exitPrice ? parseFloat(newTrade.exitPrice) : null
    };
    const { data, error } = await supabase.from('trades').insert([dbTrade]).select();
    setLoading(false);
    if (error) {
      alert('Error saving trade. Please try again.');
      return;
    }
    if (data && data[0]) {
      const added = {
        ...data[0],
        strikePrice: data[0].strike_price,
        entryPrice: data[0].entry_price,
        exitPrice: data[0].exit_price,
        totalPremium: (data[0].premium || 0) * (data[0].quantity || 0),
        earnings: calcEarnings(data[0])
      };
      setTrades(t => [added, ...t]);
    }
    setNewTrade(defaultTrade);
    setShowAdd(false);
  };

  const editTrade = async (id, updatedTrade) => {
    setLoading(true);
    const dbTrade = {
      stock: updatedTrade.stock,
      strategy: updatedTrade.strategy,
      strike_price: parseFloat(updatedTrade.strikePrice),
      premium: parseFloat(updatedTrade.premium),
      quantity: parseInt(updatedTrade.quantity, 10),
      expiry: updatedTrade.expiry,
      trade_date: updatedTrade.tradeDate,
      status: updatedTrade.status,
      entry_price: updatedTrade.entryPrice ? parseFloat(updatedTrade.entryPrice) : null,
      exit_price: updatedTrade.exitPrice ? parseFloat(updatedTrade.exitPrice) : null
    };
    const { error } = await supabase.from('trades').update(dbTrade).eq('id', id);
    setLoading(false);
    if (error) {
      alert('Failed to update trade');
      return;
    }
    setTrades(trades.map(t => t.id === id
      ? { ...t, ...dbTrade, strikePrice: dbTrade.strike_price, entryPrice: dbTrade.entry_price, exitPrice: dbTrade.exit_price, totalPremium: dbTrade.premium * dbTrade.quantity, earnings: calcEarnings(dbTrade) }
      : t));
  };

  const deleteTrade = async (id) => {
    if (!window.confirm('Delete this trade?')) return;
    setLoading(true);
    await supabase.from('trades').delete().eq('id', id);
    setLoading(false);
    setTrades(trades.filter(t => t.id !== id));
  };

  // Dashboard calculations
  const stats = {
    totalPremium: trades.reduce((sum, t) => sum + (t.totalPremium || 0), 0),
    open: trades.filter(t => t.status === 'open').length,
    closed: trades.filter(t => t.status === 'closed').length,
    exercised: trades.filter(t => t.status === 'exercised').length,
    total: trades.length
  };

  return (
    <div className="bg-gray-50 min-h-screen dark:bg-gray-900 px-2 py-6">
      <main className="sm:w-3/4 md:w-2/3 max-w-3xl mx-auto bg-white dark:bg-gray-800 shadow rounded-lg pt-6 pb-8 px-3 sm:px-8">
        <header>
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900 dark:text-white">Wheel Strategy Trading Journal</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-2">Track your trades with accessibility-friendly, responsive UI.</p>
        </header>

        {/* Dashboard */}
        <section className="flex gap-3 flex-wrap mt-4 mb-6" aria-label="statistics">
          <div className="flex-1 text-center p-4 rounded bg-cyan-50 dark:bg-cyan-900">
            <IndianRupee className="inline" /> <div className="text-lg font-bold">{stats.totalPremium.toLocaleString()}</div>
            <div className="text-gray-600 dark:text-gray-200 text-xs">Total Premium</div>
          </div>
          <div className="flex-1 text-center p-4 rounded bg-blue-50 dark:bg-blue-900">
            <TrendingUp className="inline" /> <div className="text-lg font-bold">{stats.open}</div>
            <div className="text-gray-600 dark:text-gray-200 text-xs">Open</div>
          </div>
          <div className="flex-1 text-center p-4 rounded bg-green-50 dark:bg-green-900">
            <TrendingDown className="inline" /> <div className="text-lg font-bold">{stats.closed}</div>
            <div className="text-gray-600 dark:text-gray-200 text-xs">Closed</div>
          </div>
        </section>

        <section className="my-4 flex items-center justify-between">
          <button
            tabIndex={0}
            className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
            aria-label="Add Trade"
            onClick={() => setShowAdd(true)}
          >
            <Plus aria-hidden="true" size={18} /> Add Trade
          </button>
        </section>

        {/* Add Form */}
        {showAdd && (
          <form
            aria-label="Add a new trade"
            className="bg-gray-100 border p-3 rounded mb-4"
            onSubmit={e => { e.preventDefault(); addTrade(); }}
          >
            <div className="flex flex-wrap gap-3">
              <div>
                <label htmlFor="stock" className="text-gray-700 text-sm">Stock Symbol</label>
                <input id="stock" name="stock" type="text" className="input input-bordered"
                  value={newTrade.stock} required
                  onChange={e => setNewTrade(t => ({ ...t, stock: e.target.value.toUpperCase() }))}
                />
              </div>
              <div>
                <label htmlFor="strategy" className="text-gray-700 text-sm">Strategy</label>
                <select id="strategy" name="strategy" className="input"
                  value={newTrade.strategy}
                  onChange={e => setNewTrade(t => ({ ...t, strategy: e.target.value }))}
                >
                  <option value="cash-secured-put">Put (CSP)</option>
                  <option value="covered-call">Call (CC)</option>
                </select>
              </div>
              <div>
                <label htmlFor="strikePrice" className="text-gray-700 text-sm">Strike Price</label>
                <input id="strikePrice" type="number" className="input"
                  value={newTrade.strikePrice} required
                  onChange={e => setNewTrade(t => ({ ...t, strikePrice: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="premium" className="text-gray-700 text-sm">Premium (₹/sh)</label>
                <input id="premium" type="number" className="input"
                  value={newTrade.premium} required
                  onChange={e => setNewTrade(t => ({ ...t, premium: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="quantity" className="text-gray-700 text-sm">Quantity</label>
                <input id="quantity" type="number" className="input"
                  value={newTrade.quantity} required
                  onChange={e => setNewTrade(t => ({ ...t, quantity: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="expiry" className="text-gray-700 text-sm">Expiry</label>
                <input id="expiry" type="date" className="input"
                  value={newTrade.expiry} required
                  onChange={e => setNewTrade(t => ({ ...t, expiry: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="tradeDate" className="text-gray-700 text-sm">Trade Date</label>
                <input id="tradeDate" type="date" className="input"
                  value={newTrade.tradeDate}
                  onChange={e => setNewTrade(t => ({ ...t, tradeDate: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="entryPrice" className="text-gray-700 text-sm">Entry Price</label>
                <input id="entryPrice" type="number" className="input"
                  value={newTrade.entryPrice}
                  onChange={e => setNewTrade(t => ({ ...t, entryPrice: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="exitPrice" className="text-gray-700 text-sm">Exit Price</label>
                <input id="exitPrice" type="number" className="input"
                  value={newTrade.exitPrice}
                  onChange={e => setNewTrade(t => ({ ...t, exitPrice: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="status" className="text-gray-700 text-sm">Status</label>
                <select id="status" className="input"
                  value={newTrade.status}
                  onChange={e => setNewTrade(t => ({ ...t, status: e.target.value }))}
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="exercised">Exercised</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-green-300"
                tabIndex={0}
                autoFocus={focusSave}
                onFocus={() => setFocusSave(true)}
                aria-label="Save Trade"
              >
                <Check className="inline" size={16} /> Save
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="bg-gray-300 hover:bg-gray-500 text-gray-800 px-4 py-2 rounded focus:outline-none"
                tabIndex={0}
                aria-label="Cancel"
              >
                <X className="inline" size={16} /> Cancel
              </button>
            </div>
          </form>
        )}
        {/* Table */}
        <section role="table" aria-label="Trades Table">
          <div className="overflow-x-auto">
            <table className="min-w-full text-gray-900 dark:text-gray-50 border-separate border-spacing-y-2" aria-label="trades">
              <thead>
                <tr>
                  <th>Stock</th>
                  <th>Strategy</th>
                  <th>Earn</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>Strike</th>
                  <th>Premium</th>
                  <th>Qty</th>
                  <th>Expiry</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading && trades.length === 0 && (
                  <tr>
                    <td colSpan={11} className="text-center text-gray-600 py-8">
                      <PieChart className="inline mb-0.5 mr-2" /> No trades yet. Add one!
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
                      ₹{trade.earnings?.toLocaleString() || '-'}
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
                      {statusBadge(trade.status)}
                    </td>
                    <td className="flex gap-2">
                      <button aria-label="Edit" className="bg-yellow-200 hover:bg-yellow-300 text-yellow-900 px-2 py-1 rounded"
                        onClick={() => {
                          setNewTrade({
                            ...trade,
                            strikePrice: trade.strikePrice || trade.strike_price,
                            entryPrice: trade.entryPrice || trade.entry_price,
                            exitPrice: trade.exitPrice || trade.exit_price,
                            tradeDate: trade.trade_date,
                          });
                          setShowAdd(true);
                        }}>
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
            tabIndex={0}
            className="flex items-center gap-2 px-4 py-2 text-blue-900 bg-blue-100 hover:bg-blue-200 rounded focus:ring-2 focus:ring-blue-300"
            aria-label="Export as JSON"
            onClick={() => {
              const dataStr = JSON.stringify(trades, null, 2);
              const link = document.createElement('a');
              link.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
              link.download = 'trades.json';
              link.click();
            }}>
            <Download size={16} /> Export
          </button>
          <label htmlFor="importfile" className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded cursor-pointer">
            <Upload size={16} /> Import
            <input
              id="importfile"
              type="file"
              accept="application/json"
              className="hidden"
              tabIndex={0}
              aria-label="Import JSON"
              onChange={e => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = event => {
                    try {
                      setTrades(JSON.parse(event.target.result));
                    } catch (err) {
                      alert('Import failed.');
                    }
                  };
                  reader.readAsText(file);
                }
              }}
            />
          </label>
        </section>
        {loading && <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"><div className="bg-white text-blue-600 px-8 py-5 rounded shadow-lg text-xl">Loading...</div></div>}
      </main>
    </div>
  );
};

export default App;
