-- ==============================================================================
-- EcoCoin Initial Seed Data (database/seed.sql)
-- ==============================================================================

-- 1. Departments
INSERT INTO public.departments (id, name, code, building, total_eco_coins, total_kg_diverted) VALUES
('d1111111-1111-1111-1111-111111111111', 'Computer Science & AI', 'CS', 'Turing Hall', 14250, 485.50),
('d2222222-2222-2222-2222-222222222222', 'Mechanical & Materials Eng', 'MME', 'Edison Complex', 11890, 412.30),
('d3333333-3333-3333-3333-333333333333', 'Environmental & Earth Sciences', 'EES', 'Carson Pavilion', 18640, 620.80),
('d4444444-4444-4444-4444-444444444444', 'Business & Economics', 'BUS', 'Smith Hall', 9530, 310.20),
('d5555555-5555-5555-5555-555555555555', 'Life Sciences & Biotech', 'BIO', 'Franklin Labs', 13200, 440.00)
ON CONFLICT (name) DO NOTHING;

-- 2. Smart Campus Bins (Digital Twin initial deployment)
INSERT INTO public.bins (id, bin_code, name, category, campus_zone, building, floor, latitude, longitude, fill_level_pct, capacity_liters, battery_level_pct, status, last_collected_at) VALUES
('b1111111-1111-1111-1111-111111111111', 'BIN-CAMPUS-001', 'Turing Plaza Plastic Hub', 'plastic', 'North Quad', 'Turing Hall', 'Ground Level', 37.7749, -122.4194, 38, 120, 94, 'NORMAL', NOW() - INTERVAL '4 hours'),
('b2222222-2222-2222-2222-222222222222', 'BIN-CAMPUS-002', 'Library West Paper Depot', 'paper', 'Central Quad', 'Main Library', '1st Floor', 37.7755, -122.4182, 82, 240, 88, 'NEAR_FULL', NOW() - INTERVAL '18 hours'),
('b3333333-3333-3333-3333-333333333333', 'BIN-CAMPUS-003', 'Student Union Can & Metal Vault', 'metal', 'Student Life Zone', 'Student Union', 'Food Court', 37.7738, -122.4175, 45, 120, 99, 'NORMAL', NOW() - INTERVAL '2 hours'),
('b4444444-4444-4444-4444-444444444444', 'BIN-CAMPUS-004', 'Edison Cafe Glass Return', 'glass', 'Engineering Zone', 'Edison Complex', 'Courtyard', 37.7761, -122.4165, 94, 90, 76, 'FULL', NOW() - INTERVAL '26 hours'),
('b5555555-5555-5555-5555-555555555555', 'BIN-CAMPUS-005', 'Carson Pavilion Organic Compost', 'organic', 'Science Quad', 'Carson Pavilion', 'Greenhouse Entry', 37.7768, -122.4201, 62, 180, 91, 'NORMAL', NOW() - INTERVAL '6 hours'),
('b6666666-6666-6666-6666-666666666666', 'BIN-CAMPUS-006', 'Dormitory Quad Multi-Stream Station', 'multi-stream', 'Residential Village', 'Oak Hall', 'Lobby', 37.7731, -122.4212, 22, 360, 95, 'NORMAL', NOW() - INTERVAL '1 hour'),
('b7777777-7777-7777-7777-777777777777', 'BIN-CAMPUS-007', 'Athletics Center Hydration & Bottle Drop', 'plastic', 'Athletics Complex', 'Field House', 'Gate 2', 37.7720, -122.4188, 79, 150, 83, 'NEAR_FULL', NOW() - INTERVAL '12 hours'),
('b8888888-8888-8888-8888-888888888888', 'BIN-CAMPUS-008', 'Arts Workshop Scrap & General Hub', 'general', 'Arts District', 'Sculpture Hall', 'Loading Bay', 37.7742, -122.4225, 15, 200, 65, 'MAINTENANCE', NOW() - INTERVAL '3 days')
ON CONFLICT (bin_code) DO NOTHING;

-- 3. Rewards Catalog (Campus Vouchers)
INSERT INTO public.rewards (id, title, description, category, cost_coins, sponsor, discount_value, terms, stock_available, is_active) VALUES
('f1111111-1111-1111-1111-111111111111', 'Campus Cafe 50% Off Espresso/Matcha', 'Get half off any specialty handcrafted beverage at all campus cafe locations.', 'food', 80, 'Campus Dining Services', '50% OFF', 'Valid for 1 beverage per visit. Show code at checkout.', 150, true),
('f2222222-2222-2222-2222-222222222222', 'Library Print Station 50 Free Pages', 'Add 50 color or monochrome printing credits directly to your student ID card.', 'printing', 120, 'University Library Systems', '50 PAGES', 'Redeemable at any campus printing terminal.', 500, true),
('f3333333-3333-3333-3333-333333333333', 'Campus Bookstore 20% Voucher', 'Receive 20% off all university apparel, supplies, and reusable drinkware.', 'merchandise', 250, 'University Co-Op Store', '20% OFF', 'Excludes required course textbooks. One-time use.', 85, true),
('f4444444-4444-4444-4444-444444444444', 'EcoCoin Insulated Stainless Steel Bottle', 'Premium double-wall insulated 750ml flask with custom college crest engraving.', 'sustainable_gear', 400, 'Sustainability Council', 'FREE ITEM', 'Pick up at Student Union Room 204 with redemption code.', 32, true),
('f5555555-5555-5555-5555-555555555555', 'Semester Campus Bike Share Pass', 'Unlimited 45-minute rides on the green campus e-bike network for the remainder of term.', 'transport', 600, 'Campus Transportation Office', 'FREE PASS', 'Requires student verification and safety waiver.', 18, true)
ON CONFLICT DO NOTHING;
