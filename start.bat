@echo off
title SmartOps Dev Launcher
color 0A
echo.
echo  ========================================================
echo   SmartOps Inventory Management - Development Launcher
echo  ========================================================
echo.

:: ── Check Node.js ──────────────────────────────────────────────────────────
node --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js is not installed or not in PATH.
    echo  Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo  [OK] Node.js found: %NODE_VER%

:: ── Check MongoDB ───────────────────────────────────────────────────────────
echo.
echo  [INFO] Checking MongoDB service...
sc query MongoDB >nul 2>&1
if errorlevel 1 (
    mongod --version >nul 2>&1
    if errorlevel 1 (
        echo  [WARN] MongoDB service not detected. Attempting to start...
        net start MongoDB >nul 2>&1
        if errorlevel 1 (
            echo  [WARN] Could not auto-start MongoDB. The server will retry for 15s.
            echo         Make sure MongoDB is running before using the app.
        ) else (
            echo  [OK] MongoDB service started successfully.
        )
    ) else (
        echo  [OK] mongod found in PATH.
    )
) else (
    echo  [OK] MongoDB Windows service is running.
)

:: ── Kill stale processes on ports 5000 and 5173 ─────────────────────────────
echo.
echo  [INFO] Releasing ports 5000 and 5173 (if in use)...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5000 " ^| findstr "LISTENING"') do (
    echo  [INFO] Killing PID %%a on port 5000...
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    echo  [INFO] Killing PID %%a on port 5173...
    taskkill /PID %%a /F >nul 2>&1
)
echo  [OK] Ports cleared.

:: ── Install root dependencies if needed ─────────────────────────────────────
echo.
echo  [INFO] Checking frontend dependencies...
if not exist "node_modules\concurrently" (
    echo  [INFO] Installing frontend dependencies (this may take a moment)...
    call npm install
    if errorlevel 1 (
        echo  [ERROR] npm install failed. Check your internet connection.
        pause
        exit /b 1
    )
    echo  [OK] Frontend dependencies installed.
) else (
    echo  [OK] Frontend dependencies present.
)

:: ── Install server dependencies if needed ───────────────────────────────────
echo  [INFO] Checking server dependencies...
if not exist "smartops-supervisor\node_modules\express" (
    echo  [INFO] Installing server dependencies...
    cd smartops-supervisor
    call npm install
    if errorlevel 1 (
        echo  [ERROR] Server npm install failed.
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo  [OK] Server dependencies installed.
) else (
    echo  [OK] Server dependencies present.
)

:: ── Start Backend ────────────────────────────────────────────────────────────
echo.
echo  [INFO] Starting Backend (port 5000)...
start "SmartOps Backend" cmd /k "cd /d "%~dp0" && title SmartOps Backend && node smartops-supervisor/server.js"

:: Wait 3 seconds for backend to initialize before starting frontend
timeout /t 3 /nobreak >nul

:: ── Start Frontend ───────────────────────────────────────────────────────────
echo  [INFO] Starting Frontend (port 5173)...
start "SmartOps Frontend" cmd /k "cd /d "%~dp0" && title SmartOps Frontend && npm run dev:frontend"

:: ── Done ─────────────────────────────────────────────────────────────────────
echo.
echo  ========================================================
echo   Both servers are starting in separate windows!
echo.
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:5000
echo   Health   : http://localhost:5000/health
echo.
echo   IMPORTANT: Use http://localhost:5173 in your browser.
echo              Do NOT use the Go Live port (just click Go
echo              Live and it will open the correct URL).
echo  ========================================================
echo.
echo  This launcher window will close in 5 seconds...
timeout /t 5 /nobreak >nul
