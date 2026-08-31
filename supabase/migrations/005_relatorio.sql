-- Conferencia da 005. So le.
-- ESPERADO: a trava ATIVA, e a contagem dos repetidos que JA existiam
-- (eles continuam ate a manutencao decidir quais ficam).
SELECT 'trava' AS o_que,
       tgname AS item,
       CASE WHEN tgenabled = 'D' THEN '>>> DESLIGADA <<<' ELSE 'ATIVA' END AS situacao
FROM pg_trigger
WHERE tgrelid = 'public.equipment'::regclass AND tgname = 'trg_patrimonio_unico'
UNION ALL
SELECT 'repetido que ja existia',
       upper(replace(trim(registration_number),' ','')),
       count(*)::text || ' registros'
FROM public.equipment
GROUP BY 2 HAVING count(*) > 1
ORDER BY 1, 2;
