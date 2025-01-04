
-- Create healthstats table for providers health stats
CREATE or REPLACE TABLE IF NOT EXISTS healthstats (
  id SERIAL PRIMARY KEY,
  address VARCHAR(48) NOT NULL,
  message TEXT NOT NULL,
  signature TEXT NOT NULL,
  verified_at TIMESTAMP NOT NULL
);

-- Create providers table
CREATE TABLE providers (
    id SERIAL PRIMARY KEY,
    account VARCHAR(48) NOT NULL,
    name VARCHAR(99), 
    website VARCHAR(99), 
    total_resources INTEGER NOT NULL,
    reputation_score INTEGER NOT NULL,
    registration_block INTEGER NOT NULL,
    last_updated INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



