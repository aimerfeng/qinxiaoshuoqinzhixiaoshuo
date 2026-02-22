# ===========================================
# Project Anima - Database Initialization Script
# ===========================================
# Initializes the database and runs Prisma migrations
# Usage: .\scripts\db-init.ps1 [-Force] [-Seed]

param(
    [switch]$Force,
    [switch]$Seed,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$BackendDir = Join-Path $RootDir "backend"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Project Anima - Database Initialization" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if PostgreSQL is running
Write-Host "[1/4] Checking PostgreSQL connection..." -ForegroundColor Yellow
try {
    $result = docker exec project-anima-postgres pg_isready -U postgres -d project_anima 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "PostgreSQL is not ready"
    }
    Write-Host "  PostgreSQL is ready" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: PostgreSQL is not running or not ready" -ForegroundColor Red
    Write-Host "  Run '.\scripts\dev-start.ps1' first" -ForegroundColor Gray
    exit 1
}

# Check if backend directory exists
if (-not (Test-Path $BackendDir)) {
    Write-Host "  ERROR: Backend directory not found at $BackendDir" -ForegroundColor Red
    exit 1
}

# Navigate to backend directory
Set-Location $BackendDir

# Check if .env file exists
Write-Host "[2/4] Checking environment configuration..." -ForegroundColor Yellow
$envFile = Join-Path $BackendDir ".env"
$envExampleFile = Join-Path $BackendDir ".env.example"

if (-not (Test-Path $envFile)) {
    if (Test-Path $envExampleFile) {
        Write-Host "  Creating .env from .env.example..." -ForegroundColor Gray
        Copy-Item $envExampleFile $envFile
        
        # Update DATABASE_URL for local Docker PostgreSQL
        $envContent = Get-Content $envFile -Raw
        $envContent = $envContent -replace 'DATABASE_URL=prisma\+postgres://.*', 'DATABASE_URL=postgresql://postgres:postgres@localhost:5432/project_anima?schema=public'
        Set-Content $envFile $envContent
        
        Write-Host "  .env file created with local Docker settings" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: No .env or .env.example file found" -ForegroundColor Yellow
    }
} else {
    Write-Host "  .env file exists" -ForegroundColor Green
}

# Check if node_modules exists
Write-Host "[3/4] Checking dependencies..." -ForegroundColor Yellow
$nodeModules = Join-Path $BackendDir "node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "  Installing dependencies..." -ForegroundColor Gray
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR: Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}
Write-Host "  Dependencies are installed" -ForegroundColor Green

# Run Prisma migrations
Write-Host "[4/4] Running Prisma migrations..." -ForegroundColor Yellow
try {
    if ($Force) {
        Write-Host "  Resetting database (force mode)..." -ForegroundColor Gray
        npx prisma migrate reset --force 2>&1
    } else {
        # Generate Prisma client
        Write-Host "  Generating Prisma client..." -ForegroundColor Gray
        npx prisma generate 2>&1
        
        # Run migrations
        Write-Host "  Applying migrations..." -ForegroundColor Gray
        npx prisma migrate dev --name init 2>&1
    }
    
    if ($LASTEXITCODE -ne 0) {
        # Migration might fail if already applied, try db push instead
        Write-Host "  Trying db push..." -ForegroundColor Gray
        npx prisma db push 2>&1
    }
    
    Write-Host "  Database schema is up to date" -ForegroundColor Green
} catch {
    Write-Host "  WARNING: Migration had issues: $_" -ForegroundColor Yellow
    Write-Host "  You may need to run 'npx prisma migrate dev' manually" -ForegroundColor Gray
}

# Run seed if requested
if ($Seed) {
    Write-Host ""
    Write-Host "Running database seed..." -ForegroundColor Yellow
    $seedFile = Join-Path $BackendDir "prisma\seed.ts"
    if (Test-Path $seedFile) {
        npx prisma db seed
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Seed data inserted" -ForegroundColor Green
        } else {
            Write-Host "  WARNING: Seed failed" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  No seed file found at prisma/seed.ts" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Database initialization complete!" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Connection string:" -ForegroundColor White
Write-Host "  postgresql://postgres:postgres@localhost:5432/project_anima" -ForegroundColor Gray
Write-Host ""
Write-Host "  Useful commands:" -ForegroundColor White
Write-Host "  - View database: npx prisma studio" -ForegroundColor Gray
Write-Host "  - Reset database: .\scripts\db-init.ps1 -Force" -ForegroundColor Gray
Write-Host "  - Seed database: .\scripts\db-init.ps1 -Seed" -ForegroundColor Gray
Write-Host ""

# Return to original directory
Set-Location $RootDir
exit 0
