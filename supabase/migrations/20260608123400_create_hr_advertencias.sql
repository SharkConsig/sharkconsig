-- Create hr_advertencias table
CREATE TABLE IF NOT EXISTS public.hr_advertencias (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "collaboratorName" VARCHAR(255) NOT NULL,
    verbal VARCHAR(20) DEFAULT '',
    "verbalDate" VARCHAR(50) DEFAULT '',
    escrita VARCHAR(20) DEFAULT '',
    "escritaDate" VARCHAR(50) DEFAULT '',
    quantidade VARCHAR(50) DEFAULT '',
    suspensao VARCHAR(20) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fix permissions for hr_advertencias table
GRANT ALL ON TABLE public.hr_advertencias TO authenticated;
GRANT ALL ON TABLE public.hr_advertencias TO anon;
GRANT ALL ON TABLE public.hr_advertencias TO service_role;

-- Ensure RLS is enabled
ALTER TABLE public.hr_advertencias ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and recreate
DROP POLICY IF EXISTS "Acesso total para todos" ON public.hr_advertencias;

CREATE POLICY "Acesso total para todos" ON public.hr_advertencias
    FOR ALL USING (true) WITH CHECK (true);
