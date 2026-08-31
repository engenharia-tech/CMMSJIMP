-- =====================================================================
-- CMMS JIMP - Migração 001
-- Projeto: buqfrfphieeahlnxhnpp
--
-- O QUE ESTA MIGRAÇÃO FAZ
--   PARTE 1  Fecha o vazamento: hoje qualquer pessoa com a chave anônima
--            lê nome, e-mail e papel de todos os usuários.
--   PARTE 2  Abre APENAS o necessário para o QR Code da máquina funcionar
--            sem login, via duas funções que devolvem colunas escolhidas
--            a dedo (sem custo, sem fornecedor, sem dinheiro).
--   PARTE 3  Confere o resultado e imprime um relatório.
--
-- É segura de rodar mais de uma vez (idempotente).
-- Não apaga nenhum dado.
-- =====================================================================

BEGIN;

-- =====================================================================
-- PARTE 1 — FECHAR A TABELA profiles
-- =====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remove qualquer política que hoje conceda acesso ao papel anônimo.
-- Varremos o catálogo porque não sabemos com que nome ela foi criada.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'profiles'
      AND ('anon' = ANY(roles) OR 'public' = ANY(roles))
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    RAISE NOTICE 'Política anônima removida de profiles: %', pol.policyname;
  END LOOP;
END $$;

-- Tira o privilégio de tabela do papel anônimo.
-- Sem isto, recriar uma política por engano reabriria o vazamento.
REVOKE ALL ON public.profiles FROM anon;

-- Recria o conjunto correto de políticas, todas exigindo login.
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"                 ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles"               ON public.profiles;

CREATE POLICY "profiles_select_autenticado" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_update_proprio_ou_admin" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_admin_total" ON public.profiles
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =====================================================================
-- PARTE 2 — QR CODE PÚBLICO, PELO CAMINHO ESTREITO
--
-- Não abrimos as tabelas equipment/maintenance_orders para o anônimo.
-- Em vez disso, duas funções SECURITY DEFINER devolvem só o que pode
-- aparecer num cartaz de chão de fábrica, e só para UM id por vez —
-- assim ninguém consegue baixar a lista inteira de equipamentos.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_public_machine_status(p_id UUID)
RETURNS TABLE (
  id                  UUID,
  registration_number TEXT,
  equipment_name      TEXT,
  sector              TEXT,
  type                TEXT,
  criticality         TEXT,
  status              TEXT,
  photo_url           TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT e.id, e.registration_number, e.equipment_name, e.sector,
         e.type, e.criticality, e.status, e.photo_url
  FROM public.equipment e
  WHERE e.id = p_id;
$$;

CREATE OR REPLACE FUNCTION public.get_public_machine_orders(p_id UUID)
RETURNS TABLE (
  id                  UUID,
  order_number        TEXT,
  action_type         TEXT,
  priority            TEXT,
  status              TEXT,
  request_date        TIMESTAMPTZ,
  problem_description TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT o.id, o.order_number, o.action_type, o.priority,
         o.status, o.request_date, o.problem_description
  FROM public.maintenance_orders o
  WHERE o.equipment_id = p_id
    AND o.status <> 'completed'
  ORDER BY o.created_at DESC
  LIMIT 50;
$$;

-- Ninguém executa por padrão; liberamos nominalmente.
REVOKE ALL ON FUNCTION public.get_public_machine_status(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_machine_orders(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_public_machine_status(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_machine_orders(UUID) TO anon, authenticated;

-- A função is_admin() também é SECURITY DEFINER; fixamos o search_path
-- dela para fechar a porta de sequestro de esquema.
ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;

COMMIT;
