-- SQL DE CRIAÇÃO PARA O MÓDULO DE ENTREVISTAS (RH)
-- Execute este script no SQL Editor do seu painel do Supabase para criar a tabela.

-- ==========================================================
-- OPÇÃO 1 (PRIMÁRIA): Schema customizado 'rh'
-- ==========================================================
CREATE SCHEMA IF NOT EXISTS rh;

CREATE TABLE IF NOT EXISTS rh.hr_interviews (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    fase TEXT NOT NULL DEFAULT 'Entrevista',
    plataforma TEXT NOT NULL DEFAULT 'Instagram',
    area TEXT NOT NULL DEFAULT 'Comercial',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE rh.hr_interviews ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE rh.hr_interviews TO anon;
GRANT ALL ON TABLE rh.hr_interviews TO authenticated;
GRANT ALL ON TABLE rh.hr_interviews TO service_role;

DROP POLICY IF EXISTS "Acesso total livre para hr_interviews" ON rh.hr_interviews;
CREATE POLICY "Acesso total livre para hr_interviews" 
ON rh.hr_interviews FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION rh.update_hr_interviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_hr_interviews_updated_at ON rh.hr_interviews;
CREATE TRIGGER trigger_update_hr_interviews_updated_at
    BEFORE UPDATE ON rh.hr_interviews
    FOR EACH ROW
    EXECUTE FUNCTION rh.update_hr_interviews_updated_at();

-- ==========================================================
-- OPÇÃO 2 (AUTO-FALLBACK): Tabela no Schema 'public'
-- (Necessária se o seu Supabase não expuser o schema 'rh' na API)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.hr_interviews (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    fase TEXT NOT NULL DEFAULT 'Entrevista',
    plataforma TEXT NOT NULL DEFAULT 'Instagram',
    area TEXT NOT NULL DEFAULT 'Comercial',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.hr_interviews ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.hr_interviews TO anon;
GRANT ALL ON TABLE public.hr_interviews TO authenticated;
GRANT ALL ON TABLE public.hr_interviews TO service_role;

DROP POLICY IF EXISTS "Acesso total livre para hr_interviews" ON public.hr_interviews;
CREATE POLICY "Acesso total livre para hr_interviews" 
ON public.hr_interviews FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_hr_interviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_hr_interviews_updated_at ON public.hr_interviews;
CREATE TRIGGER trigger_update_hr_interviews_updated_at
    BEFORE UPDATE ON public.hr_interviews
    FOR EACH ROW
    EXECUTE FUNCTION public.update_hr_interviews_updated_at();

