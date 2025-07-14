-- Update existing training plans to have proper start dates for testing
-- This ensures some plans are visible and some are not

-- Update the demo client's plan to start today (should be visible)
UPDATE training_plans 
SET start_date = CURRENT_DATE,
    end_date = CURRENT_DATE + INTERVAL '4 weeks'
WHERE client_id = '550e8400-e29b-41d4-a716-446655440002' 
AND status = 'Active';

-- Create a future plan that should not be visible (starts in 10 days)
INSERT INTO training_plans (id, coach_id, client_id, name, duration, status, start_date, end_date) VALUES
  ('750e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'Future Advanced Plan', '6 weeks', 'Active', CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '10 days' + INTERVAL '6 weeks')
ON CONFLICT (id) DO NOTHING;

-- Create a plan that starts in 5 days (should be visible)
INSERT INTO training_plans (id, coach_id, client_id, name, duration, status, start_date, end_date) VALUES
  ('750e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'Upcoming Strength Plan', '4 weeks', 'Active', CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '5 days' + INTERVAL '4 weeks')
ON CONFLICT (id) DO NOTHING;
