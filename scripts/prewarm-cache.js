const fs = require('fs');
const path = require('path');

async function prewarm() {
  const stocksPath = path.join(process.cwd(), 'data', 'nifty500.json');
  if (!fs.existsSync(stocksPath)) {
    console.error('nifty500.json not found!');
    return;
  }

  const stocks = JSON.parse(fs.readFileSync(stocksPath, 'utf8'));
  console.log(`Pre-warming quotes for ${stocks.length} stocks...`);
  const t0 = Date.now();
  const chunkSize = 40;
  const allQuotes = [];

  for (let i = 0; i < stocks.length; i += chunkSize) {
    const chunk = stocks.slice(i, i + chunkSize);
    process.stdout.write(`Fetching ${i + 1}-${Math.min(i + chunkSize, stocks.length)}... `);

    const res = await Promise.all(
      chunk.map(async (s) => {
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${s.symbol}?interval=1d&range=1y`;
          const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          if (!r.ok) return null;
          const json = await r.json();
          const result = json.chart?.result?.[0];
          if (!result) return null;

          const meta = result.meta;
          const quotes = result.indicators?.quote?.[0];
          if (!quotes || !quotes.close) return null;

          const closes = quotes.close.filter((c) => c != null);
          if (closes.length < 2) return null;

          const curPrice = meta.regularMarketPrice ?? closes[closes.length - 1];
          const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? closes[closes.length - 2];
          const change = curPrice - prevClose;
          const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

          const high52 = meta.fiftyTwoWeekHigh ?? Math.max(...closes);
          const low52 = meta.fiftyTwoWeekLow ?? Math.min(...closes);

          const discountFromHigh = high52 > 0 ? Math.max(0, ((high52 - curPrice) / high52) * 100) : 0;
          const distanceFromLow = low52 > 0 ? ((curPrice - low52) / low52) * 100 : 0;

          // RSI 14
          let rsi = 50;
          if (closes.length >= 15) {
            let gains = 0;
            let losses = 0;
            for (let j = closes.length - 14; j < closes.length; j++) {
              const diff = closes[j] - closes[j - 1];
              if (diff >= 0) gains += diff;
              else losses -= diff;
            }
            const rs = losses === 0 ? 100 : gains / losses;
            rsi = Math.round(100 - 100 / (1 + rs));
          }

          // EMA 50 & 200
          let ema50 = curPrice;
          let ema200 = curPrice;
          if (closes.length >= 50) {
            const k = 2 / (50 + 1);
            ema50 = closes.slice(0, 50).reduce((a, b) => a + b, 0) / 50;
            for (let j = 50; j < closes.length; j++) {
              ema50 = closes[j] * k + ema50 * (1 - k);
            }
          }
          if (closes.length >= 200) {
            const k = 2 / (200 + 1);
            ema200 = closes.slice(0, 200).reduce((a, b) => a + b, 0) / 200;
            for (let j = 200; j < closes.length; j++) {
              ema200 = closes[j] * k + ema200 * (1 - k);
            }
          }

          const pe = meta.trailingPE ? parseFloat(meta.trailingPE.toFixed(1)) : undefined;

          let signal = 'HOLD';
          let signalScore = 5.0;
          const tags = [];

          if (discountFromHigh >= 15 && rsi <= 40) {
            signal = 'STRONG_BUY';
            signalScore = 8.6;
            tags.push('Deep Value Dip', 'Oversold');
          } else if (discountFromHigh >= 10 || rsi <= 42) {
            signal = 'BUY';
            signalScore = 7.5;
            tags.push('10%+ Discount', 'Value Zone');
          } else if (rsi >= 70) {
            signal = 'SELL';
            signalScore = 3.8;
            tags.push('Overbought / Profit Booking');
          } else if (curPrice >= ema50 * 0.98 && curPrice <= ema50 * 1.02) {
            signal = 'BUY';
            signalScore = 7.2;
            tags.push('50 EMA Pullback');
          } else {
            signal = 'HOLD';
            signalScore = 6.2;
            tags.push('Stable Range');
          }

          return {
            symbol: s.symbol,
            name: s.name,
            price: parseFloat(curPrice.toFixed(2)),
            change: parseFloat(change.toFixed(2)),
            changePercent: parseFloat(changePercent.toFixed(2)),
            previousClose: parseFloat(prevClose.toFixed(2)),
            fiftyTwoWeekHigh: parseFloat(high52.toFixed(2)),
            fiftyTwoWeekLow: parseFloat(low52.toFixed(2)),
            discountFromHigh: parseFloat(discountFromHigh.toFixed(1)),
            distanceFromLow: parseFloat(distanceFromLow.toFixed(1)),
            sector: s.sector,
            nifty50: s.nifty50,
            nifty100: s.nifty100,
            rsi14: rsi,
            ema50: parseFloat(ema50.toFixed(2)),
            ema200: parseFloat(ema200.toFixed(2)),
            peRatio: pe,
            signal,
            signalScore,
            tags,
            lastUpdated: new Date().toISOString(),
          };
        } catch (e) {
          return null;
        }
      })
    );

    const valid = res.filter(Boolean);
    allQuotes.push(...valid);
    console.log(`done (${valid.length} valid)`);
  }

  console.log(`Finished in ${(Date.now() - t0) / 1000}s. Total valid quotes: ${allQuotes.length}`);
  const cachePath = path.join(process.cwd(), 'data', 'stocks_cache.json');
  fs.writeFileSync(cachePath, JSON.stringify({ quotes: allQuotes, timestamp: Date.now() }, null, 2), 'utf8');
  console.log('Saved data/stocks_cache.json successfully!');
}

prewarm();

