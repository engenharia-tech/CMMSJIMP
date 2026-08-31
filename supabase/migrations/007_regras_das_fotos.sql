-- 007 - quem pode mexer nas fotos de equipamento.
--
-- Deposito publico libera LEITURA. O ENVIO continua precisando de regra,
-- e sem ela nem o app consegue: o operador foi barrado com
-- "new row violates row-level security policy" (medido em 31/08).
--
-- Enviar: quem esta na lista de autorizados.
-- Trocar e apagar: so o admin - foto de patrimonio nao se apaga por engano.

DROP POLICY IF EXISTS "fotos_ler" ON storage.objects;
CREATE POLICY "fotos_ler" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'equipment-photos');

DROP POLICY IF EXISTS "fotos_enviar" ON storage.objects;
CREATE POLICY "fotos_enviar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'equipment-photos' AND public.usuario_autorizado());

DROP POLICY IF EXISTS "fotos_trocar" ON storage.objects;
CREATE POLICY "fotos_trocar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'equipment-photos' AND public.is_admin())
  WITH CHECK (bucket_id = 'equipment-photos' AND public.is_admin());

DROP POLICY IF EXISTS "fotos_apagar" ON storage.objects;
CREATE POLICY "fotos_apagar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'equipment-photos' AND public.is_admin());
