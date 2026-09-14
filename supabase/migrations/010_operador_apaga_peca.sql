-- 010 - operador pode apagar peca.
--
-- Na 006 apagar ficou so com o admin nas 3 tabelas de dados. O Edson
-- pediu em 14/09 para liberar PECAS aos operadores (o estoque e deles).
-- Equipamento e ordem de manutencao continuam so com o admin: apagar
-- equipamento leva o historico junto, e apagar ordem apaga custo.
DROP POLICY IF EXISTS "parts_apagar" ON public.parts;
CREATE POLICY "parts_apagar" ON public.parts
  FOR DELETE TO authenticated
  USING (public.usuario_autorizado());
