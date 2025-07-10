# Wheel Strategy Trading Tracker

A comprehensive web application to track your wheel strategy options trades in the Indian stock market. Built with React and designed for easy deployment on Vercel.

## Features

### 📊 Trading Dashboard
- **Real-time Stats**: Track total premium collected, open trades, closed trades, and exercised positions
- **Indian Market Ready**: All prices displayed in Indian Rupees (₹)
- **Comprehensive Tracking**: Monitor both Cash Secured Puts and Covered Calls

### 📝 Trade Management
- **Add New Trades**: Easy-to-use form for entering trade details
- **Edit Trades**: Inline editing of existing trades
- **Delete Trades**: Remove trades with confirmation
- **Status Tracking**: Mark trades as Open, Closed, or Exercised

### 💾 Data Management
- **Auto-save**: Trades are automatically saved to browser localStorage
- **Export Data**: Download your trades as JSON for backup
- **Import Data**: Upload previously exported trade data
- **Data Persistence**: Never lose your trading history

### 🎯 Wheel Strategy Specific
- **Cash Secured Puts**: Track puts you've sold on stocks you want to own
- **Covered Calls**: Track calls you've sold on stocks you already own
- **Premium Calculation**: Automatically calculates total premium (per share × quantity)
- **Expiry Tracking**: Monitor expiry dates for all your positions

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/wheel-strategy-tracker.git
   cd wheel-strategy-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Building for Production
```bash
npm run build
```

## Deployment on Vercel

### Method 1: Direct GitHub Integration (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign up/login with your GitHub account
   - Click "New Project"
   - Select your repository
   - Click "Deploy"

3. **Automatic Deployments**
   - Every push to main branch will trigger a new deployment
   - Get a live URL instantly

### Method 2: Manual Deployment

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

## Project Structure

```
wheel-strategy-tracker/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── App.js          # Main application component
│   ├── index.js        # React entry point
│   └── index.css       # Global styles with Tailwind
├── package.json        # Dependencies and scripts
└── README.md
```

## Usage Guide

### Adding a Trade

1. Click the "Add Trade" button
2. Fill in the trade details:
   - **Stock Symbol**: Enter the stock ticker (e.g., RELIANCE)
   - **Strategy**: Select Cash Secured Put or Covered Call
   - **Strike Price**: Enter the strike price in ₹
   - **Premium**: Enter premium per share in ₹
   - **Quantity**: Number of contracts
   - **Expiry Date**: Option expiry date
   - **Trade Date**: Date when trade was executed
3. Click "Add Trade
