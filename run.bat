@echo off
title Inventory Sentinel
echo ============================================================
echo   INVENTORY SENTINEL -- AI Autonomous Inventory Dispatch
echo ============================================================
echo.
echo [1/2] Navigating to backend directory...
cd /d "%~dp0backend"

echo [2/2] Launching server at http://localhost:8000 ...
echo.
echo Press Ctrl+C in this window anytime to terminate hosting.
echo.
start http://localhost:8000
python -m uvicorn main:app --reload --port 8000
pause
