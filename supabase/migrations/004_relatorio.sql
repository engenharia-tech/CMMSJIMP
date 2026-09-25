-- =====================================================================
-- Relatório das políticas das 5 tabelas (migração 004 + o que a 006 mudou).
-- Só lê. Não altera nada.
--
-- 🔴 NÃO existe número esperado escrito neste cabeçalho, de propósito.
-- A versão anterior dizia "ESPERADO: 7 linhas". Sete era a contagem de ANTES
-- da 006 — ou seja, quem conferisse por aquele número daria "conforme" justo
-- no cenário em que a 006 nunca tinha rodado, e "problema" quando estava tudo
-- certo. Conferência que carrega um número velho mente na direção mais cara.
-- Agora ela conta sozinha e imprime o que achou, na primeira linha.
--
-- 🔴 E ela olha os DOIS lados. A versão anterior só lia `qual`, que é a regra
-- de LEITURA. Uma política que libera GRAVAÇÃO para qualquer um saía impressa
-- como inocente. `with_check` é o lado de gravar, e agora tem coluna própria.
--
-- O QUE REPROVA:
--   · qualquer '>>> LIBERA GERAL <<<', seja em leitura ou em gravação;
--   · a última linha dizendo '>>> NAO EXISTE <<<' (sem ela, qualquer pessoa
--     com login se promove a administrador — foi o furo medido em 31/08).
-- =====================================================================

SELECT '0. TOTAL' AS tabela,
       count(*)::text || ' politica(s) nas 5 tabelas' AS politica,
       '' AS operacao,
       '' AS ao_ler,
       '' AS ao_gravar
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('equipment','maintenance_orders','parts','settings','profiles')

UNION ALL

SELECT tablename, policyname, cmd,
       CASE
         WHEN qual IS NULL                       THEN '(nao se aplica)'
         WHEN btrim(qual) = 'true'               THEN '>>> LIBERA GERAL <<<'
         WHEN qual ILIKE '%is_admin%'            THEN 'exige admin'
         WHEN qual ILIKE '%usuario_autorizado%'  THEN 'exige cracha'
         ELSE left(qual, 40)
       END,
       CASE
         WHEN with_check IS NULL                      THEN '(nao se aplica)'
         WHEN btrim(with_check) = 'true'              THEN '>>> LIBERA GERAL <<<'
         WHEN with_check ILIKE '%is_admin%'           THEN 'exige admin'
         WHEN with_check ILIKE '%usuario_autorizado%' THEN 'exige cracha'
         ELSE left(with_check, 40)
       END
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('equipment','maintenance_orders','parts','settings','profiles')

UNION ALL

SELECT 'zz. trava de papel',
       'trg_protege_papel em profiles (006a)',
       'TRIGGER',
       CASE WHEN EXISTS (SELECT 1 FROM pg_trigger
                          WHERE tgrelid = 'public.profiles'::regclass
                            AND tgname  = 'trg_protege_papel'
                            AND NOT tgisinternal)
            THEN 'existe' ELSE '>>> NAO EXISTE <<<' END,
       ''

ORDER BY 1, 2;
