'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from '@/components/Header';
import { MarketIndices } from '@/components/MarketIndices';
import { ScreenerView } from '@/components/ScreenerView';
import { WatchlistView } from '@/components/WatchlistView';
import { StockDetailModal } from '@/components/StockDetailModal';
import { AiAnalysisModal } from '@/components/AiAnalysisModal';
import { MarketBriefingModal } from '@/components/MarketBriefingModal';
import { SettingsModal } from '@/components/SettingsModal';
import { AddToWatchlistModal } from '@/components/AddToWatchlistModal';
import { CouncilModal } from '@/components/CouncilModal';
import { PortfolioView } from '@/components/PortfolioView';
import { PortfolioAuditModal } from '@/components/PortfolioAuditModal';
import { OrderModal } from '@/components/OrderModal';
import { LoginGate } from '@/components/LoginGate';
import { TrendingUp } from 'lucide-react';
import {
  StockQuote,
  MarketIndex,
  WatchlistItem,
  AiStockAnalysis,
  MarketBriefing,
} from '@/types/stock';
import { CouncilConsensus } from '@/types/agent';
import { UpstoxHolding, PortfolioSummary, PortfolioAuditReport, PortfolioAlert } from '@/types/upstox';

const DEFAULT_BUCKETS = ['Long-Term Value', 'Dip Opportunities', 'Momentum Breakouts'];

interface AuthSessionState {
  authenticated: boolean;
  isApproved: boolean;
  isAdmin: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    picture?: string;
    role: 'admin' | 'user';
  } | null;
  hasGoogleConfig?: boolean;
  adminEmail?: string;
  pendingCount?: number;
}

