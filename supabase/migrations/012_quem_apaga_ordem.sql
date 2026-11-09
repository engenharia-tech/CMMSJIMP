-- 012 - apagar ORDEM deixa de ser so do admin: vale tambem para quem
-- estiver na lista 'pode_apagar_ordem'.
--
-- Edson, 09/11/2026: "Preciso que voce libere permissao para o Matheus e
-- para o Enio para quando uma nova ordem seja digitada errada, eles possam
-- excluir pela lixeirinha. Nao deixe mais preso so ao meu usuario."
--
-- Por que uma lista e nao o papel (role): o Matheus e operador, e liberar
-- o papel inteiro daria a lixeira a todos os operadores. E por que uma
-- tabela e nao uma coluna em profiles: cada um pode editar o proprio
-- profile, entao uma coluna ali o proprio usuario poderia ligar sozinho.
-- Esta tabela so o admin escreve.
--
-- Equipamento continua so com o admin (006b): apagar equipamento leva o
-- historico junto.

CREATE TABLE IF NOT EXISTS public.pode_apagar_ordem (
  user_id    UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  liberado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pode_apagar_ordem ENABLE ROW LEVEL SECURITY;

-- cada um ve se esta na lista (a tela pergunta isso); o admin ve todos
DROP POLICY IF EXISTS "pode_apagar_ordem_ler" ON public.pode_apagar_ordem;
CREATE POLICY "pode_apagar_ordem_ler" ON public.pode_apagar_ordem
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- so o admin poe ou tira gente da lista
DROP POLICY IF EXISTS "pode_apagar_ordem_admin" ON public.pode_apagar_ordem;
CREATE POLICY "pode_apagar_ordem_admin" ON public.pode_apagar_ordem
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- a regra de apagar ordem: admin OU quem esta na lista (e ainda autorizado)
DROP POLICY IF EXISTS "maintenance_orders_apagar" ON public.maintenance_orders;
CREATE POLICY "maintenance_orders_apagar" ON public.maintenance_orders
  FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR (public.usuario_autorizado()
        AND EXISTS (SELECT 1 FROM public.pode_apagar_ordem p WHERE p.user_id = auth.uid()))
  );

-- os dois que ele liberou, achados pelo e-mail do cadastro
INSERT INTO public.pode_apagar_ordem (user_id)
SELECT id FROM public.profiles
WHERE lower(email) IN ('matheusrozanunes@gmail.com', 'enionunes49@gmail.com')
ON CONFLICT (user_id) DO NOTHING;

-- conferencia: tem de listar os dois
SELECT pr.full_name, pr.email, p.liberado_em
FROM public.pode_apagar_ordem p JOIN public.profiles pr ON pr.id = p.user_id;
