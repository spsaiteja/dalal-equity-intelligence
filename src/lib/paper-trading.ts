import fs from 'fs';
import path from 'path';
import { OrderPlacementRequest, OrderPlacementResponse } from '@/types/upstox';
import { isVaultConfigured, readVaultFile, writeVaultFile } from './drive-vault';
import { encryptUserData, decryptUserData, getUserVaultHash } from './crypto-vault';
import { fetchStockQuote } from './yahoo-client';

export interface PaperHolding {
  symbol: string;
  companyName: string;
  quantity: number;
  averagePrice: number;
  investedValue: number;
  currentPrice: number;
  currentValue: number;
  pnl: number;
  pnlPercentage: number;
  dayPnl: number;
  dayChange: number;
  dayChangePercentage: number;
  targetPrice?: number;
  stopLossPrice?: number;
  lastUpdated: string;
}

export interface PaperOrder {
  orderId: string;
  symbol: string;
  companyName: string;
  quantity: number;
  price: number;
  orderType: 'MARKET' | 'LIMIT';
  transactionType: 'BUY' | 'SELL';
  productType: 'D' | 'I';
  status: 'COMPLETE' | 'AMO_QUEUED' | 'REJECTED';
  timestamp: string;
  totalValue: number;
  message: string;
  isPaperTrade: true;
}

export interface PaperPortfolio {
  cashBalance: number;
  initialCapital: number;
  holdings: PaperHolding[];
  orders: PaperOrder[];
  updatedAt: string;
}

const DEFAULT_INITIAL_CAPITAL = 1000000; // ₹10,00,000 (10 Lakhs INR)

function getDataDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join('/tmp', 'dalal_data');
  }
  return path.join(process.cwd(), 'data');
}

function getLocalPaperFile(email: string): string {
  const hash = getUserVaultHash(email);
  return path.join(getDataDir(), `papertrade_${hash}.json`);
}

function getVaultPaperFilename(email: string): string {
  const hash = getUserVaultHash(email);
  return `pt_${hash}.enc`;
}

