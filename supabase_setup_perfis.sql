-- ==============================================================================
-- SharkConsig: Tabela 'perfis' vinculada ao Supabase Auth
-- Separação definitiva entre Identidade/Sessão (Auth) e Ficha Cadastral (PostgreSQL)
-- Evita inchaço do token JWT e garante integridade relacional com Risco Zero.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL DEFAULT 'Colaborador',
    email VARCHAR(255),
    username VARCHAR(100),
    funcao VARCHAR(100) DEFAULT 'Corretor',
    role VARCHAR(100) DEFAULT 'Corretor',
    regime_contratacao VARCHAR(50) DEFAULT 'CLT',
    equipe VARCHAR(100) DEFAULT 'Shark',
    supervisor_id UUID,
    supervisor_nome VARCHAR(255),
    padrinho_id VARCHAR(100),
    padrinho_nome VARCHAR(255),
    avatar_url TEXT,
    foto_campanha_url TEXT,
    foto_proposta_url TEXT,
    status VARCHAR(20) DEFAULT 'ATIVO',
    
    -- Campos estendidos de RH e Comunicação Interna
    rh_mensagem_destaque TEXT,
    rh_mensagem_updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Dados complementares (mimos, afinidades, preferências de layout)
    preferencias JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- Índices para Performance e Otimização de Recursos
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_perfis_supervisor_id ON public.perfis(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_perfis_status ON public.perfis(status);
CREATE INDEX IF NOT EXISTS idx_perfis_funcao ON public.perfis(funcao);
CREATE INDEX IF NOT EXISTS idx_perfis_equipe ON public.perfis(equipe);

-- ==============================================================================
-- Trigger para Atualização Automática de updated_at
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at_perfis()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_handle_updated_at_perfis ON public.perfis;
CREATE TRIGGER trigger_handle_updated_at_perfis
    BEFORE UPDATE ON public.perfis
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at_perfis();

-- ==============================================================================
-- Trigger Automático: Novo usuário em auth.users cria linha em public.perfis
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    raw_meta JSONB;
BEGIN
    raw_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    
    INSERT INTO public.perfis (
        id,
        nome,
        email,
        username,
        funcao,
        role,
        regime_contratacao,
        equipe,
        supervisor_id,
        supervisor_nome,
        avatar_url,
        foto_campanha_url,
        foto_proposta_url,
        status,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        COALESCE(raw_meta->>'nome_completo', raw_meta->>'full_name', raw_meta->>'nome', 'Colaborador'),
        NEW.email,
        COALESCE(raw_meta->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(raw_meta->>'funcao', 'Corretor'),
        COALESCE(raw_meta->>'funcao', raw_meta->>'role', 'Corretor'),
        COALESCE(raw_meta->>'regime_contratacao', 'CLT'),
        COALESCE(raw_meta->>'equipe', 'Shark'),
        CASE 
            WHEN raw_meta->>'supervisor_id' ~ '^[0-9a-fA-F-]{36}$' THEN (raw_meta->>'supervisor_id')::uuid 
            ELSE NULL 
        END,
        raw_meta->>'supervisor_nome',
        raw_meta->>'avatar_url',
        raw_meta->>'foto_campanha_url',
        raw_meta->>'foto_proposta_url',
        COALESCE(UPPER(raw_meta->>'status'), 'ATIVO'),
        NEW.created_at,
        NEW.created_at
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        nome = CASE WHEN public.perfis.nome = 'Colaborador' THEN EXCLUDED.nome ELSE public.perfis.nome END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_auth_user();

-- ==============================================================================
-- Povoamento Inicial Seguro (Copia com segurança os usuários já existentes)
-- ==============================================================================
INSERT INTO public.perfis (
    id,
    nome,
    email,
    username,
    funcao,
    role,
    regime_contratacao,
    equipe,
    supervisor_id,
    supervisor_nome,
    padrinho_id,
    padrinho_nome,
    avatar_url,
    foto_campanha_url,
    foto_proposta_url,
    status,
    created_at,
    updated_at
)
SELECT 
    u.id,
    COALESCE(u.raw_user_meta_data->>'nome_completo', u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'nome', 'Colaborador') AS nome,
    u.email,
    COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)) AS username,
    COALESCE(u.raw_user_meta_data->>'funcao', 'Corretor') AS funcao,
    COALESCE(u.raw_user_meta_data->>'funcao', u.raw_user_meta_data->>'role', 'Corretor') AS role,
    COALESCE(u.raw_user_meta_data->>'regime_contratacao', 'CLT') AS regime_contratacao,
    COALESCE(u.raw_user_meta_data->>'equipe', 'Shark') AS equipe,
    CASE 
        WHEN u.raw_user_meta_data->>'supervisor_id' ~ '^[0-9a-fA-F-]{36}$' THEN (u.raw_user_meta_data->>'supervisor_id')::uuid 
        ELSE NULL 
    END AS supervisor_id,
    u.raw_user_meta_data->>'supervisor_nome' AS supervisor_nome,
    u.raw_user_meta_data->>'padrinho_id' AS padrinho_id,
    u.raw_user_meta_data->>'padrinho_nome' AS padrinho_nome,
    u.raw_user_meta_data->>'avatar_url' AS avatar_url,
    u.raw_user_meta_data->>'foto_campanha_url' AS foto_campanha_url,
    u.raw_user_meta_data->>'foto_proposta_url' AS foto_proposta_url,
    COALESCE(UPPER(u.raw_user_meta_data->>'status'), 'ATIVO') AS status,
    u.created_at,
    timezone('utc'::text, now())
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- Políticas de Segurança (Row Level Security - RLS)
-- ==============================================================================
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura de perfis para autenticados" ON public.perfis;
CREATE POLICY "Leitura de perfis para autenticados"
    ON public.perfis FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Atualizacao de perfil proprio" ON public.perfis;
CREATE POLICY "Atualizacao de perfil proprio"
    ON public.perfis FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Acesso total service_role" ON public.perfis;
CREATE POLICY "Acesso total service_role"
    ON public.perfis FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
