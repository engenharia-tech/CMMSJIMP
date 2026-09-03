-- 009 - data MARCADA por equipamento.
--
-- A 008 resolveu o CICLO (a cada 30/60/90/365 dias, contado da ultima).
-- Faltava marcar uma data especifica: "esta bomba, dia 15 de outubro",
-- independente de quando foi a ultima manutencao.
--
-- Quando preenchida, a data marcada MANDA: ela vira a proxima manutencao
-- daquele equipamento. Vazia, volta a valer o ciclo.
ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS preventive_scheduled_date DATE,
  ADD COLUMN IF NOT EXISTS predictive_scheduled_date DATE;

COMMENT ON COLUMN public.equipment.preventive_scheduled_date IS
  'Data marcada para a proxima preventiva. Vence o ciclo. NULO = usa o ciclo.';
COMMENT ON COLUMN public.equipment.predictive_scheduled_date IS
  'Data marcada para a proxima preditiva. Vence o ciclo. NULO = usa o ciclo.';
