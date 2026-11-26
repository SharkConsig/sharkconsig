-- Reverter a alteração da coluna content para descricao na tabela chamados
-- O usuário confirmou que a descrição principal deve ficar em 'descricao'

DO $$ 
BEGIN 
    -- Se 'content' existe e 'descricao' não existe, renomeia de volta
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chamados' AND column_name='content') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chamados' AND column_name='descricao') THEN
        ALTER TABLE public.chamados RENAME COLUMN content TO descricao;
    END IF;

    -- Se 'descricao' não existe por algum motivo, cria
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chamados' AND column_name='descricao') THEN
        ALTER TABLE public.chamados ADD COLUMN descricao TEXT;
    END IF;
    
    -- Se 'content' ainda existe (não foi renomeado porque descricao já existia), deixa lá 
    -- ou remove se não for usado. O usuário disse que no mensagens_chamado é content.
    -- Vamos garantir que em mensagens_chamado seja content.
END $$;
