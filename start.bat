@echo off
echo ================================================
echo   ROBO ARENA - Starting All Servers
echo ================================================

:: Kill any stale node processes on our ports
echo Clearing ports 8080...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8080"') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: Start API server in background
echo [1/2] Starting API Server (port 8080)...
start "API Server" /min cmd /c "cd /d d:\project-robo wrs\robo-war-backend\artifacts\api-server && node dist\index.mjs"

:: Wait for API to boot
timeout /t 2 /nobreak >nul

:: Start Vite dev server
echo [2/2] Starting Vite Dev Server...
echo.
echo ================================================
echo   App will be at: http://localhost:5173/
echo   (or next available port if 5173 is busy)
echo ================================================
echo.
cd /d "d:\project-robo wrs\robo-war-backend\artifacts\robo-arena"
npm run dev
