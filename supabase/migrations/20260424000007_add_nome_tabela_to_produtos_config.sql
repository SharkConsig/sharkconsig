-- Migration to add 'nome_tabela' to produtos_config
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos_config' AND column_name='nome_tabela') THEN
    ALTER TABLE public.produtos_config ADD COLUMN nome_tabela TEXT;
  END IF;
END $$;
