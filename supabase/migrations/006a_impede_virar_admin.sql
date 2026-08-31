-- 006a - ninguem muda o proprio papel nem o proprio e-mail.
-- Medido em 31/08: um OPERADOR se promoveu a admin com uma unica chamada.
-- A politica deixava a pessoa editar a propria linha, e 'role' era so mais
-- uma coluna dessa linha.
CREATE OR REPLACE FUNCTION public.protege_papel_e_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Somente o administrador altera o cargo.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF lower(trim(COALESCE(NEW.email,''))) IS DISTINCT FROM lower(trim(COALESCE(OLD.email,''))) THEN
    RAISE EXCEPTION 'Somente o administrador altera o e-mail.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_protege_papel ON public.profiles;
CREATE TRIGGER trg_protege_papel
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protege_papel_e_email();
