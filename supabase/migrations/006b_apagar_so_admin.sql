-- 006b - apagar equipamento, ordem ou peca passa a ser so do admin.
-- Antes, qualquer pessoa autorizada apagava. Medido: um operador apagou
-- um equipamento. Ler, criar e editar seguem liberados - o trabalho do
-- dia a dia nao muda.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['equipment','maintenance_orders','parts'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_autorizado', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.usuario_autorizado())', t||'_ler', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.usuario_autorizado())', t||'_criar', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.usuario_autorizado()) WITH CHECK (public.usuario_autorizado())', t||'_editar', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_admin())', t||'_apagar', t);
  END LOOP;
END $$;
