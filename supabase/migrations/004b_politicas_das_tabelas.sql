-- 004b - as 4 tabelas de dados: so quem tem cracha.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['equipment','maintenance_orders','parts','settings'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.usuario_autorizado()) WITH CHECK (public.usuario_autorizado())', t||'_autorizado', t);
  END LOOP;
END $$;
