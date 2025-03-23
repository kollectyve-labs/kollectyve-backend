----------------------------
-- CORE TABLES
----------------------------
CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    wallet_address VARCHAR(200) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    score INTEGER DEFAULT 50,
    last_lease_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE provider_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    ip_address INET NOT NULL,
    cpu_cores INTEGER NOT NULL,
    ram INTEGER NOT NULL, -- in MB
    storage INTEGER NOT NULL, -- in GB
    bandwidth INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE health_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    cpu_usage NUMERIC(5, 2) NOT NULL,
    memory_free VARCHAR(50) NOT NULL,
    disk_free VARCHAR(50) NOT NULL,
    docker_status VARCHAR(50) NOT NULL,
    running_containers INTEGER NOT NULL,
    unhealthy_containers INTEGER NOT NULL,
    timestamp_unix BIGINT NOT NULL,
    timestamp_human TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE developers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    wallet_address VARCHAR(200) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- TODO: Refactor to have set the id of the vm to the container id
CREATE TABLE developer_vms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    developer_id UUID NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
    provider_resource_id UUID NOT NULL REFERENCES provider_resources(id) ON DELETE CASCADE,
    container_id VARCHAR(200) UNIQUE NOT NULL,
    ram INTEGER NOT NULL,
    cpu_cores INTEGER NOT NULL,
    storage INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'running',
    ssh_public_key TEXT NOT NULL,
    ssh_port INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

----------------------------
-- TYPES FOR DEPLOYMENTS
----------------------------
CREATE TYPE app_type AS ENUM (
    'odoo',
    'wordpress',
    'libreoffice',
    'nextcloud'
);

CREATE TYPE container_type AS ENUM (
    'main',
    'database',
    'cache',
    'proxy'
);

CREATE TYPE deployment_status AS ENUM (
    'creating',
    'running',
    'stopped',
    'failed',
    'deleted'
);

----------------------------
-- DEPLOYMENT TABLES
----------------------------
CREATE TABLE app_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    developer_id UUID NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
    provider_resource_id UUID NOT NULL REFERENCES provider_resources(id),
    app_type app_type NOT NULL,
    network_name VARCHAR(100) NOT NULL,
    status deployment_status NOT NULL DEFAULT 'creating',
    total_cpu INTEGER NOT NULL,
    total_memory INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE deployment_containers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID NOT NULL REFERENCES app_deployments(id) ON DELETE CASCADE,
    container_id VARCHAR(200) NOT NULL UNIQUE,
    container_type container_type NOT NULL,
    name VARCHAR(100) NOT NULL,
    image VARCHAR(200) NOT NULL,
    cpu_cores INTEGER NOT NULL,
    ram INTEGER NOT NULL,
    storage INTEGER NOT NULL,
    port INTEGER,
    internal_port INTEGER,
    status VARCHAR(50) NOT NULL DEFAULT 'creating',
    environment_vars JSONB,
    volumes JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

----------------------------
-- INDEXES
----------------------------
CREATE INDEX idx_deployment_status ON app_deployments(status);
CREATE INDEX idx_deployment_developer ON app_deployments(developer_id);
CREATE INDEX idx_deployment_provider ON app_deployments(provider_resource_id);
CREATE INDEX idx_container_deployment ON deployment_containers(deployment_id);
CREATE INDEX idx_container_status ON deployment_containers(status);

----------------------------
-- VIEWS
----------------------------
CREATE VIEW deployment_overview AS
SELECT 
    d.id as deployment_id,
    d.app_type,
    d.status as deployment_status,
    d.network_name,
    d.total_cpu,
    d.total_memory,
    json_agg(json_build_object(
        'container_id', c.container_id,
        'container_type', c.container_type,
        'status', c.status,
        'port', c.port
    )) as containers
FROM app_deployments d
LEFT JOIN deployment_containers c ON d.id = c.deployment_id
GROUP BY d.id;
