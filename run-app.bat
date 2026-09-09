@echo off
title DalalAI - Indian Stock Market Screener & AI Intelligence
echo =======================================================
echo   Starting DalalAI (NSE/BSE Screener & Gemini Terminal)
echo =======================================================
echo.
cd /d "%~dp0"

echo Opening browser at http://localhost:3000 ...
start http://localhost:3000

echo Starting Next.js development server...
npm run dev
pause

