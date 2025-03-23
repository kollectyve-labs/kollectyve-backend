-- Insert a developer
INSERT INTO developers (id, name, email, wallet_address)
VALUES (
    '42115ec2-376a-489c-8300-94984aba72fa',  -- This is the ID used in your code
    'Test User',
    'test@example.com',
    '0x1234567890abcdef1234567890abcdef12345678'
);

-- Insert a provider
INSERT INTO providers ( name, email, wallet_address, is_active, score) VALUES
('Alpha Provider', 'alpha@provider.com', '0x1234567890123456789012345678901234567890', TRUE, 95),
('Beta Provider', 'beta@provider.com', '0x2345678901234567890123456789012345678901', TRUE, 88),
('Gamma Provider', 'gamma@provider.com', '0x3456789012345678901234567890123456789012', TRUE, 75),
('Delta Provider', 'delta@provider.com', '0x4567890123456789012345678901234567890123', TRUE, 92),
('Epsilon Provider', 'epsilon@provider.com', '0x5678901234567890123456789012345678901234', TRUE, 85),
('Zeta Provider', 'zeta@provider.com', '0x6789012345678901234567890123456789012345', TRUE, 79),
('Eta Provider', 'eta@provider.com', '0x7890123456789012345678901234567890123456', TRUE, 91),
('Theta Provider', 'theta@provider.com', '0x8901234567890123456789012345678901234567', TRUE, 83),
('Iota Provider', 'iota@provider.com', '0x9012345678901234567890123456789012345678', TRUE, 87),
('Kappa Provider', 'kappa@provider.com', '0x0123456789012345678901234567890123456789', TRUE, 94);

-- Insert a provider resource
INSERT INTO provider_resources (provider_id, ip_address, cpu_cores, ram, storage, bandwidth) VALUES
('866dcf15-3298-418d-bcbb-9af8e8bd25a6', '192.168.1.10', 32, 65536, 2000, 10000),
('89de7bc9-5813-447d-ab1b-e1fa82074516', '192.168.1.20', 24, 32768, 1000, 5000),
('8a9bdea4-fa3c-4d8a-aaa2-f0283d5c5d39', '192.168.1.30', 8, 8192, 250, 1000),
('8fb84888-b1f3-4a16-a3d5-92af4d4d728c', '192.168.1.40', 32, 65536, 2000, 10000),
('a6ae7e2f-e89a-4477-b3ac-ea4607c4599f', '192.168.1.50', 24, 32768, 1000, 5000),
('a7dd3cfc-7bc9-4066-9e20-b61c102eb623', '192.168.1.60', 8, 8192, 250, 1000),
('c0bd5106-3c91-4bd4-b96e-62d360d242ab', '192.168.1.70', 32, 65536, 2000, 10000),
('cebcd1ee-c8cf-4301-b1b9-443fd6c3befc', '192.168.1.80', 16, 16384, 500, 2500),
('89de7bc9-5813-447d-ab1b-e1fa82074516', '192.168.1.90', 24, 32768, 1000, 5000),
('a6ae7e2f-e89a-4477-b3ac-ea4607c4599f', '192.168.1.100', 32, 65536, 2000, 10000);
