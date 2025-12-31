# Start Everything - Launch proxy and Expo dev server
# This script starts both the proxy server and Expo in the correct order

Write-Host "Starting AI Phone App Development Environment..." -ForegroundColor Cyan
Write-Host ""

# Kill any existing node processes on port 3001 or 8081
Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {
    $pid = $_.Id
    $connections = Get-NetTCPConnection -OwningProcess $pid -ErrorAction SilentlyContinue
    $connections | Where-Object { $_.LocalPort -eq 3001 -or $_.LocalPort -eq 8081 }
} | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 1

# Start proxy server in a separate persistent window
Write-Host "Starting proxy server on localhost:3001..." -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$PSScriptRoot'; Write-Host '=== PROXY SERVER ===' -ForegroundColor Cyan; Write-Host 'Running on http://localhost:3001' -ForegroundColor Green; Write-Host 'Do not close this window' -ForegroundColor Yellow; Write-Host ''; node proxy\server.js"
) -WindowStyle Normal

# Wait for proxy to start
Write-Host "Waiting for proxy to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Verify proxy is running
$proxyRunning = Test-NetConnection -ComputerName localhost -Port 3001 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($proxyRunning) {
    Write-Host "Proxy server running" -ForegroundColor Green
} else {
    Write-Host "Proxy server failed to start" -ForegroundColor Red
    Write-Host "Check the proxy window for errors" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Starting Expo dev server..." -ForegroundColor Green
Write-Host ""

# Start Expo
$env:EXPO_NO_INTERACTIVE = '1'
npx expo start
