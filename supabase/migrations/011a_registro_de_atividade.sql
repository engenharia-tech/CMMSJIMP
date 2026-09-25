-- 011a - onde o registro de atividade mora.
--
-- Pedido do Edson (25/09): "crie uma tela de logs, para que seja sabido o que
-- foi criado o que foi excluido".
--
-- Ninguem escreve aqui pela API: a tabela nao tem politica de INSERT nenhuma.
-- Quem grava e o gatilho (011b), que roda como dono e passa por cima da RLS.
-- Assim o registro nao pode ser forjado nem apagado por quem usa o sistema.
CREATE TABLE IF NOT EXISTS public.registro_atividade (
  id           BIGSERIAL PRIMARY KEY,
  quando       TIMESTAMPTZ NOT NULL DEFAULT now(),
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

CREATE INDEX IF NOT EXISTS idx_registro_quando ON public.registro_atividade (quando DESC);
CREATE INDEX IF NOT EXISTS idx_registro_tabela ON public.registro_atividade (tabela, quando DESC);

ALTER TABLE public.registro_atividade ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.registro_atividade FROM anon;

DROP POLICY IF EXISTS "registro_admin_le" ON public.registro_atividade;
CREATE POLICY "registro_admin_le" ON public.registro_atividade
  FOR SELECT TO authenticated
  USING (public.is_admin());
