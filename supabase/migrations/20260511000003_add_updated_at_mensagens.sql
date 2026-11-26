-- Adicionar coluna updated_at na tabela mensagens_chamado caso não exista
-- Isso resolve o erro "Could not find the 'updated_at' column"

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mensagens_chamado' AND column_name='updated_at') THEN
        ALTER TABLE public.mensagens_chamado ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Garantir que o trigger de atualização automática exista
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_updated_at_mensagens ON public.mensagens_chamado;
CREATE TRIGGER set_updated_at_mensagens
    BEFORE UPDATE ON public.mensagens_chamado
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
