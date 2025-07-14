-- Insert sample users
INSERT INTO users (id, email, name, role) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'coach@example.com', 'John Coach', 'coach'),
  ('550e8400-e29b-41d4-a716-446655440002', 'client@example.com', 'Jane Client', 'client'),
  ('550e8400-e29b-41d4-a716-446655440003', 'sarah.smith@example.com', 'Sarah Smith', 'client'),
  ('550e8400-e29b-41d4-a716-446655440004', 'mike.johnson@example.com', 'Mike Johnson', 'client')
ON CONFLICT (email) DO NOTHING;

-- Insert sample exercises
INSERT INTO exercises (id, coach_id, name, category, type, description, image_url) VALUES
  ('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Barbell Squat', 'Legs', 'Weighted', 'A compound exercise targeting quadriceps, hamstrings, and glutes.', '/placeholder.svg?height=200&width=300'),
  ('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Push-ups', 'Chest', 'Bodyweight', 'Classic upper body exercise targeting chest, shoulders, and triceps.', '/placeholder.svg?height=200&width=300'),
  ('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Running', 'Cardio', 'Cardio', 'Cardiovascular exercise for endurance and fat burning.', '/placeholder.svg?height=200&width=300'),
  ('650e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'Deadlift', 'Back', 'Weighted', 'Compound exercise targeting posterior chain muscles.', '/placeholder.svg?height=200&width=300'),
  ('650e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', 'Plank', 'Core', 'Bodyweight', 'Isometric core strengthening exercise.', '/placeholder.svg?height=200&width=300'),
  ('650e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440001', 'Bench Press', 'Chest', 'Weighted', 'Strength exercise for chest, shoulders, and triceps.', '/placeholder.svg?height=200&width=300'),
  ('650e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440001', 'Pull-ups', 'Back', 'Bodyweight', 'Upper body exercise for back and biceps.', '/placeholder.svg?height=200&width=300'),
  ('650e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440001', 'Overhead Press', 'Shoulders', 'Weighted', 'Compound exercise for shoulders and triceps.', '/placeholder.svg?height=200&width=300'),
  ('650e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440001', 'Lunges', 'Legs', 'Bodyweight', 'Unilateral leg exercise for quadriceps, hamstrings, and glutes.', '/placeholder.svg?height=200&width=300'),
  ('650e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440001', 'Barbell Row', 'Back', 'Weighted', 'Compound exercise for back thickness.', '/placeholder.svg?height=200&width=300'),
  ('650e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 'Dips', 'Chest', 'Bodyweight', 'Upper body exercise for chest, shoulders, and triceps.', '/placeholder.svg?height=200&width=300'),
  ('650e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', 'Bicep Curls', 'Arms', 'Weighted', 'Isolation exercise for biceps.', '/placeholder.svg?height=200&width=300'),
  ('650e8400-e29b-41d4-a716-4466554400013', '550e8400-e29b-41d4-a716-446655440001', 'Tricep Extensions', 'Arms', 'Weighted', 'Isolation exercise for triceps.', '/placeholder.svg?height=200&width=300'),
  ('650e8400-e29b-41d4-a716-4466554400014', '550e8400-e29b-41d4-a716-446655440001', 'Calf Raises', 'Legs', 'Weighted', 'Isolation exercise for calves.', '/placeholder.svg?height=200&width=300'),
  ('650e8400-e29b-41d4-a716-4466554400015', '550e8400-e29b-41d4-a716-446655440001', 'Crunches', 'Core', 'Bodyweight', 'Core exercise for abdominal muscles.', '/placeholder.svg?height=200&width=300')
ON CONFLICT (id) DO NOTHING;

-- Insert sample training plans
INSERT INTO training_plans (id, coach_id, client_id, name, duration, status, start_date, end_date) VALUES
  ('750e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'Beginner Full Body', '4 weeks', 'Active', '2024-01-15', '2024-02-12'),
  ('750e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', 'Advanced Strength', '6 weeks', 'Active', '2024-01-10', '2024-02-21'),
  ('750e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', 'Weight Loss Program', '8 weeks', 'Completed', '2023-12-01', '2024-01-26')
ON CONFLICT (id) DO NOTHING;

-- Insert sample plan exercises
INSERT INTO plan_exercises (plan_id, exercise_id, sets, reps, weight, rest_seconds, tempo, order_index) VALUES
  ('750e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', 3, 12, 135.00, 90, '2-1-2-1', 1),
  ('750e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440002', 3, 15, NULL, 60, '2-0-2-0', 2),
  ('750e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440004', 3, 10, 185.00, 120, '2-1-2-1', 3)
ON CONFLICT (id) DO NOTHING;

-- Insert sample workout sessions
INSERT INTO workout_sessions (id, client_id, plan_id, scheduled_date, status) VALUES
  ('850e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440001', CURRENT_DATE, 'Scheduled'),
  ('850e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440001', CURRENT_DATE + INTERVAL '2 days', 'Scheduled'),
  ('850e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440001', CURRENT_DATE - INTERVAL '1 day', 'Completed')
ON CONFLICT (id) DO NOTHING;

-- Insert sample invoices
INSERT INTO invoices (coach_id, client_id, amount, sessions_count, status, due_date) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 400.00, 8, 'Paid', '2024-01-15'),
  ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', 600.00, 12, 'Pending', '2024-01-20'),
  ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', 300.00, 6, 'Overdue', '2024-01-10')
ON CONFLICT (id) DO NOTHING;
