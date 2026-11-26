-- SQL para garantir a existência e permissões da tabela mensagens_chamado
-- A tabela mensagens_chamado é o coração do chat dos chamados

CREATE TABLE IF NOT EXISTS public.mensagens_chamado (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chamado_id INTEGER NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    user_nome TEXT,
    user_role TEXT,
    user_avatar TEXT,
    content TEXT,
    action TEXT DEFAULT 'respondeu',
    attachments JSONB DEFAULT '[]'::jsonb,
    status_change JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.mensagens_chamado ENABLE ROW LEVEL SECURITY;

-- Permissões
GRANT ALL ON TABLE public.mensagens_chamado TO authenticated;
GRANT ALL ON TABLE public.mensagens_chamado TO service_role;

-- Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Acesso total para autenticados" ON public.mensagens_chamado;
DROP POLICY IF EXISTS "Controle total de mensagens para autenticados" ON public.mensagens_chamado;

-- Criar política de acesso total para usuários autenticados
-- Nota: Em um ambiente de produção real, você pode querer restringir quem pode editar/deletar mensagens,
-- mas aqui estamos permitindo acesso total para simplificar a colaboração entre corretor e operacional.
CREATE POLICY "Controle total de mensagens para autenticados" 
ON public.mensagens_chamado 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Trigger para atualização automática do campo updated_at
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
