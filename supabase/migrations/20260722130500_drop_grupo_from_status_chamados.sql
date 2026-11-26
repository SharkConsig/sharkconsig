-- Migration to revert adding 'grupo' column from status_chamados table
ALTER TABLE public.status_chamados DROP COLUMN IF EXISTS grupo;
