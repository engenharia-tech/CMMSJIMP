-- 011a - onde o registro de atividade mora.
--
-- Pedido do Edson (25/09): "crie uma tela de logs, para que seja sabido o que
-- foi criado o que foi excluido".
--
-- Ninguem escreve aqui pela API: a tabela nao tem politica de INSERT nenhuma.
-- Quem grava e o gatilho (011b), que roda como dono e passa por cima da RLS.
-- Assim o registro nao pode ser forjado nem apagado por quem usa o sistema.
BEGIN;

CREATE TABLE IF NOT EXISTS public.registro_atividade (
  id           BIGSERIAL PRIMARY KEY,
  quando       TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Agrupa o que aconteceu junto: apagar um equipamento leva as ordens dele em
  -- cascata, e sem isto a tela mostraria 12 exclusoes soltas como se alguem as
  -- tivesse apagado uma a uma.
  transacao    BIGINT NOT NULL DEFAULT txid_current(),
  tabela       TEXT NOT NULL,
  acao         TEXT NOT NULL,
  registro_id  TEXT,
  descricao    TEXT,
  quem_id      UUID,
  quem_nome    TEXT,
  quem_email   TEXT,
  alteracoes   JSONB,
  dados        JSONB
);

-- A coluna nasceu depois numa instalacao que ja rodou a versao antiga do 011a.
ALTER TABLE public.registro_atividade
  ADD COLUMN IF NOT EXISTS transacao BIGINT NOT NULL DEFAULT txid_current();

CREATE INDEX IF NOT EXISTS idx_registro_quando    ON public.registro_atividade (quando DESC);
CREATE INDEX IF NOT EXISTS idx_registro_tabela    ON public.registro_atividade (tabela, quando DESC);
CREATE INDEX IF NOT EXISTS idx_registro_acao      ON public.registro_atividade (acao, quando DESC);
CREATE INDEX IF NOT EXISTS idx_registro_transacao ON public.registro_atividade (transacao);

ALTER TABLE public.registro_atividade ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.registro_atividade FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.registro_atividade FROM authenticated;
REVOKE ALL ON SEQUENCE public.registro_atividade_id_seq FROM anon, authenticated;

DROP POLICY IF EXISTS "registro_admin_le" ON public.registro_atividade;
CREATE POLICY "registro_admin_le" ON public.registro_atividade
  FOR SELECT TO authenticated
  USING (public.is_admin());

COMMIT;
