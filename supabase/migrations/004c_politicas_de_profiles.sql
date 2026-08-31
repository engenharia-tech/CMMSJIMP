-- 004c - profiles: cada um se edita, admin manda, e todos precisam do cracha.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles FROM anon;
CREATE POLICY "profiles_ler" ON public.profiles FOR SELECT TO authenticated
  USING (public.usuario_autorizado());
CREATE POLICY "profiles_editar_proprio" ON public.profiles FOR UPDATE TO authenticated
  USING (public.usuario_autorizado() AND (auth.uid()=id OR public.is_admin()))
  WITH CHECK (public.usuario_autorizado() AND (auth.uid()=id OR public.is_admin()));
CREATE POLICY "profiles_admin" ON public.profiles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
