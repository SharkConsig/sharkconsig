-- Fix permissions for GOVBR tables
-- Sometimes tables created via migrations need explicit grants for the authenticated role

GRANT ALL ON public.governo_br_clientes TO authenticated, anon, service_role;
GRANT ALL ON public.governo_br_matriculas TO authenticated, anon, service_role;
GRANT ALL ON public.governo_br_instituidores TO authenticated, anon, service_role;

-- Ensure RLS is enabled and policies exist (redundancy to ensure consistency)
DO $$ 
BEGIN
    -- For governo_br_clientes
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'governo_br_clientes' AND policyname = 'Acesso total governo_br_clientes') THEN
        ALTER TABLE public.governo_br_clientes ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Acesso total governo_br_clientes" ON public.governo_br_clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    -- For governo_br_matriculas
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'governo_br_matriculas' AND policyname = 'Acesso total governo_br_matriculas') THEN
        ALTER TABLE public.governo_br_matriculas ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Acesso total governo_br_matriculas" ON public.governo_br_matriculas FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    -- For governo_br_instituidores
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'governo_br_instituidores' AND policyname = 'Acesso total governo_br_instituidores') THEN
        ALTER TABLE public.governo_br_instituidores ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Acesso total governo_br_instituidores" ON public.governo_br_instituidores FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;
