param(
    [switch]$Web,
    [switch]$Clear
)

$ErrorActionPreference = 'Stop'

function Write-Section($message) {
    Write-Host "==> $message" -ForegroundColor Cyan
}

function Stop-Port {
    param([int]$Port)
    try {
        $pids = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($pid in $pids) {
            if ($pid -and $pid -ne 0) {
                Write-Host "Stopping process $pid on port $Port"
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {
        Write-Host "No process found on port $Port"
    }
}

function Wait-ProxyHealth {
    param(
        [string]$Url,
        [int]$Attempts = 20
    )

    for ($i = 1; $i -le $Attempts; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -eq 200 -and ($response.Content -match '"ok"')) {
                Write-Host "Proxy healthy after attempt $i"
                return
            }
        } catch {
            # Ignore and retry
        }
        Start-Sleep -Seconds 1
    }

    throw "Proxy did not become healthy after $Attempts attempts."
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $repoRoot
$healthUrl = 'http://localhost:3001/health'
$proxyScript = Join-Path $repoRoot 'proxy\server.js'
$proxyProcess = $null
$expoCmd = Join-Path $repoRoot 'node_modules\.bin\expo.cmd'

try {
    Write-Section 'Clearing dev ports (3001, 8081, 8082)'
    3001, 8081, 8082 | ForEach-Object { Stop-Port $_ }

    Write-Section 'Starting dev proxy on http://localhost:3001'
    $proxyProcess = Start-Process -FilePath 'node' -ArgumentList @($proxyScript) -WorkingDirectory $repoRoot -PassThru -WindowStyle Hidden

    Write-Section 'Waiting for proxy health'
    Wait-ProxyHealth -Url $healthUrl

    $env:EXPO_PUBLIC_API_BASE = 'http://localhost:3001/api/data'
    $env:EXPO_PUBLIC_AUTH_BASE = 'http://localhost:3001/api/auth'
    Write-Section "Env set: API_BASE=$($env:EXPO_PUBLIC_API_BASE) AUTH_BASE=$($env:EXPO_PUBLIC_AUTH_BASE)"

    $expoArgs = @('start')
    if ($Web) { $expoArgs += '--web' }
    if ($Clear) { $expoArgs += '--clear' }

    if (Test-Path $expoCmd) {
        Write-Section "Starting Expo via local CLI: $expoCmd $($expoArgs -join ' ')"
        & $expoCmd @expoArgs
    } else {
        Write-Section "Local Expo CLI not found, falling back to npx expo $($expoArgs -join ' ')"
        & npx.cmd expo @expoArgs
    }
} finally {
    if ($proxyProcess -and -not $proxyProcess.HasExited) {
        Write-Host "Stopping proxy (pid $($proxyProcess.Id))"
        $proxyProcess.Kill() | Out-Null
    }
}
