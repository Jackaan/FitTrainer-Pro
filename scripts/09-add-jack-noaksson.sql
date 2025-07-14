-- Add Jack Noaksson as a client user
INSERT INTO users (id, email, name, role, workouts_per_week) VALUES
  ('550e8400-e29b-41d4-a716-446655440010', 'jack.noaksson@example.com', 'Jack Noaksson', 'client', 3)
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name;

-- Create a training plan for Jack that started yesterday
INSERT INTO training_plans (id, coach_id, client_id, name, duration, status, difficulty, estimated_duration, start_date, end_date) VALUES
  ('750e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440010', 'Jack''s Strength Program', '6 weeks', 'Active', 'Intermediate', '60-75', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE - INTERVAL '1 day' + INTERVAL '6 weeks')
ON CONFLICT (id) DO UPDATE SET 
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  status = EXCLUDED.status;

-- Add some exercises to Jack's plan
INSERT INTO plan_exercises (plan_id, exercise_id, sets, reps, weight, rest_seconds, tempo, order_index) VALUES
  ('750e8400-e29b-41d4-a716-446655440020', '650e8400-e29b-41d4-a716-446655440001', 4, 8, 160.00, 120, '3-1-2-1', 1),
  ('750e8400-e29b-41d4-a716-446655440020', '650e8400-e29b-41d4-a716-446655440004', 4, 6, 200.00, 180, '3-1-3-1', 2),
  ('750e8400-e29b-41d4-a716-446655440020', '650e8400-e29b-41d4-a716-446655440002', 3, 12, NULL, 90, '2-0-2-0', 3)
ON CONFLICT (id) DO NOTHING;

-- Create a workout session for Jack for today
INSERT INTO workout_sessions (client_id, plan_id, scheduled_date, status) VALUES
  ('550e8400-e29b-41d4-a716-446655440010', '750e8400-e29b-41d4-a716-446655440020', CURRENT_DATE, 'Scheduled')
ON CONFLICT DO NOTHING;
