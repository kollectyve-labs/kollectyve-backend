CREATE OR REPLACE FUNCTION lease_best_provider(
    requested_cpu INTEGER,
    requested_ram INTEGER,
    requested_storage INTEGER
)
RETURNS TABLE (
    provider_id UUID,
    provider_name TEXT,
    wallet_address TEXT,
    score INTEGER,
    last_lease_at TIMESTAMP,
    allocated_cpu INTEGER,
    allocated_ram INTEGER,
    allocated_storage INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    selected_provider RECORD;
BEGIN
    -- 1. Find the best eligible provider
    SELECT 
        p.id AS id,
        p.name AS name,
        p.wallet_address AS wallet_address,
        p.score AS score,
        p.last_lease_at AS last_lease_at,
        pr.cpu_cores AS cpu_cores,
        pr.ram AS ram,
        pr.storage AS storage,
        
        -- Ranking calculation
        (0.7 * p.score) + 
        (0.3 * EXTRACT(EPOCH FROM NOW() - COALESCE(p.last_lease_at, '1970-01-01'))) AS total_score

    INTO selected_provider

    FROM providers p
    INNER JOIN provider_resources pr ON pr.provider_id = p.id

    WHERE p.is_active = true
      AND pr.cpu_cores >= requested_cpu
      AND pr.ram >= requested_ram
      AND pr.storage >= requested_storage

    ORDER BY total_score DESC
    LIMIT 1;

    -- 2. If no provider found, raise an exception
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No eligible provider found for the requested resources.';
    END IF;

    -- 3. Update provider's last lease time
    UPDATE providers
    SET last_lease_at = NOW()
    WHERE id = selected_provider.id;

    -- 4. Reserve the resources (optional)
    UPDATE provider_resources
    SET 
        cpu_cores = cpu_cores - requested_cpu,
        ram = ram - requested_ram,
        storage = storage - requested_storage
    WHERE provider_id = selected_provider.id;

    -- 5. Return the selected provider info with RETURN QUERY
    RETURN QUERY SELECT
        selected_provider.id,
        selected_provider.name,
        selected_provider.wallet_address,
        selected_provider.score,
        NOW(), -- returns updated last_lease_at
        requested_cpu,
        requested_ram,
        requested_storage;

END;
$$;
