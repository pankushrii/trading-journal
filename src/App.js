import React, { useState, useEffect } from 'react';
import supabase from './lib/supabaseClient';
import { Plus, TrendingUp, TrendingDown, IndianRupee, Calendar, PieChart, Download, Upload, Trash2, Edit2, Check, X } from 'lucide-react';

const App = () => {
  const [trades, setTrades] = useState([]);
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [newTrade, setNewTrade] = useState({
    stock: '',
    strategy: 'cash-secured-put',
    strikePrice: '',
    premium: '',
    quantity: '',
    expiry: '',
    tradeDate: new Date().toISOString().split('T')[0],
    status: 'open'
  });

  // Load trades from localStorage on component mount
 useEffect(() => {
  const fetchTrades = async () => {
    const { data, error } = await supabase.from('trades').select('*').order('trade_date', { ascending: false });
    if (error) console.error('Error fetching trades:', error);
    else setTrades(data);
  };
  fetchTrades();
}, []);


  // Save trades to localStorage whenever trades change
  useEffect(() => {
    localStorage.setItem('wheelTrades', JSON.stringify(trades));
  }, [trades]);

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
   // total_premium: parseFloat(newTrade.premium) * parseInt(newTrade.quantity)
  };

  try {
    const { data, error } = await supabase.from('trades').insert([trade]).select();

    if (error) {
      console.error('❌ Supabase Insert Error:', error);
      alert('Error saving trade. Please try again.');
      return;
    }

    // Add new trade to state
    setTrades([...trades, data[0]]);

    // Reset form
    setNewTrade({
      stock: '',
      strategy: 'cash-secured-put',
      strikePrice: '',
      premium: '',
      quantity: '',
      expiry: '',
      tradeDate: new Date().toISOString().split('T')[0],
      status: 'open'
    });

    setShowAddTrade(false);
  } catch (err) {
    console.error('Unexpected error:', err);
    alert('Unexpected error while saving trade.');
  }
};

  const updateTrade = (id, updatedTrade) => {
    setTrades(trades.map(trade => 
      trade.id === id 
        ? { ...updatedTrade, totalPremium: updatedTrade.premium * updatedTrade.quantity }
        : trade
    ));
    setEditingTrade(null);
  };

  const deleteTrade = (id) => {
    if (window.confirm('Are you sure you want to delete this trade?')) {
      setTrades(trades.filter(trade => trade.id !== id));
    }
  };

  const calculateStats = () => {
    const totalPremium = trades.reduce((sum, trade) => sum + trade.totalPremium, 0);
    const openTrades = trades.filter(trade => trade.status === 'open').length;
    const closedTrades = trades.filter(trade => trade.status === 'closed').length;
    const exercisedTrades = trades.filter(trade => trade.status === 'exercised').length;
    
    return {
      totalPremium,
      openTrades,
      closedTrades,
      exercisedTrades,
      totalTrades: trades.length
    };
  };

  const exportData = () => {
    const dataStr = JSON.stringify(trades, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'wheel-strategy-trades.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedTrades = JSON.parse(e.target.result);
          setTrades(importedTrades);
          alert('Data imported successfully!');
        } catch (error) {
          alert('Error importing data. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  const stats = calculateStats();

  const TradeRow = ({ trade, onEdit, onDelete }) => {
    const [editing, setEditing] = useState(false);
    const [editData, setEditData] = useState(trade);

    if (editing) {
      return (
        <tr className="bg-blue-50">
          <td className="px-6 py-4">
            <input
              type="text"
              value={editData.stock}
              onChange={(e) => setEditData({...editData, stock: e.target.value})}
              className="w-full px-2 py-1 border rounded"
            />
          </td>
          <td className="px-6 py-4">
            <select
              value={editData.strategy}
              onChange={(e) => setEditData({...editData, strategy: e.target.value})}
              className="w-full px-2 py-1 border rounded"
            >
              <option value="cash-secured-put">Cash Secured Put</option>
              <option value="covered-call">Covered Call</option>
            </select>
          </td>
          <td className="px-6 py-4">
            <input
              type="number"
              value={editData.strikePrice}
              onChange={(e) => setEditData({...editData, strikePrice: parseFloat(e.target.value)})}
              className="w-full px-2 py-1 border rounded"
            />
          </td>
          <td className="px-6 py-4">
            <input
              type="number"
              value={editData.premium}
              onChange={(e) => setEditData({...editData, premium: parseFloat(e.target.value)})}
              className="w-full px-2 py-1 border rounded"
            />
          </td>
          <td className="px-6 py-4">
            <input
              type="number"
              value={editData.quantity}
              onChange={(e) => setEditData({...editData, quantity: parseInt(e.target.value)})}
              className="w-full px-2 py-1 border rounded"
            />
          </td>
          <td className="px-6 py-4">
            <input
              type="date"
              value={editData.expiry}
              onChange={(e) => setEditData({...editData, expiry: e.target.value})}
              className="w-full px-2 py-1 border rounded"
            />
          </td>
          <td className="px-6 py-4">
            <select
              value={editData.status}
              onChange={(e) => setEditData({...editData, status: e.target.value})}
              className="w-full px-2 py-1 border rounded"
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="exercised">Exercised</option>
            </select>
          </td>
          <td className="px-6 py-4">
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  onEdit(trade.id, editData);
                  setEditing(false);
                }}
                className="text-green-600 hover:text-green-800"
              >
                <Check size={18} />
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-red-600 hover:text-red-800"
              >
                <X size={18} />
              </button>
            </div>
          </td>
        </tr>
      );
    }

    return (
      <tr className="hover:bg-gray-50">
        <td className="px-6 py-4 font-medium text-gray-900">{trade.stock}</td>
        <td className="px-6 py-4">
          <span className={`px-2 py-1 rounded-full text-xs ₹{
            trade.strategy === 'cash-secured-put' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-green-100 text-green-800'
          }`}>
            {trade.strategy === 'cash-secured-put' ? 'CSP' : 'CC'}
          </span>
        </td>
        <td className="px-6 py-4">₹{trade.strikePrice}</td>
        <td className="px-6 py-4">₹{trade.premium}</td>
        <td className="px-6 py-4">{trade.quantity}</td>
        <td className="px-6 py-4">{trade.expiry}</td>
        <td className="px-6 py-4">
          <span className={`px-2 py-1 rounded-full text-xs ₹{
            trade.status === 'open' 
              ? 'bg-yellow-100 text-yellow-800' 
              : trade.status === 'closed'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {trade.status}
          </span>
        </td>
        <td className="px-6 py-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setEditing(true)}
              className="text-blue-600 hover:text-blue-800"
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={() => onDelete(trade.id)}
              className="text-red-600 hover:text-red-800"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Wheel Strategy Tracker</h1>
          <p className="text-gray-600">Track your cash-secured puts and covered calls in the Indian market</p>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <IndianRupee className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Premium</p>
                <p className="text-2xl font-bold text-gray-900">₹{stats.totalPremium.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Open Trades</p>
                <p className="text-2xl font-bold text-gray-900">{stats.openTrades}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <TrendingDown className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Closed Trades</p>
                <p className="text-2xl font-bold text-gray-900">{stats.closedTrades}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Exercised</p>
                <p className="text-2xl font-bold text-gray-900">{stats.exercisedTrades}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <PieChart className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Trades</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalTrades}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => setShowAddTrade(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Add Trade</span>
          </button>
          
          <div className="flex space-x-2">
            <button
              onClick={exportData}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <Download size={20} />
              <span>Export</span>
            </button>
            
            <label className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2 cursor-pointer">
              <Upload size={20} />
              <span>Import</span>
              <input
                type="file"
                accept=".json"
                onChange={importData}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Add Trade Modal */}
        {showAddTrade && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Add New Trade</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Symbol</label>
                  <input
                    type="text"
                    value={newTrade.stock}
                    onChange={(e) => setNewTrade({...newTrade, stock: e.target.value.toUpperCase()})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., RELIANCE"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Strategy</label>
                  <select
                    value={newTrade.strategy}
                    onChange={(e) => setNewTrade({...newTrade, strategy: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cash-secured-put">Cash Secured Put</option>
                    <option value="covered-call">Covered Call</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Strike Price (₹)</label>
                  <input
                    type="number"
                    value={newTrade.strikePrice}
                    onChange={(e) => setNewTrade({...newTrade, strikePrice: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="2500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Premium per Share (₹)</label>
                  <input
                    type="number"
                    value={newTrade.premium}
                    onChange={(e) => setNewTrade({...newTrade, premium: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={newTrade.quantity}
                    onChange={(e) => setNewTrade({...newTrade, quantity: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={newTrade.expiry}
                    onChange={(e) => setNewTrade({...newTrade, expiry: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trade Date</label>
                  <input
                    type="date"
                    value={newTrade.tradeDate}
                    onChange={(e) => setNewTrade({...newTrade, tradeDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => setShowAddTrade(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={addTrade}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Trade
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Trades Table */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strategy</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strike Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Premium</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trades.map(trade => (
                  <TradeRow 
                    key={trade.id} 
                    trade={trade} 
                    onEdit={updateTrade}
                    onDelete={deleteTrade}
                  />
                ))}
              </tbody>
            </table>
          </div>
          
          {trades.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No trades yet. Add your first trade to get started!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
