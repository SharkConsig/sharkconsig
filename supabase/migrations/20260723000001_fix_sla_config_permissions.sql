-- Fix permissions and RLS policies for sla_config table
ALTER TABLE public.sla_config DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.sla_config TO authenticated;
GRANT ALL ON TABLE public.sla_config TO anon;
GRANT ALL ON TABLE public.sla_config TO service_role;
GRANT ALL ON TABLE public.sla_config TO public;


