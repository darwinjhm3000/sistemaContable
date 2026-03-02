# Script de monitoreo y reinicio automático del backend
# Uso: .\monitor-backend.ps1

$backendUrl = "http://localhost:3001/api/health"
$checkInterval = 30 # segundos
$maxRetries = 3
$retryDelay = 5 # segundos

function Test-Backend {
    try {
        $response = Invoke-WebRequest -Uri $backendUrl -UseBasicParsing -TimeoutSec 5
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Start-Backend {
    Write-Host "🔄 Iniciando backend..." -ForegroundColor Yellow
    Set-Location $PSScriptRoot
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm start" -WindowStyle Minimized
    Start-Sleep -Seconds 10
}

function Restart-Backend {
    Write-Host "🔄 Reiniciando backend..." -ForegroundColor Yellow
    Get-Process | Where-Object {$_.ProcessName -eq "node" -and $_.Path -like "*$PSScriptRoot*"} | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Start-Backend
}

Write-Host "🚀 Monitor de Backend iniciado" -ForegroundColor Green
Write-Host "   URL: $backendUrl" -ForegroundColor Cyan
Write-Host "   Intervalo de verificación: $checkInterval segundos" -ForegroundColor Cyan
Write-Host "   Presiona Ctrl+C para detener" -ForegroundColor Yellow
Write-Host ""

$consecutiveFailures = 0

while ($true) {
    $isHealthy = Test-Backend

    if ($isHealthy) {
        if ($consecutiveFailures -gt 0) {
            Write-Host "✅ Backend recuperado - $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Green
            $consecutiveFailures = 0
        } else {
            Write-Host "✅ Backend OK - $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Green
        }
    } else {
        $consecutiveFailures++
        Write-Host "❌ Backend no responde (intento $consecutiveFailures/$maxRetries) - $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Red

        if ($consecutiveFailures -ge $maxRetries) {
            Write-Host "🔄 Reiniciando backend después de $maxRetries fallos consecutivos..." -ForegroundColor Yellow
            Restart-Backend
            $consecutiveFailures = 0
        }
    }

    Start-Sleep -Seconds $checkInterval
}

