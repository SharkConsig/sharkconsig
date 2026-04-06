-- Create campanhas table
CREATE TABLE IF NOT EXISTS public.campanhas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    filtros JSONB NOT NULL,
    publico_estimado INTEGER DEFAULT 0,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Acesso total para autenticados" ON public.campanhas
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);
