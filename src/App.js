import React, { useState, useEffect } from 'react';
import supabase from './lib/supabaseClient';
import {
  Plus, TrendingUp, TrendingDown, IndianRupee,
  Calendar, PieChart, Download, Upload, Trash2, Edit2, Check, X
} from 'lucide-react';

const App = () => {
  const [trades, setTrades] = useState([]);
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [newTrade, setNewTrade] = useState({
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
  });

  const calculateEarnings = (trade) => {
    const { strategy, entry_price, exit_price, quantity, premium, strike_price, status } = trade;
    if (strategy === 'stock-buy') {
      if (entry_price == null || exit_price == null || quantity == null) return 0;
      return (exit_price - entry_price) * quantity;
    }
    if (strategy === 'cash-secured-put') {
      if (entry_price == null || exit_price == null || quantity == null || premium == null) return 0;
      return (exit_price - entry_price) * quantity + premium * quantity;
    }
    if (strategy === 'covered-call') {
      if (entry_price == null || strike_price == null || quantity == null || premium == null) return 0;
      const effectiveExit = status === 'exercised' ? strike_price : exit_price;
      if (effectiveExit == null) return 0;
      return (effectiveExit - entry_price) * quantity + premium * quantity;
    }
    return 0;
  };

  const fetchTrades = async () => {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .order('trade_date', { ascending: false });

    if (error) {
      console.error('Error fetching trades:', error);
    } else {
      const enrichedTrades = data.map((trade) => ({
        ...trade,
        strikePrice: trade.strike_price,
        entryPrice: trade.entry_price,
        exitPrice: trade.exit_price,
        totalPremium: (trade.premium || 0) * (trade.quantity || 0),
        earnings: calculateEarnings(trade),
      }));
      setTrades(enrichedTrades);
    }
  };

  useEffect(() => {
    fetchTrades();
  }, []);

  useEffect(() => {
    localStorage.setItem('wheelTrades', JSON.stringify(trades));
  }, [trades]);

  const addTrade = async () => {
    const requiredFields = ['stock', 'quantity', 'tradeDate', 'status'];
    const strategyFields = {
      'cash-secured-put': ['strikePrice', 'premium', 'expiry'],
      'covered-call': ['strikePrice', 'premium', 'expiry', 'entryPrice'],
      'stock-buy': ['entryPrice']
    };

    const missing = [...requiredFields, ...(strategyFields[newTrade.strategy] || [])]
      .filter((f) => !newTrade[f]);

    if (missing.length > 0) {
      alert('Missing fields: ' + missing.join(', '));
      return;
    }

    const trade = {
      stock: newTrade.stock,
      strategy: newTrade.strategy,
      strike_price: newTrade.strikePrice ? parseFloat(newTrade.strikePrice) : null,
      premium: newTrade.premium ? parseFloat(newTrade.premium) : null,
      quantity: parseInt(newTrade.quantity),
      expiry: newTrade.expiry || null,
      trade_date: newTrade.tradeDate,
      status: newTrade.status,
      entry_price: newTrade.entryPrice ? parseFloat(newTrade.entryPrice) : null,
      exit_price: newTrade.exitPrice ? parseFloat(newTrade.exitPrice) : null,
    };

    const { data, error } = await supabase.from('trades').insert([trade]).select();

    if (error) {
      console.error('Insert error:', error);
      return;
    }

    const inserted = data[0];
    setTrades([
      ...trades,
      {
        ...inserted,
        strikePrice: inserted.strike_price,
        entryPrice: inserted.entry_price,
        exitPrice: inserted.exit_price,
        totalPremium: (inserted.premium || 0) * (inserted.quantity || 0),
        earnings: calculateEarnings(inserted),
      }
    ]);

    setNewTrade({
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
    });

    setShowAddTrade(false);
  };

  const renderInput = (label, field, type = 'text', placeholder = '', required = false) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={newTrade[field] || ''}
        onChange={(e) => setNewTrade({ ...newTrade, [field]: e.target.value })}
        className="w-full px-3 py-2 border rounded-md mt-1"
        placeholder={placeholder}
        required={required}
      />
    </div>
  );

  const renderConditionalFields = () => {
    switch (newTrade.strategy) {
      case 'cash-secured-put':
        return (
          <>
            {renderInput('Strike Price (₹)', 'strikePrice', 'number', '2500')}
            {renderInput('Premium (₹)', 'premium', 'number', '50')}
            {renderInput('Expiry Date', 'expiry', 'date')}
            {renderInput('Entry Price (optional)', 'entryPrice', 'number', '2400')}
            {renderInput('Exit Price (optional)', 'exitPrice', 'number', '2600')}
          </>
        );
      case 'covered-call':
        return (
          <>
            {renderInput('Strike Price (₹)', 'strikePrice', 'number', '2500')}
            {renderInput('Premium (₹)', 'premium', 'number', '50')}
            {renderInput('Expiry Date', 'expiry', 'date')}
            {renderInput('Entry Price', 'entryPrice', 'number', '2400')}
            {renderInput('Exit Price (optional)', 'exitPrice', 'number', '2600')}
          </>
        );
      case 'stock-buy':
        return (
          <>
            {renderInput('Entry Price', 'entryPrice', 'number', '2400')}
            {renderInput('Exit Price (optional)', 'exitPrice', 'number', '2600')}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Wheel Strategy Tracker</h1>
        <button
          onClick={() => setShowAddTrade(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>Add Trade</span>
        </button>
      </div>

      {showAddTrade && (
        <div className="bg-white shadow-md rounded-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Add Trade</h2>
          {renderInput('Stock Symbol', 'stock', 'text', 'RELIANCE')}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Strategy</label>
            <select
              value={newTrade.strategy}
              onChange={(e) => setNewTrade({ ...newTrade, strategy: e.target.value })}
              className="w-full px-3 py-2 border rounded-md mt-1"
            >
              <option value="cash-secured-put">Cash Secured Put</option>
              <option value="covered-call">Covered Call</option>
              <option value="stock-buy">Stock Buy</option>
            </select>
          </div>

          {renderInput('Quantity', 'quantity', 'number')}
          {renderInput('Trade Date', 'tradeDate', 'date')}
          {renderInput('Status', 'status', 'text', 'open/closed/exercised')}
          {renderConditionalFields()}

          <div className="mt-4 flex justify-end space-x-2">
            <button
              onClick={() => setShowAddTrade(false)}
              className="px-4 py-2 text-gray-600 border rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={addTrade}
              className="px-4 py-2 bg-green-600 text-white rounded-md"
            >
              Save Trade
            </button>
          </div>
        </div>
      )}

      {/* Trade Table Placeholder */}
      <div className="text-sm text-gray-500">[✅ You can now add logic to render your trades list here]</div>
    </div>
  );
};

export default App;
