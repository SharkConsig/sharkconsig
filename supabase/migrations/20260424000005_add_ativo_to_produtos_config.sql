-- Migration to add 'ativo' column to produtos_config
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos_config' AND column_name='ativo') THEN
    ALTER TABLE public.produtos_config ADD COLUMN ativo BOOLEAN DEFAULT TRUE;
  END IF;
END $$;
