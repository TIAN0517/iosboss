@echo off
chcp 65001 >nul
REM ========================================
REM JYT Gas Management System - Start Services
REM ========================================

echo ========================================
echo JYT Gas Management System - Start
echo ========================================

REM 1. Create Network
echo [1/6] Creating network...
docker network inspect jyt-gas-network >nul 2>&1
if errorlevel 1 (
    docker network create jyt-gas-network
)

REM Check if containers already exist
docker inspect jyt-gas-postgres >nul 2>&1
if errorlevel 1 (
    REM 2. Start PostgreSQL
    echo [2/6] Starting PostgreSQL...
    docker run -d --name jyt-gas-postgres --network jyt-gas-network ^
        -e POSTGRES_USER=postgres ^
        -e POSTGRES_PASSWORD=Ss520520 ^
        -e POSTGRES_DB=gas_management ^
        -v jyt-gas-postgres-data:/var/lib/postgresql/data ^
        --restart always ^
        postgres:16-alpine
    timeout /t 5 /nobreak >nul
) else (
    echo [2/6] PostgreSQL already running
)

docker inspect jyt-gas-app >nul 2>&1
if errorlevel 1 (
    REM 3. Start Main App
    echo [3/6] Starting main app...
    docker run -d --name jyt-gas-app --network jyt-gas-network ^
        --add-host=postgres:172.18.0.2 ^
        -p 9999:9999 ^
        -e POSTGRES_USER=postgres ^
        -e POSTGRES_PASSWORD=Ss520520 ^
        -e POSTGRES_DB=gas_management ^
        -e DATABASE_URL="postgresql://postgres:Ss520520@postgres:5432/gas_management?schema=public&connection_limit=20&pool_timeout=30" ^
        -e DIRECT_URL="postgresql://postgres:Ss520520@postgres:5432/gas_management" ^
        -e NODE_ENV=production ^
        -e PORT=9999 ^
        -e DB_AUTO_MIGRATE=true ^
        -e DB_AUTO_SEED=true ^
        -v jyt-gas-app-data:/app/data ^
        --restart always ^
        jyt-gas-app:latest
    timeout /t 10 /nobreak >nul
) else (
    echo [3/6] Main app already running
)

docker inspect jyt-gas-call-display >nul 2>&1
if errorlevel 1 (
    REM 4. Start Call Display Service
    echo [4/6] Starting call display service...
    docker run -d --name jyt-gas-call-display --network jyt-gas-network ^
        -p 3004:3004 ^
        -e NODE_ENV=production ^
        -e PORT=3004 ^
        -e APP_URL="http://app:9999" ^
        --restart always ^
        jyt-gas-call-display:latest
) else (
    echo [4/6] Call display service already running
)

docker inspect jyt-gas-sync-websocket >nul 2>&1
if errorlevel 1 (
    REM 5. Start Sync WebSocket Service
    echo [5/6] Starting sync websocket service...
    docker run -d --name jyt-gas-sync-websocket --network jyt-gas-network ^
        -p 3005:3005 ^
        -e DATABASE_URL="postgresql://postgres:Ss520520@postgres:5432/gas_management?schema=public&connection_limit=20&pool_timeout=30" ^
        -e NODE_ENV=production ^
        -e SYNC_WEBSOCKET_ENABLED=true ^
        -e SYNC_WEBSOCKET_PORT=3005 ^
        --restart always ^
        jyt-gas-sync-websocket:latest
) else (
    echo [5/6] Sync websocket service already running
)

REM 6. Show Status
echo [6/6] Checking service status...
timeout /t 5 /nobreak >nul
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | findstr jyt-gas

echo ========================================
echo Services started successfully!
echo Main App: http://localhost:9999
echo Call Display: http://localhost:3004
echo Sync WebSocket: http://localhost:3005
echo ========================================
pause
