-- =====================================================================
-- CMMS JIMP - Migração 004
-- Projeto: buqfrfphieeahlnxhnpp
--
-- POR QUE ESTA MIGRAÇÃO EXISTE
--   A 003 criou as políticas certas, mas as ANTIGAS continuaram vivas.
--   Políticas de leitura se somam: basta UMA liberar para o acesso passar.
--   Eu tentei derrubar as antigas pelo nome, tirando os nomes do arquivo
--   supabase_schema.sql — que, como já vimos com a coluna photo_url, não
--   descreve fielmente este banco. Os nomes reais eram outros.
--
--   Resultado medido: um usuário SUSPENSO continuava lendo as 5 tabelas
--   e ainda conseguiu INSERIR uma peça.
--
-- O QUE ELA FAZ
--   Varre o catálogo e derruba TODAS as políticas das 5 tabelas, seja
--   qual for o nome, e recria só as corretas. Sem depender de nome
--   nenhum, nem do arquivo de esquema.
--
-- Segura de rodar mais de uma vez. Não apaga dados.
-- =====================================================================

BEGIN;

-- 1. Terra arrasada nas políticas das 5 tabelas
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('equipment','maintenance_orders','parts','settings','profiles')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    RAISE NOTICE 'derrubada: %.%', pol.tablename, pol.policyname;
  END LOOP;
END $$;

-- 2. RLS ligada e o anônimo sem privilégio direto
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['equipment','maintenance_orders','parts','settings','profiles'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
  END LOOP;
END $$;

-- 3. As únicas políticas que passam a existir
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['equipment','maintenance_orders','parts','settings'] LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
      'USING (public.usuario_autorizado()) WITH CHECK (public.usuario_autorizado())',
      t || '_autorizado', t);
  END LOOP;
END $$;

CREATE POLICY "profiles_select_autorizado" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.usuario_autorizado());

CREATE POLICY "profiles_update_proprio_ou_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.usuario_autorizado() AND (auth.uid() = id OR public.is_admin()))
  WITH CHECK (public.usuario_autorizado() AND (auth.uid() = id OR public.is_admin()));

CREATE POLICY "profiles_admin_escreve" ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

COMMIT;
