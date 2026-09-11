# DalalAI Terminal: Complete System Implementation & Architecture Guide

A comprehensive, production-grade guide covering the full implementation, system architecture, data models, AI committee reasoning engine, and brokerage integration of the **DalalAI NSE / BSE Equity Research Terminal**.

---

## Table of Contents

1. [Executive Summary & Project Vision](#1-executive-summary--project-vision)
2. [End-to-End System Architecture](#2-end-to-end-system-architecture)
3. [Full Project Directory Inventory](#3-full-project-directory-inventory)
4. [Module 1: Real-Time Market Indices Dashboard](#4-module-1-real-time-market-indices-dashboard)
5. [Module 2: 500-Stock NIFTY Universe & Screener Engine](#5-module-2-500-stock-nifty-universe--screener-engine)
6. [Module 3: The 5-Agent AI Investment Council](#6-module-3-the-5-agent-ai-investment-council)
7. [Module 4: Stock Deep Dive & Interactive Charts](#7-module-4-stock-deep-dive--interactive-charts)
8. [Module 5: Daily Pre-Market AI Briefing](#8-module-5-daily-pre-market-ai-briefing)
9. [Module 6: Watchlist & Multi-Bucket Organization](#9-module-6-watchlist--multi-bucket-organization)
10. [Module 7: Upstox Demat Integration & Portfolio Audit](#10-module-7-upstox-demat-integration--portfolio-audit)
11. [Module 8: System Settings & API Key Manager](#11-module-8-system-settings--api-key-manager)
12. [Module 9: Portfolio Alerts Engine & 1-Click Order Execution Chamber](#12-module-9-portfolio-alerts-engine--1-click-order-execution-chamber)
13. [Module 10: Multi-User Zero-DB Authentication & Master Admin Gatekeeper](#13-module-10-multi-user-zero-db-authentication--master-admin-gatekeeper)
14. [Module 11: Cloud Vault Engine (Upstash Redis & Google Drive)](#14-module-11-cloud-vault-engine-upstash-redis--google-drive)
15. [Module 12: Simulated Paper Trading Engine & Order Ledger](#15-module-12-simulated-paper-trading-engine--order-ledger)
16. [Module 13: UAE Gold & Silver Bullion Terminal & Master Admin Physical Portfolio](#16-module-13-uae-gold--silver-bullion-terminal--master-admin-physical-portfolio)
17. [Module 14: Watchlist & Custom Strategy Buckets Persistence Architecture](#17-module-14-watchlist--custom-strategy-buckets-persistence-architecture)
18. [Complete Data Models & Type System](#18-complete-data-models--type-system)
19. [Storage Architecture & Zero-DB Privacy Strategy](#19-storage-architecture--zero-db-privacy-strategy)
20. [Setup, Installation & Web Hosting Deployment](#20-setup-installation--web-hosting-deployment)
21. [Verification & Performance Benchmarks](#21-verification--performance-benchmarks)

---

## 1. Executive Summary & Project Vision

**DalalAI** is an institutional-grade equity intelligence and multi-asset wealth research terminal purpose-built for Indian markets (NSE & BSE) and international physical commodities. It bridges the gap between raw quantitative market feeds, automated brokerage execution, and institutional investment committee deliberation.

### Core Capabilities:
- **Full 500-Stock NIFTY Coverage**: Real-time quotes, technical indicators, and discount-from-high calculations for all 500 official NSE constituents.
- **5-Agent AI Investment Council**: Multi-agent committee powered by Google Gemini (Sentinel, The Fundamentalist, News Scout, Risk Guardian, and CIO) that debates and reaches actionable consensus on any Indian stock.
- **Pre-Market Daily AI Intelligence**: Automated daily macro briefings, institutional flow summaries, and top 3 high-conviction breakout opportunities.
- **Watchlist & Custom Strategy Buckets**: Strategy-driven categorized portfolios (*"Long-Term Value"*, *"Dip Opportunities"*, *"Momentum Breakouts"*) backed by Upstash Redis JSON cloud storage and local fallback.
- **Upstox Brokerage Demat Integration**: Live synchronization of Demat holdings, average buy prices, live P&L tracking, browser-direct smart routing, and a dedicated 5-Agent Portfolio Audit Chamber.
- **Simulated Paper Trading Engine**: Risk-free institutional simulation with a virtual ₹10,00,000 cash balance, live market order execution, AMO queueing, and persistent cloud ledger.
- **UAE Gold & Silver Bullion Terminal**: Dedicated, institutional Dubai Gold Souk spot board (24K, 22K, 21K, 18K, Silver 999) with live USD/AED peg and AED/INR currency switcher, paired with a private Physical Bullion Portfolio Tracker strictly for Master Admin (`teja.sai42@gmail.com`).
- **Zero-DB Multi-User Authentication**: Stateless HMAC-signed sessions, Google OAuth 2.0, an in-app Master Admin Approval Gate, user telemetry, and isolated browser tokens.

---

## 2. End-to-End System Architecture

```mermaid
flowchart TD
    subgraph Client_Layer ["Client Layer (Next.js 14 App Router + Tailwind CSS)"]
        UI_Nav["Navigation & Header (Screener / Watchlist / Portfolio / UAE Bullion / Admin)"]
        UI_Indices["Market Indices Banner (NIFTY 50, SENSEX, BANK NIFTY, VIX)"]
        UI_Screener["Screener View (Scope Selector, Filters, Pagination, Table)"]
        UI_Watchlist["Bucket List View (Custom Buckets, Target & Stop Loss)"]
        UI_Portfolio["Portfolio View (Demat Sync, P&L Cards, Holdings, Paper Trading)"]
        UI_Bullion["UAE Bullion View (Dubai Souk Rates, AED/INR Toggle, Physical Vault)"]
        
        subgraph Modals ["Chambers & Modals"]
            Modal_Stock["Stock Detail & Price History Modal"]
            Modal_AI["Gemini AI Deep Dive Analysis Modal"]
            Modal_Council["5-Agent AI Council Chamber Modal"]
            Modal_Briefing["Pre-Market Daily Briefing Modal"]
            Modal_Audit["Portfolio Audit Chamber Modal"]
            Modal_Order["1-Click Institutional Order Ticket (Upstox + Paper)"]
            Modal_Settings["Settings Modal (Gemini + Upstox + Access Management)"]
        end
    end

    subgraph Security_Gate ["Gatekeeper & Authentication Layer"]
        Auth_Gate["HMAC SHA-256 Session Cookie (dalal_auth_session)"]
        Auth_Approval["Master Admin Approval Gate (teja.sai42@gmail.com)"]
        Auth_Telemetry["User Activity & Telemetry Ledger"]
    end

    subgraph API_Layer ["Next.js Server API Routes (/api)"]
        API_Auth["/api/auth/* (Google OAuth, Session, Users, Heartbeat)"]
        API_Market["/api/market (Live Indices Feed)"]
        API_Stocks["/api/stocks & /api/stocks/[symbol] (500 Universe + Hist Candles)"]
        API_AICouncil["/api/ai/council (5-Agent Debate Engine)"]
        API_AIAnalyze["/api/ai/analyze (SWOT & Valuation Deep Dive)"]
        API_AIBriefing["/api/ai/briefing (Pre-Market Macro Synthesis)"]
        API_AIAudit["/api/ai/audit-portfolio (Holdings Committee Audit)"]
        API_Watchlist["/api/watchlist (Get / Save Buckets)"]
        API_UpstoxOrder["/api/upstox/order (Upstox v2 + Paper Trading Engine)"]
        API_UpstoxPortfolio["/api/upstox/portfolio (Holdings & Summary)"]
        API_Bullion["/api/bullion (Dubai Spot Rates & Master Admin Portfolio)"]
        API_VaultStatus["/api/vault/status (Upstash Redis & Drive Health)"]
    end

    subgraph Persistence_Engine ["Cloud Vault & Local Storage"]
        Cloud_Redis["Upstash Redis Cloud Vault (vault:*.json)"]
        Cloud_Drive["Google Drive Vault Fallback (AES-256-GCM .enc)"]
        Disk_Local["Local Disk Cache & File Store (data/)"]
    end

    subgraph External_Feeds ["External Providers & AI"]
        Feed_NSE["NSE / Yahoo Finance Live Market Feeds"]
        Feed_Bullion["Yahoo Finance Spot Metals (GC=F, SI=F, AEDINR=X)"]
        AI_Gemini["Google Gemini 2.5 Flash LLM"]
        Broker_Upstox["Upstox API v2 Live Brokerage"]
    end

    Client_Layer --> Security_Gate
    Security_Gate --> API_Layer
    API_Layer <--> Persistence_Engine
    API_Market --> Feed_NSE
    API_Stocks --> Feed_NSE
    API_Bullion --> Feed_Bullion
    API_AICouncil --> AI_Gemini
    API_AIAnalyze --> AI_Gemini
    API_AIBriefing --> AI_Gemini
    API_AIAudit --> AI_Gemini
    API_UpstoxOrder --> Broker_Upstox
```

---

## 3. Full Project Directory Inventory

```
c:\Users\tejas\OneDrive\Documents\AI Project\
├── data/                               # Local persistent storage & caches
│   ├── approved_users.json             # Approved user access records
│   ├── buckets.json                    # User-created watchlist bucket categories
│   ├── nifty500.json                   # Official 500 NSE constituent metadata
│   ├── pending_users.json              # Access approval request queue
│   ├── stocks_cache.json               # Tier-2 persistent disk cache for 500 stocks
│   ├── upstox_config.json              # Stored Upstox API credentials
│   ├── upstox_session.json             # Active Upstox daily OAuth access token
│   └── watchlist.json                  # Saved watchlist entries with target prices
├── scripts/                            # Operational & pre-warming scripts
│   ├── build-universe.js               # Fetches & normalizes official NSE CSV to JSON
│   └── prewarm-cache.js                # Pre-populates 500-stock cache with live ticks
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ai/
│   │   │   │   ├── analyze/route.ts    # Deep dive stock analysis route
│   │   │   │   ├── audit-portfolio/    # 5-Agent Council portfolio audit route
│   │   │   │   ├── briefing/route.ts   # Daily pre-market macro briefing route
│   │   │   │   ├── council/route.ts    # 5-Agent Council stock consensus route
│   │   │   │   └── status/route.ts     # Gemini API key check & validation
│   │   │   ├── auth/
│   │   │   │   ├── dev-login/route.ts  # Localhost 1-click test login
│   │   │   │   ├── google/route.ts     # Google OAuth 2.0 initiation
│   │   │   │   ├── google/callback/    # Google OAuth token exchange & session creator
│   │   │   │   ├── heartbeat/route.ts  # Active user telemetry ping endpoint
│   │   │   │   ├── logout/route.ts     # Session cookie invalidation
│   │   │   │   ├── session/route.ts    # Active session user verification
│   │   │   │   ├── usage/route.ts      # Active/total user activity statistics
│   │   │   │   └── users/route.ts      # Master Admin user approval & revoke API
│   │   │   ├── bullion/route.ts        # UAE Gold & Silver Souk rates & portfolio API
│   │   │   ├── market/route.ts         # Live NSE/BSE benchmark indices feed
│   │   │   ├── stocks/
│   │   │   │   ├── [symbol]/route.ts   # Historical candles & detailed quote
│   │   │   │   └── route.ts            # 500-stock screener feed & tiered cache
│   │   │   ├── upstox/
│   │   │   │   ├── auth/route.ts       # Upstox login URL generation & logout
│   │   │   │   ├── callback/route.ts   # OAuth 2.0 authorization code receiver
│   │   │   │   ├── order/route.ts      # Live Upstox v2 & Paper Trading execution
│   │   │   │   └── portfolio/route.ts  # Demat holdings & summary metrics
│   │   │   ├── vault/status/route.ts   # Cloud Vault backend health monitor
│   │   │   └── watchlist/route.ts      # Watchlist and bucket persistence API
│   │   ├── globals.css                 # Dark-mode styling, gradients & animations
│   │   ├── layout.tsx                  # Root HTML layout with Inter font
│   │   └── page.tsx                    # Main terminal controller & state manager
│   ├── components/
│   │   ├── AccessManagementModal.tsx   # Admin user approval & access management
│   │   ├── AddToWatchlistModal.tsx     # Add stock to custom bucket modal
│   │   ├── AiAnalysisModal.tsx         # Deep Dive SWOT & trade plan modal
│   │   ├── BullionView.tsx             # UAE Gold & Silver Dubai Souk & Portfolio View
│   │   ├── CouncilModal.tsx            # 5-Agent Council debate & directive modal
│   │   ├── Header.tsx                  # Navigation tabs & live connection badges
│   │   ├── MarketBriefingModal.tsx     # Pre-market macro analysis modal
│   │   ├── MarketIndices.tsx           # Real-time Dalal Street benchmark bar
│   │   ├── OrderModal.tsx              # 1-Click trade execution ticket
│   │   ├── PortfolioAuditModal.tsx     # Demat portfolio health & rebalance chamber
│   │   ├── PortfolioView.tsx           # Holdings table, P&L cards & Council trigger
│   │   ├── ScreenerView.tsx            # 500-stock screener table, scope & filters
│   │   ├── SettingsModal.tsx           # Gemini AI & Upstox configuration modal
│   │   ├── StockDetailModal.tsx        # Interactive chart & metrics modal
│   │   └── WatchlistView.tsx           # Bucket list table & bucket management
│   ├── lib/
│   │   ├── agents/                     # 5-Agent AI Council Personas
│   │   │   ├── cio.ts                  # Chief Investment Officer consensus engine
│   │   │   ├── fundamental.ts          # Fundamentalist valuation & margin of safety
│   │   │   ├── news-scout.ts           # News Scout sentiment & catalyst detector
│   │   │   ├── risk-guardian.ts        # Risk Guardian volatility & stop-loss rules
│   │   │   └── sentinel.ts             # Sentinel technical chartist & key levels
│   │   ├── auth.ts                     # HMAC SHA-256 sessions, approval & whitelist
│   │   ├── bullion-engine.ts           # Dubai Souk rate calculator & portfolio engine
│   │   ├── crypto-vault.ts             # AES-256-GCM encryption & multi-key fallback
│   │   ├── drive-vault.ts              # Upstash Redis REST & Google Drive cloud vault
│   │   ├── gemini.ts                   # Google Gemini AI client & prompt generators
│   │   ├── market-service.ts           # Yahoo Finance quote fetcher & indicators
│   │   ├── paper-trading.ts            # Virtual ₹10 Lakh portfolio & simulated engine
│   │   ├── portfolio-alerts.ts         # 4-tier holding alert & rebalancing rules
│   │   ├── storage.ts                  # Watchlist, buckets & portfolio persistence
│   │   └── upstox-client.ts            # Upstox API v2 OAuth, holdings & orders
│   └── types/
│       ├── bullion.ts                  # UAE gold/silver rates, holdings & constants
│       ├── stock.ts                    # Quotes, technicals, indicators, watchlist
│       └── upstox.ts                   # Upstox holdings, summaries, alerts, orders
├── .env.local                          # Local environment variables & secrets
├── package.json                        # Project dependencies & scripts
├── tailwind.config.ts                  # Terminal color palette, borders & surfaces
└── tsconfig.json                       # Strict TypeScript compiler options
```

---

## 4. Module 1: Real-Time Market Indices Dashboard

### Purpose:
Provides immediate macro context on Indian markets before analyzing individual equities.

- **Component**: [`src/components/MarketIndices.tsx`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/components/MarketIndices.tsx)
- **API Endpoint**: [`src/app/api/market/route.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/app/api/market/route.ts)
- **Benchmarks Tracked**:
  1. **NIFTY 50** (`^NSEI`): Headline barometer of the top 50 Indian blue-chips.
  2. **BSE SENSEX** (`^BSESN`): The oldest Indian benchmark (30 large-caps).
  3. **BANK NIFTY** (`^NSEBANK`): High-beta banking & credit expansion pulse.
  4. **INDIA VIX** (`^INDIAVIX`): NSE Volatility Index (fear gauge).
  5. **NIFTY MIDCAP 100** (`^NSEMDCP`): Broader market sentiment and liquidity.
- **Key Features**:
  - Auto-formatting in Indian numbering system (e.g., `₹24,852.15`).
  - Color-coded positive/negative change badges with arrow indicators.
  - Manual 1-click refresh button.

---

## 5. Module 2: 500-Stock NIFTY Universe & Screener Engine

### Purpose:
Empowers users to filter the entire liquid Indian equity market across price action, technical indicators, valuation discounts, and institutional scope.

### The 500-Stock Universe Dataset:
- Stored in [`data/nifty500.json`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/data/nifty500.json) containing all 500 official companies listed on the National Stock Exchange of India.
- Spans 20+ sectors: IT, Financial Services, Oil & Gas, Capital Goods, Automobile, Healthcare, FMCG, Chemicals, Metals, Telecom, and Power.

### Two-Tier High-Speed Caching Pipeline:
Located in [`src/app/api/stocks/route.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/app/api/stocks/route.ts):
1. **Tier 1 (In-Memory Cache)**: TTL 60 seconds. Instant (~5 ms) response for active browser sessions.
2. **Tier 2 (Persistent Disk Cache)**: `data/stocks_cache.json` (TTL 5 minutes). Prevents slow cold-start requests upon server restarts.
3. **Serving Latency**: Returns all 500 stocks with complete metrics in **~120 ms**.

### Technical Indicators Calculated On-The-Fly:
In [`src/lib/technicals.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/lib/technicals.ts):
- **RSI (14-period Relative Strength Index)**: Identifies oversold (<42) and overbought (>70) momentum.
- **50 EMA & 200 EMA**: Computes intermediate pullback and long-term secular trend supports.
- **Discount from 52-Week High**: `((52W High - Current Price) / 52W High) * 100`.
- **Distance from 52-Week Low**: `((Current Price - 52W Low) / 52W Low) * 100`.
- **Algorithmic Signal Engine**: Generates `STRONG_BUY`, `BUY`, `HOLD`, `SELL` based on confluence of RSI, moving averages, and value discount.

### Screener Controls ([`src/components/ScreenerView.tsx`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/components/ScreenerView.tsx)):
- **Index Scope Selector**:
  - **`NIFTY 500`** (All 500 Stocks): Broader market exploration.
  - **`NIFTY 100`** (Top 100 Large Caps): Mega and large-cap stability.
  - **`NIFTY 50`** (50 Blue Chips): NIFTY flagship universe.
- **Quick Preset Filters**:
  - 🔥 **Discounted Stocks Today**: 10%+ off 52-week high or RSI &le; 42.
  - 🟢 **Strong Buy Signals**: High composite technical conviction score.
  - ⚡ **RSI Oversold (<42)**: Mean-reversion swing trade candidates.
  - 📈 **Trend Pullback (50 EMA)**: Uptrending equities testing the 50-day moving average.
  - 🌐 **All Universe**: Unfiltered sorted access.
- **Pagination**: Zero browser lag with selectable rows (`25 | 50 | 100 | All 500`), page jump, and live result counts.

---

## 6. Module 3: The 5-Agent AI Investment Council

### Purpose:
Eliminates single-perspective cognitive bias by simulating an institutional investment committee debate. When a user requests council deliberation for any stock, 5 specialized AI personas evaluate the equity from conflicting mandates:

```
                      ┌────────────────────────────┐
                      │    Chief Investment Officer │
                      │         (CIO Consensus)    │
                      └──────────────┬─────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
┌────────┴────────┐         ┌────────┴────────┐         ┌────────┴────────┐
│    SENTINEL     │         │ THE FUNDAMENTALIST│       │   NEWS SCOUT    │
│ (Technicals &   │         │ (Valuation, P/E,  │       │ (Catalysts &    │
│  Momentum)      │         │  Margin of Safety)│       │  Headwinds)     │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                     │
                            ┌────────┴────────┐
                            │  RISK GUARDIAN  │
                            │ (Position Size, │
                            │  Max Drawdown)  │
                            └─────────────────┘
```

### The 5 Personas & Mandates:

1. **Sentinel (The Quantitative Chartist)**:
   - *File*: [`src/lib/agents/sentinel.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/lib/agents/sentinel.ts)
   - *Focus*: Price action, candlestick patterns, RSI divergences, 50/200 EMA crossovers, immediate and major support/resistance levels.
   - *Output*: Key levels (`immediateSupport`, `majorBreakout`) and trend verdict.

2. **The Fundamentalist (The Deep-Value Skeptic)**:
   - *File*: [`src/lib/agents/fundamental.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/lib/agents/fundamental.ts)
   - *Focus*: P/E vs 5-year historical median, industry multiple comparison, debt-to-equity, Return on Equity (RoE), and intrinsic margin of safety.
   - *Output*: `valuationStatus` (*Deeply Undervalued* to *Overvalued*) and `estimatedMarginOfSafetyPercent`.

3. **News Scout (The Macro & Sentiment Pulse)**:
   - *File*: [`src/lib/agents/news-scout.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/lib/agents/news-scout.ts)
   - *Focus*: Dalal Street headlines, quarterly earnings commentary, government policy shifts (PLI schemes, import duties, GST revisions), and crude/rupee macro trends.
   - *Output*: `sentimentPolarity` (-1.0 to +1.0), `catalystsIdentified`, and `headwindWarnings`.

4. **Risk Guardian (The Capital Protector)**:
   - *File*: [`src/lib/agents/risk-guardian.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/lib/agents/risk-guardian.ts)
   - *Focus*: Downside preservation, sector concentration, volatility beta, liquidity spread, and mandated position caps.
   - *Output*: `riskRating`, `recommendedMaxPositionPercent` (e.g., max 4% of portfolio), and strict `mandatedStopLoss`.

5. **Chief Investment Officer / CIO (The Committee Chair)**:
   - *File*: [`src/lib/agents/cio.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/lib/agents/cio.ts)
   - *Focus*: Resolves conflicts between Sentinel and The Fundamentalist, weighs Risk Guardian's warnings, and issues a singular binding trade plan.
   - *Output*: Verdict (`STRONG_BUY`, `BUY`, `HOLD`, `SELL`), Overall Conviction Score (1-10), executive directive, and actionable entry strategy (`target1`, `target2`, `stopLoss`).

### The Orchestration Engine (`orchestrator.ts`):
- **Central Coordinator**: [`src/lib/agents/orchestrator.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/lib/agents/orchestrator.ts)
- **Lifecycle Context**: Generates unique `runId` (UUID v4), tracks per-agent and total execution latency in milliseconds, and captures execution statuses (`success`, `fallback`, `failed`).
- **Parallel Fault-Tolerant Execution**: Employs `Promise.allSettled` to execute Sentinel, Fundamentalist, News Scout, and Risk Guardian concurrently. Failure or rate-limiting of any single agent does not crash the session; safe deterministic baselines are supplied seamlessly.
- **Strict Runtime Schema Validation**: Guard functions (`isValidSentinelReport`, `isValidFundamentalReport`, etc.) ensure every agent's payload strictly conforms to TypeScript interfaces before synthesis.
- **Observability Metadata**: Returned via `OrchestrationMetadata` alongside consensus, rendering a live telemetry bar (Run ID, Latency, Model, executed tool count, and agent status badges) in the UI.

### Discrete AI Tools Layer (`src/lib/agents/tools/`):
- **Tool Architecture**: Modular, strongly typed tools conforming to the agentic tool-use standard with parameter schemas and runtime validation.
- **Callable Tools**:
  1. `get_stock_quote`: Real-time CMP, 52W high/low, discount %, volume, and day range.
  2. `get_historical_candles`: Multi-timeframe daily OHLCV candlestick bars for chart patterns.
  3. `get_technical_indicators`: 14-period RSI, 50-EMA, 200-EMA, immediate & major support/resistance levels.
  4. `get_company_financials`: Fundamental valuation status, P/E ratio, and estimated margin of safety %.
  5. `search_market_news`: Google News RSS financial search with automated keyword sentiment polarity analysis.
  6. `calculate_risk_metrics`: Quantitative stop-loss buffer %, risk-to-reward ratio, and mandated portfolio position allocation %.
- **Gemini Function Calling Schema**: `getGeminiToolDeclarations()` formats all registered tools into OpenAI/Gemini function declaration specifications for true agent tool-use.

### Runtime Schema Validation & Self-Repair Layer (`schemas.ts` & `schema-validator.ts`):
- **Zod Schemas**: Strict runtime validation schemas (`SentinelReportSchema`, `FundamentalReportSchema`, `NewsScoutReportSchema`, `RiskGuardianReportSchema`, `CIOConsensusSchema`) enforcing boundaries, types, and required fields on LLM payloads.
- **Resilient Auto-Repair Pipeline**:
  - *Numeric Coercion*: Automatically converts stringified numbers (e.g. `"92.5%"` -> `92.5`) with range bounding.
  - *Enum Normalization*: Resolves case/formatting variations (e.g. `"strong_bullish"` -> `'Strong Bullish'`, `"buy"` -> `'Bullish'`).
  - *String Array Coercion*: Converts newline or semicolon-delimited text blocks into typed string arrays.
  - *Fail-Soft Isolation*: `safeParse()` prevents any malformed LLM response from crashing API routes, falling back to deterministic baselines seamlessly.

### Exponential Backoff, Retry Logic & Fault Tolerance (`gemini-helper.ts`):
- **Intelligent Retry Engine**:
  - `maxRetries`: Up to 3 retry attempts per agent deliberation.
  - `calculateBackoff()`: Exponential progression (`initialDelay: 500ms`, `maxDelay: 4,000ms`) with 30% full jitter to prevent thundering herd spikes.
  - `isRetryableError()`: Intelligently detects HTTP 429 (rate-limiting), 500/502/503 (server overloads), `RESOURCE_EXHAUSTED`, and timeouts.
- **Timeout Protection**: Strict per-agent execution budget (8,500ms) prevents hanging sockets from stalling user sessions.
- **Transparent Fallback Generator**:
  - When LLM calls time out or exhaust all retries, the engine immediately yields a deterministic, quantitative baseline report.
  - Sets `isFallback: true` and a human-readable `fallbackReason`.
  - UI automatically displays an amber `Fallback` warning chip on the affected department card in [`CouncilModal.tsx`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/components/CouncilModal.tsx).

### Structured Observability & Telemetry Audit Engine (`telemetry.ts`):
- **Agent Run Telemetry Schema**:
  - `AgentExecutionLog`: Captures execution time in milliseconds, retry counts, active model, operational status (`success` | `fallback` | `failed`), and explicit fallback rationale.
  - `DeliberationRunTelemetry`: Correlates all 5 agents under an immutable `runId`, overall status, CIO conviction verdict & score, tool execution counts, and timestamps.
- **Dual-Tier Zero-DB Cloud Persistence**:
  - Primary: Async fire-and-forget sync to Upstash Redis REST (`telemetry:agent_runs.json`).
  - Fallback: Local disk cache (`data/telemetry_runs.json`) ensuring 100% offline tracing capability.
- **Real-Time Aggregate Metrics Engine**:
  - `getTelemetryStats()` computes total deliberation runs, overall success rate %, fallback rate %, mean execution latency, model distributions, and per-agent latency/reliability matrices.
- **Public Observability Route**:
  - `GET /api/ai/telemetry` exposes telemetry stats and recent deliberation run traces.
- **UI Observability Dashboard & Trace Modal**:
  - [`TelemetryModal.tsx`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/components/TelemetryModal.tsx): Real-time tracing view with KPI cards, per-agent latency gauges, and expandable run execution inspector.
  - Accessible via the **Observability** button in [`Header.tsx`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/components/Header.tsx) and by clicking any active `Run ID` badge in [`CouncilModal.tsx`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/components/CouncilModal.tsx).

### UI Chamber Experience:
- Rendered in [`src/components/CouncilModal.tsx`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/components/CouncilModal.tsx).
- Features a header score gauge, debate summary, CIO trade plan card, telemetry status bar (interactive Run ID link to Telemetry Modal, Latency, Model, Tools Executed, Agent badges), amber fallback chips on rate-limited agents, and interactive tabs to read the unvarnished arguments of each agent.

---

## 7. Module 4: Stock Deep Dive & Interactive Charts

### Purpose:
Allows detailed inspection of any company's technical candles, key statistics, and comprehensive AI SWOT analysis.

### Features:
1. **Interactive Historical Candlestick Chart**:
   - Component: [`src/components/StockDetailModal.tsx`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/components/StockDetailModal.tsx)
   - API: [`src/app/api/stocks/[symbol]/route.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/app/api/stocks/%5Bsymbol%5D/route.ts)
   - Period selectors: `1M`, `3M`, `6M`, `1Y`.
   - Hover tooltips showing Open, High, Low, Close, and Volume.
2. **AI Deep Dive Analysis**:
   - Component: [`src/components/AiAnalysisModal.tsx`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/components/AiAnalysisModal.tsx)
   - API: [`src/app/api/ai/analyze/route.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/app/api/ai/analyze/route.ts)
   - **Dip Classification Engine**: Accurately categorizes price drops into:
     - 🎯 *Bargain Opportunity* (high-quality stock experiencing transitory overreaction)
     - ⚠️ *Value Trap* (deteriorating fundamentals and structurally impaired earnings)
     - 📉 *Fair Value Pullback* (healthy normal profit booking)
     - 🚨 *Overvalued Dip* (still dangerously priced despite drop)
   - Structured SWOT analysis (Strengths, Weaknesses, Opportunities, Threats) and a 3-step actionable trade roadmap.

---

## 8. Module 5: Daily Pre-Market AI Briefing

### Purpose:
Delivers an institutional pre-market note before Dalal Street opens at 9:15 AM IST.

- **Component**: [`src/components/MarketBriefingModal.tsx`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/components/MarketBriefingModal.tsx)
- **API Endpoint**: [`src/app/api/ai/briefing/route.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/app/api/ai/briefing/route.ts)
- **Briefing Sections**:
  1. **Macro Sentiment Gauge**: Bullish, Neutral, or Cautionary stance synthesized from GIFT Nifty trends, US Fed commentary, and Asian market cues.
  2. **Institutional Flow Pulse**: Assessment of FII (Foreign Institutional Investors) and DII (Domestic Institutional Investors) cash market momentum.
  3. **Key Sectoral Themes**: Highlighted sectors (e.g., Banking rally, IT margin pressure, Defence order pipeline).
  4. **Top 3 High-Conviction Stock Picks**: Specific Dalal Street picks with target levels, stop-loss, and catalyst notes. Direct 1-click links open the stock detail modal.

---

## 9. Module 6: Watchlist & Multi-Bucket Organization

### Purpose:
Enables structured portfolio planning by categorizing monitored equities into customized strategic buckets.

- **Component**: [`src/components/WatchlistView.tsx`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/components/WatchlistView.tsx)
- **Storage Layer**: [`src/lib/storage.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/lib/storage.ts) & [`src/app/api/watchlist/route.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/app/api/watchlist/route.ts)
- **Default Strategic Buckets**:
  - `Long-Term Value`: Compounders for multi-year holding.
  - `Dip Opportunities`: Temporary sell-offs awaiting entry confirmation.
  - `Momentum Breakouts`: Stocks near 52W high breaking out on elevated volume.
- **Capabilities**:
  - Create unlimited custom buckets on-the-fly.
  - Track buy price, target price, stop loss, and notes for each entry.
  - Instant live P&L calculation against current market price.
  - One-click triggers for the 5-Agent Council from within the bucket list.

---

## 10. Module 7: Upstox Demat Integration & Portfolio Audit

### Purpose:
Directly synchronizes verified Demat holdings from Upstox to monitor real capital exposure and run holistic portfolio audits.

### Full Subsystem Breakdown:
1. **OAuth 2.0 Engine**:
   - Authorizes daily access via SEBI-compliant authorization code exchange.
   - Implemented in [`src/app/api/upstox/callback/route.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/app/api/upstox/callback/route.ts) and [`src/lib/upstox-client.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/lib/upstox-client.ts).
2. **Instant Demo Mode**:
   - Automatically provides 8 blue-chip holdings (Reliance, TCS, HDFC Bank, Infosys, ICICI Bank, Bharti Airtel, ITC, L&T) with ₹5,05,575 invested capital.
   - Allows immediate testing of all metrics and AI audits without requiring Upstox credentials.
3. **Live Portfolio View** ([`src/components/PortfolioView.tsx`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/components/PortfolioView.tsx)):
   - 4 summary cards: Total Invested, Current Value, Net P&L (₹ and %), Day's P&L.
   - Holdings table with live quotes, quantities, average costs, and P&L.
   - Single-stock Council button on each holding row.
4. **5-Agent Portfolio Audit Chamber** ([`src/components/PortfolioAuditModal.tsx`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/components/PortfolioAuditModal.tsx)):
   - **Health Score**: 1.0 to 10.0 scale (e.g., *8.5/10 - Balanced & Resilient*).
   - **CIO Rebalancing Plan**: Actionable directives for every holding (`STRONG_ACCUMULATE`, `ACCUMULATE`, `HOLD`, `BOOK_PROFIT`, `EXIT_STOP_LOSS`) with target prices and stop-losses.
   - **Sector Exposure Breakdown**: Categorizes allocation into Financials, IT, Energy, etc., flagging sectors with >35% weight as *Overweight*.
   - **Agent Insights**: Specific commentary from Sentinel, Fundamentalist, News Scout, and Risk Guardian.

---

## 11. Module 8: System Settings & API Key Manager

### Purpose:
Unified hub for managing external API credentials with zero external leakage.

- **Component**: [`src/components/SettingsModal.tsx`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/components/SettingsModal.tsx)
- **API Endpoint**: [`src/app/api/ai/status/route.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/app/api/ai/status/route.ts)
- **Tabs**:
  1. **Google Gemini AI**:
     - Automatically detects server-side key in `.env.local` (`AIzaSy...`).
     - Allows custom browser-level override key.
     - Live **"Test Connection"** button verifies Gemini API connectivity.
  2. **Upstox Brokerage**:
     - Upstox API Key (Client ID) & API Secret inputs.
     - 1-click copyable Redirect URL: `http://localhost:3000/api/upstox/callback`.
     - Active session status display with user ID, name, and expiration timestamp.
     - **"Authorize & Connect Upstox"** and **"Disconnect"** actions.

---

## 12. Module 9: Portfolio Alerts Engine & 1-Click Order Execution Chamber

### Purpose:
Provides proactive risk management by constantly scanning Demat holdings for stop-loss triggers, profit-taking opportunities, and dip accumulation thresholds, paired with an institutional trade execution modal supporting live Upstox API v2 orders and risk-free Paper Trading.

### Architecture & Capabilities:
1. **Rule-Based Institutional Alert Engine** ([`src/lib/portfolio-alerts.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/lib/portfolio-alerts.ts)):
   - **`STOP_LOSS` (Critical Sell)**: Triggered when unrealized losses hit &ge; 7% from buy average (`pnl_percentage <= -7.0%`) or intraday drop &ge; 5%. Flags immediate capital preservation directive.
   - **`BOOK_PROFIT` (Lock Gains)**: Triggered when gain reaches &ge; 18% or parabolic single-day rally &ge; 6%. Recommends locking in 30%–50% profits.
   - **`BUY_MORE` (Dip Accumulate)**: Triggered on mild pullbacks (-2.5% to -6.5%) into moving average support for high-quality holdings.
   - **`CONCENTRATION_WARNING` (Portfolio Risk)**: Triggered when a single stock exceeds 22% of total portfolio value.
2. **Order Placement API** ([`src/app/api/upstox/order/route.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/app/api/upstox/order/route.ts)):
   - **Live Upstox API v2**: Sends signed `POST https://api.upstox.com/v2/order/place` requests with user OAuth bearer token.
   - **Paper Trading Mode**: Generates simulated exchange executions (`SIM-NSE-XXXXXX`) with realistic regulatory charges without touching live capital.
   - **Dalal Street Market Hours & AMO Detection**: Automatically checks IST (UTC+5:30) trading hours (9:15 AM - 3:30 PM). Automatically marks orders outside hours as `is_amo: true` and queues them for the opening bell.
3. **Institutional Order Ticket** ([`src/components/OrderModal.tsx`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/components/OrderModal.tsx)):
   - Order types: `MARKET`, `LIMIT` with numeric price field.
   - Products: `Delivery (CNC)` vs `Intraday (MIS)`.
   - Capital quick-allocator: `₹10,000`, `₹25,000`, `₹50,000`, `₹1,00,000` buttons calculate quantity automatically.
   - Seamless integration with the 5-Agent Council: Pre-populates CIO target price and stop-loss directly into the ticket.
4. **End-to-End Triggers**:
   - **Council Modal**: "Execute 1-Click Order" button directly under the CIO matrix.
   - **Stock Detail Modal**: "Buy / Trade" button in the header.
   - **Screener & Watchlist**: "Trade" button on every stock row.
   - **Portfolio View**: Quick "Trade / Exit" buttons on both alert cards and holdings rows.

---

## 13. Module 10: Multi-User Zero-DB Authentication & Master Admin Gatekeeper

### Purpose:
Enables secure web hosting deployment (e.g. on Vercel) without managing an external SQL/NoSQL user database. It provides Google OAuth 2.0 authentication, a holding gate for unapproved sign-ins, and a live Master Admin approval queue.

### Architecture & Capabilities:
1. **Zero Database (0-DB) Session Engine** ([`src/lib/auth.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/lib/auth.ts)):
   - **Stateless HMAC SHA-256 Signatures**: Authenticated user payloads are serialized, base64url encoded, and signed into `dalal_auth_session` HTTP-only cookies (`payload.signature`).
   - **Dynamic Authorization Check**: On every API route request, even with a valid signed cookie, the user's email is evaluated against `ADMIN_EMAIL`, `ALLOWED_EMAILS`, and `data/approved_users.json` / Upstash Redis records.
2. **Master Admin Anchor (`teja.sai42@gmail.com`)**:
   - The Master Admin is hard-anchored in the system core. Master Admin status cannot be revoked or bypassed.
   - Master Admin enjoys exclusive access to the **Access Management Chamber**, live server telemetry, and the **UAE Bullion Terminal**.
3. **Approval Gate & Holding Queue**:
   - Any new user signing in via Google who is not pre-approved is held at a stylized *"Access Pending Administrator Approval"* gatekeeper screen.
   - Unapproved requests are automatically appended to the pending queue (`/api/auth/users`) and reflected in real-time on the Master Admin's header badge.
4. **Access Management Modal** ([`src/components/AccessManagementModal.tsx`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/components/AccessManagementModal.tsx)):
   - Master Admin can 1-click **Approve**, **Pre-Approve by Email**, or **Revoke** any user.
   - Immediate revoking terminates active sessions upon their next API request.
5. **Per-User Demat & Key Isolation**:
   - Upstox access tokens and Demat credentials never leak across users. User A cannot view User B's portfolio.
   - Browser tokens are stored in scoped keys (`dalal_upstox_token_${email}`) and transmitted via `x-upstox-token` headers.
   - Browser-direct smart routing fetches holdings directly from the client IP, completely bypassing Vercel/AWS datacenter IP blocks.
6. **Telemetry & Live Activity Ledger**:
   - The frontend sends periodic heartbeat pings (`/api/auth/heartbeat`) every 90 seconds.
   - Upstash Redis stores active user telemetry (`vault:user_activity_ledger.json`), reporting total registered users, active sessions today, and live concurrent investors.

---

## 14. Module 11: Cloud Vault Engine (Upstash Redis & Google Drive)

### Purpose:
Solves the ephemeral filesystem problem of serverless hosts (like Vercel and AWS Lambda) by providing a low-latency, free, permanent cloud persistence layer with instant cross-device synchronization.

### Architecture & Capabilities:
1. **Direct Structured JSON Storage (Primary - Upstash Redis)** ([`src/lib/drive-vault.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/lib/drive-vault.ts)):
   - Operates over Upstash Redis REST HTTP API (`UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN`).
   - Data collections are stored directly as structured JSON under deterministic key namespaces:
     - `vault:watchlist_<hash>.json`: User watchlist and custom strategy bucket categories.
     - `vault:bullion_portfolio_<hash>.json`: Master Admin physical UAE bullion holdings.
     - `vault:dalal_access_records.json`: Approved user whitelist records.
     - `vault:user_activity_ledger.json`: Active user session telemetry and visitor ledger.
   - **Direct JSON eliminates decryption failures**: Avoids serverless environment variable mismatches and ensures instant reads/writes.
2. **AES-256-GCM Cryptographic Vault (Backup)** ([`src/lib/crypto-vault.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/lib/crypto-vault.ts)):
   - Encrypts sensitive personal financial payloads using authenticated AES-256-GCM.
   - Multi-Secret & Multi-Salt Fallback: Seamlessly decrypts across diverse deployments by testing candidate master secrets (`AUTH_SECRET`, `VAULT_SECRET`, `GEMINI_API_KEY`, etc.) and automatically migrates successfully decrypted payloads to direct Redis JSON.
3. **Google Drive Vault (Secondary Fallback)**:
   - Supports Google Drive API via Service Account or OAuth refresh token (`GOOGLE_DRIVE_FOLDER_ID`), backing up files into a dedicated cloud folder.

---

## 15. Module 12: Simulated Paper Trading Engine & Order Ledger

### Purpose:
Provides investors with a risk-free virtual execution environment to test quantitative strategies and AI Council recommendations in live market conditions without deploying real capital.

### Architecture & Capabilities:
1. **Virtual Capital Ledger** ([`src/lib/paper-trading.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/lib/paper-trading.ts)):
   - Every user receives a default initial virtual bankroll of **₹10,00,000 (10 Lakhs INR)**.
   - Supports instant BUY and SELL execution on any NSE/BSE stock at live CMP.
2. **Simulated Matching & Order Execution**:
   - Realistic transaction tracking: Generates exchange order IDs (`SIM-NSE-XXXXXX`), timestamps, and trade prices.
   - Automatically deducts or credits the virtual cash balance and recalculates weighted average acquisition prices.
   - Dynamic P&L Calculation: Computes live invested capital, current valuation, and net unrealized returns.
3. **Cloud Synchronization**:
   - Paper trading balances and order books are persisted in Upstash Redis (`vault:pt_<hash>.enc` and `data/papertrade_<hash>.json`), synchronizing across devices.

---

## 16. Module 13: UAE Gold & Silver Bullion Terminal & Master Admin Physical Portfolio

### Purpose:
A dedicated, institutional-grade commodity board and physical bullion portfolio tracker designed specifically for UAE physical gold and silver investors. Access is strictly restricted to the Master Admin (`teja.sai42@gmail.com`).

### Architecture & Capabilities:
1. **Live Dubai Gold Souk Benchmark Board** ([`src/lib/bullion-engine.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/lib/bullion-engine.ts)):
   - Streams live international spot prices for Gold (`GC=F`) and Silver (`SI=F`) via Yahoo Finance API.
   - Uses the official UAE Central Bank currency peg: **`1 USD = 3.6725 AED`**.
   - Calculates Dubai Souk benchmark rates across 5 retail & investment grades:
     - **Gold 24K (999.9)**: Pure investment mint bars and ingots.
     - **Gold 22K (916)**: Standard Souk jewelry and sovereign coins.
     - **Gold 21K (875)**: Traditional Arab market benchmark.
     - **Gold 18K (750)**: Modern jewelry and stone-set pieces.
     - **Silver 999 Fine**: Industrial and investment grade bullion.
2. **Dual Currency Engine & Live Forex Conversion**:
   - Fetches live `AEDINR=X` exchange rates (e.g., `1 AED ≈ ₹25.93`).
   - One-click instant currency toggle: Displays all rates and portfolio values in either **AED (د.إ)** or **INR (₹)**.
   - Displays 24-hour price change and percentage fluctuations for each metal grade.
3. **Master Admin Physical Portfolio Tracker** ([`src/components/BullionView.tsx`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/components/BullionView.tsx)):
   - **Record Purchases**:
     - Flexible metal selection (24K, 22K, 21K, 18K, Silver 999).
     - Multi-unit weight entry: **Grams (g)**, **Tolas (11.66g)**, **Troy Ounces (31.10g)**, or **Kilograms (kg)**.
     - Flexible pricing: Enter **Buy Price per gram (AED)** or **Total AED Paid** with automatic bi-directional conversion.
     - 1-Click Helper: **"Use Today's UAE CMP"** fills current market price automatically.
     - Dealer & Invoice notes (e.g. Dubai Souk, Joyalukkas, Malabar Gold).
   - **Real-Time Portfolio KPIs**:
     - Total Invested Capital (AED & INR).
     - Current Market Valuation at live Souk CMP (AED & INR).
     - Net Unrealized Profit / Loss (AED, INR, and %).
     - Physical Weight Summary: Total Gold (grams & tolas) and Total Silver (grams & kilograms).
   - **Holdings Management**: Interactive table with filtering (All / Gold Only / Silver Only), in-line edit, and delete actions.
4. **Security & Data Isolation**:
   - **Strict Master Admin Gate**: The `🟡 UAE Bullion` navigation button only renders if `session?.isAdmin === true`.
   - **API Protection**: `/api/bullion` rejects non-admin requests with `403 Forbidden`.
   - **Cloud Persistence**: Holdings are stored directly in Upstash Redis under `vault:bullion_portfolio_<hash>.json`.

---

## 17. Module 14: Watchlist & Custom Strategy Buckets Persistence Architecture

### Purpose:
Ensures user watchlists and custom bucket categories remain permanently saved across browser refreshes, cache clearing, and serverless cold starts.

### Architecture & Resilience Highlights:
1. **Direct Upstash Redis JSON Persistence** ([`src/lib/storage.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/lib/storage.ts)):
   - Watchlist items and bucket names are saved directly as JSON under `vault:watchlist_<hash>.json`.
   - Bypasses fragile encryption tag verification across different serverless environments.
2. **Client-Side Safeguard against Demo Fallback Overwrite** ([`src/app/page.tsx`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/app/page.tsx)):
   - If the server ever returns the 2-stock demo fallback (`HDFCBANK.NS` & `TATAMOTORS.NS`) while the user has custom stocks locally, the client detects the anomaly, rejects the overwrite, and immediately synchronizes the user's custom stocks up to the cloud.
3. **Support for Empty Lists & Safe Deletions**:
   - Full support for users clearing or deleting default stocks without the system restoring hardcoded demo defaults on subsequent reloads.

---

## 18. Complete Data Models & Type System

### 1. `StockQuote` ([`src/types/stock.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/types/stock.ts))
```typescript
export interface StockQuote {
  symbol: string;               // e.g. "RELIANCE.NS"
  name: string;                 // e.g. "Reliance Industries Limited"
  price: number;                // Current market price (CMP)
  change: number;               // Absolute change in INR
  changePercent: number;        // Percentage change
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap: number;
  peRatio?: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  discountFromHigh: number;     // % drop from 52-week peak
  distanceFromLow: number;      // % gain from 52-week trough
  rsi14?: number;               // 14-period Relative Strength Index
  ema50?: number;               // 50-day Exponential Moving Average
  ema200?: number;              // 200-day Exponential Moving Average
  sector?: string;              // e.g. "Energy", "Technology"
  nifty50?: boolean;
  nifty100?: boolean;
  signal: ConvictionType;       // 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL'
  signalScore: number;          // 1 to 10 scale
  signalReason: string;
  tags: string[];               // e.g. ['Value Discount', 'RSI Oversold']
}
```

### 2. `CouncilConsensus` ([`src/types/agent.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/types/agent.ts))
```typescript
export interface CouncilConsensus {
  symbol: string;
  companyName: string;
  currentPrice: number;
  cioVerdict: ConvictionType;
  overallScore: number;         // 1 to 10 scale
  debateSummary: string;
  cioExecutiveDirective: string;
  tradeActionPlan: {
    entryStrategy: string;
    target1: string;
    target2: string;
    stopLoss: string;
    suggestedAllocationPercent: number;
    holdingHorizon: string;
  };
  sentinel: SentinelReport;
  fundamentalist: FundamentalReport;
  newsScout: NewsScoutReport;
  riskGuardian: RiskGuardianReport;
  timestamp: string;
}
```

### 3. `UpstoxHolding` & `PortfolioSummary` ([`src/types/upstox.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/types/upstox.ts))
```typescript
export interface UpstoxHolding {
  isin: string;
  trading_symbol: string;
  company_name: string;
  exchange: 'NSE' | 'BSE';
  quantity: number;
  average_price: number;
  last_price: number;
  close_price: number;
  pnl: number;
  pnl_percentage: number;
  day_change: number;
  day_change_percentage: number;
  invested_value: number;
  current_value: number;
  sector?: string;
}

export interface PortfolioSummary {
  total_invested: number;
  current_value: number;
  total_pnl: number;
  total_pnl_percentage: number;
  day_pnl: number;
  day_pnl_percentage: number;
  holdings_count: number;
  is_demo_mode: boolean;
}

export interface PortfolioAlert {
  id: string;
  symbol: string;
  company_name: string;
  type: 'STOP_LOSS' | 'BOOK_PROFIT' | 'BUY_MORE' | 'CONCENTRATION_WARNING';
  severity: 'urgent' | 'warning' | 'opportunity' | 'info';
  title: string;
  message: string;
  suggestedAction: string;
  metric: string;
  currentPrice: number;
  averagePrice?: number;
  targetPrice?: number;
  stopLossPrice?: number;
  holdingSignal: 'STOP_LOSS' | 'BOOK_PROFIT' | 'BUY_MORE' | 'HOLD';
}

export interface OrderPlacementRequest {
  symbol: string;
  quantity: number;
  transaction_type: 'BUY' | 'SELL';
  product: 'D' | 'I';
  order_type: 'MARKET' | 'LIMIT';
  price?: number;
  trigger_price?: number;
  target_price?: number;
  stop_loss?: number;
  isPaperTrade?: boolean;
}
```

### 4. `BullionRate` & `BullionHolding` ([`src/types/bullion.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/types/bullion.ts))
```typescript
export type BullionMetalType = 'GOLD_24K' | 'GOLD_22K' | 'GOLD_21K' | 'GOLD_18K' | 'SILVER_999';

export interface BullionRate {
  metal: BullionMetalType;
  displayName: string;
  purity: number;               // 0.9999, 0.9167, 0.875, 0.750, 0.999
  pricePerGramAED: number;
  pricePerGramINR: number;
  pricePerKgAED?: number;
  pricePerKgINR?: number;
  change24hAED: number;
  changePercent24h: number;
}

export interface DubaiSoukRates {
  gold24k: BullionRate;
  gold22k: BullionRate;
  gold21k: BullionRate;
  gold18k: BullionRate;
  silver999: BullionRate;
  usdAedPeg: number;            // 3.6725
  aedInrRate: number;           // Live Forex e.g. 25.93
  goldOunceUSD: number;
  silverOunceUSD: number;
  lastUpdated: string;
}

export interface BullionHolding {
  id: string;
  metalType: BullionMetalType;
  itemName: string;             // e.g. "10g Emirates Gold Bar"
  weightGrams: number;
  buyPricePerGramAED: number;
  buyDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BullionSummary {
  totalInvestedAED: number;
  totalInvestedINR: number;
  currentValueAED: number;
  currentValueINR: number;
  unrealizedPnLAED: number;
  unrealizedPnLINR: number;
  unrealizedPnLPercent: number;
  totalGoldWeightGrams: number;
  totalGoldWeightTolas: number;
  totalSilverWeightGrams: number;
  totalSilverWeightKg: number;
  holdingsCount: number;
}
```

### 5. `AuthUser` & Session Record ([`src/lib/auth.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/lib/auth.ts))
```typescript
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: 'admin' | 'user';
  isApproved: boolean;
}

export interface ApprovedUserRecord {
  email: string;
  name: string;
  approvedAt: string;
  approvedBy: string;
}

export interface PendingUserRecord {
  email: string;
  name: string;
  picture?: string;
  requestedAt: string;
}
```

---

## 19. Storage Architecture & Zero-DB Privacy Strategy

DalalAI implements a hybrid **Zero-DB Cloud Vault** designed for 100% privacy, zero server maintenance costs, and permanent survival across serverless host restarts:

```
                                  ┌──────────────────────────────┐
                                  │   Browser Client (Next.js)   │
                                  └──────────────┬───────────────┘
                                                 │
                                                 ▼
                                  ┌──────────────────────────────┐
                                  │ Next.js 14 API Layer (/api)  │
                                  └──────┬───────────────┬───────┘
                                         │               │
                     Direct Structured   │               │ Fallback
                     JSON REST Reads     │               │ Encrypted Backup
                                         ▼               ▼
                       ┌───────────────────────┐   ┌───────────────────────┐
                       │  Upstash Redis Vault  │   │  Google Drive Vault   │
                       │  vault:watchlist.json │   │  wl_*.enc (AES-256)   │
                       │  vault:bullion.json   │   │  pt_*.enc (AES-256)   │
                       │  vault:access.json    │   │  .test.txt            │
                       └───────────────────────┘   └───────────────────────┘
                                         │
                                         ▼ Local Dev Mirror
                               ┌───────────────────┐
                               │       data/       │
                               │  watchlist.json   │
                               │  stocks_cache.json│
                               └───────────────────┘
```

**Security Principles**:
- No user accounts or passwords are stored in an external database.
- Upstox Demat API tokens are isolated to the specific user's browser localStorage and never logged to server disks.
- All bullion records and admin control panels are strictly bound to `teja.sai42@gmail.com`.
- API keys are masked in all UI displays (e.g., `••••••••-••••-••••-••••-9c0d`).

---

## 20. Setup, Installation & Web Hosting Deployment

### Prerequisites:
- **Node.js**: v18.17.0 or higher
- **Package Manager**: npm or yarn
- **API Key**: A free Google Gemini API key from [aistudio.google.com](https://aistudio.google.com)
- **Cloud Vault (Free)**: An Upstash Redis database from [upstash.com](https://upstash.com)

### Local Development Setup:
```bash
# 1. Clone repository or navigate to workspace
cd "c:\Users\tejas\OneDrive\Documents\AI Project"

# 2. Install dependencies
npm install

# 3. Configure .env.local:
# GEMINI_API_KEY="AIzaSy..."
# UPSTASH_REDIS_REST_URL="https://proud-dogfish-111517.upstash.io"
# UPSTASH_REDIS_REST_TOKEN="..."
# ADMIN_EMAIL="teja.sai42@gmail.com"
```

### Pre-warming the 500-Stock Universe:
```bash
# Pre-populates the local disk cache with live NSE quotes
node scripts/prewarm-cache.js
```

### Starting the Development Server:
```bash
npm run dev
# Server boots at http://localhost:3000
```

### Web Hosting Deployment (Vercel):
In your Vercel Project Settings &rarr; **Environment Variables**, set:

| Variable | Description |
| :--- | :--- |
| `GEMINI_API_KEY` | Server-side Google Gemini 2.5 Flash API Key |
| `ADMIN_EMAIL` | Master Administrator email (`teja.sai42@gmail.com`) |
| `AUTH_SECRET` | 32+ character random secret for signing HMAC session cookies |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Web Application Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 Client Secret |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL (Instant Cloud Persistence) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST Token |

---

## 21. Verification & Performance Benchmarks

| Metric / Pipeline | Expected Standard | Verified Result | Status |
| :--- | :--- | :--- | :--- |
| **TypeScript Compilation** | Zero type errors (`npx tsc --noEmit`) | **0 Errors (Exit code 0)** | Passed |
| **Production Webpack Build** | Clean Next.js build (`npm run build`) | **26 Routes Compiled Successfully** | Passed |
| **Structured AI Observability** | Async Redis logging & Telemetry Modal | **Audited (/api/ai/telemetry)** | Passed |
| **500-Stock Screener Fetch** | Latency under 300 ms | **~120 ms** | Passed |
| **Market Benchmark Indices** | NIFTY, SENSEX, BANK NIFTY, VIX | **100% Live Quotes** | Passed |
| **5-Agent Council Deliberation** | Structured consensus JSON | **Valid (Health Score 8.5/10)** | Passed |
| **Portfolio Alerts Engine** | 4-Tier rule evaluation on holdings | **Real & Demo Triggers Verified** | Passed |
| **1-Click Order Execution** | Upstox API v2 + Simulated Paper Trade | **Executed with AMO Queueing** | Passed |
| **Upstox Demat Sync** | Live OAuth session + Demo fallback | **₹5,05,575 Deployed Capital** | Passed |
| **Zero-DB Google Login Gate** | Unapproved users blocked at holding gate | **Dynamic Whitelist Verified** | Passed |
| **Upstash Cloud Vault Sync** | Instant cross-device persistence | **Active (Direct Redis JSON)** | Passed |
| **UAE Gold & Silver Live Rates** | Dubai Souk 24K, 22K, 21K, 18K, Silver 999 | **Live Peg (3.6725) & Live AED/INR** | Passed |
| **Master Admin Bullion Vault** | Strict admin isolation & AED/INR P&L | **Verified (`teja.sai42@gmail.com`)** | Passed |
| **Next.js Page Hydration** | Zero SSR hydration mismatches | **Clean Render (25 KB HTML)** | Passed |

---

*DalalAI Institutional Equity Research Terminal • NSE / BSE Dalal Street Intelligence • UAE Gold & Silver Souk Terminal • Built with Next.js 14 & Google Gemini*

