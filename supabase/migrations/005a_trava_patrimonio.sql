-- 005a - impede DOIS equipamentos com o mesmo patrimonio.
-- Compara ignorando espacos e maiusculas: 'FJ 01', 'fj01' e 'FJ  01' colidem.
CREATE OR REPLACE FUNCTION public.impede_patrimonio_repetido()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $fn$
DECLARE
  chave TEXT := upper(replace(trim(COALESCE(NEW.registration_number,'')), ' ', ''));
  antigo TEXT := upper(replace(trim(COALESCE(OLD.registration_number,'')), ' ', ''));
  dono TEXT;
BEGIN
  IF chave = '' THEN
    RAISE EXCEPTION 'Informe o patrimonio do equipamento.';
  END IF;

  -- Numa edicao que NAO mexe no patrimonio, deixa passar: e assim que da
  -- para corrigir nome e setor dos 23 repetidos que ja existem.
  IF TG_OP = 'UPDATE' AND chave = antigo THEN
    RETURN NEW;
  END IF;

  SELECT e.equipment_name INTO dono
  FROM public.equipment e
  WHERE upper(replace(trim(COALESCE(e.registration_number,'')), ' ', '')) = chave
    AND (TG_OP = 'INSERT' OR e.id <> NEW.id)
  LIMIT 1;

  IF dono IS NOT NULL THEN
    RAISE EXCEPTION 'O patrimonio % ja pertence a: %', NEW.registration_number, dono
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$fn$;
