-- =====================================================================
-- CMMS JIMP - Relatório de conferência da migração 001
-- Projeto: buqfrfphieeahlnxhnpp
--
-- Só lê, não altera nada. Rode DEPOIS da migração.
--
-- ESPERADO: 7 linhas — as 5 tabelas com RLS 'LIGADA' e as 2 funções
-- do QR 'CRIADA'. Qualquer linha começando com '1.' ou '3.' é problema.
-- =====================================================================

SELECT '1. politica aberta ao anonimo' AS verificacao,
       tablename || ' -> ' || policyname AS item,
       '>>> PROBLEMA <<<' AS resultado
FROM pg_policies
WHERE schemaname = 'public'
  AND ('anon' = ANY(roles) OR 'public' = ANY(roles))

UNION ALL

SELECT '2. RLS da tabela',
       relname,
       CASE WHEN relrowsecurity THEN 'LIGADA' ELSE '>>> DESLIGADA <<<' END
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relkind = 'r'
  AND relname IN ('profiles','equipment','maintenance_orders','parts','settings')

UNION ALL

SELECT '3. privilegio do anonimo em profiles',
       grantee || ': ' || privilege_type,
       '>>> PROBLEMA <<<'
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name  = 'profiles'
  AND grantee IN ('anon','public')

UNION ALL

SELECT '4. funcao do QR publico',
       p.proname,
       'CRIADA'
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('get_public_machine_status','get_public_machine_orders')

ORDER BY 1, 2;
