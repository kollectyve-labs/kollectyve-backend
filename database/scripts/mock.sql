-- Insert a developer
INSERT INTO developers (id, name, email, wallet_address)
VALUES (
    '42115ec2-376a-489c-8300-94984aba72fa',  -- This is the ID used in your code
    'Test User',
    'test@example.com',
    '0x1234567890abcdef1234567890abcdef12345678'
);

-- Insert a provider
INSERT INTO providers (id, name, email, wallet_address, is_active, score)
VALUES (
    'a6ae7e2f-e89a-4477-b3ac-ea4607c4599f',  -- This is the ID used in your code
    'Local Provider',
    'provider@example.com',
    '0xabcdef1234567890abcdef1234567890abcdef12',
    true,
    100
);

-- Insert a provider resource
INSERT INTO provider_resources (id, provider_id, ip_address, cpu_cores, ram, storage, bandwidth)
VALUES (
    'a6ae7e2f-e89a-4477-b3ac-ea4607c4599f',  -- This is the ID used in your code
    'a6ae7e2f-e89a-4477-b3ac-ea4607c4599f',  -- References the provider ID
    '127.0.0.1',
    4,  -- CPU cores
    8192,  -- RAM in MB (8GB)
    100,  -- Storage in GB
    1000  -- Bandwidth in Mbps
);