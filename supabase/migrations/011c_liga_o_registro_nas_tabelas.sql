-- 011c - liga o registro nas 6 tabelas.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['equipment','maintenance_orders','parts',
                           'profiles','usuarios_autorizados','settings'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_registro ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_registro AFTER INSERT OR UPDATE OR DELETE ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION public.registra_atividade()', t);
  END LOOP;
END $$;
