-- Migração para garantir que a tabela chamados use a coluna 'content' para a descrição principal
-- e manter a compatibilidade se 'descricao' existir.

DO $$ 
BEGIN 
    -- Se 'descricao' existe e 'content' não existe, renomeia
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chamados' AND column_name='descricao') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chamados' AND column_name='content') THEN
        ALTER TABLE public.chamados RENAME COLUMN descricao TO content;
    END IF;

    -- Se nenhum dos dois existe (improvável), cria 'content'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chamados' AND column_name='content') THEN
        ALTER TABLE public.chamados ADD COLUMN content TEXT;
    END IF;
END $$;
