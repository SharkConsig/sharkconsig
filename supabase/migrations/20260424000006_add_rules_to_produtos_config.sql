-- Migration to add commission rules to produtos_config
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos_config' AND column_name='prazo') THEN
    ALTER TABLE public.produtos_config ADD COLUMN prazo INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos_config' AND column_name='coeficiente') THEN
    ALTER TABLE public.produtos_config ADD COLUMN coeficiente DECIMAL(10, 6);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos_config' AND column_name='percentual_producao') THEN
    ALTER TABLE public.produtos_config ADD COLUMN percentual_producao DECIMAL(5, 2);
  END IF;
END $$;
