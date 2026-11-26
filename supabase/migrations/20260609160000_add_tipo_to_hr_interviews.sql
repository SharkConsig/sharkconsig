-- Migration to add 'tipo' column to hr_interviews
ALTER TABLE hr_interviews ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'ENTREVISTAS';
