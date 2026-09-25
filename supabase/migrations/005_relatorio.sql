-- =====================================================================
-- Conferência da trava de patrimônio repetido (migração 005a + 005b).
-- Só lê. Não altera nada.
--
-- 🔴 A versão anterior CALAVA no caso que importa. Ela procurava o vigia com
-- um SELECT direto em pg_trigger: se o vigia não existisse, a consulta voltava
-- zero linhas — ausência saía como SILÊNCIO, nunca como alarme. Quem rodasse
-- ia achar que estava tudo certo exatamente no cenário que estamos caçando
-- (a migração escrita e nunca aplicada). Agora a linha SEMPRE aparece, e diz
-- '>>> NAO EXISTE <<<' quando é o caso.
--
-- ESPERADO: a função e a trava existindo e ATIVA, seguidas dos patrimônios
-- repetidos que já estavam no banco antes dela — esses continuam até a
-- manutenção decidir, pela plaqueta, qual máquina fica com cada código.
-- =====================================================================

SELECT '1. funcao (005a)' AS o_que,
       'impede_patrimonio_repetido' AS item,
       CASE WHEN to_regproc('public.impede_patrimonio_repetido') IS NULL
            THEN '>>> NAO EXISTE - a 005a nunca rodou <<<'
            ELSE 'existe' END AS situacao

UNION ALL

SELECT '2. trava (005b)',
       'trg_patrimonio_unico em equipment',
       CASE
         WHEN NOT EXISTS (SELECT 1 FROM pg_trigger
                           WHERE tgrelid = 'public.equipment'::regclass
                             AND tgname  = 'trg_patrimonio_unico'
                             AND NOT tgisinternal)
           THEN '>>> NAO EXISTE - a 005b nunca rodou <<<'
         WHEN EXISTS (SELECT 1 FROM pg_trigger
                       WHERE tgrelid = 'public.equipment'::regclass
                         AND tgname  = 'trg_patrimonio_unico'
                         AND NOT tgisinternal
                         AND tgenabled = 'D')
           THEN '>>> DESLIGADA <<<'
         ELSE 'ATIVA'
       END

UNION ALL

SELECT '3. repetido que ja existia',
       upper(replace(trim(registration_number), ' ', '')),
       count(*)::text || ' maquinas com esse mesmo codigo'
FROM public.equipment
GROUP BY 2 HAVING count(*) > 1

ORDER BY 1, 2;
