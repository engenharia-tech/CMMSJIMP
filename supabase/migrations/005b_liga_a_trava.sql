-- 005b - liga a trava.
DROP TRIGGER IF EXISTS trg_patrimonio_unico ON public.equipment;
CREATE TRIGGER trg_patrimonio_unico
  BEFORE INSERT OR UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.impede_patrimonio_repetido();
