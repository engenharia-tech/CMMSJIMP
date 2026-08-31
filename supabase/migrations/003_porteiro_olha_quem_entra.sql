-- =====================================================================
-- CMMS JIMP - Migração 003
-- Projeto: buqfrfphieeahlnxhnpp
--
-- A 002 pôs um porteiro na PORTA DE ENTRADA: ninguém nasce sem convite.
-- Mas quem já tinha crachá continuava entrando mesmo saindo da lista.
--
-- Esta migração faz o porteiro conferir o crachá A CADA CONSULTA.
-- Tirar alguém da lista (ou desmarcar 'ativo') corta o acesso na hora,
-- sem precisar apagar a conta.
--
-- Segura de rodar mais de uma vez. Não apaga dados.
-- =====================================================================

BEGIN;

-- Poder suspender sem apagar: o histórico de quem foi autorizado fica.
ALTER TABLE public.usuarios_autorizados
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;

-- ---------------------------------------------------------------------
-- O CRACHÁ
-- Casa o usuário logado com a lista PELO E-MAIL do auth.users, e não
-- por profiles: assim, mexer no perfil não concede acesso a ninguém.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.usuario_autorizado()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $fn$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    JOIN public.usuarios_autorizados a
      ON a.email = lower(trim(u.email))
    WHERE u.id = auth.uid()
      AND a.ativo
  );
$fn$;

GRANT EXECUTE ON FUNCTION public.usuario_autorizado() TO authenticated;

-- Admin suspenso deixa de ser admin.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $fn$
  SELECT public.usuario_autorizado() AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$fn$;

-- ---------------------------------------------------------------------
-- TODA TABELA PASSA A EXIGIR O CRACHÁ
-- ---------------------------------------------------------------------

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['equipment','maintenance_orders','parts','settings'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_autorizado', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
      'USING (public.usuario_autorizado()) WITH CHECK (public.usuario_autorizado())',
      t || '_autorizado', t);

    -- derruba as politicas antigas, que liberavam para qualquer logado
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated users to read %s"   ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated users to insert %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated users to update %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated users to delete %s" ON public.%I', t, t);
  END LOOP;
END $$;

-- 'orders' era o sufixo usado nas politicas antigas de maintenance_orders
DROP POLICY IF EXISTS "Allow authenticated users to read orders"   ON public.maintenance_orders;
DROP POLICY IF EXISTS "Allow authenticated users to insert orders" ON public.maintenance_orders;
DROP POLICY IF EXISTS "Allow authenticated users to update orders" ON public.maintenance_orders;
DROP POLICY IF EXISTS "Allow authenticated users to delete orders" ON public.maintenance_orders;

-- profiles: cada um se vê e se edita; o resto da lista, só quem tem crachá
DROP POLICY IF EXISTS "profiles_select_autenticado"      ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_proprio_ou_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_total"             ON public.profiles;

CREATE POLICY "profiles_select_autorizado" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.usuario_autorizado());

CREATE POLICY "profiles_update_proprio_ou_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.usuario_autorizado() AND (auth.uid() = id OR public.is_admin()));

CREATE POLICY "profiles_admin_total" ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------
-- O APP PERGUNTA "AINDA POSSO ENTRAR?"
-- Sem isto, o suspenso veria a tela abrir e tudo vazio, sem entender.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.meu_acesso()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $fn$
  SELECT public.usuario_autorizado();
$fn$;

REVOKE ALL ON FUNCTION public.meu_acesso() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.meu_acesso() TO authenticated;

COMMIT;
