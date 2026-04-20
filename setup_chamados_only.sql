-- SQL EXCLUSIVO PARA O MÓDULO DE CHAMADOS (TICKETS)
-- Este script cria apenas os recursos necessários para a funcionalidade 'ABRIR CHAMADO'

-- 1. Criação da Tabela de Chamados
CREATE TABLE IF NOT EXISTS public.chamados (
    id SERIAL PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'ABERTO',
    origem VARCHAR(255),
    cliente_nome VARCHAR(255),
    cliente_cpf VARCHAR(11),
    cliente_telefone VARCHAR(20),
    margem DECIMAL(15, 2),
    convenio VARCHAR(255),
    equipe VARCHAR(255),
    descricao TEXT,
    arquivo_rg_frente TEXT,
    arquivo_rg_verso TEXT,
    arquivo_contracheque TEXT,
    arquivo_extrato TEXT,
    arquivo_outros TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.1 Garantir que as colunas de arquivos existam (caso a tabela já tenha sido criada antes)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chamados' AND column_name='arquivo_rg_frente') THEN
        ALTER TABLE public.chamados ADD COLUMN arquivo_rg_frente TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chamados' AND column_name='arquivo_rg_verso') THEN
        ALTER TABLE public.chamados ADD COLUMN arquivo_rg_verso TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chamados' AND column_name='arquivo_contracheque') THEN
        ALTER TABLE public.chamados ADD COLUMN arquivo_contracheque TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chamados' AND column_name='arquivo_extrato') THEN
        ALTER TABLE public.chamados ADD COLUMN arquivo_extrato TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chamados' AND column_name='arquivo_outros') THEN
        ALTER TABLE public.chamados ADD COLUMN arquivo_outros TEXT;
    END IF;
END $$;

-- 2. Configuração do Storage (Observação Importante)
-- Você deve criar manualmente um bucket chamado 'chamados-attachments' no painel do Supabase.
-- Certifique-se de definir o bucket como 'Public' para que os links funcionem.
-- Ou execute o comando abaixo no SQL Editor para criar o bucket e políticas por código:

-- Inserir bucket se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('chamados-attachments', 'chamados-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao Storage
CREATE POLICY "Acesso Público para Visualização" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'chamados-attachments');

CREATE POLICY "Upload para Autenticados" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chamados-attachments');

-- 3. Habilitação de Segurança (RLS)
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;

-- 4. Definição de Permissões de Acesso
GRANT ALL ON TABLE public.chamados TO authenticated;
GRANT ALL ON TABLE public.chamados TO service_role;

-- Permissões para a sequência de ID (necessário para SERIAL/auto-incremento)
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.chamados_id_seq TO authenticated;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.chamados_id_seq TO service_role;

-- 5. Criação de Políticas de Segurança (Policies)
-- Remove políticas pré-existentes para evitar conflitos
DROP POLICY IF EXISTS "Acesso total para autenticados" ON public.chamados;
DROP POLICY IF EXISTS "Permitir tudo para todos" ON public.chamados;
DROP POLICY IF EXISTS "Controle total de chamados para autenticados" ON public.chamados;

-- Política: Usuários autenticados podem ver e gerenciar todos os chamados
CREATE POLICY "Controle total de chamados para autenticados" 
ON public.chamados 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 6. Trigger para atualização automática do campo updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_updated_at_chamados ON public.chamados;
CREATE TRIGGER set_updated_at_chamados
    BEFORE UPDATE ON public.chamados
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
