-- 006c - a taxa de mao de obra governa TODO o custo. Medido: um operador
-- conseguiu regravar settings. Agora todos leem, so o admin escreve.
DROP POLICY IF EXISTS "settings_autorizado" ON public.settings;
CREATE POLICY "settings_ler" ON public.settings
  FOR SELECT TO authenticated USING (public.usuario_autorizado());
CREATE POLICY "settings_admin" ON public.settings
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
