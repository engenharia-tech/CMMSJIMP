-- =====================================================================
-- CMMS JIMP - Migração 002
-- Projeto: buqfrfphieeahlnxhnpp
--
-- DESEJO DO EDSON (31/08/2026):
--   "Somente eu posso criar os usuários, e autorizá-los via Administração.
--    Ninguém pode criar sua conta e entrar na base."
--
-- COMO ISTO É GARANTIDO
--   Uma lista de convidados (`usuarios_autorizados`) e um porteiro
--   (gatilho em auth.users) que RECUSA qualquer cadastro cujo e-mail não
--   esteja na lista. O porteiro vale para TODOS os caminhos: cadastro
--   pela tela, chamada direta na API, login pelo Google, link mágico.
--   Desligar o cadastro no painel é o cinto; isto aqui é o suspensório.
--
-- Segura de rodar mais de uma vez. Não apaga dados.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. A LISTA DE CONVIDADOS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.usuarios_autorizados (
  email       TEXT PRIMARY KEY,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'operator',
  autorizado_por TEXT,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  usado_em    TIMESTAMPTZ
);

-- O e-mail entra sempre em minúsculas e sem espaço, senão "Edson@" e
-- "edson@" viram duas pessoas e o porteiro deixa passar quem não devia.
CREATE OR REPLACE FUNCTION public.normaliza_email_autorizado()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $fn$
BEGIN
  NEW.email := lower(trim(NEW.email));
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_normaliza_email ON public.usuarios_autorizados;
CREATE TRIGGER trg_normaliza_email
  BEFORE INSERT OR UPDATE ON public.usuarios_autorizados
  FOR EACH ROW EXECUTE FUNCTION public.normaliza_email_autorizado();

-- Quem já entrou continua entrando: os usuários de hoje viram autorizados.
INSERT INTO public.usuarios_autorizados (email, full_name, role, autorizado_por)
SELECT lower(trim(p.email)),
       COALESCE(p.full_name, 'Usuário'),
       COALESCE(p.role, 'operator'),
       'migracao_002'
FROM public.profiles p
WHERE p.email IS NOT NULL AND trim(p.email) <> ''
ON CONFLICT (email) DO NOTHING;

-- Só quem está logado e é admin enxerga ou mexe na lista.
ALTER TABLE public.usuarios_autorizados ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.usuarios_autorizados FROM anon;

DROP POLICY IF EXISTS "autorizados_admin" ON public.usuarios_autorizados;
CREATE POLICY "autorizados_admin" ON public.usuarios_autorizados
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------
-- 2. O PORTEIRO
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bloqueia_cadastro_nao_autorizado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios_autorizados a
    WHERE a.email = lower(trim(NEW.email))
  ) THEN
    RAISE EXCEPTION 'Cadastro nao autorizado. Peca ao administrador para liberar seu e-mail.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.usuarios_autorizados
     SET usado_em = now()
   WHERE email = lower(trim(NEW.email)) AND usado_em IS NULL;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_bloqueia_cadastro ON auth.users;
CREATE TRIGGER trg_bloqueia_cadastro
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.bloqueia_cadastro_nao_autorizado();

-- ---------------------------------------------------------------------
-- 3. O PERFIL NASCE COM O QUE O ADMIN DEFINIU
--    (antes, o papel vinha do que o proprio cadastrante mandava:
--     bastava pedir "role":"admin" no cadastro para virar admin)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  convite public.usuarios_autorizados%ROWTYPE;
BEGIN
  SELECT * INTO convite
  FROM public.usuarios_autorizados
  WHERE email = lower(trim(new.email));

  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id,
    COALESCE(convite.full_name, new.raw_user_meta_data->>'full_name', 'Usuario Novo'),
    lower(trim(new.email)),
    COALESCE(convite.role, 'operator')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$fn$;

COMMIT;
