# Retrato do banco REAL

> Colunas e funcoes: geradas a partir do proprio banco (`buqfrfphieeahlnxhnpp`)
> em 31/08/2026. **Migracoes: remedidas em 25/09/2026** — ver a secao final.
> **Este arquivo descreve o que EXISTE.** O `supabase_schema.sql` descreve o que
> foi criado la atras e ja divergiu duas vezes: errou a coluna `photo_url` de
> `equipment` e os nomes das politicas de seguranca. Conferir aqui, nao la.
>
> Para regerar: leia `/rest/v1/` com o cabecalho `Accept: application/openapi+json`.

## equipment  (15 colunas)

| coluna | tipo |
|---|---|
| `acquisition_date` | date |
| `created_at` | timestamp with time zone |
| `criticality` | text |
| `equipment_name` | text |
| `expected_life` | integer |
| `id` | uuid |
| `manufacturer` | text |
| `model` | text |
| `notes` | text |
| `photo_url` | text |
| `registration_number` | text |
| `sector` | text |
| `serial_number` | text |
| `status` | text |
| `type` | text |

## maintenance_orders  (24 colunas)

| coluna | tipo |
|---|---|
| `action_taken` | text |
| `action_type` | text |
| `completion_date` | timestamp with time zone |
| `created_at` | timestamp with time zone |
| `created_by` | uuid |
| `downtime_hours` | numeric |
| `equipment_id` | uuid |
| `id` | uuid |
| `labor_cost` | numeric |
| `labor_hours` | numeric |
| `maintenance_cost` | numeric |
| `next_preventive_date` | date |
| `operator` | text |
| `order_number` | text |
| `parts_cost` | numeric |
| `parts_list` | jsonb |
| `parts_used` | text[] |
| `priority` | text |
| `problem_description` | text |
| `request_date` | timestamp with time zone |
| `requester` | text |
| `root_cause` | text |
| `sector` | text |
| `status` | text |

## parts  (9 colunas)

| coluna | tipo |
|---|---|
| `created_at` | timestamp with time zone |
| `id` | uuid |
| `minimum_stock` | numeric |
| `part_code` | text |
| `part_name` | text |
| `stock_quantity` | numeric |
| `supplier` | text |
| `unit` | text |
| `unit_cost` | numeric |

## profiles  (5 colunas)

| coluna | tipo |
|---|---|
| `email` | text |
| `full_name` | text |
| `id` | uuid |
| `role` | text |
| `updated_at` | timestamp with time zone |

## settings  (8 colunas)

| coluna | tipo |
|---|---|
| `address` | text |
| `company_name` | text |
| `default_corrective_time` | integer |
| `default_predictive_interval` | integer |
| `default_preventive_interval` | integer |
| `id` | uuid |
| `labor_rate` | numeric |
| `updated_at` | timestamp with time zone |

## usuarios_autorizados  (7 colunas)

| coluna | tipo |
|---|---|
| `ativo` | boolean |
| `autorizado_por` | text |
| `criado_em` | timestamp with time zone |
| `email` | text |
| `full_name` | text |
| `role` | text |
| `usado_em` | timestamp with time zone |

## Funcoes que o app chama

| funcao | para que |
|---|---|
| `get_public_machine_status(uuid)` | tela publica do QR — colunas escolhidas a dedo |
| `get_public_machine_orders(uuid)` | ordens abertas daquela maquina, sem custo |
| `meu_acesso()` | o app pergunta se o usuario ainda esta autorizado |
| `usuario_autorizado()` | usada por TODA politica das 5 tabelas |
| `is_admin()` | exige estar autorizado E ter papel admin |

## Migracoes — o que esta MEDIDO no banco (25/09/2026)

> ⚠ A versao anterior desta secao listava "001, 002, 003, 004 a/b/c" como
> aplicadas. Ela foi escrita as 13:26 de 31/08 — **antes** de as migracoes 005
> (13:40) e 006 (14:04) existirem —, e nunca dizia COMO cada uma tinha sido
> conferida. Foi esse tipo de linha que fez a `010` e as `011b/011c` ficarem
> escritas e sem valer por semanas: alguem le "aplicada" e risca da lista.
>
> Neste projeto **nao existe runner de migracao**. Cada `.sql` so vale depois de
> alguem colar no SQL Editor a mao. Por isso a tabela abaixo nao diz o que foi
> escrito: diz o que foi **provado**, pelo comportamento, contra o banco no ar.

| migracao | o que garante | como foi provado, em 25/09 |
|---|---|---|
| **001** | `profiles` fechado ao anonimo; QR publico por funcao | anonimo em `GET /profiles` -> `42501`; as 2 funcoes do QR respondem 200 ao anonimo com as colunas escolhidas a dedo |
| **002** | lista de autorizados; ninguem entra sem convite | a tabela `usuarios_autorizados` existe e so o admin le |
| **003** | cracha conferido a cada consulta; coluna `ativo` | **a prova central**: com o MESMO token, o Enio ativo le 5+5+5+5+1 linhas nas 5 tabelas; suspenso, le **0 em todas**; reliberado, volta a ler |
| **004 a/b/c** | derruba TODA politica antiga e recria | mesma prova acima: se tivesse sobrado alguma regra velha de "libera geral", o suspenso ainda leria |
| **005 a/b** | trava de patrimonio repetido | cadastrar o patrimonio `27`, que ja existe, responde `23505 — "O patrimonio 27 ja pertence a: MAQUINA DE SOLDA"` |
| **006a** | ninguem se promove a administrador | operador tentando `role = admin` -> `42501 — "Somente o administrador altera o cargo."` |
| **006b** | so o admin apaga equipamento e ordem | equipamento temporario: o operador mandou apagar e ele **continuou la** |
| **006c** | so o admin muda as configuracoes | operador tentando `labor_rate = 999`: a taxa continuou **50** |
| **007** | regras das fotos | anonimo enviando -> `403`; operador **envia**; operador apagando -> `403`; admin apaga |
| **008 / 009** | prazo por equipamento e data marcada | as 4 colunas existem e vem preenchidas (ex.: `preventive_interval_days = 30`) |
| **010** | o operador apaga peca | 🔴 **descoberta ausente em 25/09** e aplicada no mesmo dia. Antes: o banco devolvia "pronto" e a peca ficava. Depois: o operador apaga e ela some |
| **011 a/b/c** | registro de quem-fez-o-que | 🔴 **as duas ultimas descobertas ausentes em 25/09** e aplicadas no mesmo dia. As 6 tabelas gravam; a rota de administracao grava o nome do admin, nao "sistema"; nem o admin consegue forjar ou apagar linha |

**Nao provaveis por comportamento, e nao precisam ser:** `004a` so APAGA politicas
velhas (apagar nao deixa rastro) e `004c` so RENOMEIA (o resultado e identico ao
que ja existia) — as duas ficam provadas pelo efeito das outras. Os cinco
`00N_relatorio.sql` so LEEM: rodar ou nao rodar nao muda um bit.

🔴 **Nao cole o arquivo `004` achando que esta completando algo.** Os tres
(`004a`, `004b`, `004c`) so funcionam como bloco e na ordem, e rodar so a `004`
hoje **desfaz a 006 e a 010**: o operador volta a apagar equipamento (levando as
ordens junto, em cascata) e a regravar a taxa de mao de obra.
