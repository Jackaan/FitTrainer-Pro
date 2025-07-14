-- Insert sample workout sessions for the current client
-- This assumes we have the demo client with ID '550e8400-e29b-41d4-a716-446655440002'

-- Insert a current workout session that can be completed
INSERT INTO workout_sessions (id, client_id, plan_id, scheduled_date, status) VALUES
  ('850e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440001', CURRENT_DATE, 'In Progress')
ON CONFLICT (id) DO NOTHING;

-- Insert some completed workout sessions for history
INSERT INTO workout_sessions (id, client_id, plan_id, scheduled_date, completed_date, status, duration_minutes) VALUES
  ('850e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440001', CURRENT_DATE - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day', 'Completed', 45),
  ('850e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440001', CURRENT_DATE - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days', 'Completed', 50),
  ('850e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440001', CURRENT_DATE - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days', 'Completed', 42)
ON CONFLICT (id) DO NOTHING;

-- Insert exercise feedback for the completed sessions
INSERT INTO exercise_feedback (session_id, exercise_id, completed, feedback, actual_sets, actual_reps, actual_weight) VALUES
  ('850e8400-e29b-41d4-a716-446655440011', '650e8400-e29b-41d4-a716-446655440001', true, 'Felt strong today, could do more reps', 3, 12, 135.00),
  ('850e8400-e29b-41d4-a716-446655440011', '650e8400-e29b-41d4-a716-446655440002', true, 'Good form throughout', 3, 15, NULL),
  ('850e8400-e29b-41d4-a716-446655440012', '650e8400-e29b-41d4-a716-446655440001', true, 'Challenging but manageable', 3, 12, 135.00),
  ('850e8400-e29b-41d4-a716-446655440013', '650e8400-e29b-41d4-a716-446655440001', true, 'Great session overall', 3, 12, 135.00)
ON CONFLICT (id) DO NOTHING;