export default function Dashboard() {
  // Auth Session State
  const [session, setSession] = useState<AuthSessionState | null>(null);
  const [loadingSession, setLoadingSession] = useState<boolean>(true);

  // Tab & Core Data States
  const [activeTab, setActiveTab] = useState<'screener' | 'watchlist' | 'portfolio'>('screener');
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [stocks, setStocks] = useState<StockQuote[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [buckets, setBuckets] = useState<string[]>(DEFAULT_BUCKETS);
  const [apiKey, setApiKey] = useState<string>('');
  const [hasServerKey, setHasServerKey] = useState<boolean>(false);

  // Upstox Portfolio States
  const [portfolioHoldings, setPortfolioHoldings] = useState<UpstoxHolding[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [isUpstoxConnected, setIsUpstoxConnected] = useState<boolean>(false);
  const [isDemoPortfolio, setIsDemoPortfolio] = useState<boolean>(true);
  const [isAnalyticsPortfolio, setIsAnalyticsPortfolio] = useState<boolean>(false);
  const [portfolioUserName, setPortfolioUserName] = useState<string | null>(null);
  const [loadingPortfolio, setLoadingPortfolio] = useState<boolean>(false);
  const [portfolioAlerts, setPortfolioAlerts] = useState<PortfolioAlert[]>([]);
  const [portfolioAlertCounts, setPortfolioAlertCounts] = useState<{
    urgent: number;
    buyMore: number;
    bookProfit: number;
    concentration: number;
    total: number;
  }>({ urgent: 0, buyMore: 0, bookProfit: 0, concentration: 0, total: 0 });

  // Portfolio Audit States
  const [isPortfolioAuditOpen, setIsPortfolioAuditOpen] = useState<boolean>(false);
  const [loadingPortfolioAudit, setLoadingPortfolioAudit] = useState<boolean>(false);
  const [portfolioAuditReport, setPortfolioAuditReport] = useState<PortfolioAuditReport | null>(null);

  // Modals & States
  const [selectedStockForDetail, setSelectedStockForDetail] = useState<StockQuote | null>(null);
  const [selectedStockForAi, setSelectedStockForAi] = useState<StockQuote | null>(null);
  const [selectedStockForCouncil, setSelectedStockForCouncil] = useState<StockQuote | null>(null);
  const [selectedStockForAdd, setSelectedStockForAdd] = useState<StockQuote | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AiStockAnalysis | null>(null);
  const [councilConsensus, setCouncilConsensus] = useState<CouncilConsensus | null>(null);
  const [marketBriefing, setMarketBriefing] = useState<MarketBriefing | null>(null);

  const [loadingIndices, setLoadingIndices] = useState(false);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [loadingCouncil, setLoadingCouncil] = useState(false);
  const [loadingBriefing, setLoadingBriefing] = useState(false);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isCouncilOpen, setIsCouncilOpen] = useState(false);
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Institutional Order Modal States
  const [isOrderOpen, setIsOrderOpen] = useState<boolean>(false);
  const [orderStock, setOrderStock] = useState<StockQuote | null>(null);
  const [orderTransactionType, setOrderTransactionType] = useState<'BUY' | 'SELL'>('BUY');
  const [orderTargetPrice, setOrderTargetPrice] = useState<number | string | undefined>(undefined);
  const [orderStopLossPrice, setOrderStopLossPrice] = useState<number | string | undefined>(undefined);

  // Check Auth Session
  const loadSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      setSession(data);
    } catch (err) {
      console.error('Session load error:', err);
    } finally {
      setLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Initialize from LocalStorage & Server Disk API
  useEffect(() => {
    if (!session?.isApproved) return;

    try {
      const savedKey = localStorage.getItem('dalal_ai_api_key');
      if (savedKey) setApiKey(savedKey);

      // Check server API key configuration
      fetch('/api/ai/status')
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && data.hasServerKey) {
            setHasServerKey(true);
          }
        })
        .catch(() => {});

      // Check for tab param e.g. /?tab=portfolio
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const tab = urlParams.get('tab');
        if (tab === 'portfolio') {
          setActiveTab('portfolio');
        }
      }

      // Fetch from disk storage
      fetch('/api/watchlist')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            if (data.watchlist && data.watchlist.length > 0) {
              setWatchlist(data.watchlist);
              localStorage.setItem('dalal_ai_watchlist', JSON.stringify(data.watchlist));
            }
            if (data.buckets && data.buckets.length > 0) {
              setBuckets(data.buckets);
              localStorage.setItem('dalal_ai_buckets', JSON.stringify(data.buckets));
            }
          }
        })
        .catch(() => {
          const savedWatchlist = localStorage.getItem('dalal_ai_watchlist');
          if (savedWatchlist) setWatchlist(JSON.parse(savedWatchlist));
          const savedBuckets = localStorage.getItem('dalal_ai_buckets');
          if (savedBuckets) setBuckets(JSON.parse(savedBuckets));
        });
    } catch (e) {
      console.error('Watchlist init error:', e);
    }
  }, [session?.isApproved]);

  // Fetch Market Indices
  const loadIndices = useCallback(async () => {
    setLoadingIndices(true);
    try {
      const res = await fetch('/api/market');
      const data = await res.json();
      if (data.success && data.data) {
        setIndices(data.data);
      }
    } catch (err) {
      console.error('Failed to load indices:', err);
    } finally {
      setLoadingIndices(false);
    }
  }, []);

  // Fetch Screener Stocks
  const loadStocks = useCallback(async (refresh: boolean = false) => {
    setLoadingStocks(true);
    try {
      const res = await fetch(`/api/stocks?limit=500${refresh ? '&refresh=true' : ''}`);
      const data = await res.json();
      if (data.success && data.data) {
        setStocks(data.data);
      }
    } catch (err) {
      console.error('Failed to load screened stocks:', err);
    } finally {
      setLoadingStocks(false);
    }
  }, []);

  // Fetch Upstox or Demo Portfolio (Scoped to user's personal token)
  const loadPortfolio = useCallback(async (refresh: boolean = false) => {
    setLoadingPortfolio(true);
    try {
      const userTokenKey = session?.user?.email ? `dalal_upstox_token_${session.user.email}` : 'dalal_upstox_token';
      const userUpstoxToken =
        typeof window !== 'undefined'
          ? localStorage.getItem(userTokenKey) || localStorage.getItem('dalal_upstox_token')
          : null;

      const res = await fetch(`/api/upstox/portfolio${refresh ? '?refresh=true' : ''}`, {
        headers: userUpstoxToken ? { 'x-upstox-token': userUpstoxToken } : {},
      });
      const data = await res.json();
      if (data.success) {
        setPortfolioHoldings(data.holdings || []);
        setPortfolioSummary(data.summary || null);
        setIsUpstoxConnected(Boolean(data.isConnected));
        setIsDemoPortfolio(Boolean(data.isDemoMode));
        setIsAnalyticsPortfolio(Boolean(data.isAnalyticsToken));
        setPortfolioUserName(data.user_name || null);
        if (data.alerts) setPortfolioAlerts(data.alerts);
        if (data.alertCounts) setPortfolioAlertCounts(data.alertCounts);
      }
    } catch (err) {
      console.error('Failed to load portfolio:', err);
    } finally {
      setLoadingPortfolio(false);
    }
  }, [session?.user?.email]);

  useEffect(() => {
    if (session?.isApproved) {
      loadIndices();
      loadStocks();
      loadPortfolio();
    }
  }, [session?.isApproved, loadIndices, loadStocks, loadPortfolio]);

  // Dictionary of symbol -> quote for fast lookup
  const stockQuotesMap = useMemo(() => {
    const map: Record<string, StockQuote> = {};
    stocks.forEach((s) => {
      map[s.symbol] = s;
    });
    return map;
  }, [stocks]);

  // Set of watchlisted symbols
  const watchlistSymbols = useMemo(() => {
    return new Set(watchlist.map((w) => w.symbol));
  }, [watchlist]);

  // Save API Key
  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('dalal_ai_api_key', key);
  };

  // Helper to sync watchlist changes to disk & localStorage
  const persistWatchlist = (updatedList: WatchlistItem[], updatedBuckets?: string[]) => {
    setWatchlist(updatedList);
    localStorage.setItem('dalal_ai_watchlist', JSON.stringify(updatedList));

    fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        watchlist: updatedList,
        buckets: updatedBuckets || buckets,
      }),
    }).catch((err) => console.error('Failed to save watchlist to disk:', err));
  };

  // Watchlist Actions
  const handleAddToWatchlist = (itemData: {
    symbol: string;
    name: string;
    bucket: string;
    addedPrice: number;
    targetPrice?: number;
    stopLoss?: number;
    notes?: string;
  }) => {
    const newItem: WatchlistItem = {
      id: Date.now().toString(),
      ...itemData,
      addedAt: new Date().toISOString(),
    };
    const updated = [newItem, ...watchlist.filter((w) => w.symbol !== itemData.symbol)];
    persistWatchlist(updated);
  };

  const handleRemoveFromWatchlist = (id: string) => {
    const updated = watchlist.filter((w) => w.id !== id);
    persistWatchlist(updated);
  };

  const handleCreateBucket = (name: string) => {
    if (!buckets.includes(name)) {
      const updatedBuckets = [...buckets, name];
      setBuckets(updatedBuckets);
      localStorage.setItem('dalal_ai_buckets', JSON.stringify(updatedBuckets));
      persistWatchlist(watchlist, updatedBuckets);
    }
  };

  // AI Stock Analysis Trigger
  const handleRunAiAnalysis = async (stock: StockQuote) => {
    setSelectedStockForAi(stock);
    setIsAiOpen(true);
    setLoadingAi(true);
    setAiAnalysis(null);

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: stock.symbol,
          apiKey: apiKey || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAiAnalysis(data.data);
      }
    } catch (err) {
      console.error('AI Analysis failed:', err);
    } finally {
      setLoadingAi(false);
    }
  };

  // AI Council Deliberation Trigger
  const handleRunCouncil = async (stock: StockQuote) => {
    setSelectedStockForCouncil(stock);
    setIsCouncilOpen(true);
    setLoadingCouncil(true);
    setCouncilConsensus(null);

    try {
      const res = await fetch('/api/ai/council', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: stock.symbol,
          quote: stock,
          apiKey: apiKey || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCouncilConsensus(data.data);
      }
    } catch (err) {
      console.error('Council Deliberation failed:', err);
    } finally {
      setLoadingCouncil(false);
    }
  };

  // Pre-Market Briefing Trigger
  const handleOpenBriefing = async () => {
    setIsBriefingOpen(true);
    if (!marketBriefing) {
      setLoadingBriefing(true);
      try {
        const res = await fetch('/api/ai/briefing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: apiKey || undefined }),
        });
        const data = await res.json();
        if (data.success) {
          setMarketBriefing(data.data);
        }
      } catch (err) {
        console.error('Briefing failed:', err);
      } finally {
        setLoadingBriefing(false);
      }
    }
  };

  // Portfolio 5-Agent Council Audit Trigger
  const handleRunPortfolioAudit = async () => {
    setIsPortfolioAuditOpen(true);
    setLoadingPortfolioAudit(true);
    setPortfolioAuditReport(null);

    try {
      const res = await fetch('/api/ai/audit-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey || undefined,
          holdings: portfolioHoldings,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setPortfolioAuditReport(data.data);
      }
    } catch (err) {
      console.error('Portfolio Audit failed:', err);
    } finally {
      setLoadingPortfolioAudit(false);
    }
  };

  // Institutional Order Trigger
  const handleOpenOrderModal = (
    stockOrSymbol: StockQuote | string,
    transactionType: 'BUY' | 'SELL' = 'BUY',
    targetPrice?: number | string,
    stopLossPrice?: number | string
  ) => {
    let resolvedStock: StockQuote | null = null;

    if (typeof stockOrSymbol === 'string') {
      const clean = stockOrSymbol.replace('.NS', '').replace('.BO', '');
      const foundInStocks = stocks.find(
        (s) => s.symbol === stockOrSymbol || s.symbol.replace('.NS', '') === clean
      );

      if (foundInStocks) {
        resolvedStock = foundInStocks;
      } else {
        const foundInHoldings = portfolioHoldings.find(
          (h) => h.trading_symbol === clean || h.trading_symbol === stockOrSymbol
        );

        if (foundInHoldings) {
          resolvedStock = {
            symbol: `${foundInHoldings.trading_symbol}.NS`,
            name: foundInHoldings.company_name,
            price: foundInHoldings.last_price,
            change: foundInHoldings.day_change,
            changePercent: foundInHoldings.day_change_percentage,
            dayHigh: foundInHoldings.last_price * 1.02,
            dayLow: foundInHoldings.last_price * 0.98,
            fiftyTwoWeekHigh: foundInHoldings.last_price * 1.2,
            fiftyTwoWeekLow: foundInHoldings.last_price * 0.8,
            volume: 100000,
            marketCap: 0,
            peRatio: 0,
            discountFromHigh: 0,
            distanceFromLow: 0,
            sector: foundInHoldings.sector || 'Equities',
            signal: 'BUY',
            signalScore: 7,
            signalReason: 'Holding rebalance target',
            tags: [],
          };
        } else {
          resolvedStock = {
            symbol: stockOrSymbol.includes('.') ? stockOrSymbol : `${stockOrSymbol}.NS`,
            name: stockOrSymbol,
            price: 100,
            change: 0,
            changePercent: 0,
            dayHigh: 102,
            dayLow: 98,
            fiftyTwoWeekHigh: 120,
            fiftyTwoWeekLow: 80,
            volume: 50000,
            marketCap: 0,
            peRatio: 0,
            discountFromHigh: 0,
            distanceFromLow: 0,
            sector: 'Equities',
            signal: 'BUY',
            signalScore: 7,
            signalReason: 'Order placement target',
            tags: [],
          };
        }
      }
    } else {
      resolvedStock = stockOrSymbol;
    }

    setOrderStock(resolvedStock);
    setOrderTransactionType(transactionType);
    setOrderTargetPrice(targetPrice);
    setOrderStopLossPrice(stopLossPrice);
    setIsOrderOpen(true);
  };

  // Loading State
  if (loadingSession) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 animate-pulse">
            <TrendingUp className="h-7 w-7 text-white" />
          </div>
          <div>
            <span className="text-2xl font-black text-white">
              Dalal<span className="text-market-blue">AI</span>
            </span>
            <p className="text-xs text-surface-muted">Institutional Terminal</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-surface-muted">
          <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Verifying institutional session...</span>
        </div>
      </div>
    );
  }

  // Gate Unauthenticated or Pending Approval Users
  if (!session?.authenticated || !session?.isApproved) {
    return <LoginGate session={session} onRefreshSession={loadSession} />;
  }

  // Approved User Terminal Stage
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenBriefing={handleOpenBriefing}
        onOpenSettings={() => setIsSettingsOpen(true)}
        watchlistCount={watchlist.length}
        hasApiKey={Boolean(apiKey || hasServerKey)}
        isUpstoxConnected={isUpstoxConnected}
        portfolioAlertsCount={portfolioAlertCounts.total}
        user={session?.user}
        isAdmin={Boolean(session?.isAdmin)}
        pendingApprovalsCount={session?.pendingCount || 0}
        onSignOut={async () => {
          await fetch('/api/auth/logout', { method: 'POST' });
          window.location.reload();
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Real-time Market Indices */}
        <MarketIndices
          indices={indices}
          loading={loadingIndices}
          onRefresh={() => {
            loadIndices();
            loadStocks(true);
          }}
        />

        {/* Tab Switcher: Screener vs Bucket List vs Portfolio */}
        {activeTab === 'screener' && (
          <ScreenerView
            stocks={stocks}
            loading={loadingStocks}
            onSelectStock={(stock) => {
              setSelectedStockForDetail(stock);
              setIsDetailOpen(true);
            }}
            onRunAiAnalysis={handleRunAiAnalysis}
            onRunCouncil={handleRunCouncil}
            onAddToWatchlist={(stock) => {
              setSelectedStockForAdd(stock);
              setIsAddOpen(true);
            }}
            watchlistSymbols={watchlistSymbols}
            onOpenOrderModal={handleOpenOrderModal}
          />
        )}

        {activeTab === 'watchlist' && (
          <WatchlistView
            watchlist={watchlist}
            stockQuotes={stockQuotesMap}
            onRemoveFromWatchlist={handleRemoveFromWatchlist}
            onRunAiAnalysis={handleRunAiAnalysis}
            onRunCouncil={handleRunCouncil}
            onOpenAddModal={() => {
              if (stocks.length > 0) {
                setSelectedStockForAdd(stocks[0]);
                setIsAddOpen(true);
              }
            }}
            onCreateBucket={handleCreateBucket}
            availableBuckets={buckets}
            onOpenOrderModal={handleOpenOrderModal}
          />
        )}

        {activeTab === 'portfolio' && (
          <PortfolioView
            holdings={portfolioHoldings}
            summary={portfolioSummary}
            loading={loadingPortfolio}
            isConnected={isUpstoxConnected}
            isDemoMode={isDemoPortfolio}
            userName={portfolioUserName}
            onRunPortfolioAudit={handleRunPortfolioAudit}
            onRefreshHoldings={() => loadPortfolio(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onRunCouncil={handleRunCouncil}
            alerts={portfolioAlerts}
            alertCounts={portfolioAlertCounts}
            onOpenOrderModal={handleOpenOrderModal}
            isAnalyticsToken={isAnalyticsPortfolio}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-border py-4 bg-surface/50 text-center text-xs text-surface-muted">
        <p>
          DalalAI • Built with Google Gemini &amp; Yahoo Finance API • Master Admin: {session.adminEmail || 'teja.sai42@gmail.com'}
        </p>
      </footer>

      {/* Stock Detail & History Modal */}
      <StockDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        stock={selectedStockForDetail}
        onRunAiAnalysis={(stock) => {
          setIsDetailOpen(false);
          handleRunAiAnalysis(stock);
        }}
        onRunCouncil={(stock) => {
          setIsDetailOpen(false);
          handleRunCouncil(stock);
        }}
        onAddToWatchlist={(stock) => {
          setSelectedStockForAdd(stock);
          setIsAddOpen(true);
        }}
        onOpenOrderModal={(stock, type) => {
          setIsDetailOpen(false);
          handleOpenOrderModal(stock, type || 'BUY');
        }}
      />

      {/* Gemini AI Deep Dive Modal */}
      <AiAnalysisModal
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        analysis={aiAnalysis}
        loading={loadingAi}
        symbol={selectedStockForAi?.symbol || ''}
      />

      {/* Multi-Agent AI Council Modal */}
      <CouncilModal
        isOpen={isCouncilOpen}
        onClose={() => setIsCouncilOpen(false)}
        consensus={councilConsensus}
        loading={loadingCouncil}
        symbol={selectedStockForCouncil?.symbol || ''}
        onOpenOrderModal={(sym, type, target, sl) => {
          setIsCouncilOpen(false);
          handleOpenOrderModal(sym, type, target, sl);
        }}
      />

      {/* Pre-Market Daily Intelligence Modal */}
      <MarketBriefingModal
        isOpen={isBriefingOpen}
        onClose={() => setIsBriefingOpen(false)}
        briefing={marketBriefing}
        loading={loadingBriefing}
        onSelectPick={(sym) => {
          const match = stocks.find((s) => s.symbol === sym || s.symbol.replace('.NS', '') === sym);
          if (match) {
            setSelectedStockForDetail(match);
            setIsDetailOpen(true);
          }
        }}
      />

      {/* Add to Watchlist / Bucket Modal */}
      <AddToWatchlistModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        stock={selectedStockForAdd}
        availableBuckets={buckets}
        onAdd={handleAddToWatchlist}
      />

      {/* Settings / API Key, Upstox Integration & Access Management Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
        onUpstoxStatusChange={() => loadPortfolio(true)}
        isAdmin={Boolean(session?.isAdmin)}
        userEmail={session?.user?.email}
        onUsersUpdated={loadSession}
      />

      {/* 5-Agent Council Portfolio Audit Modal */}
      <PortfolioAuditModal
        isOpen={isPortfolioAuditOpen}
        onClose={() => setIsPortfolioAuditOpen(false)}
        report={portfolioAuditReport}
        loading={loadingPortfolioAudit}
      />

      {/* Institutional Trading Ticket / 1-Click Execution Modal */}
      <OrderModal
        isOpen={isOrderOpen}
        onClose={() => setIsOrderOpen(false)}
        stock={orderStock}
        initialTransactionType={orderTransactionType}
        suggestedTarget={orderTargetPrice}
        suggestedStopLoss={orderStopLossPrice}
        isUpstoxConnected={isUpstoxConnected}
        onOrderSuccess={(_res) => {
          loadPortfolio(true);
        }}
      />
    </div>
  );
}
