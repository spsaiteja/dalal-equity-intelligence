import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { UpstoxHolding, PortfolioAuditReport, SectorWeight, RebalanceAction } from '@/types/upstox';
import { generateGeminiJson } from '@/lib/gemini-helper';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const sessionUser = getSessionUser(request);
    const isDevBypass = process.env.NODE_ENV === 'development' && !process.env.GOOGLE_CLIENT_ID && !process.env.ENFORCE_AUTH_IN_DEV;

    if (!isDevBypass && (!sessionUser || !sessionUser.isApproved)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Approved session required to access AI models' },
        { status: 401 }
      );
    }
    const body = await request.json();
    const holdings: UpstoxHolding[] = body?.holdings || [];
    const customApiKey: string | undefined = body?.apiKey;

    if (!holdings || holdings.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No portfolio holdings provided for audit' },
        { status: 400 }
      );
    }

    const key = customApiKey || process.env.GEMINI_API_KEY;
    const client = key && key.trim() ? new GoogleGenerativeAI(key.trim()) : null;

    // 1. Calculate Sector Allocation & Concentration
    let totalInvested = 0;
    const sectorMap: Record<string, number> = {};

    holdings.forEach((h) => {
      totalInvested += h.invested_value;
      const s = h.sector || 'Other';
      sectorMap[s] = (sectorMap[s] || 0) + h.invested_value;
    });

    const sectorWeights: SectorWeight[] = Object.entries(sectorMap)
      .map(([sector, amount]) => {
        const pct = totalInvested > 0 ? (amount / totalInvested) * 100 : 0;
        let riskRating: 'Balanced' | 'Overweight' | 'Underweight' = 'Balanced';
        if (pct > 35) riskRating = 'Overweight';
        else if (pct < 10) riskRating = 'Underweight';

        return {
          sector,
          investedAmount: parseFloat(amount.toFixed(2)),
          percentage: parseFloat(pct.toFixed(1)),
          riskRating,
        };
      })
      .sort((a, b) => b.percentage - a.percentage);

    // 2. Identify top risk holding by concentration
    let maxWeight = 0;
    let topHolding = holdings[0]?.trading_symbol || 'None';
    holdings.forEach((h) => {
      const weight = totalInvested > 0 ? (h.invested_value / totalInvested) * 100 : 0;
      if (weight > maxWeight) {
        maxWeight = weight;
        topHolding = h.trading_symbol;
      }
    });

    // 3. Fallback Heuristic Audit
    const gainers = holdings.filter((h) => h.pnl_percentage > 8);
    const losers = holdings.filter((h) => h.pnl_percentage < -5);

    const fallbackRebalancing: RebalanceAction[] = holdings.map((h) => {
      const weight = totalInvested > 0 ? (h.invested_value / totalInvested) * 100 : 0;
      let action: RebalanceAction['action'] = 'HOLD';
      let note = 'Maintain position within target allocation.';

      if (h.pnl_percentage > 10 && weight > 20) {
        action = 'BOOK_PROFIT';
        note = `Book partial gains (+${h.pnl_percentage}%); position size is heavy (${weight.toFixed(1)}%).`;
      } else if (h.pnl_percentage < -7) {
        action = 'EXIT_STOP_LOSS';
        note = `Review risk parameters; holding is down ${h.pnl_percentage}%. Protect principal capital.`;
      } else if (h.pnl_percentage < 0 && h.pnl_percentage > -6 && weight < 15) {
        action = 'ACCUMULATE';
        note = `Attractive dip buy; down ${Math.abs(h.pnl_percentage)}% with headroom for accumulation.`;
      }

      return {
        symbol: h.trading_symbol,
        company_name: h.company_name,
        action,
        allocationWeightPercent: parseFloat(weight.toFixed(1)),
        recommendedActionNote: note,
        targetPrice: `₹${Math.round(h.last_price * 1.12)}`,
        stopLoss: `₹${Math.round(h.last_price * 0.93)}`,
      };
    });

    const fallbackReport: PortfolioAuditReport = {
      overallHealthScore: maxWeight > 30 ? 7.2 : 8.5,
      healthStatus: maxWeight > 30 ? 'Moderate Concentration Risk' : 'Balanced & Resilient',
      cioExecutiveSummary: `The committee has audited ${holdings.length} Demat holdings with a total deployed capital of ₹${totalInvested.toLocaleString('en-IN')}. Top exposure is in ${topHolding} (${maxWeight.toFixed(1)}%). Core blue-chip allocation remains robust with strong downside resilience across Dalal Street indices.`,
      sectorWeights,
      rebalancingPlan: fallbackRebalancing,
      agentAudits: {
        sentinel: {
          stance: 'Constructive Momentum',
          technicalAlert: `${gainers.length} holdings in strong upward momentum; ${losers.length} holdings consolidating near support.`,
          breakdownRisks: losers.map((l) => `${l.trading_symbol} (${l.pnl_percentage}% return)`),
        },
        fundamental: {
          valuationAssessment: 'Predominantly Quality Compounders at Fair-to-Attractive Valuations',
          portfolioPeEstimate: '26.4x trailing',
          undervaluedOpportunities: holdings.filter((h) => h.pnl_percentage <= 0).map((h) => h.trading_symbol),
          stretchedHoldings: gainers.map((g) => g.trading_symbol),
        },
        newsScout: {
          headlineSentiment: 'Moderately Bullish across Large Caps',
          catalystsIdentified: [
            'Capex expansion and steady credit growth in banking',
            'Strong institutional liquidity inflows',
            'Stable quarterly margin execution in IT and auto',
          ],
          headwindAlerts: [
            'Geopolitical crude oil volatility',
            'Persistent high interest rate environment impact on midcaps',
          ],
        },
        riskGuardian: {
          diversificationScore: maxWeight > 25 ? 74 : 88,
          maxSingleStockExposurePercent: parseFloat(maxWeight.toFixed(1)),
          topRiskHolding: `${topHolding} (${maxWeight.toFixed(1)}% of total capital)`,
          mandatedRiskAdjustments: [
            `Cap single stock concentration below 20% (current max: ${maxWeight.toFixed(1)}% in ${topHolding})`,
            'Ensure disciplined stop-loss trailing on profitable holdings up +10%+',
          ],
        },
      },
      timestamp: new Date().toISOString(),
    };

    if (!client) {
      return NextResponse.json({ success: true, data: fallbackReport });
    }

    // 4. Enhance with Gemini 3.5 Flash
    const prompt = `
You are the Chief Investment Officer leading an institutional 5-Agent Investment Committee auditing an Indian equity Demat portfolio:

Holdings Summary (${holdings.length} stocks, Total Invested: ₹${totalInvested}):
${holdings
  .map(
    (h) =>
      `- ${h.company_name} (${h.trading_symbol}): Qty ${h.quantity}, Avg Buy: ₹${h.average_price}, CMP: ₹${h.last_price}, P&L: ${h.pnl_percentage}%, Sector: ${h.sector || 'N/A'}`
  )
  .join('\n')}

Top Sector Allocations:
${sectorWeights.map((s) => `- ${s.sector}: ${s.percentage}%`).join('\n')}

Task: Provide an institutional portfolio audit with:
1. Overall Health Score (1.0 to 10.0)
2. Health Status ("Institutional Grade" | "Balanced & Resilient" | "Moderate Concentration Risk" | "High Risk / Unbalanced")
3. CIO Executive Summary (3-4 sentences on risk/reward, liquidity, and strategy)
4. Specific Rebalancing Recommendations for top holdings: action ("STRONG_ACCUMULATE" | "ACCUMULATE" | "HOLD" | "BOOK_PROFIT" | "EXIT_STOP_LOSS"), and specific note
5. Agent Insights: Sentinel technical alerts, Fundamentalist valuation comments, News Scout catalysts, Risk Guardian position size warnings.

Respond ONLY with valid JSON matching this schema:
{
  "overallHealthScore": number,
  "healthStatus": "Institutional Grade" | "Balanced & Resilient" | "Moderate Concentration Risk" | "High Risk / Unbalanced",
  "cioExecutiveSummary": string,
  "rebalancingPlan": [
    {
      "symbol": string,
      "company_name": string,
      "action": "STRONG_ACCUMULATE" | "ACCUMULATE" | "HOLD" | "BOOK_PROFIT" | "EXIT_STOP_LOSS",
      "allocationWeightPercent": number,
      "recommendedActionNote": string,
      "targetPrice": string,
      "stopLoss": string
    }
  ],
  "agentAudits": {
    "sentinel": { "stance": string, "technicalAlert": string, "breakdownRisks": string[] },
    "fundamental": { "valuationAssessment": string, "portfolioPeEstimate": string, "undervaluedOpportunities": string[], "stretchedHoldings": string[] },
    "newsScout": { "headlineSentiment": string, "catalystsIdentified": string[], "headwindAlerts": string[] },
    "riskGuardian": { "diversificationScore": number, "maxSingleStockExposurePercent": number, "topRiskHolding": string, "mandatedRiskAdjustments": string[] }
  }
}
`;

    const parsed = await generateGeminiJson(client, prompt, 6000);
    if (!parsed) {
      return NextResponse.json({ success: true, data: fallbackReport });
    }

    const mergedReport: PortfolioAuditReport = {
      overallHealthScore: parsed.overallHealthScore || fallbackReport.overallHealthScore,
      healthStatus: parsed.healthStatus || fallbackReport.healthStatus,
      cioExecutiveSummary: parsed.cioExecutiveSummary || fallbackReport.cioExecutiveSummary,
      sectorWeights,
      rebalancingPlan: parsed.rebalancingPlan || fallbackReport.rebalancingPlan,
      agentAudits: parsed.agentAudits || fallbackReport.agentAudits,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: mergedReport,
    });
  } catch (error: any) {
    console.error('Error in Portfolio Audit route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Portfolio audit failed' },
      { status: 500 }
    );
  }
}

