@echo off
echo =========================================================================
echo       MASHALITIC AUTO SPARES - SALES & INVENTORY MANAGEMENT SYSTEM
echo                         Drive with Confidence.
echo =========================================================================
echo.

echo [1/3] Checking Node.js environment...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH. Please install Node.js v18+.
    pause
    exit /b 1
)

echo [2/3] Starting Mashalitic Backend Server (Port 5000)...
start "Mashalitic Backend API" cmd /k "cd backend && node src/server.js"

echo [3/3] Starting Mashalitic Frontend Application (Port 3000)...
start "Mashalitic Frontend UI" cmd /k "cd frontend && npm run dev"

echo.
echo =========================================================================
echo Both services have been started!
echo Frontend UI: http://localhost:3000
echo Backend API: http://localhost:5000
echo Default Login: admin@mashalitic.co.ke / admin123
echo Opening web browser...
start http://localhost:3000
echo =========================================================================
timeout /t 5
