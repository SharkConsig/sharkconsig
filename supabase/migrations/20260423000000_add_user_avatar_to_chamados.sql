-- Migration to add user_avatar column to chamados table
ALTER TABLE public.chamados 
ADD COLUMN IF NOT EXISTS user_avatar TEXT;

-- Comment for record
COMMENT ON COLUMN public.chamados.user_avatar IS 'Avatar do usuário que abriu o chamado';
