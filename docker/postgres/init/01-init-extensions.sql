-- ===========================================
-- Project Anima - PostgreSQL Initialization
-- ===========================================
-- This script runs automatically when the PostgreSQL container is first created.
-- It sets up necessary extensions for the application.

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector for semantic search and AI recommendations
-- The pgvector/pgvector:pg15 Docker image includes this extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Grant privileges to the default user
GRANT ALL PRIVILEGES ON DATABASE project_anima TO postgres;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Project Anima database initialized successfully!';
    RAISE NOTICE 'Extensions enabled: uuid-ossp, vector (pgvector)';
END $$;

-- Verify pgvector installation
DO $$
DECLARE
    ext_version TEXT;
BEGIN
    SELECT extversion INTO ext_version FROM pg_extension WHERE extname = 'vector';
    IF ext_version IS NOT NULL THEN
        RAISE NOTICE 'pgvector version: %', ext_version;
    ELSE
        RAISE WARNING 'pgvector extension not found!';
    END IF;
END $$;
