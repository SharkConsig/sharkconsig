-- Add suspensaoData and suspensaoDias columns to public.hr_advertencias
ALTER TABLE public.hr_advertencias 
ADD COLUMN IF NOT EXISTS "suspensaoData" VARCHAR(100) DEFAULT '',
ADD COLUMN IF NOT EXISTS "suspensaoDias" VARCHAR(50) DEFAULT '';
