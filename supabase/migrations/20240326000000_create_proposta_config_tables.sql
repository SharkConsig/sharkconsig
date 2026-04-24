-- Migration to create configuration tables for propostas
-- Convênios
CREATE TABLE IF NOT EXISTS public.convenios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bancos
CREATE TABLE IF NOT EXISTS public.bancos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tipos de Operação
CREATE TABLE IF NOT EXISTS public.tipos_operacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.convenios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bancos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_operacao ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Acesso total para autenticados" ON public.convenios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total para autenticados" ON public.bancos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total para autenticados" ON public.tipos_operacao FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Initial Data (from constants in propostas/nova/page.tsx)
INSERT INTO public.convenios (nome) VALUES 
('FEDERAL'), 
('FEDERAL CARTÃO BENEFÍCIO'), 
('GOVERNO SP'), 
('GOVERNO SP CARTÃO BENEFÍCIO')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO public.bancos (nome) VALUES 
('AMIGOZ'), ('BANCO BMG'), ('BANCO DIGIO SA.'), 
('BANCO DO BRASIL'), ('NEOCREDITO'), 
('BANCO PAULISTA'), ('BANCO SAFRA'), ('BARU FINANCEIRA'), 
('BRB - CRÉDITO, FINANCIAMENTO E INVESTIMENTO'),
('CAPITAL'), ('FUTURO PREVIDÊNCIA'), ('MEU CASHCARD'), 
('XNBANK')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO public.tipos_operacao (nome) VALUES 
('CARTÃO C/ SAQUE'), 
('MARGEM LIVRE (NOVO)'), 
('CARTÃO COM SAQUE COMPLEMENTAR À VISTA')
ON CONFLICT (nome) DO NOTHING;
