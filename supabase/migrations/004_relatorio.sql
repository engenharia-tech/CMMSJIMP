-- =====================================================================
-- Relatório da migração 004 — mostra TODA política das 5 tabelas.
-- Só lê.
--
-- ESPERADO: 7 linhas, e a coluna 'regra' de todas deve citar
-- usuario_autorizado ou is_admin. Qualquer 'LIBERA GERAL' é problema.
-- =====================================================================

SELECT tablename  AS tabela,
       policyname AS politica,
       cmd        AS operacao,
       CASE
         WHEN qual IS NULL THEN '(sem condicao de leitura)'
         WHEN qual ILIKE '%usuario_autorizado%' THEN 'exige cracha'
         WHEN qual ILIKE '%is_admin%'          THEN 'exige admin'
         WHEN qual = 'true'                    THEN '>>> LIBERA GERAL <<<'
         ELSE left(qual, 40)
       END AS regra
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('equipment','maintenance_orders','parts','settings','profiles')
ORDER BY tablename, policyname;
