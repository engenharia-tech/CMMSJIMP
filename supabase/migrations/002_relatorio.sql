-- =====================================================================
-- CMMS JIMP - Relatório de conferência da migração 002
-- Só lê, não altera nada. Rode DEPOIS da migração 002.
--
-- ESPERADO: os 4 usuários de hoje na lista de autorizados,
-- o porteiro 'trg_bloqueia_cadastro' ATIVO, e o anônimo sem
-- nenhum privilégio na lista.
-- =====================================================================

SELECT '1. autorizado' AS verificacao,
       email || '  (' || role || ')' AS item,
       'na lista' AS resultado
FROM public.usuarios_autorizados

UNION ALL

SELECT '2. porteiro em auth.users',
       tgname,
       CASE WHEN tgenabled = 'D' THEN '>>> DESLIGADO <<<' ELSE 'ATIVO' END
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass
  AND NOT tgisinternal

UNION ALL

SELECT '3. anonimo na lista de autorizados',
       grantee || ': ' || privilege_type,
       '>>> PROBLEMA <<<'
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name  = 'usuarios_autorizados'
  AND grantee IN ('anon','public')

ORDER BY 1, 2;
