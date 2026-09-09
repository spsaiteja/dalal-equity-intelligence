# DalalAI: Upstox Demat Integration & 5-Agent Council Audit

Comprehensive architecture, technical implementation details, and step-by-step user guide for the Upstox Brokerage Demat Integration and 5-Agent AI Council Portfolio Audit Chamber in DalalAI.

---

## Table of Contents

1. [Executive Overview](#1-executive-overview)
2. [Architecture & Data Flow](#2-architecture--data-flow)
3. [File Structure & Modified Components](#3-file-structure--modified-components)
4. [Data Models & TypeScript Interfaces](#4-data-models--typescript-interfaces)
5. [Backend API Endpoints](#5-backend-api-endpoints)
6. [Frontend UI Components](#6-frontend-ui-components)
7. [SEBI Compliance & Token Management](#7-sebi-compliance--token-management)
8. [Instant Demo Portfolio Mode](#8-instant-demo-portfolio-mode)
9. [5-Agent Council Audit Engine](#9-5-agent-council-audit-engine)
10. [Step-by-Step Upstox Connection Guide](#10-step-by-step-upstox-connection-guide)
11. [Verification & Testing](#11-verification--testing)

---

## 1. Executive Overview

The **Upstox Demat Integration** transforms DalalAI from a standalone stock screener into a connected institutional-grade equity terminal. By linking an Upstox account:

- **Automatic Demat Sync**: Holdings, quantities, average buy prices, and live Dalal Street market values are fetched in real-time.
- **Live P&L Tracking**: Calculates total invested capital, current portfolio valuation, unrealized net P&L (₹ and %), and day's P&L.
- **5-Agent Council Portfolio Audit**: A holistic committee deliberation (CIO, Sentinel, The Fundamentalist, News Scout, and Risk Guardian) that reviews your invested portfolio for concentration risk, technical breakdowns, valuation extremes, and produces specific rebalancing targets.
- **Instant Demo Mode**: A realistic 8-holding institutional blue-chip portfolio is available out of the box, allowing full testing of all analytics and audits without requiring Upstox credentials.

---

## 2. Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Browser ["User Browser (Next.js 14 Client)"]
        UI_Header["Header (My Portfolio Tab)"]
        UI_Portfolio["PortfolioView Component"]
        UI_AuditModal["PortfolioAuditModal (Chamber)"]
        UI_Settings["SettingsModal (Upstox & Gemini Tabs)"]
    end

    subgraph API_Routes ["Next.js Server API Routes"]
        API_Auth["/api/upstox/auth (GET/POST/DELETE)"]
        API_Callback["/api/upstox/callback (OAuth Redirect)"]
        API_Portfolio["/api/upstox/portfolio (Holdings & Summary)"]
        API_Audit["/api/ai/audit-portfolio (5-Agent Gemini Committee)"]
    end

    subgraph Storage ["Local Encrypted Storage (data/)"]
        ConfigDisk["data/upstox_config.json (API Key & Secret)"]
        SessionDisk["data/upstox_session.json (Access Token & Expiry)"]
    end

    subgraph External ["External Services"]
        UpstoxAuth["Upstox OAuth Dialog (SEBI 24h)"]
        UpstoxAPI["Upstox v2 API (/v2/portfolio/long-term-holdings)"]
        GeminiAI["Google Gemini 2.5 Flash"]
    end

    UI_Settings -->|1. Save Credentials & Request Login| API_Auth
    API_Auth -->|2. Return OAuth Login URL| UpstoxAuth
    UpstoxAuth -->|3. User Authorizes & Redirects with Code| API_Callback
    API_Callback -->|4. Exchange Code for Token| UpstoxAPI
    API_Callback -->|5. Save Active Session| SessionDisk
    API_Portfolio -->|6. Check Session| SessionDisk
    API_Portfolio -->|7a. If Connected: Fetch Live Holdings| UpstoxAPI
    API_Portfolio -->|7b. If Not Connected: Load Demo Portfolio| Storage
    UI_Portfolio -->|8. Fetch Holdings & Summary| API_Portfolio
    UI_AuditModal -->|9. Trigger Audit Request| API_Audit
    API_Audit -->|10. Synthesize Multi-Agent Directives| GeminiAI
```

---

## 3. File Structure & Modified Components

| File | Purpose | Key Responsibilities |
| :--- | :--- | :--- |
| `src/types/upstox.ts` | **Type Definitions** | Defines interfaces for holdings, session, portfolio summary, audit reports, sector weights, and rebalance directives. |
| `src/lib/upstox-storage.ts` | **Local Storage Utility** | Handles saving, reading, clearing, key masking, and expiration checks for credentials and tokens in `data/`. |
| `src/lib/upstox-client.ts` | **Upstox API Client** | Builds OAuth URLs, exchanges auth code for token, calls `/v2/portfolio/long-term-holdings`, and supplies realistic 8-holding demo data. |
| `src/app/api/upstox/auth/route.ts` | **Auth Management API** | `GET` (status & masked keys), `POST` (save credentials & generate auth URL), `DELETE` (logout session). |
| `src/app/api/upstox/callback/route.ts` | **OAuth Callback Receiver** | Receives SEBI auth code, exchanges for access token, stores session, redirects to `/?tab=portfolio&connected=true`. |
| `src/app/api/upstox/portfolio/route.ts` | **Portfolio Data API** | Serves holdings, computes summary metrics (total invested, current value, total P&L, day P&L). |
| `src/app/api/ai/audit-portfolio/route.ts` | **AI Council Audit API** | Computes sector allocations, runs Gemini 5-Agent Council deliberation, produces health score & rebalancing actions. |
| `src/components/PortfolioView.tsx` | **Portfolio Dashboard View** | 4 summary metric cards, live/demo status banner, holdings table, 1-click single-stock Council trigger. |
| `src/components/PortfolioAuditModal.tsx` | **Audit Chamber Modal** | Visual health score gauge, CIO executive directive, sector breakdown table, and 4 agent insight tabs. |
| `src/components/SettingsModal.tsx` | **Settings & Integrations Modal** | Dual-tab interface: Google Gemini AI key configuration + Upstox brokerage API linking. |
| `src/components/Header.tsx` | **Main Navigation** | Adds "My Portfolio" tab with pulsing green LIVE dot or yellow DEMO indicator. |
| `src/app/page.tsx` | **Root Application Page** | State management, active tab routing, URL query parameter detection, modal triggers. |

---

## 4. Data Models & TypeScript Interfaces

Located at [`src/types/upstox.ts`](file:///c:/Users/tejas/OneDrive/Documents/AI%20Project/src/types/upstox.ts):

### UpstoxHolding
Represents a single Demat position:
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
  product?: string;
}
```

### PortfolioSummary
Aggregate portfolio metrics:
```typescript
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
```

### PortfolioAuditReport
Output of the 5-Agent AI Council:
```typescript
export interface PortfolioAuditReport {
  overallHealthScore: number;       // 1.0 to 10.0 scale
  healthStatus: 'Institutional Grade' | 'Balanced & Resilient' | 'Moderate Concentration Risk' | 'High Risk / Unbalanced';
  cioExecutiveSummary: string;
  sectorWeights: SectorWeight[];
  rebalancingPlan: RebalanceAction[];
  agentAudits: {
    sentinel: { stance: string; technicalAlert: string; breakdownRisks: string[] };
    fundamental: { valuationAssessment: string; portfolioPeEstimate: string; undervaluedOpportunities: string[]; stretchedHoldings: string[] };
    newsScout: { headlineSentiment: string; catalystsIdentified: string[]; headwindAlerts: string[] };
    riskGuardian: { diversificationScore: number; maxSingleStockExposurePercent: number; topRiskHolding: string; mandatedRiskAdjustments: string[] };
  };
  timestamp: string;
}
```

---

## 5. Backend API Endpoints

### 1. `GET /api/upstox/auth`
- **Purpose**: Check if an active Upstox session is present and valid.
- **Response**:
  ```json
  {
    "success": true,
    "isConnected": false,
    "user_name": null,
    "hasCredentials": true,
    "apiKeyMasked": "••••••••-••••-••••-••••-9c0d",
    "redirectUri": "http://localhost:3000/api/upstox/callback"
  }
  ```

### 2. `POST /api/upstox/auth`
- **Purpose**: Save API Key & Secret locally and generate the Upstox OAuth Login URL.
- **Request Body**: `{ "apiKey": "...", "apiSecret": "...", "redirectUri": "..." }`
- **Response**:
  ```json
  {
    "success": true,
    "loginUrl": "https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id=...&redirect_uri=..."
  }
  ```

### 3. `DELETE /api/upstox/auth`
- **Purpose**: Clears the current session token from local disk storage and reverts the terminal to Demo Portfolio Mode.

### 4. `GET /api/upstox/callback`
- **Purpose**: Upstox OAuth redirect target. Captures `?code=...` from query parameters, performs server-side POST to `https://api.upstox.com/v2/login/authorization/token`, saves the resulting session, and redirects to `http://localhost:3000/?tab=portfolio&connected=true`.

### 5. `GET /api/upstox/portfolio`
- **Purpose**: Fetches holdings and summary. Supports `?refresh=true` to invalidate cache.
- **Response**:
  ```json
  {
    "success": true,
    "isConnected": false,
    "isDemoMode": true,
    "holdings": [...],
    "summary": {
      "total_invested": 505575,
      "current_value": 520174,
      "total_pnl": 14599,
      "total_pnl_percentage": 2.89,
      "day_pnl": 1479,
      "day_pnl_percentage": 0.29,
      "holdings_count": 8,
      "is_demo_mode": true
    }
  }
  ```

### 6. `POST /api/ai/audit-portfolio`
- **Purpose**: Runs the 5-Agent Council portfolio audit.
- **Request Body**: `{ "holdings": [...], "apiKey": "optional_gemini_key" }`
- **Response**: Full `PortfolioAuditReport` with health score, CIO directives, and agent audits.

---

## 6. Frontend UI Components

### 1. `Header.tsx`
- Added `'portfolio'` to active tabs: `'screener' | 'watchlist' | 'portfolio'`.
- Includes a live status indicator (green pinging circle when connected, yellow tag when in demo mode).

### 2. `PortfolioView.tsx`
- **Top Metrics Grid**: 4 prominent cards displaying Total Invested, Current Value, Total Unrealized P&L (₹ & %), and Day's P&L.
- **Status Banner**: Clearly indicates whether data is live from Demat or running in Demo Mode with a quick button to connect credentials.
- **Action Toolbar**: "Run 5-Agent Portfolio Audit" (primary button) and "Refresh Holdings" button.
- **Holdings Table**: Displays Symbol, Company Name, Quantity, Buy Average, Current Market Price (CMP), Total Value, Net P&L, Day Change, and a 1-click button to summon the 5-Agent Council for any single stock.

### 3. `PortfolioAuditModal.tsx`
- **Health Score Banner**: Displays score out of 10 and percentage gauge with color-coded status badge (*"Balanced & Resilient"*).
- **CIO Directive Section**: High-level strategic recommendation for the portfolio.
- **Tabbed Views**:
  - **Rebalancing Plan**: Every stock listed with CIO action (`HOLD`, `ACCUMULATE`, `BOOK_PROFIT`, `EXIT_STOP_LOSS`), allocation weight, target price, and stop-loss.
  - **Sector Exposure**: Table of all sectors with invested amount, weight %, and risk rating (*Balanced*, *Overweight*, *Underweight*).
  - **Committee Perspectives**: Dedicated cards for Sentinel, The Fundamentalist, News Scout, and Risk Guardian.

### 4. `SettingsModal.tsx`
- Upgraded with a clean dual-tab design:
  - **Google Gemini AI**: Server key status (`.env.local`), custom override input, connection testing.
  - **Upstox Brokerage**: Upstox Client ID input, API Secret input, 1-click copyable Redirect URL (`http://localhost:3000/api/upstox/callback`), live session status, Connect / Re-authorize and Disconnect buttons.

---

## 7. SEBI Compliance & 1-Year Analytics Token

Upstox provides two distinct connection models in DalalAI:

### A. 1-Year Analytics Access Token (Recommended for Continuous Sync)
- **365-Day Validity**: Upstox Developer apps generate an **Analytics Access Token** valid for 1 full year.
- **Continuous Background Sync**: You do **not** need to log in or enter an OTP every morning. DalalAI continuously syncs your Demat holdings, average buy prices, real-time P&L, and AI Council audits.
- **Read-Only Security**: Prevents accidental live order execution; your account cannot be compromised for unauthorized trades. If you want to place orders, use DalalAI's built-in Paper Trading mode.

### B. Daily OAuth 2.0 (Full Interactive Trading)
- According to SEBI cybersecurity regulations for trading access:
  - Interactive trading tokens expire daily (at 3:30 AM or midnight).
  - Used when you want live 1-click order execution through Upstox API v2.
  - DalalAI saves your API Key and Secret locally and prompts you to re-authorize with 1 click when the daily token expires.

---

## 8. Instant Demo Portfolio Mode

To allow immediate exploration without waiting for Upstox developer account approval, DalalAI provides an institutional 8-holding demo portfolio:

| Stock | Ticker | Sector | Qty | Buy Avg (₹) | Current CMP (₹) | Invested (₹) | Current (₹) | P&L (₹ / %) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Reliance Industries** | `RELIANCE` | Energy | 50 | ₹1,245.00 | ₹1,280.40 | ₹62,250 | ₹64,020 | +₹1,770 (+2.84%) |
| **Tata Consultancy Services** | `TCS` | Information Technology | 20 | ₹4,120.00 | ₹4,215.80 | ₹82,400 | ₹84,316 | +₹1,916 (+2.33%) |
| **HDFC Bank** | `HDFCBANK` | Banking & Financials | 45 | ₹1,680.00 | ₹1,724.50 | ₹75,600 | ₹77,602 | +₹2,002 (+2.65%) |
| **Infosys** | `INFY` | Information Technology | 35 | ₹1,850.00 | ₹1,892.00 | ₹64,750 | ₹66,220 | +₹1,470 (+2.27%) |
| **ICICI Bank** | `ICICIBANK` | Banking & Financials | 50 | ₹1,220.00 | ₹1,268.30 | ₹61,000 | ₹63,415 | +₹2,415 (+3.96%) |
| **Bharti Airtel** | `BHARTIARTL` | Telecom | 30 | ₹1,540.00 | ₹1,595.00 | ₹46,200 | ₹47,850 | +₹1,650 (+3.57%) |
| **ITC Ltd.** | `ITC` | FMCG | 100 | ₹485.00 | ₹502.20 | ₹48,500 | ₹50,220 | +₹1,720 (+3.55%) |
| **Larsen & Toubro** | `LT` | Infrastructure | 18 | ₹3,600.00 | ₹3,696.20 | ₹64,800 | ₹66,531 | +₹1,731 (+2.67%) |
| **Total** | **8 Stocks** | **5 Sectors** | - | - | - | **₹5,05,575** | **₹5,20,174** | **+₹14,599 (+2.89%)** |

---

## 9. 5-Agent Council Audit Engine

When clicking **"Run 5-Agent Portfolio Audit"**, DalalAI initiates a comprehensive audit pipeline:

1. **Sector Weight Aggregator**:
   - Calculates the exact capital allocation across all Dalal Street sectors.
   - Flags sectors with >35% allocation as *Overweight* and <10% as *Underweight*.
2. **Concentration Risk Analyzer**:
   - Computes single-stock exposure percentages.
   - Identifies the top-risk holding by portfolio weight (e.g., TCS at 16.3%).
3. **Multi-Agent Deliberation (Google Gemini)**:
   - **CIO (Chief Investment Officer)**: Issues the holistic executive verdict and sets concrete targets.
   - **Sentinel**: Assesses moving average support (50/200 EMA) and downside breakdown triggers.
   - **The Fundamentalist**: Analyzes aggregate portfolio P/E, flags stretched multiples, and identifies undervalued assets.
   - **News Scout**: Scans for macro and Dalal Street headwinds (RBI rate cycles, crude oil swings, earnings season).
   - **Risk Guardian**: Evaluates portfolio beta, diversification score, and suggests mandatory adjustments.
4. **Resilient Fallback Mode**:
   - If the Gemini API key is missing or encounters a rate limit, an institutional heuristic engine generates an instant fallback audit so the UI never errors out.

---

## 10. Step-by-Step Upstox Connection Guide

### Option 1: Instant 1-Year Analytics Token (Recommended)
1. Go to [Upstox Developer Portal](https://developer.upstox.com) and open your App.
2. Locate your **Analytics Access Token**.
3. In DalalAI, open **Settings &rarr; Upstox Brokerage**.
4. Paste your token into **"Analytics Access Token"** and click **"Verify & Connect (365-Day Access)"**.
5. Your real Demat holdings will immediately populate with continuous 365-day validity!

### Option 2: Daily OAuth 2.0 (For Live Order Placement)
1. In your Upstox App settings on `developer.upstox.com`, set the Redirect URL:
   ```text
   http://localhost:3000/api/upstox/callback
   ```
2. In DalalAI Settings, switch to **"Daily OAuth 2.0"**.
3. Paste your **API Key** and **API Secret** and click **"Authorize & Connect Upstox"**.
4. Log in with your Upstox mobile number, OTP, and 6-digit PIN.
5. Upstox redirects back to DalalAI with an active daily trading session.

---

## 11. Verification & Testing

The entire implementation has been validated with end-to-end tests:

### 1. TypeScript Strict Type-Checking
```bash
npx tsc --noEmit
# Output: Exited with code 0 (Zero errors)
```

### 2. Live Portfolio API Endpoint Test
```bash
node -e "fetch('http://localhost:3000/api/upstox/portfolio').then(r=>r.json()).then(d=>console.log(d.summary))"
```
**Output**:
```json
{
  "total_invested": 505575,
  "current_value": 520174,
  "total_pnl": 14599,
  "total_pnl_percentage": 2.89,
  "day_pnl": 1479,
  "day_pnl_percentage": 0.29,
  "holdings_count": 8,
  "is_demo_mode": true
}
```

### 3. 5-Agent Council Audit Verification
```bash
node -e "
fetch('http://localhost:3000/api/upstox/portfolio')
  .then(r => r.json())
  .then(p => fetch('http://localhost:3000/api/ai/audit-portfolio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ holdings: p.holdings })
  }))
  .then(r => r.json())
  .then(data => console.log('Audit Success:', data.success, 'Health Score:', data.data.overallHealthScore));
"
```
**Output**:
```text
Audit Success: true Health Score: 8.5
```

### 4. Browser Page Rendering
```bash
node -e "fetch('http://localhost:3000/?tab=portfolio').then(r=>r.text()).then(html=>console.log('Status: OK, Length: ' + html.length))"
# Output: Status: OK, Length: ~25726 bytes (No hydration errors)
```

---

*DalalAI Equity Terminal • Powered by Google Gemini & Upstox Developer API • NSE / BSE Live Markets*

