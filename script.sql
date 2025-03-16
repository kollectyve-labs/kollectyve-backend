CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    wallet_address VARCHAR(200) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    score INTEGER DEFAULT 50, -- Default score for newcomers
    last_lease_at TIMESTAMP, -- Last time this provider was selected
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

----------------------------
-- PROVIDER RESOURCES TABLE
----------------------------
CREATE TABLE provider_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    ip_address INET NOT NULL, -- Public IP of the provider machine
    cpu_cores INTEGER NOT NULL,
    ram INTEGER NOT NULL, -- in MB
    storage INTEGER NOT NULL, -- in GB
    bandwidth INTEGER NOT NULL, -- in Mbps (optional, remove if not needed)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

----------------------------
-- HEALTH CHECKS TABLE
----------------------------
CREATE TABLE health_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    cpu_usage NUMERIC(5, 2) NOT NULL, -- %
    memory_free VARCHAR(50) NOT NULL, -- "512 MB"
    disk_free VARCHAR(50) NOT NULL, -- "100 GB"
    docker_status VARCHAR(50) NOT NULL,
    running_containers INTEGER NOT NULL,
    unhealthy_containers INTEGER NOT NULL,
    timestamp_unix BIGINT NOT NULL,
    timestamp_human TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

----------------------------
-- DEVELOPERS TABLE (OPTIONAL)
----------------------------
CREATE TABLE developers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    wallet_address VARCHAR(200) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

----------------------------
-- DEVELOPER VMS (Containerized Ubuntu Machines)
----------------------------
CREATE TABLE developer_vms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    developer_id UUID NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    container_id VARCHAR(200) UNIQUE NOT NULL, -- from Docker or the agent
    ram INTEGER NOT NULL, -- in MB
    cpu_cores INTEGER NOT NULL,
    storage INTEGER NOT NULL, -- in GB
    status VARCHAR(50) NOT NULL DEFAULT 'running', -- running, stopped, etc.
    ssh_public_key TEXT NOT NULL, -- for accessing the container
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

----------------------------
-- OTHER CONTAINERS (Apps: LibreOffice, Odoo, Moodle, Wordpress, etc.)
----------------------------
CREATE TABLE developer_app_containers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    developer_id UUID NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    container_id VARCHAR(200) UNIQUE NOT NULL,
    app_name VARCHAR(100) NOT NULL, -- E.g., LibreOffice, Odoo, Moodle
    ram INTEGER NOT NULL,
    cpu_cores INTEGER NOT NULL,
    storage INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'running',
    ssh_public_key TEXT, -- optional, if they can SSH into app containers
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

----------------------------
-- EXAMPLE DATA
----------------------------

-- Example providers
INSERT INTO providers (id, name, email, wallet_address, is_active, score, last_lease_at)
VALUES
(gen_random_uuid(), 'Provider One', 'provider1@example.com', '0x123abcProvider1', true, 50, NULL),
(gen_random_uuid(), 'Provider Two', 'provider2@example.com', '0x456defProvider2', true, 70, NOW() - INTERVAL '2 days');

-- Example provider resources
INSERT INTO provider_resources (provider_id, ip_address, cpu_cores, ram, storage, bandwidth)
SELECT id, '192.168.1.100', 8, 16384, 500, 100 FROM providers WHERE name = 'Provider One';

INSERT INTO provider_resources (provider_id, ip_address, cpu_cores, ram, storage, bandwidth)
SELECT id, '192.168.1.101', 4, 8192, 200, 50 FROM providers WHERE name = 'Provider Two';

-- Example health checks
INSERT INTO health_checks (provider_id, cpu_usage, memory_free, disk_free, docker_status, running_containers, unhealthy_containers, timestamp_unix, timestamp_human)
SELECT id, 30.5, '1024 MB', '200 GB', 'running', 2, 0, EXTRACT(EPOCH FROM NOW()), NOW() FROM providers WHERE name = 'Provider One';

-- Example developers
INSERT INTO developers (id, name, email, wallet_address)
VALUES
(gen_random_uuid(), 'Dev Alice', 'alice@developers.com', '0xDevAliceWallet'),
(gen_random_uuid(), 'Dev Bob', 'bob@developers.com', '0xDevBobWallet');

-- Example developer VMs
INSERT INTO developer_vms (developer_id, provider_id, container_id, ram, cpu_cores, storage, status, ssh_public_key)
SELECT
d.id, p.id, 'container123', 4096, 2, 50, 'running', 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQD...'
FROM developers d, providers p
WHERE d.name = 'Dev Alice' AND p.name = 'Provider One';

-- Example app containers
INSERT INTO developer_app_containers (developer_id, provider_id, container_id, app_name, ram, cpu_cores, storage, status)
SELECT
d.id, p.id, 'appcontainer456', 'Wordpress', 2048, 1, 20, 'running'
FROM developers d, providers p
WHERE d.name = 'Dev Bob' AND p.name = 'Provider Two';