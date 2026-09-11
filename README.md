# ⚡ Kuberis — Real-Time Personal Wealth OS & Investment Portfolio

Kuberis is a complete, private, mobile-friendly personal financial & stock portfolio dashboard for tracking live stock prices (NSE/BSE), AMFI mutual fund NAVs, expenses, income, budgets, goals, recurring bills, and documents in **₹ (INR)** with custom Apple Liquid Glass aesthetics.

---

## 🌟 Key Features

- **⚡ Live 3-Second Market Ticker**: Connects to NSE & AMFI APIs down to 4 decimal places. Prices tick automatically every 3 seconds.
- **📊 Comprehensive Financial Overview**: Track Net Worth (Assets - Liabilities), Income, Spending, and Savings Rate with real-time Recharts visualizations.
- **💸 Single & Batch Transactions**: Search, filter by category/account, edit inline category dropdowns, manage tag pills, and flag receipts.
- **🔄 Auto-Recurring & Subscriptions Detection**: Intelligent algorithm normalizes merchant names, classifies cadence windows (weekly to annual), and calculates monthly/annual commitments.
- **🎯 Category Budgets & Savings Goals**: Real-time progress bars, budget utilization rings, remaining balances, and target dates.
- **📂 R2 Storage & Google Drive Inbox**: Store receipts/documents up to 20MB in object storage; automated daily sync at 8:00 AM IST for `Kuberis Financial Inbox`.
- **🎨 Apple Liquid Glass Themes**: Cyber Emerald, Aurora Cyan, Golden Champagne, and Crystal Light modes with 1-click theme switcher.
- **🔒 Bank-Grade Security**: Biometric Face ID / Fingerprint passkeys, 4-digit MPIN, and multi-tenant user isolation.

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher installed on your computer.

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Tvmsasank/Kuberis.git
   cd Kuberis
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start Development / Application Server**:
   ```bash
   npm run dev:all
   ```
   This single command starts both the **Backend API (port 3001)** and **Frontend UI (port 3000)** concurrently!

4. Open your browser to:
   **`http://localhost:3000`**

---

## 📁 Repository Structure

```text
Kuberis/
├── data/                    # Database storage directory (git-ignored for privacy)
│   └── db.json              # Local database storage engine
├── storage/                 # Binary object storage directory (git-ignored)
│   └── r2/                  # Local R2 object storage driver (receipts/documents)
├── server/
│   ├── index.js             # Express API Server endpoints (/api/*)
│   ├── investments.js       # Live stock & mutual fund price fetchers (Yahoo / AMFI)
│   └── db.js                # Multi-tenant database engine
├── src/
│   ├── components/          # Tab views (Home, Dashboard, Investments, Transactions, etc.)
│   ├── utils/               # Biometrics passkeys & CSV bank statement parser
│   ├── App.jsx              # Main application shell & state routing
│   ├── index.css            # Apple Liquid Glass design system tokens
│   └── main.jsx             # React entry point
├── package.json
├── vite.config.js
└── README.md
```

---

## ☁️ Deployment Options (Access Anywhere)

### Cloud Hosting on Render.com
1. Push your repository to **GitHub**: `https://github.com/Tvmsasank/Kuberis.git`
2. Sign up or log into [Render.com](https://render.com/).
3. Create a **Web Service**, connect your GitHub repo `Kuberis`.
4. Set Build Command: `npm install && npx vite build`
5. Set Start Command: `node server/index.js`
6. Click **Deploy**. Your app will be live on Render!

---

## 📜 License
Private Owner License. Free for personal financial tracking.