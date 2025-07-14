-- Add country field to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS country VARCHAR(2), -- ISO country code
ADD COLUMN IF NOT EXISTS country_name VARCHAR(100);

-- Update existing users with default country (can be changed in profile)
UPDATE users 
SET country = 'SE', country_name = 'Sweden'
WHERE country IS NULL;
