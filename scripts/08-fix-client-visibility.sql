-- Ensure the demo client has a proper active plan starting today
UPDATE training_plans 
SET start_date = CURRENT_DATE,
    end_date = CURRENT_DATE + INTERVAL '4 weeks',
    status = 'Active'
WHERE client_id = '550e8400-e29b-41d4-a716-446655440002' 
AND name = 'Beginner Full Body';

-- Create a workout session for today if it doesn't exist
INSERT INTO workout_sessions (client_id, plan_id, scheduled_date, status) 
SELECT 
  '550e8400-e29b-41d4-a716-446655440002',
  tp.id,
  CURRENT_DATE,
  'Scheduled'
FROM training_plans tp
WHERE tp.client_id = '550e8400-e29b-41d4-a716-446655440002'
  AND tp.status = 'Active'
  AND tp.start_date <= CURRENT_DATE
  AND NOT EXISTS (
    SELECT 1 FROM workout_sessions ws 
    WHERE ws.client_id = '550e8400-e29b-41d4-a716-446655440002' 
    AND ws.scheduled_date = CURRENT_DATE
  )
LIMIT 1;

-- Update the upcoming plan to start in 3 days (should be visible)
UPDATE training_plans 
SET start_date = CURRENT_DATE + INTERVAL '3 days',
    end_date = CURRENT_DATE + INTERVAL '3 days' + INTERVAL '4 weeks'
WHERE id = '750e8400-e29b-41d4-a716-446655440011';
