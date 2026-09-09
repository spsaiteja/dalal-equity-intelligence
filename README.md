# DalalAI — Institutional Equity Terminal for NSE / BSE

**DalalAI** is an institutional-grade stock intelligence and research terminal for the Indian equity markets (NSE & BSE). It combines real-time technical screening across the entire **NIFTY 500**, an institutional **5-Agent AI Investment Council** powered by Google Gemini, customized **Strategic Watchlist Buckets**, and **Upstox Demat Integration** with automated portfolio auditing.

---

## Quick Navigation & Documentation

- 📘 **[Full System Implementation & Architecture Guide (PROJECT_IMPLEMENTATION.md)](./PROJECT_IMPLEMENTATION.md)**: Deep dive into all 8 modules, end-to-end architecture diagrams, file directory inventory, data models, and performance benchmarks.
- 💼 **[Upstox Brokerage Demat Integration Guide (UPSTOX_PORTFOLIO_IMPLEMENTATION.md)](./UPSTOX_PORTFOLIO_IMPLEMENTATION.md)**: Step-by-step setup for linking Upstox, SEBI compliance rules, demo portfolio mode, and the 5-Agent Portfolio Audit Chamber.

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

4. **Strategic Watchlist Buckets**:
   - Save stocks into custom categories (*"Long-Term Value"*, *"Dip Opportunities"*, *"Momentum Breakouts"*) with target prices, stop-losses, and disk persistence.

5. **Upstox Demat Sync & Portfolio Audit**:
   - Automatic sync of real Demat holdings, buy average costs, and live P&L.
   - Realistic 8-holding institutional demo mode available out of the box.
   - 5-Agent Council Portfolio Audit: Health score (1-10), CIO rebalancing directives, and sector concentration risk.

---

## Quickstart Guide

### 1. Prerequisites
- Node.js 18.17+
- Free Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### 2. Setup & Run
```bash
# Clone or open workspace directory
cd "c:\Users\tejas\OneDrive\Documents\AI Project"

# Install dependencies
npm install

# Add your Google Gemini API key
echo "GEMINI_API_KEY=your_key_here" > .env.local

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
- **Market Data**: Yahoo Finance API / NSE Live Feeds
- **Brokerage API**: Upstox API v2 OAuth
- **Persistence**: Local encrypted JSON storage (`data/`)

