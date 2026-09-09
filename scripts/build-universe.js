const fs = require('fs');
const path = require('path');

async function buildUniverse() {
  console.log('Downloading official Nifty 500 list from NSE India...');
  const res = await fetch('https://archives.nseindia.com/content/indices/ind_nifty500list.csv', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  const text = await res.text();
  const rows = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0).slice(1);

  const nifty50Symbols = new Set([
    'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS', 'HINDUNILVR.NS', 'ITC.NS', 'SBIN.NS', 'BHARTIARTL.NS',
    'BAJFINANCE.NS', 'LICI.NS', 'LT.NS', 'HCLTECH.NS', 'KOTAKBANK.NS', 'SUNPHARMA.NS', 'M&M.NS', 'MARUTI.NS', 'AXISBANK.NS',
    'NTPC.NS', 'ONGC.NS', 'POWERGRID.NS', 'TITAN.NS', 'ADANIENT.NS', 'BAJAJFINSV.NS', 'COALINDIA.NS', 'TATASTEEL.NS',
    'ULTRACEMCO.NS', 'ASIANPAINT.NS', 'JSWSTEEL.NS', 'HINDALCO.NS', 'ADANIPORTS.NS', 'SIEMENS.NS', 'NESTLEIND.NS', 'GRASIM.NS',
    'TECHM.NS', 'WIPRO.NS', 'SBILIFE.NS', 'BEL.NS', 'HDFCLIFE.NS', 'SHRIRAMFIN.NS', 'TRENT.NS', 'BAJAJ-AUTO.NS',
    'HEROMOTOCO.NS', 'EICHERMOT.NS', 'BRITANNIA.NS', 'DRREDDY.NS', 'CIPLA.NS', 'APOLLOHOSP.NS', 'BPCL.NS', 'TATACONSUM.NS',
  ]);

  const nifty100Additions = new Set([
    'IOC.NS', 'VEDL.NS', 'HAL.NS', 'BHEL.NS', 'ABB.NS', 'CUMMINSIND.NS', 'POLYCAB.NS', 'HAVELLS.NS', 'VOLTAS.NS',
    'PERSISTENT.NS', 'COFORGE.NS', 'MPHASIS.NS', 'NAUKRI.NS', 'POLICYBZR.NS', 'NYKAA.NS', 'KPITTECH.NS', 'TATAELXSI.NS',
    'GAIL.NS', 'PFC.NS', 'RECLTD.NS', 'IRFC.NS', 'TVSMOTOR.NS', 'MOTHERSON.NS', 'BOSCHLTD.NS', 'ASHOKLEY.NS',
    'DABUR.NS', 'GODREJCP.NS', 'MARICO.NS', 'COLPAL.NS', 'VBL.NS', 'JINDALSTEL.NS', 'NMDC.NS', 'DIVISLAB.NS',
    'AUROPHARMA.NS', 'LUPIN.NS', 'MANKIND.NS', 'AMBUJACEM.NS', 'SHREECEM.NS', 'DLF.NS', 'LODHA.NS', 'GODREJPROP.NS',
    'PIDILITIND.NS', 'BERGEPAINT.NS', 'INDIGO.NS', 'IRCTC.NS', 'RVNL.NS', 'BANKBARODA.NS', 'PNB.NS', 'CANBK.NS',
  ]);

  const list = [];
  for (const r of rows) {
    const parts = r.split(',');
    if (parts.length < 3) continue;
    const name = parts[0].trim().replace(/"/g, '');
    const sector = parts[1].trim().replace(/"/g, '');
    const symbolRaw = parts[2].trim().replace(/"/g, '');
    if (!symbolRaw || symbolRaw === 'DUMMYHEG') continue;

    const symbol = symbolRaw + '.NS';
    const isN50 = nifty50Symbols.has(symbol);
    const isN100 = isN50 || nifty100Additions.has(symbol);

    list.push({
      symbol,
      name,
      sector,
      nifty50: isN50,
      nifty100: isN100,
    });
  }

  // Sort: Nifty 50 first, then Nifty 100, then rest alphabetically
  list.sort((a, b) => {
    if (a.nifty50 && !b.nifty50) return -1;
    if (!a.nifty50 && b.nifty50) return 1;
    if (a.nifty100 && !b.nifty100) return -1;
    if (!a.nifty100 && b.nifty100) return 1;
    return a.name.localeCompare(b.name);
  });

  const outDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'nifty500.json');
  fs.writeFileSync(outPath, JSON.stringify(list, null, 2), 'utf8');
  console.log(`Saved ${list.length} stocks to data/nifty500.json successfully!`);
}

buildUniverse();

