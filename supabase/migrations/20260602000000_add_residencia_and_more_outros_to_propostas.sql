-- Add new attachment columns to propostas: Comprovante de Residência and two extra outros files
ALTER TABLE public.propostas 
ADD COLUMN IF NOT EXISTS arquivo_residencia TEXT,
ADD COLUMN IF NOT EXISTS arquivo_outros_3 TEXT,
ADD COLUMN IF NOT EXISTS arquivo_outros_4 TEXT;
