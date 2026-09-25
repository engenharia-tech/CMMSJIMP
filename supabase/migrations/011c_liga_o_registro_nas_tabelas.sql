-- 011c - liga o registro nas 6 tabelas.
--
-- Este e o arquivo que faz o registro EXISTIR de fato: sem ele, 011a e 011b
-- ficam prontos e nenhuma linha nasce - a tela diria "nada aconteceu" para
-- sempre. Por isso ele recusa rodar se os dois anteriores nao estiverem no
-- lugar, em vez de passar verde sem ligar nada.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.registro_atividade') IS NULL THEN
    RAISE EXCEPTION 'Rode antes o bloco 011a (a tabela do registro nao existe).';
  END IF;
  IF to_regproc('public.registra_atividade') IS NULL THEN
    RAISE EXCEPTION 'Rode antes o bloco 011b (o gatilho do registro nao existe).';
  END IF;
END $$;

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

COMMIT;

-- Conferencia: espera-se 6 linhas, uma por tabela.
SELECT c.relname AS tabela,
       CASE WHEN t.tgenabled = 'D' THEN '>>> DESLIGADO <<<' ELSE 'ativo' END AS registro
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE t.tgname = 'trg_registro' AND NOT t.tgisinternal
ORDER BY c.relname;
