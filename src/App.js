import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, IndianRupee, Calendar, PieChart, Download, Upload, Trash2, Edit2, Check, X } from 'lucide-react';

// You'll need to create this file with your Supabase config
const supabase = {
  from: (table) => ({
    select: (columns = '*') => ({
      order: (column, options) => ({
        then: (callback) => callback({ data: [], error: null })
      })
    }),
    insert: (data) => ({
      select: () => ({
        then: (callback) => callback({ data: data.map(item => ({ ...item, id: Date.now() + Math.random() })), error: null })
      })
    }),
    update: (data) => ({
      eq: (column, value) => ({
        then: (callback) => callback({ error: null })
      })
    }),
    delete: () => ({
      eq: (column, value) => ({
        then: (callback) => callback({ error: null })
      })
    })
  })
};

const App = () => {
  const [trades, setTrades] = useState([]);
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [newTrade, setNewTrade] = useState({
    stock: '', strategy: 'cash-secured-put', strikePrice: '', premium: '', quantity: '',
    expiry: '', tradeDate: new Date().toISOString().split('T')[0], status: 'open',
    entryPrice: '', exitPrice: ''
  });

  const calcEarnings = (trade) => {
    const { entry_price, exit_price, quantity } = trade;
    if (!entry_price || !exit_price || !quantity) return 0;
    return (exit_price - entry_price) * quantity;
  };

  useEffect(() => {
    const fetchTrades = async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .order('trade_date', { ascending: false });

      if (error) {
        console.error('Error fetching trades:', error);
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
    };
    fetchTrades();
  }, []);

  const addTrade = async () => {
    if (!newTrade.stock || !newTrade.strikePrice || !newTrade.premium || !newTrade.quantity || !newTrade.expiry) {
      alert('Please fill all required fields');
      return;
    }

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
      exit_price: newTrade.exitPrice ? parseFloat(newTrade.exitPrice) : null
    };

    try {
      const { data, error } = await supabase.from('trades').insert([trade]).select();
      if (error) {
        console.error('❌ Supabase Insert Error:', error);
        alert('Error saving trade. Please try again.');
        return;
      }

      const enrichedTrade = {
        ...data[0],
        strikePrice: data[0].strike_price,
        entryPrice: data[0].entry_price,
        exitPrice: data[0].exit_price,
        totalPremium: (data[0].premium || 0) * (data[0].quantity || 0),
        earnings: calcEarnings(data[0])
      };

      setTrades([enrichedTrade, ...trades]);
      setNewTrade({
        stock: '', strategy: 'cash-secured-put', strikePrice: '', premium: '', quantity: '',
        expiry: '', tradeDate: new Date().toISOString().split('T')[0], status: 'open',
        entryPrice: '', exitPrice: ''
      });
      setShowAddTrade(false);
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('Unexpected error while saving trade.');
    }
  };

  const updateTrade = async (id, updatedTrade) => {
    const updated = {
      stock: updatedTrade.stock,
      strategy: updatedTrade.strategy,
      strike_price: parseFloat(updatedTrade.strikePrice),
      premium: parseFloat(updatedTrade.premium),
      quantity: parseInt(updatedTrade.quantity),
      expiry: updatedTrade.expiry,
      trade_date: updatedTrade.tradeDate,
      status: updatedTrade.status,
      entry_price: updatedTrade.entryPrice ? parseFloat(updatedTrade.entryPrice) : null,
      exit_price: updatedTrade.exitPrice ? parseFloat(updatedTrade.exitPrice) : null
    };

    const { error } = await supabase.from('trades').update(updated).eq('id', id);
    if (error) {
      console.error('❌ Update failed:', error);
      alert('Failed to update trade.');
      return;
    }

    setTrades(trades.map(trade => trade.id === id ? {
      ...trade,
      ...updated,
      strikePrice: updated.strike_price,
      entryPrice: updated.entry_price,
      exitPrice: updated.exit_price,
      totalPremium: updated.premium * updated.quantity,
      earnings: calcEarnings(updated)
    } : trade));
  };

  const deleteTrade = async (id) => {
    if (!window.confirm('Are you sure you want to delete this trade?')) return;

    const { error } = await supabase.from('trades').delete().eq('id', id);
    if (error) {
      console.error('❌ Delete failed:', error);
      alert('Failed to delete trade.');
      return;
    }
    setTrades(trades.filter(trade => trade.id !== id));
  };

  const calcStats = () => {
    const totalPremium = trades.reduce((sum, t) => sum + (t.totalPremium || 0), 0);
    const openTrades = trades.filter(t => t.status === 'open').length;
    const closedTrades = trades.filter(t => t.status === 'closed').length;
    const exercisedTrades = trades.filter(t => t.status === 'exercised').length;
    return { totalPremium, openTrades, closedTrades, exercisedTrades, totalTrades: trades.length };
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
        } catch (error) {
          alert('Error importing data. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  const stats = calcStats();

  const TradeRow = ({ trade, onEdit, onDelete }) => {
    const [editing, setEditing] = useState(false);
    const [editData, setEditData] = useState(trade);

    if (editing) {
      return (
        <tr className="bg-blue-50">
          <td className="px-4 py-2">
            <input type="text" value={editData.stock} onChange={(e) => setEditData({...editData, stock: e.target.value})} className="w-full px-2 py-1 border rounded" />
          </td>
          <td className="px-4 py-2">
            <select value={editData.strategy} onChange={(e) => setEditData({...editData, strategy: e.target.value})} className="w-full px-2 py-1 border rounded">
              <option value="cash-secured-put">CSP</option>
              <option value="covered-call">CC</option>
              <option value="stock-buy">Buy</option>
            </select>
          </td>
          <td className="px-4 py-2">₹{trade.earnings?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
          <td className="px-4 py-2">
            <input type="number" value={editData.entryPrice || ''} onChange={(e) => setEditData({...editData, entryPrice: e.target.value})} className="w-full px-2 py-1 border rounded" />
          </td>
          <td className="px-4 py-2">
            <input type="number" value={editData.exitPrice || ''} onChange={(e) => setEditData({...editData, exitPrice: e.target.value})} className="w-full px-2 py-1 border rounded" />
          </td>
          <td className="px-4 py-2">
            <input type="number" value={editData.strikePrice} onChange={(e) => setEditData({...editData, strikePrice: e.target.value})} className="w-full px-2 py-1 border rounded" />
          </td>
          <td className="px-4 py-2">
            <input type="number" value={editData.premium} onChange={(e) => setEditData({...editData, premium: e.target.value})} className="w-full px-2 py-1 border rounded" />
          </td>
          <td className="px-4 py-2">
            <input type="number" value={editData.quantity} onChange={(e) => setEditData({...editData, quantity: e.target.value})} className="w-full px-2 py-1 border rounded" />
          </td>
          <td className="px-4 py-2">
            <input type="date" value={editData.expiry} onChange={(e) => setEditData({...editData, expiry: e.target.value})} className="w-full px-2 py-1 border rounded" />
          </td>
          <td className="px-4 py-2">
            <select value={editData.status} onChange={(e) => setEditData({...editData, status: e.target.value})} className="w-full px-2 py-1 border rounded">
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="exercised">Exercised</option>
            </select>
          </td>
          <td className="px-4 py-2">
            <div className="flex space-x-1">
              <button onClick={() => { onEdit(trade.id, editData); setEditing(false); }} className="text-green-600 hover:text-green-800">
                <Check size={16} />
              </button>
              <button onClick={() => setEditing(false)} className="text-red-600 hover:text-red-800">
                <X size={16} />
              </button>
            </div>
          </td>
        </tr>
      );
    }

    return (
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-2 font-medium">{trade.stock}</td>
        <td className="px-4 py-2">
          <span className={`px-2 py-1 rounded text-xs ${trade.strategy === 'cash-secured-put' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
            {trade.strategy === 'cash-secured-put' ? 'CSP' : trade.strategy === 'covered-call' ? 'CC' : 'Buy'}
          </span>
        </td>
        <td className="px-4 py-2">₹{trade.earnings?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
        <td className="px-4 py-2">{trade.entryPrice || '-'}</td>
        <td className="px-4 py-2">{trade.exitPrice || '-'}</td>
        <td className="px-4 py-2">₹{trade.strikePrice}</td>
        <td className="px-4 py-2">₹{trade.premium}</td>
        <td className="px-4 py-2">{trade.quantity}</td>
        <td className="px-4 py-2">{trade.expiry}</td>
        <td className="px-4 py-2">
          <span className={`px-2 py-1 rounded text-xs ${trade.status === 'open' ? 'bg-yellow-100 text-yellow-800' : trade.status === 'closed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {trade.status}
          </span>
        </td>
        <td className="px-4 py-2">
          <div className="flex space-x-1">
            <button onClick={() => setEditing(true)} className="text-blue-600 hover:text-blue-800">
              <Edit2 size={16} />
            </button>
            <button onClick={() => onDelete(trade.id)} className="text-red-600 hover:text-red-800">
              <Trash2 size={16} />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Wheel Strategy Tracker</h1>
          <p className="text-gray-600">Track your trades in the Indian market</p>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded shadow-sm">
            <div className="flex items-center">
              <IndianRupee className="h-6 w-6 text-green-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Total Premium</p>
                <p className="text-lg font-bold">₹{stats.totalPremium.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded shadow-sm">
            <div className="flex items-center">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Open</p>
                <p className="text-lg font-bold">{stats.openTrades}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded shadow-sm">
            <div className="flex items-center">
              <TrendingDown className="h-6 w-6 text-green-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Closed</p>
                <p className="text-lg font-bold">{stats.closedTrades}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded shadow-sm">
            <div className="flex items-center">
              <Calendar className="h-6 w-6 text-red-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Exercised</p>
                <p className="text-lg font-bold">{stats.exercisedTrades}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded shadow-sm">
            <div className="flex items-center">
              <PieChart className="h-6 w-6 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-lg font-bold">{stats.totalTrades}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setShowAddTrade(true)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center space-x-2">
            <Plus size={18} />
            <span>Add Trade</span>
          </button>
          <div className="flex space-x-2">
            <button onClick={exportData} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center space-x-2">
              <Download size={18} />
              <span>Export</span>
            </button>
            <label className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 flex items-center space-x-2 cursor-pointer">
              <Upload size={18} />
              <span>Import</span>
              <input type="file" accept=".json" onChange={importData} className="hidden" />
            </label>
          </div>
        </div>

        {/* Add Trade Modal */}
        {showAddTrade && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Add New Trade</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Stock</label>
                  <input type="text" value={newTrade.stock} onChange={(e) => setNewTrade({...newTrade, stock: e.target.value.toUpperCase()})} className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500" placeholder="RELIANCE" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Strategy</label>
                  <select value={newTrade.strategy} onChange={(e) => setNewTrade({...newTrade, strategy: e.target.value})} className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                    <option value="cash-secured-put">Cash Secured Put</option>
                    <option value="covered-call">Covered Call</option>
                    <option value="stock-buy">Stock Buy</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Strike (₹)</label>
                    <input type="number" value={newTrade.strikePrice} onChange={(e) => setNewTrade({...newTrade, strikePrice: e.target.value})} className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Premium (₹)</label>
                    <input type="number" value={newTrade.premium} onChange={(e) => setNewTrade({...newTrade, premium: e.target.value})} className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Quantity</label>
                    <input type="number" value={newTrade.quantity} onChange={(e) => setNewTrade({...newTrade, quantity: e.target.value})} className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Expiry</label>
                    <input type="date" value={newTrade.expiry} onChange={(e) => setNewTrade({...newTrade, expiry: e.target.value})} className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Entry Price</label>
                    <input type="number" value={newTrade.entryPrice || ''} onChange={(e) => setNewTrade({...newTrade, entryPrice: e.target.value})} className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500" placeholder="Optional" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Exit Price</label>
                    <input type="number" value={newTrade.exitPrice || ''} onChange={(e) => setNewTrade({...newTrade, exitPrice: e.target.value})} className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500" placeholder="Optional" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button onClick={() => setShowAddTrade(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                <button onClick={addTrade} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Add Trade</button>
              </div>
            </div>
          </div>
        )}

        {/* Trades Table */}
        <div className="bg-white shadow-sm rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Strategy</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Earnings</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Strike</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Premium</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {trades.map(trade => (
                  <TradeRow key={trade.id} trade={trade} onEdit={updateTrade} onDelete={deleteTrade} />
                ))}
              </tbody>
            </table>
          </div>
          {trades.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No trades yet. Add your first trade to get started!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
