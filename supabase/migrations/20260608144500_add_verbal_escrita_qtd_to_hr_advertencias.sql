-- Add verbalQtd and escritaQtd columns to hr_advertencias
ALTER TABLE public.hr_advertencias 
ADD COLUMN IF NOT EXISTS "verbalQtd" VARCHAR(50) DEFAULT '',
ADD COLUMN IF NOT EXISTS "escritaQtd" VARCHAR(50) DEFAULT '';
