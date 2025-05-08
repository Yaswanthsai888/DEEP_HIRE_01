-- Database schema for storing parsed resume data
DROP TABLE IF EXISTS resumes;
CREATE TABLE resumes (
    id SERIAL PRIMARY KEY,
    full_text TEXT NOT NULL,
    skills TEXT[] NOT NULL,
    embedding VECTOR(384) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Contact information
    email TEXT,
    phone TEXT,
    
    -- Technical skills as a dedicated array
    technical_skills TEXT[],
    
    -- Projects information
    projects JSONB,
    
    -- Education information
    education TEXT
);

-- Create an index on the embedding for similarity search
CREATE INDEX IF NOT EXISTS resumes_embedding_idx ON resumes USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

-- Create indices on other columns for faster lookups
CREATE INDEX IF NOT EXISTS resumes_technical_skills_idx ON resumes USING GIN (technical_skills);
CREATE INDEX IF NOT EXISTS resumes_email_idx ON resumes (email);

-- Add a comment to the table explaining its purpose
COMMENT ON TABLE resumes IS 'Stores parsed resume data for candidate matching and RAG-based interview question generation';