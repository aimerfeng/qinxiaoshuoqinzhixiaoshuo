# ===========================================
# Project Anima - Development Environment Startup Script
# ===========================================
# One-click startup for all development services
# Usage: .\scripts\dev-start.ps1

param(
    [switch]$SkipHealthCheck,
    [switch]$Rebuild,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Project Anima - Dev Environment Setup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "[1/5] Checking Docker..." -ForegroundColor Yellow
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Docker is not running"
    }
    Write-Host "  Docker is running" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Navigate to project root
Set-Location $RootDir

# Start Docker services
Write-Host "[2/5] Starting Docker services..." -ForegroundColor Yellow
if ($Rebuild) {
    Write-Host "  Rebuilding containers..." -ForegroundColor Gray
    docker-compose down -v 2>&1 | Out-Null
    docker-compose up -d --build
} else {
    docker-compose up -d
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Failed to start Docker services" -ForegroundColor Red
    exit 1
}
Write-Host "  Docker services started" -ForegroundColor Green

# Wait for services to be ready
if (-not $SkipHealthCheck) {
    Write-Host "[3/5] Waiting for services to be healthy..." -ForegroundColor Yellow
    & "$ScriptDir\health-check.ps1" -Wait -Timeout 60
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  WARNING: Some services may not be fully healthy" -ForegroundColor Yellow
    }
} else {
    Write-Host "[3/5] Skipping health check..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
}

# Initialize database (if needed)
Write-Host "[4/5] Checking database initialization..." -ForegroundColor Yellow
& "$ScriptDir\db-init.ps1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  WARNING: Database initialization had issues" -ForegroundColor Yellow
}

# Display service information
Write-Host "[5/5] Services are ready!" -ForegroundColor Yellow
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Service Endpoints" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  PostgreSQL:" -ForegroundColor White
Write-Host "    Host: localhost:5432" -ForegroundColor Gray
Write-Host "    Database: project_anima" -ForegroundColor Gray
Write-Host "    User: postgres / Password: postgres" -ForegroundColor Gray
Write-Host ""
Write-Host "  Redis:" -ForegroundColor White
Write-Host "    Host: localhost:6379" -ForegroundColor Gray
Write-Host ""
Write-Host "  MinIO (S3-compatible):" -ForegroundColor White
Write-Host "    API: http://localhost:9000" -ForegroundColor Gray
Write-Host "    Console: http://localhost:9001" -ForegroundColor Gray
Write-Host "    User: minioadmin / Password: minioadmin" -ForegroundColor Gray
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Next Steps" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Backend: cd backend && npm run start:dev" -ForegroundColor Gray
Write-Host "  2. Frontend: cd frontend && npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "  To stop services: docker-compose down" -ForegroundColor Gray
Write-Host "  To reset data: docker-compose down -v" -ForegroundColor Gray
Write-Host ""
