ALTER TABLE public.produtos_config ADD COLUMN regras JSONB DEFAULT '[]'::jsonb;
