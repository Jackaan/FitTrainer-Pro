-- Add difficulty and estimated_duration columns to training_plans table
ALTER TABLE training_plans 
ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'Beginner' CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
ADD COLUMN IF NOT EXISTS estimated_duration VARCHAR(20) DEFAULT '45-60';

-- Update existing plans with default values
UPDATE training_plans 
SET difficulty = 'Beginner', estimated_duration = '45-60'
WHERE difficulty IS NULL OR estimated_duration IS NULL;

-- Update some existing plans with different difficulties for variety
UPDATE training_plans 
SET difficulty = 'Intermediate', estimated_duration = '60-75'
WHERE name LIKE '%Advanced%';

UPDATE training_plans 
SET difficulty = 'Advanced', estimated_duration = '75-90'
WHERE name LIKE '%Strength%';
