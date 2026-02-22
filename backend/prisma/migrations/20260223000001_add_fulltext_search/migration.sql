-- ===========================================
-- Project Anima - Full-Text Search Configuration
-- ===========================================
-- This migration adds PostgreSQL full-text search capabilities
-- for works, users, and chapters.

-- Create a custom text search configuration for Chinese
-- Note: pg_jieba extension is optional, falls back to 'simple' if not available
DO $$
BEGIN
    -- Try to create configuration with pg_jieba if available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_jieba') THEN
        CREATE TEXT SEARCH CONFIGURATION IF NOT EXISTS chinese (COPY = simple);
        ALTER TEXT SEARCH CONFIGURATION chinese
            ALTER MAPPING FOR word WITH jieba_stem;
        RAISE NOTICE 'Using pg_jieba for Chinese text search';
    ELSE
        -- Fallback to simple configuration for Chinese
        CREATE TEXT SEARCH CONFIGURATION IF NOT EXISTS chinese (COPY = simple);
        RAISE NOTICE 'pg_jieba not available, using simple configuration for Chinese text search';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- If configuration already exists, just log it
        RAISE NOTICE 'Text search configuration already exists or error occurred: %', SQLERRM;
END $$;

-- Add tsvector columns for full-text search
ALTER TABLE works ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE users ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN indexes for fast full-text search
CREATE INDEX IF NOT EXISTS idx_works_search_vector ON works USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_users_search_vector ON users USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_chapters_search_vector ON chapters USING GIN (search_vector);

-- Create function to update works search vector
CREATE OR REPLACE FUNCTION update_works_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update users search vector
CREATE OR REPLACE FUNCTION update_users_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('simple', COALESCE(NEW.username, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.display_name, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.bio, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update chapters search vector
CREATE OR REPLACE FUNCTION update_chapters_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(LEFT(NEW.content, 10000), '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update search vectors
DROP TRIGGER IF EXISTS trigger_update_works_search_vector ON works;
CREATE TRIGGER trigger_update_works_search_vector
    BEFORE INSERT OR UPDATE OF title, description ON works
    FOR EACH ROW
    EXECUTE FUNCTION update_works_search_vector();

DROP TRIGGER IF EXISTS trigger_update_users_search_vector ON users;
CREATE TRIGGER trigger_update_users_search_vector
    BEFORE INSERT OR UPDATE OF username, display_name, bio ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_search_vector();

DROP TRIGGER IF EXISTS trigger_update_chapters_search_vector ON chapters;
CREATE TRIGGER trigger_update_chapters_search_vector
    BEFORE INSERT OR UPDATE OF title, content ON chapters
    FOR EACH ROW
    EXECUTE FUNCTION update_chapters_search_vector();

-- Update existing records to populate search vectors
UPDATE works SET search_vector = 
    setweight(to_tsvector('simple', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(description, '')), 'B')
WHERE search_vector IS NULL;

UPDATE users SET search_vector = 
    setweight(to_tsvector('simple', COALESCE(username, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(display_name, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(bio, '')), 'B')
WHERE search_vector IS NULL;

UPDATE chapters SET search_vector = 
    setweight(to_tsvector('simple', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(LEFT(content, 10000), '')), 'B')
WHERE search_vector IS NULL;

-- Create a helper function for searching with ranking
CREATE OR REPLACE FUNCTION search_rank(query text, search_vector tsvector)
RETURNS float AS $$
BEGIN
    RETURN ts_rank_cd(search_vector, plainto_tsquery('simple', query));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create search history table for suggestions
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    result_count INT DEFAULT 0,
    search_type VARCHAR(20) DEFAULT 'all',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(query);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at DESC);

-- Create popular searches view for suggestions
CREATE OR REPLACE VIEW popular_searches AS
SELECT 
    query,
    COUNT(*) as search_count,
    AVG(result_count) as avg_results
FROM search_history
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY query
HAVING COUNT(*) >= 3
ORDER BY search_count DESC
LIMIT 100;

RAISE NOTICE 'Full-text search configuration completed successfully!';
