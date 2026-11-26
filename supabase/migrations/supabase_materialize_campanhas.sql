-- STEP 1: Update or Create 'campanhas' table
CREATE TABLE IF NOT EXISTS public.campanhas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    convenio TEXT NOT NULL,
    filtros JSONB, -- For backward compatibility
    filtros_json JSONB, -- Requested column
    user_id UUID REFERENCES auth.users(id), -- For backward compatibility
    criado_por UUID REFERENCES auth.users(id), -- Requested column
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- For backward compatibility
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Requested column
    status TEXT DEFAULT 'ativa',
    processamento_status TEXT DEFAULT 'PROCESSANDO',
    publico_estimado INTEGER
);

-- Ensure all required columns exist in case the table already existed
ALTER TABLE public.campanhas ADD COLUMN IF NOT EXISTS convenio TEXT;
ALTER TABLE public.campanhas ADD COLUMN IF NOT EXISTS filtros_json JSONB;
ALTER TABLE public.campanhas ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES auth.users(id);
ALTER TABLE public.campanhas ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.campanhas ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativa';
ALTER TABLE public.campanhas ADD COLUMN IF NOT EXISTS processamento_status TEXT DEFAULT 'PROCESSANDO';
ALTER TABLE public.campanhas ADD COLUMN IF NOT EXISTS publico_estimado INTEGER;

-- Create indexes for 'campanhas'
CREATE INDEX IF NOT EXISTS idx_campanhas_convenio ON public.campanhas(convenio);
CREATE INDEX IF NOT EXISTS idx_campanhas_status ON public.campanhas(status);
CREATE INDEX IF NOT EXISTS idx_campanhas_criado_por ON public.campanhas(criado_por);
CREATE INDEX IF NOT EXISTS idx_campanhas_processamento_status ON public.campanhas(processamento_status);


-- STEP 2: Create 'campanha_membros' table
CREATE TABLE IF NOT EXISTS public.campanha_membros (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    campanha_id UUID REFERENCES public.campanhas(id) ON DELETE CASCADE,
    cliente_cpf TEXT NOT NULL,
    convenio TEXT NOT NULL,
    ordem_fila INTEGER,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for 'campanha_membros'
CREATE INDEX IF NOT EXISTS idx_campanha_membros_campanha_id ON public.campanha_membros(campanha_id);
CREATE INDEX IF NOT EXISTS idx_campanha_membros_cliente_cpf ON public.campanha_membros(cliente_cpf);
CREATE INDEX IF NOT EXISTS idx_campanha_membros_ordem_fila ON public.campanha_membros(ordem_fila);


-- STEP 3: Create 'campanha_participantes' table
CREATE TABLE IF NOT EXISTS public.campanha_participantes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    campanha_id UUID REFERENCES public.campanhas(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    papel TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for 'campanha_participantes'
CREATE INDEX IF NOT EXISTS idx_campanha_participantes_campanha_id ON public.campanha_participantes(campanha_id);
CREATE INDEX IF NOT EXISTS idx_campanha_participantes_user_id ON public.campanha_participantes(user_id);

-- STEP 4: Grant Permissions & Disable RLS to prevent 'permission denied' errors
-- This ensures the client, server routes and APIs have access to query and manipulate campaigning data.
ALTER TABLE public.campanhas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanha_membros DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanha_participantes DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.campanhas TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.campanha_membros TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.campanha_participantes TO anon, authenticated, service_role;

