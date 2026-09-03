-- 008 - cada maquina com o proprio prazo de preventiva.
--
-- Ate aqui o Planejamento usava UM numero para a fabrica inteira
-- (settings.default_preventive_interval, 30 dias). Compressor, lixadeira e
-- ponte rolante entravam no mesmo ciclo, e nao havia como programar 30, 60,
-- 90 ou 365 dias por equipamento.
--
-- NULO = segue o padrao geral das Configuracoes.
ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS preventive_interval_days INTEGER,
  ADD COLUMN IF NOT EXISTS predictive_interval_days INTEGER;

COMMENT ON COLUMN public.equipment.preventive_interval_days IS
  'Dias entre preventivas desta maquina. NULO = usa o padrao de settings.';
COMMENT ON COLUMN public.equipment.predictive_interval_days IS
  'Dias entre preditivas desta maquina. NULO = usa o padrao de settings.';
