-- Add profile fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS height_cm INTEGER,
ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS fitness_goal TEXT,
ADD COLUMN IF NOT EXISTS workouts_per_week INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);

-- Update existing users with default workout preferences
UPDATE users 
SET workouts_per_week = 3 
WHERE workouts_per_week IS NULL;
