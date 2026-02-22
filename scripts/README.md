# Project Anima - Development Scripts

This directory contains scripts for managing the local development environment.

## Prerequisites

- **Docker Desktop** - Must be installed and running
- **PowerShell** - Windows PowerShell or PowerShell Core
- **Node.js** - v18+ for backend development

## Quick Start

```powershell
# Start all services (PostgreSQL, Redis, MinIO)
.\scripts\dev-start.ps1

# Stop all services
.\scripts\dev-stop.ps1

# Stop and reset all data
.\scripts\dev-stop.ps1 -Reset
```

## Scripts

### `dev-start.ps1`

One-click startup for all development services.

```powershell
# Basic usage
.\scripts\dev-start.ps1

# Skip health check (faster startup)
.\scripts\dev-start.ps1 -SkipHealthCheck

# Rebuild containers
.\scripts\dev-start.ps1 -Rebuild
```

**What it does:**
1. Checks if Docker is running
2. Starts all Docker services (PostgreSQL, Redis, MinIO)
3. Waits for services to be healthy
4. Initializes the database (runs Prisma migrations)
5. Displays service endpoints

### `dev-stop.ps1`

Stops all development services.

```powershell
# Stop services (preserve data)
.\scripts\dev-stop.ps1

# Stop services and remove all data
.\scripts\dev-stop.ps1 -Reset
```

### `health-check.ps1`

Checks the health status of all services.

```powershell
# Check current status
.\scripts\health-check.ps1

# Wait for services to be healthy (with timeout)
.\scripts\health-check.ps1 -Wait -Timeout 60
```

### `db-init.ps1`

Initializes the database and runs Prisma migrations.

```powershell
# Normal initialization
.\scripts\db-init.ps1

# Force reset database
.\scripts\db-init.ps1 -Force

# Initialize and seed with test data
.\scripts\db-init.ps1 -Seed
```

## Service Endpoints

After running `dev-start.ps1`, the following services are available:

| Service | Endpoint | Credentials |
|---------|----------|-------------|
| PostgreSQL | `localhost:5432` | User: `postgres`, Password: `postgres`, DB: `project_anima` |
| Redis | `localhost:6379` | No password |
| MinIO API | `http://localhost:9000` | User: `minioadmin`, Password: `minioadmin` |
| MinIO Console | `http://localhost:9001` | User: `minioadmin`, Password: `minioadmin` |

## Connection Strings

**PostgreSQL:**
```
postgresql://postgres:postgres@localhost:5432/project_anima?schema=public
```

**Redis:**
```
redis://localhost:6379
```

**MinIO (S3-compatible):**
```
Endpoint: http://localhost:9000
Access Key: minioadmin
Secret Key: minioadmin
```

## Troubleshooting

### Docker not running
```
ERROR: Docker is not running. Please start Docker Desktop first.
```
**Solution:** Start Docker Desktop and wait for it to be fully running.

### Port already in use
```
ERROR: Port 5432 is already in use
```
**Solution:** Stop any existing PostgreSQL service or change the port in `docker-compose.yml`.

### Services not healthy
```
Some services are not healthy.
```
**Solution:** Check logs with `docker-compose logs` to identify the issue.

### Database migration fails
```
WARNING: Migration had issues
```
**Solution:** 
1. Check if the database is accessible
2. Try running `npx prisma migrate dev` manually in the backend directory
3. Use `.\scripts\db-init.ps1 -Force` to reset the database

## Manual Docker Commands

```powershell
# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f postgres

# Access PostgreSQL CLI
docker exec -it project-anima-postgres psql -U postgres -d project_anima

# Access Redis CLI
docker exec -it project-anima-redis redis-cli

# Restart a specific service
docker-compose restart postgres
```
