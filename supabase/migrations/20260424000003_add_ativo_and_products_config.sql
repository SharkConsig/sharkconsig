-- Migration to add 'ativo' column to settings tables and create products config table
ALTER TABLE public.convenios ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;
ALTER TABLE public.bancos ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;
ALTER TABLE public.tipos_operacao ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;
ALTER TABLE public.status_chamados ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;

-- Create table for manageable products and commissions
CREATE TABLE IF NOT EXISTS public.produtos_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    banco_id UUID REFERENCES public.bancos(id) ON DELETE CASCADE,
    convenio_id UUID REFERENCES public.convenios(id) ON DELETE CASCADE,
    operacoes UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(banco_id, convenio_id)
);

-- Enable RLS
ALTER TABLE public.produtos_config ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Acesso total para autenticados" ON public.produtos_config;
CREATE POLICY "Acesso total para autenticados" ON public.produtos_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Ensure authenticated role can access
GRANT ALL ON public.produtos_config TO authenticated;
GRANT ALL ON public.produtos_config TO service_role;