function createDefaultPortfolio(): PaperPortfolio {
  return {
    cashBalance: DEFAULT_INITIAL_CAPITAL,
    initialCapital: DEFAULT_INITIAL_CAPITAL,
    holdings: [],
    orders: [],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Loads a user's paper trading portfolio.
 * Checks local disk first, then attempts to load from Google Drive Vault if configured.
 */
export async function loadPaperPortfolio(email: string): Promise<PaperPortfolio> {
  const localFile = getLocalPaperFile(email);

  // 1. If Google Drive Vault is available, try loading the encrypted portfolio
  if (isVaultConfigured()) {
    try {
      const vaultFilename = getVaultPaperFilename(email);
      const cipherText = await readVaultFile(vaultFilename);
      if (cipherText) {
        const decrypted = decryptUserData<PaperPortfolio>(cipherText, email);
        if (decrypted && typeof decrypted.cashBalance === 'number') {
          // Sync to local disk cache for fast future reads
          try {
            const dir = getDataDir();
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(localFile, JSON.stringify(decrypted, null, 2), 'utf8');
          } catch {}
          return decrypted;
        }
      }
    } catch (err) {
      console.warn('Error loading paper portfolio from Drive Vault:', err);
    }
  }

  // 2. Check local disk cache
  try {
    if (fs.existsSync(localFile)) {
      const content = fs.readFileSync(localFile, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed.cashBalance === 'number') {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading local paper portfolio:', err);
  }

  // 3. Fallback to fresh initial portfolio
  const defaultPortfolio = createDefaultPortfolio();
  try {
    const dir = getDataDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(localFile, JSON.stringify(defaultPortfolio, null, 2), 'utf8');
  } catch {}

  return defaultPortfolio;
}

/**
 * Saves a user's paper trading portfolio to local disk and the Google Drive Vault.
 */
export async function savePaperPortfolio(email: string, portfolio: PaperPortfolio): Promise<boolean> {
  portfolio.updatedAt = new Date().toISOString();
  const localFile = getLocalPaperFile(email);

  // 1. Save to local disk cache
  try {
    const dir = getDataDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(localFile, JSON.stringify(portfolio, null, 2), 'utf8');
  } catch (err) {
    console.warn('Error writing local paper portfolio:', err);
  }

  // 2. Save encrypted payload to Google Drive Vault
  if (isVaultConfigured()) {
    try {
      const vaultFilename = getVaultPaperFilename(email);
      const cipherText = encryptUserData(portfolio, email);
      await writeVaultFile(vaultFilename, cipherText, 'text/plain');
    } catch (err) {
      console.error('Error saving paper portfolio to Drive Vault:', err);
      return false;
    }
  }

  return true;
}

/**
 * Checks if the Indian Market (NSE) is currently open.
 */
function isIndianMarketOpen(): boolean {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 3600000);

  const day = ist.getDay();
  if (day === 0 || day === 6) return false;

  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  const marketOpen = 9 * 60 + 15;
  const marketClose = 15 * 60 + 30;

  return totalMinutes >= marketOpen && totalMinutes <= marketClose;
}

/**
 * Executes a simulated paper order, adjusting the user's virtual cash balance,
 * holdings, and trade ledger.
 */
export async function executePaperOrder(
  email: string,
  request: OrderPlacementRequest
): Promise<OrderPlacementResponse> {
  const portfolio = await loadPaperPortfolio(email);

  const cleanSymbol = request.symbol.replace('.NS', '').replace('.BO', '').toUpperCase();
  const fullSymbol = cleanSymbol.includes('.') ? cleanSymbol : `${cleanSymbol}.NS`;
  const qty = Math.max(1, parseInt(String(request.quantity), 10));
  const executionPrice = parseFloat(String(request.price || 100));
  const totalValue = parseFloat((qty * executionPrice).toFixed(2));
  const isMarketOpen = isIndianMarketOpen();
  const isAmo = request.isAmo !== undefined ? request.isAmo : !isMarketOpen;

  const orderId = `SIM-${cleanSymbol}-${Math.floor(100000 + Math.random() * 900000)}`;

  // BUY Order Handling
  if (request.transactionType === 'BUY') {
    if (portfolio.cashBalance < totalValue) {
      return {
        success: false,
        orderId,
        status: 'REJECTED',
        message: `Insufficient virtual cash. Required: ₹${totalValue.toLocaleString('en-IN')}, Available: ₹${Math.round(portfolio.cashBalance).toLocaleString('en-IN')}`,
        executionPrice,
        totalValue,
        timestamp: new Date().toISOString(),
        isPaperTrade: true,
      };
    }

    // Deduct virtual cash
    portfolio.cashBalance = parseFloat((portfolio.cashBalance - totalValue).toFixed(2));

    // Update or add holding
    const existingIndex = portfolio.holdings.findIndex(
      (h) => h.symbol.replace('.NS', '').toUpperCase() === cleanSymbol
    );

    if (existingIndex >= 0) {
      const existing = portfolio.holdings[existingIndex];
      const newTotalQty = existing.quantity + qty;
      const newInvestedValue = parseFloat((existing.investedValue + totalValue).toFixed(2));
      const newAvgPrice = parseFloat((newInvestedValue / newTotalQty).toFixed(2));

      portfolio.holdings[existingIndex] = {
        ...existing,
        quantity: newTotalQty,
        averagePrice: newAvgPrice,
        investedValue: newInvestedValue,
        currentPrice: executionPrice,
        currentValue: parseFloat((newTotalQty * executionPrice).toFixed(2)),
        pnl: parseFloat(((executionPrice - newAvgPrice) * newTotalQty).toFixed(2)),
        pnlPercentage: parseFloat((((executionPrice - newAvgPrice) / newAvgPrice) * 100).toFixed(2)),
        targetPrice: request.targetPrice || existing.targetPrice,
        stopLossPrice: request.stopLossPrice || existing.stopLossPrice,
        lastUpdated: new Date().toISOString(),
      };
    } else {
      portfolio.holdings.push({
        symbol: fullSymbol,
        companyName: request.companyName || cleanSymbol,
        quantity: qty,
        averagePrice: executionPrice,
        investedValue: totalValue,
        currentPrice: executionPrice,
        currentValue: totalValue,
        pnl: 0,
        pnlPercentage: 0,
        dayPnl: 0,
        dayChange: 0,
        dayChangePercentage: 0,
        targetPrice: request.targetPrice,
        stopLossPrice: request.stopLossPrice,
        lastUpdated: new Date().toISOString(),
      });
    }

    const orderRecord: PaperOrder = {
      orderId,
      symbol: fullSymbol,
      companyName: request.companyName || cleanSymbol,
      quantity: qty,
      price: executionPrice,
      orderType: request.orderType || 'MARKET',
      transactionType: 'BUY',
      productType: request.productType || 'D',
      status: isAmo ? 'AMO_QUEUED' : 'COMPLETE',
      timestamp: new Date().toISOString(),
      totalValue,
      message: isAmo
        ? `[Paper Trade] Market is closed. Simulated AMO BUY for ${qty} shares of ${cleanSymbol} queued for 9:15 AM.`
        : `[Paper Trade] Bought ${qty} shares of ${cleanSymbol} at ₹${executionPrice.toLocaleString('en-IN')}.`,
      isPaperTrade: true,
    };

    portfolio.orders.unshift(orderRecord);
    await savePaperPortfolio(email, portfolio);

    return {
      success: true,
      orderId,
      status: orderRecord.status,
      message: orderRecord.message,
      executionPrice,
      totalValue,
      timestamp: orderRecord.timestamp,
      isPaperTrade: true,
    };
  }

  // SELL Order Handling
  if (request.transactionType === 'SELL') {
    const existingIndex = portfolio.holdings.findIndex(
      (h) => h.symbol.replace('.NS', '').toUpperCase() === cleanSymbol
    );

    if (existingIndex < 0 || portfolio.holdings[existingIndex].quantity <= 0) {
      return {
        success: false,
        orderId,
        status: 'REJECTED',
        message: `You do not own any shares of ${cleanSymbol} in your paper portfolio to sell.`,
        executionPrice,
        totalValue,
        timestamp: new Date().toISOString(),
        isPaperTrade: true,
      };
    }

    const existing = portfolio.holdings[existingIndex];
    if (existing.quantity < qty) {
      return {
        success: false,
        orderId,
        status: 'REJECTED',
        message: `Cannot sell ${qty} shares. You only own ${existing.quantity} shares of ${cleanSymbol}.`,
        executionPrice,
        totalValue,
        timestamp: new Date().toISOString(),
        isPaperTrade: true,
      };
    }

    // Add sale proceeds to cash balance
    portfolio.cashBalance = parseFloat((portfolio.cashBalance + totalValue).toFixed(2));

    const remainingQty = existing.quantity - qty;
    if (remainingQty === 0) {
      // Sold all shares
      portfolio.holdings.splice(existingIndex, 1);
    } else {
      const remainingInvested = parseFloat((remainingQty * existing.averagePrice).toFixed(2));
      portfolio.holdings[existingIndex] = {
        ...existing,
        quantity: remainingQty,
        investedValue: remainingInvested,
        currentValue: parseFloat((remainingQty * executionPrice).toFixed(2)),
        pnl: parseFloat(((executionPrice - existing.averagePrice) * remainingQty).toFixed(2)),
        pnlPercentage: parseFloat((((executionPrice - existing.averagePrice) / existing.averagePrice) * 100).toFixed(2)),
        lastUpdated: new Date().toISOString(),
      };
    }

    const orderRecord: PaperOrder = {
      orderId,
      symbol: fullSymbol,
      companyName: request.companyName || cleanSymbol,
      quantity: qty,
      price: executionPrice,
      orderType: request.orderType || 'MARKET',
      transactionType: 'SELL',
      productType: request.productType || 'D',
      status: isAmo ? 'AMO_QUEUED' : 'COMPLETE',
      timestamp: new Date().toISOString(),
      totalValue,
      message: isAmo
        ? `[Paper Trade] Market is closed. Simulated AMO SELL for ${qty} shares of ${cleanSymbol} queued for 9:15 AM.`
        : `[Paper Trade] Sold ${qty} shares of ${cleanSymbol} at ₹${executionPrice.toLocaleString('en-IN')}.`,
      isPaperTrade: true,
    };

    portfolio.orders.unshift(orderRecord);
    await savePaperPortfolio(email, portfolio);

    return {
      success: true,
      orderId,
      status: orderRecord.status,
      message: orderRecord.message,
      executionPrice,
      totalValue,
      timestamp: orderRecord.timestamp,
      isPaperTrade: true,
    };
  }

  return {
    success: false,
    orderId,
    status: 'REJECTED',
    message: 'Invalid transaction type.',
    executionPrice,
    totalValue,
    timestamp: new Date().toISOString(),
    isPaperTrade: true,
  };
}

/**
 * Fetches user's paper holdings and updates each holding with live market quotes.
 */
export async function getLivePaperPortfolio(email: string): Promise<{
  portfolio: PaperPortfolio;
  totalInvested: number;
  currentValue: number;
  totalPnl: number;
  totalPnlPercentage: number;
  dayPnl: number;
  dayPnlPercentage: number;
}> {
  const portfolio = await loadPaperPortfolio(email);

  let totalInvested = 0;
  let currentValue = 0;
  let dayPnl = 0;

  // Refresh live prices in parallel for all paper holdings
  if (portfolio.holdings.length > 0) {
    const updatedHoldings = await Promise.all(
      portfolio.holdings.map(async (holding) => {
        try {
          const quote = await fetchStockQuote(holding.symbol);
          if (quote && quote.price > 0) {
            const livePrice = quote.price;
            const liveVal = parseFloat((holding.quantity * livePrice).toFixed(2));
            const pnl = parseFloat((liveVal - holding.investedValue).toFixed(2));
            const pnlPct = holding.investedValue > 0 ? parseFloat(((pnl / holding.investedValue) * 100).toFixed(2)) : 0;
            const holdingDayPnl = parseFloat((holding.quantity * (quote.change || 0)).toFixed(2));

            return {
              ...holding,
              currentPrice: livePrice,
              currentValue: liveVal,
              pnl,
              pnlPercentage: pnlPct,
              dayPnl: holdingDayPnl,
              dayChange: quote.change || 0,
              dayChangePercentage: quote.changePercent || 0,
              lastUpdated: new Date().toISOString(),
            };
          }
        } catch {}
        return holding;
      })
    );

    portfolio.holdings = updatedHoldings;
  }

  portfolio.holdings.forEach((h) => {
    totalInvested += h.investedValue;
    currentValue += h.currentValue;
    dayPnl += h.dayPnl || 0;
  });

  const totalPnl = parseFloat((currentValue - totalInvested).toFixed(2));
  const totalPnlPercentage = totalInvested > 0 ? parseFloat(((totalPnl / totalInvested) * 100).toFixed(2)) : 0;
  const dayPnlPercentage = currentValue > 0 ? parseFloat(((dayPnl / (currentValue - dayPnl || 1)) * 100).toFixed(2)) : 0;

  return {
    portfolio,
    totalInvested: parseFloat(totalInvested.toFixed(2)),
    currentValue: parseFloat(currentValue.toFixed(2)),
    totalPnl,
    totalPnlPercentage,
    dayPnl: parseFloat(dayPnl.toFixed(2)),
    dayPnlPercentage,
  };
}

/**
 * Resets user's paper portfolio to initial capital.
 */
export async function resetPaperPortfolio(email: string): Promise<PaperPortfolio> {
  const fresh = createDefaultPortfolio();
  await savePaperPortfolio(email, fresh);
  return fresh;
}
