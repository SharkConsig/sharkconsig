-- =========================================================================
-- SQL PARA CONFIGURAÇÃO NO SUPABASE - BANCO DE TALENTOS (RH)
-- Execute este script no "SQL Editor" do seu painel do Supabase.
-- =========================================================================

-- 1. Criação/Estruturação da tabela de Banco de Talentos
CREATE TABLE IF NOT EXISTS public.hr_banco_talentos (
    id TEXT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    pronome VARCHAR(50),
    email VARCHAR(255) NOT NULL,
    telefone VARCHAR(50) NOT NULL,
    localizacao TEXT,
    links TEXT,
    
    escolaridade VARCHAR(100) DEFAULT 'Graduação Completa',
    instituicao VARCHAR(255),
    conclusao VARCHAR(100),
    cursos_complementares TEXT,
    idiomas TEXT,
    
    experiencias TEXT,
    tempo_funcao VARCHAR(100),
    setores TEXT,
    atividades_conquistas TEXT,
    
    hard_skills TEXT,
    soft_skills TEXT,
    
    pretensao_salarial VARCHAR(100),
    disponibilidade VARCHAR(100) DEFAULT 'Remoto',
    areas_interesse TEXT,
    vagas_afirmativas VARCHAR(50) DEFAULT 'Não',
    
    processos_anteriores TEXT,
    etapas_alcancadas VARCHAR(100) DEFAULT 'Triagem',
    motivo_desclassificacao TEXT,
    
    -- Campos para anexação de currículos do Supabase Storage Bucket
    curriculo_url TEXT,
    curriculo_name TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Segurança de Linha)
ALTER TABLE public.hr_banco_talentos ENABLE ROW LEVEL SECURITY;

-- Conceder permissões para os papéis de acesso do Supabase
GRANT ALL ON TABLE public.hr_banco_talentos TO authenticated;
GRANT ALL ON TABLE public.hr_banco_talentos TO service_role;
GRANT ALL ON TABLE public.hr_banco_talentos TO anon;

-- Criar política de acesso total livre para testes/produção interna
DROP POLICY IF EXISTS "Acesso total livre para hr_banco_talentos" ON public.hr_banco_talentos;
CREATE POLICY "Acesso total livre para hr_banco_talentos" 
ON public.hr_banco_talentos FOR ALL USING (true) WITH CHECK (true);

-- 2. Configuração do Storage (Bucket dedicado 'curriculos')
-- Insere o bucket 'curriculos' na tabela de storage se ele não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'curriculos', 
    'curriculos', 
    true, 
    5242880, -- Limite de 5MB por arquivo
    ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/jpg', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Configurar políticas de acesso ao Storage (Permitir Upload e Downloads ao público ou usuários autenticados)
DROP POLICY IF EXISTS "Acesso público de leitura no storage de curriculos" ON storage.objects;
CREATE POLICY "Acesso público de leitura no storage de curriculos"
ON storage.objects FOR SELECT
USING (bucket_id = 'curriculos');

DROP POLICY IF EXISTS "Permitir upload/write de curriculos" ON storage.objects;
CREATE POLICY "Permitir upload/write de curriculos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'curriculos');

DROP POLICY IF EXISTS "Permitir delete de curriculos" ON storage.objects;
CREATE POLICY "Permitir delete de curriculos"
ON storage.objects FOR DELETE
USING (bucket_id = 'curriculos');
