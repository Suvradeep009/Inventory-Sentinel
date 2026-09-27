@echo off
title Inventory Sentinel V2
echo ============================================================
echo   INVENTORY SENTINEL V2 -- Full-Stack AI Inventory Platform
echo ============================================================
echo.
echo [1/2] Navigating to project directory...
cd /d "%~dp0"

echo [2/2] Launching Next.js platform at http://localhost:3000 ...
echo.
echo Press Ctrl+C in this window anytime to terminate hosting.
echo.
start http://localhost:3000
npm run dev
pause
