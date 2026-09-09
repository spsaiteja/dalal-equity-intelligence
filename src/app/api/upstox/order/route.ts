import { NextRequest, NextResponse } from 'next/server';
import { getUpstoxSession } from '@/lib/upstox-storage';
import { OrderPlacementRequest, OrderPlacementResponse } from '@/types/upstox';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Checks if the National Stock Exchange (NSE) is currently open for regular equity trading.
 * Trading hours: Monday to Friday, 9:15 AM to 3:30 PM IST (UTC+5:30).
 */
function isIndianMarketOpen(): boolean {
  const now = new Date();
  // Convert UTC to IST (+5:30)
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 3600000);

  const day = ist.getDay(); // 0 = Sunday, 6 = Saturday
  if (day === 0 || day === 6) return false;

  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  const marketOpen = 9 * 60 + 15;  // 09:15 AM IST
  const marketClose = 15 * 60 + 30; // 03:30 PM IST

  return totalMinutes >= marketOpen && totalMinutes <= marketClose;
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = getSessionUser(request);
    if (!sessionUser || !sessionUser.isApproved) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You must be signed in and approved to execute trades.' },
        { status: 401 }
      );
    }

    const body: OrderPlacementRequest = await request.json();

    const {
      symbol,
      companyName,
      quantity,
      orderType = 'MARKET',
      transactionType = 'BUY',
      productType = 'D',
      price,
      triggerPrice,
      targetPrice,
      stopLossPrice,
      isPaperTrade = false,
    } = body;

    // 1. Validation
    if (!symbol) {
      return NextResponse.json(
        { success: false, error: 'Stock symbol is required' },
        { status: 400 }
      );
    }

    const cleanSymbol = symbol.replace('.NS', '').replace('.BO', '').toUpperCase();
    const qty = parseInt(String(quantity), 10);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be a positive number greater than 0' },
        { status: 400 }
      );
    }

    const cleanPrice = parseFloat(String(price || 0));
    if (orderType === 'LIMIT' && (isNaN(cleanPrice) || cleanPrice <= 0)) {
      return NextResponse.json(
        { success: false, error: 'Price must be greater than 0 for LIMIT orders' },
        { status: 400 }
      );
    }

    const marketOpen = isIndianMarketOpen();
    const isAmo = body.isAmo !== undefined ? body.isAmo : !marketOpen;

    const headerToken = request.headers.get('x-upstox-token');
    const session = getUpstoxSession();
    const activeToken = headerToken || (session && session.is_active ? session.access_token : null);
    const isLiveConnected = Boolean(activeToken);

    // 2. Paper Trading Simulation Mode (or fallback if disconnected / requested)
    if (isPaperTrade || !isLiveConnected) {
      const simulatedOrderId = `SIM-NSE-${Math.floor(100000 + Math.random() * 900000)}`;
      const executionPrice = cleanPrice > 0 ? cleanPrice : 100.0;
      const totalValue = parseFloat((qty * executionPrice).toFixed(2));

      const status: 'COMPLETE' | 'AMO_QUEUED' = isAmo ? 'AMO_QUEUED' : 'COMPLETE';
      const message = isAmo
        ? `[Paper Trade] Dalal Street is currently closed. Simulated AMO ${transactionType} order for ${qty} shares of ${cleanSymbol} queued for tomorrow's 9:15 AM opening bell.`
        : `[Paper Trade] Simulated ${transactionType} order executed successfully for ${qty} shares of ${cleanSymbol} at ₹${executionPrice.toLocaleString('en-IN')}.`;

      const responseData: OrderPlacementResponse = {
        success: true,
        orderId: simulatedOrderId,
        status,
        message,
        executionPrice,
        totalValue,
        timestamp: new Date().toISOString(),
        isPaperTrade: true,
      };

      return NextResponse.json(responseData);
    }

    // 3. Live Upstox Execution via /v2/order/place
    try {
      const upstoxPayload = {
        quantity: qty,
        product: productType, // 'D' for Delivery/CNC, 'I' for Intraday/MIS
        validity: 'DAY',
        price: orderType === 'MARKET' ? 0 : cleanPrice,
        tag: 'DalalAI',
        instrument_token: `NSE_EQ|${cleanSymbol}`,
        order_type: orderType, // 'MARKET' | 'LIMIT'
        transaction_type: transactionType, // 'BUY' | 'SELL'
        disclosed_quantity: 0,
        trigger_price: triggerPrice || 0,
        is_amo: isAmo,
      };

      const upstoxRes = await fetch('https://api.upstox.com/v2/order/place', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify(upstoxPayload),
      });

      const upstoxData = await upstoxRes.json();

      if (upstoxRes.ok && upstoxData?.status === 'success') {
        const orderId = upstoxData.data?.order_id || `UPSTOX-${Date.now()}`;
        const totalValue = parseFloat((qty * cleanPrice).toFixed(2));

        const responseData: OrderPlacementResponse = {
          success: true,
          orderId,
          status: isAmo ? 'AMO_QUEUED' : 'PENDING',
          message: isAmo
            ? `Upstox AMO ${transactionType} order successfully placed! Queued for next market open. Order ID: ${orderId}`
            : `Upstox ${transactionType} order sent to NSE. Order ID: ${orderId}`,
          executionPrice: cleanPrice,
          totalValue,
          timestamp: new Date().toISOString(),
          isPaperTrade: false,
        };

        return NextResponse.json(responseData);
      } else {
        const errorMsg =
          upstoxData?.errors?.[0]?.message ||
          upstoxData?.message ||
          'Upstox rejected the order placement request.';

        console.error('Upstox order placement error:', upstoxData);

        return NextResponse.json(
          {
            success: false,
            error: errorMsg,
            isPaperTrade: false,
          },
          { status: 400 }
        );
      }
    } catch (apiErr: any) {
      console.error('Network error during Upstox order placement:', apiErr);
      return NextResponse.json(
        {
          success: false,
          error: `Network error reaching Upstox order gateway: ${apiErr.message}`,
          isPaperTrade: false,
        },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error('Order API error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to process order' },
      { status: 500 }
    );
  }
}

