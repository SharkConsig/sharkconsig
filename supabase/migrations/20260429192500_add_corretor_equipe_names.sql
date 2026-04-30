-- Migration: Add brokerage and team names to propostas
-- This allows storing the names at the time of creation for easy display and historical record

ALTER TABLE public.propostas 
ADD COLUMN IF NOT EXISTS corretor TEXT,
ADD COLUMN IF NOT EXISTS equipe TEXT;
