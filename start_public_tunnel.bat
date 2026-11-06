@echo off
TITLE EV Charging Cyber Attack Detection - Public HTTPS Launcher
setlocal EnableDelayedExpansion

echo ======================================================================
echo   EV CHARGING CYBER ATTACK DETECTION - PUBLIC HTTPS LAUNCHER
echo   AI-Powered SOC & Transformer Intrusion Monitoring System
echo ======================================================================
echo.

:: Ensure working directory is project root
cd /d "%~dp0"

:: 1. Locate Cloudflare tunnel executable
set CF_BIN="%~dp0cloudflared.exe"
if not exist %CF_BIN% set CF_BIN="%~dp0..\cloudflared.exe"
if not exist %CF_BIN% set CF_BIN=cloudflared

:: 2. Locate Python executable
set PYTHON_BIN=python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    py --version >nul 2>&1
    if %errorlevel% equ 0 (
        set PYTHON_BIN=py
    ) else if exist "C:\Users\N.YAMINI\AppData\Local\Programs\Python\Python314\python.exe" (
        set PYTHON_BIN="C:\Users\N.YAMINI\AppData\Local\Programs\Python\Python314\python.exe"
    )
)

:: 3. Check if port 8000 is already running
netstat -ano | findstr /R /C:":8000 *LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Backend server is already running on http://127.0.0.1:8000.
) else (
    echo [1/2] Starting FastAPI backend on http://127.0.0.1:8000 in background...
    start "EV Defense FastAPI Server" %PYTHON_BIN% run_server.py
    echo [Waiting] Initializing AI model and SQLite database...
    timeout /t 4 /nobreak >nul
)

:: 4. Start Cloudflare Tunnel
echo.
echo [2/2] Connecting to Cloudflare global edge network...
echo ----------------------------------------------------------------------
echo Your public HTTPS link will appear below (look for *.trycloudflare.com):
echo ----------------------------------------------------------------------
echo.

%CF_BIN% tunnel --url http://127.0.0.1:8000

pause
