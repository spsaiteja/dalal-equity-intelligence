import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isMasterAdmin } from '@/lib/auth';
import {
  fetchUaeBullionRates,
  loadMasterBullionPortfolio,
  saveMasterBullionPortfolio,
  calculateBullionPortfolio,
} from '@/lib/bullion-engine';
import { BullionHolding, BullionMetalType } from '@/types/bullion';

export const dynamic = 'force-dynamic';

function verifyMasterAdmin(request: NextRequest) {
  const user = getSessionUser(request);
  if (!user || user.role !== 'admin' || !isMasterAdmin(user.email)) {
    return null;
  }
  return user;
}

export async function GET(request: NextRequest) {
  const user = verifyMasterAdmin(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Access denied: Master Admin access required' },
      { status: 403 }
    );
  }

  try {
    const rates = await fetchUaeBullionRates();
    const rawHoldings = await loadMasterBullionPortfolio(user.email);
    const { calculatedHoldings, summary } = calculateBullionPortfolio(rawHoldings, rates);

    return NextResponse.json({
      success: true,
      rates,
      holdings: calculatedHoldings,
      rawHoldings,
      summary,
    });
  } catch (err: any) {
    console.error('Error in bullion GET:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch bullion data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = verifyMasterAdmin(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Access denied: Master Admin access required' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { id, metalType, itemName, weightGrams, buyPricePerGramAED, buyDate, notes } = body;

    const validTypes: BullionMetalType[] = [
      'GOLD_24K',
      'GOLD_22K',
      'GOLD_21K',
      'GOLD_18K',
      'SILVER_999',
    ];

    if (!validTypes.includes(metalType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid metal type specified' },
        { status: 400 }
      );
    }

    const numWeight = Number(weightGrams);
    const numPrice = Number(buyPricePerGramAED);

    if (isNaN(numWeight) || numWeight <= 0) {
      return NextResponse.json(
        { success: false, error: 'Weight in grams must be greater than 0' },
        { status: 400 }
      );
    }

    if (isNaN(numPrice) || numPrice <= 0) {
      return NextResponse.json(
        { success: false, error: 'Buy price per gram in AED must be greater than 0' },
        { status: 400 }
      );
    }

    const currentHoldings = await loadMasterBullionPortfolio(user.email);
    const now = new Date().toISOString();

    let updatedHoldings: BullionHolding[];

    if (id) {
      // Update existing
      updatedHoldings = currentHoldings.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            metalType,
            itemName: (itemName || item.itemName).trim(),
            weightGrams: numWeight,
            buyPricePerGramAED: numPrice,
            buyDate: buyDate || item.buyDate,
            notes: notes !== undefined ? notes.trim() : item.notes,
            updatedAt: now,
          };
        }
        return item;
      });
    } else {
      // Add new
      const newHolding: BullionHolding = {
        id: `bul_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        metalType,
        itemName: (itemName || `${metalType.replace('_', ' ')} Holding`).trim(),
        weightGrams: numWeight,
        buyPricePerGramAED: numPrice,
        buyDate: buyDate || now.split('T')[0],
        notes: notes ? notes.trim() : '',
        createdAt: now,
        updatedAt: now,
      };
      updatedHoldings = [newHolding, ...currentHoldings];
    }

    await saveMasterBullionPortfolio(user.email, updatedHoldings);

    const rates = await fetchUaeBullionRates();
    const { calculatedHoldings, summary } = calculateBullionPortfolio(updatedHoldings, rates);

    return NextResponse.json({
      success: true,
      message: id ? 'Holding updated successfully' : 'Holding added successfully',
      rates,
      holdings: calculatedHoldings,
      rawHoldings: updatedHoldings,
      summary,
    });
  } catch (err: any) {
    console.error('Error in bullion POST:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to save bullion holding' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const user = verifyMasterAdmin(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Access denied: Master Admin access required' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Holding ID is required for deletion' },
        { status: 400 }
      );
    }

    const currentHoldings = await loadMasterBullionPortfolio(user.email);
    const updatedHoldings = currentHoldings.filter((item) => item.id !== id);

    await saveMasterBullionPortfolio(user.email, updatedHoldings);

    const rates = await fetchUaeBullionRates();
    const { calculatedHoldings, summary } = calculateBullionPortfolio(updatedHoldings, rates);

    return NextResponse.json({
      success: true,
      message: 'Holding removed successfully',
      rates,
      holdings: calculatedHoldings,
      rawHoldings: updatedHoldings,
      summary,
    });
  } catch (err: any) {
    console.error('Error in bullion DELETE:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to delete bullion holding' },
      { status: 500 }
    );
  }
}

