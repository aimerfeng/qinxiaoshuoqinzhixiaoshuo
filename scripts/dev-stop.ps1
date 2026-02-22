# ===========================================
# Project Anima - Development Environment Stop Script
# ===========================================
# Stops all development services
# Usage: .\scripts\dev-stop.ps1 [-Reset]

param(
    [switch]$Reset
)

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Project Anima - Stopping Services" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $RootDir

if ($Reset) {
    Write-Host "Stopping services and removing volumes..." -ForegroundColor Yellow
    docker-compose down -v
    Write-Host ""
    Write-Host "All services stopped and data volumes removed." -ForegroundColor Green
    Write-Host "Run '.\scripts\dev-start.ps1' to start fresh." -ForegroundColor Gray
} else {
    Write-Host "Stopping services..." -ForegroundColor Yellow
    docker-compose down
    Write-Host ""
    Write-Host "All services stopped. Data is preserved." -ForegroundColor Green
    Write-Host "Run '.\scripts\dev-start.ps1' to restart." -ForegroundColor Gray
    Write-Host "Run '.\scripts\dev-stop.ps1 -Reset' to remove all data." -ForegroundColor Gray
}

Write-Host ""
