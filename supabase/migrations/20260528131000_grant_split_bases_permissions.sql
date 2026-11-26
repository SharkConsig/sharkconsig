-- Migration: Grant SELECT and ALL permissions on all split base tables to authenticated and anon roles
-- This ensures the custom campaign builder client can estimate audience and fetch lists.

GRANT ALL ON public.base_consulta_siape TO authenticated, anon, service_role;
GRANT ALL ON public.base_consulta_governo_sp TO authenticated, anon, service_role;
GRANT ALL ON public.base_consulta_prefeitura_sp TO authenticated, anon, service_role;
GRANT ALL ON public.base_consulta_governo_pi TO authenticated, anon, service_role;
GRANT ALL ON public.base_consulta_governo_ma TO authenticated, anon, service_role;
