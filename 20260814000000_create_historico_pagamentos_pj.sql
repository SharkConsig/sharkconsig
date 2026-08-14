-- Create or ensure historico_pagamentos_pj table
CREATE TABLE IF NOT EXISTS public.historico_pagamentos_pj (
    id BIGSERIAL PRIMARY KEY,
    id_lead VARCHAR(255) UNIQUE NOT NULL,
    data_pagamento DATE DEFAULT CURRENT_DATE,
    nome VARCHAR(255),
    valor_operacao NUMERIC(15, 2) DEFAULT 0,
    aliquota_comissao NUMERIC(5, 2) DEFAULT 0,
    comissao_bruta NUMERIC(15, 2) DEFAULT 0,
    proventos NUMERIC(15, 2) DEFAULT 0,
    descontos NUMERIC(15, 2) DEFAULT 0,
    comissao_liquida NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.historico_pagamentos_pj ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT ALL ON public.historico_pagamentos_pj TO authenticated;
GRANT ALL ON public.historico_pagamentos_pj TO anon;
GRANT ALL ON public.historico_pagamentos_pj TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon, service_role;

-- Policies
DROP POLICY IF EXISTS "Acesso total historico_pagamentos_pj autenticados" ON public.historico_pagamentos_pj;
CREATE POLICY "Acesso total historico_pagamentos_pj autenticados" ON public.historico_pagamentos_pj FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total historico_pagamentos_pj anon" ON public.historico_pagamentos_pj;
CREATE POLICY "Acesso total historico_pagamentos_pj anon" ON public.historico_pagamentos_pj FOR ALL TO anon USING (true) WITH CHECK (true);
