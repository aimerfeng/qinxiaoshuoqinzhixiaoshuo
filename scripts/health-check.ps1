# ===========================================
# Project Anima - Health Check Script
# ===========================================
# Checks the health status of all development services
# Usage: .\scripts\health-check.ps1 [-Wait] [-Timeout 60]

param(
    [switch]$Wait,
    [int]$Timeout = 60,
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"

function Test-PostgreSQL {
    try {
        $result = docker exec project-anima-postgres pg_isready -U postgres -d project_anima 2>&1
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Test-Redis {
    try {
        $result = docker exec project-anima-redis redis-cli ping 2>&1
        return $result -eq "PONG"
    } catch {
        return $false
    }
}

function Test-MinIO {
    try {
        # Check if MinIO container is running and responding
        $containerStatus = docker inspect --format='{{.State.Health.Status}}' project-anima-minio 2>&1
        if ($containerStatus -eq "healthy") {
            return $true
        }
        # Fallback: try to connect to the API
        $response = Invoke-WebRequest -Uri "http://localhost:9000/minio/health/live" -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
        return $response.StatusCode -eq 200
    } catch {
        # MinIO might not have the health endpoint, check if port is open
        try {
            $tcpClient = New-Object System.Net.Sockets.TcpClient
            $tcpClient.Connect("localhost", 9000)
            $tcpClient.Close()
            return $true
        } catch {
            return $false
        }
    }
}

function Show-Status {
    param(
        [string]$Service,
        [bool]$IsHealthy
    )
    
    if ($IsHealthy) {
        Write-Host "  [OK] $Service" -ForegroundColor Green
    } else {
        Write-Host "  [--] $Service" -ForegroundColor Red
    }
}

function Get-AllHealthy {
    $pgHealthy = Test-PostgreSQL
    $redisHealthy = Test-Redis
    $minioHealthy = Test-MinIO
    
    return @{
        PostgreSQL = $pgHealthy
        Redis = $redisHealthy
        MinIO = $minioHealthy
        AllHealthy = ($pgHealthy -and $redisHealthy -and $minioHealthy)
    }
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Project Anima - Health Check" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

if ($Wait) {
    Write-Host "Waiting for services to be healthy (timeout: ${Timeout}s)..." -ForegroundColor Yellow
    Write-Host ""
    
    $startTime = Get-Date
    $allHealthy = $false
    
    while (-not $allHealthy) {
        $elapsed = ((Get-Date) - $startTime).TotalSeconds
        
        if ($elapsed -ge $Timeout) {
            Write-Host ""
            Write-Host "Timeout reached. Current status:" -ForegroundColor Yellow
            $status = Get-AllHealthy
            Show-Status "PostgreSQL" $status.PostgreSQL
            Show-Status "Redis" $status.Redis
            Show-Status "MinIO" $status.MinIO
            Write-Host ""
            exit 1
        }
        
        $status = Get-AllHealthy
        $allHealthy = $status.AllHealthy
        
        if (-not $allHealthy) {
            $remaining = [math]::Round($Timeout - $elapsed)
            Write-Host "`r  Checking... (${remaining}s remaining)  " -NoNewline -ForegroundColor Gray
            Start-Sleep -Seconds 2
        }
    }
    
    Write-Host "`r                                        " -NoNewline
    Write-Host "`r"
}

# Final status check
$status = Get-AllHealthy

Write-Host "Service Status:" -ForegroundColor White
Write-Host ""
Show-Status "PostgreSQL (localhost:5432)" $status.PostgreSQL
Show-Status "Redis (localhost:6379)" $status.Redis
Show-Status "MinIO (localhost:9000)" $status.MinIO
Write-Host ""

if ($status.AllHealthy) {
    Write-Host "All services are healthy!" -ForegroundColor Green
    Write-Host ""
    exit 0
} else {
    Write-Host "Some services are not healthy." -ForegroundColor Yellow
    Write-Host "Run 'docker-compose logs' to check for errors." -ForegroundColor Gray
    Write-Host ""
    exit 1
}
