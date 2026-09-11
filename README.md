# DalalAI — Institutional Equity & Multi-Asset Terminal

**DalalAI** is an institutional-grade equity intelligence and wealth management terminal for the Indian equity markets (NSE & BSE) and international commodities (UAE Gold & Silver Bullion). It combines real-time technical screening across the entire **NIFTY 500**, an institutional **5-Agent AI Investment Council** powered by Google Gemini, customized **Strategic Watchlist Buckets**, **Upstox Demat Integration**, a **Simulated Paper Trading Engine**, and a dedicated **UAE Gold & Silver Souk Terminal**.

---

## Quick Navigation & Documentation

- 📘 **[Full System Implementation & Architecture Guide (PROJECT_IMPLEMENTATION.md)](./PROJECT_IMPLEMENTATION.md)**: Complete deep dive into all 14 modules, end-to-end architecture diagrams, file directory inventory, data models, cloud vault persistence, and performance benchmarks.
- 💼 **[Upstox Brokerage Demat Integration Guide (UPSTOX_PORTFOLIO_IMPLEMENTATION.md)](./UPSTOX_PORTFOLIO_IMPLEMENTATION.md)**: Step-by-step setup for linking Upstox, SEBI compliance rules, browser-direct smart routing, demo portfolio mode, and the 5-Agent Portfolio Audit Chamber.

---

## Core Features

1. **Full 500-Stock NIFTY Universe Screener**:
   - Official 500 NSE constituent coverage across 20+ sectors.
   - Two-tier caching (in-memory + disk) serving all 500 stocks in **~120 ms**.
   - Filters: Discounted Stocks Today, Strong Buy Signals, RSI Oversold (<42), Trend Pullbacks (50 EMA).
   - Universe scope selector: `NIFTY 50`, `NIFTY 100`, `NIFTY 500`.

2. **The 5-Agent AI Investment Council**:
   - **Sentinel**: Technical chartist (RSI, 50/200 EMA, support/resistance levels).
   - **The Fundamentalist**: Valuation, margin of safety, and P/E multiples.
   - **News Scout**: Macro catalysts, earnings commentary, and headwinds.
   - **Risk Guardian**: Position sizing limits, volatility beta, and stop-loss mandates.
   - **Chief Investment Officer (CIO)**: Resolves conflicts and issues concrete entry/target plans.

3. **Pre-Market Daily AI Intelligence Briefing**:
   - Institutional macro view, institutional flows (FII/DII), sectoral themes, and top 3 high-conviction breakout opportunities.

4. **Strategic Watchlist Buckets (Cloud-Synced)**:
   - Organize stocks into custom categories (*"Long-Term Value"*, *"Dip Opportunities"*, *"Momentum Breakouts"*) with target prices and stop-losses.
   - Backed by **Upstash Redis Cloud Vault** (`vault:watchlist_<hash>.json`) for seamless cross-device synchronization and permanent survival across serverless restarts.

5. **Upstox Demat Sync & Portfolio Audit**:
   - Automatic sync of real Demat holdings, buy average costs, and live P&L.
   - Browser-direct smart routing: Fetches holdings directly from client IP to bypass datacenter IP blocks.
   - Realistic 8-holding institutional demo mode available out of the box.
   - 5-Agent Council Portfolio Audit: Health score (1-10), CIO rebalancing directives, and sector concentration risk.

6. **1-Click Order Execution & Simulated Paper Trading**:
   - Real-time order ticket supporting Live Upstox API v2 orders and simulated Paper Trading.
   - Virtual ₹10,00,000 cash balance per user with simulated execution and order ledger.
   - Automated Dalal Street market hours & After Market Order (AMO) queueing.

7. **UAE Gold & Silver Bullion Terminal (Master Admin Only)**:
   - Dedicated Dubai Gold Souk live ticker board for 24K, 22K, 21K, 18K, and Silver 999.
   - Official UAE Dirham Peg (`1 USD = 3.6725 AED`) and live `AED/INR` forex exchange rate.
   - Dual-currency toggle: Switch all rates and portfolio values between **AED (د.إ)** and **INR (₹)** with 1 click.
   - Physical Bullion Portfolio Tracker: Track physical mint bars, coins, and jewelry by weight (grams, tolas, oz, kg), buy prices, CMP valuation, and unrealized net profit/loss.
   - Restricted strictly to Master Admin (`teja.sai42@gmail.com`).

8. **Zero-DB Multi-User Authentication & Admin Approval Gate**:
   - Stateless HMAC SHA-256 signed session cookies with Google OAuth 2.0.
   - In-app Master Admin Approval Gate: Unapproved users held at holding gate until approved by Master Admin.
   - Live activity ledger & telemetry ping (`/api/auth/heartbeat`).

---

## Quickstart Guide

### 1. Prerequisites
- Node.js 18.17+
- Free Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- (Optional for Cloud Persistence) Free Upstash Redis database from [upstash.com](https://upstash.com)

### 2. Setup & Run
```bash
# Clone or open workspace directory
cd "c:\Users\tejas\OneDrive\Documents\AI Project"

# Install dependencies
npm install

# Add your environment variables
# Copy .env.example to .env.local and fill in your keys:
cp .env.example .env.local

# Pre-warm the 500-stock live quote cache
node scripts/prewarm-cache.js

# Launch the terminal
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS & Lucide Icons
- **AI Intelligence**: Google Gemini 2.5 Flash via `@google/generative-ai`
- **Market Feeds**: Yahoo Finance API / NSE Live Feeds
- **Brokerage API**: Upstox API v2 OAuth
- **Cloud Vault**: Upstash Redis REST API & Google Drive API
- **Authentication**: Stateless HMAC-SHA256 Cookies + Google OAuth 2.0


