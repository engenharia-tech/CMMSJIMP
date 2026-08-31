-- =====================================================================
-- CMMS JIMP - Relatório de conferência da migração 003
-- Só lê. Rode DEPOIS da 003.
--
-- ESPERADO: as 5 tabelas com política exigindo o crachá, os 4 usuários
-- ATIVOS, e NENHUMA política antiga do tipo "Allow authenticated".
-- =====================================================================

SELECT '1. politica antiga (liberava qualquer logado)' AS verificacao,
       tablename || ' -> ' || policyname AS item,
       '>>> PROBLEMA <<<' AS resultado
FROM pg_policies
WHERE schemaname = 'public' AND policyname LIKE 'Allow authenticated%'

UNION ALL

SELECT '2. politica exige cracha',
       tablename || ' -> ' || policyname,
       'OK'
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual LIKE '%usuario_autorizado%' OR qual LIKE '%is_admin%')

UNION ALL

SELECT '3. pessoa na lista',
       email || '  (' || role || ')',
       CASE WHEN ativo THEN 'ATIVA' ELSE 'suspensa' END
FROM public.usuarios_autorizados

ORDER BY 1, 2;
