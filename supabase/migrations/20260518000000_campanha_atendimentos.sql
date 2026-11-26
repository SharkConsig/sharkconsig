-- Migration to create campanha_atendimentos table
CREATE TABLE IF NOT EXISTS public.campanha_atendimentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campanha_id UUID REFERENCES public.campanhas(id) ON DELETE CASCADE,
    corretor_id UUID REFERENCES auth.users(id),
    cliente_cpf VARCHAR(11) NOT NULL,
    tabulacao VARCHAR(255),
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.campanha_atendimentos ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Acesso total para autenticados" ON public.campanha_atendimentos
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);
