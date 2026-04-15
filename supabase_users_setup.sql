-- SQL para configurar a gestão de usuários (perfis) no SharkConsig

-- 1. Tabela de Perfis (Usuários do Sistema)
CREATE TABLE IF NOT EXISTS perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'Corretor', -- 'Desenvolvedor', 'Administrador', 'Operacional', 'Supervisor', 'Corretor'
    status VARCHAR(20) DEFAULT 'Ativo', -- 'Ativo', 'Inativo'
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON TABLE perfis TO authenticated, anon, service_role;

-- Criar política (Usando DO block para evitar erro se já existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'perfis' AND policyname = 'Permitir tudo para todos'
    ) THEN
        CREATE POLICY "Permitir tudo para todos" ON perfis FOR ALL USING (true) WITH CHECK (true);
    END IF;
END
$$;

-- Configuração de Storage para Avatares (Referência)
-- Nota: O bucket deve ser criado via Dashboard ou API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- CREATE POLICY "Avatares públicos" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
-- CREATE POLICY "Usuários podem subir seus próprios avatares" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');
