-- 004a - derruba TODA politica das 5 tabelas, seja qual for o nome.
-- Rode 004a, 004b e 004c em sequencia, sem parar no meio.
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname, tablename FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN ('equipment','maintenance_orders','parts','settings','profiles')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;
