-- 011b - o gatilho que escreve o registro.
--
-- 🔴 A REGRA DESTE ARQUIVO: o registro NUNCA pode derrubar o trabalho de
-- ninguem. Um gatilho AFTER que estoura desfaz a operacao original - se a
-- tabela do log sumir, ou faltar permissao, o mecanico deixaria de conseguir
-- fechar a ordem dele por causa do log. Por isso a gravacao inteira fica
-- dentro de um EXCEPTION que engole o erro e avisa no log do servidor.
BEGIN;

CREATE OR REPLACE FUNCTION public.registra_atividade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_novo  JSONB := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
  v_velho JSONB := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  v_linha JSONB := COALESCE(v_novo, v_velho);
  v_acao  TEXT  := CASE TG_OP WHEN 'INSERT' THEN 'criou'
                              WHEN 'UPDATE' THEN 'alterou'
                              ELSE 'apagou' END;
  v_desc  TEXT;
  v_mud   JSONB := '{}'::jsonb;
  k       TEXT;
  v_uid   UUID  := auth.uid();
  v_nome  TEXT;
  v_email TEXT;
  v_id    TEXT;
BEGIN
  -- Rotulo legivel: quem le o log quer ver "FJ 20", nao um id.
  v_desc := COALESCE(
    NULLIF(v_linha->>'order_number', ''),
    NULLIF(concat_ws(' - ', v_linha->>'equipment_name', v_linha->>'registration_number'), ''),
    NULLIF(concat_ws(' - ', v_linha->>'part_name', v_linha->>'part_code'), ''),
    NULLIF(concat_ws(' - ', v_linha->>'full_name', v_linha->>'email'), ''),
    NULLIF(v_linha->>'email', ''),
    NULLIF(v_linha->>'company_name', ''),
    '(sem nome)');

  -- usuarios_autorizados tem o E-MAIL como chave, nao 'id'.
  v_id := COALESCE(v_linha->>'id', v_linha->>'email');

  IF TG_OP = 'UPDATE' THEN
    -- Percorre a UNIAO das chaves: campo que existia e sumiu tambem e mudanca.
    FOR k IN SELECT jsonb_object_keys(v_velho)
             UNION SELECT jsonb_object_keys(v_novo) LOOP
      IF k NOT IN ('updated_at', 'created_at')
         AND (v_novo -> k) IS DISTINCT FROM (v_velho -> k) THEN
        v_mud := v_mud || jsonb_build_object(
          k, jsonb_build_object('de', v_velho -> k, 'para', v_novo -> k));
      END IF;
    END LOOP;
    -- Sem mudanca de verdade nao vira linha: senao o log enche de ruido
    -- toda vez que alguem abre e salva uma tela sem tocar em nada.
    IF v_mud = '{}'::jsonb THEN RETURN NULL; END IF;
  END IF;

  IF v_uid IS NOT NULL THEN
    SELECT p.full_name, p.email INTO v_nome, v_email
    FROM public.profiles p WHERE p.id = v_uid;
  END IF;

  INSERT INTO public.registro_atividade
    (tabela, acao, registro_id, descricao, quem_id, quem_nome, quem_email, alteracoes, dados)
  VALUES (
    TG_TABLE_NAME, v_acao, v_id, v_desc, v_uid,
    -- Sem sessao e o proprio sistema agindo: rotina diaria, migracao, chave de
    -- servico. As rotas de admin NAO caem mais aqui (ver clienteDoChamador).
    COALESCE(v_nome, CASE WHEN v_uid IS NULL THEN 'sistema' ELSE 'usuario removido' END),
    v_email,
    CASE WHEN TG_OP = 'UPDATE' THEN v_mud ELSE NULL END,
    v_linha);

  RETURN NULL;

EXCEPTION WHEN OTHERS THEN
  -- Perder uma linha de log e ruim; travar a manutencao e pior.
  RAISE WARNING 'registro_atividade falhou em %.%: %', TG_TABLE_NAME, TG_OP, SQLERRM;
  RETURN NULL;
END;
$fn$;

COMMIT;
