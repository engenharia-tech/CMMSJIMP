# Retrato do banco REAL

> Gerado a partir do proprio banco (`buqfrfphieeahlnxhnpp`) em 31/08/2026.
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

## Migracoes aplicadas

| | |
|---|---|
| 001 | fecha `profiles` ao anonimo; QR publico por funcao |
| 002 | lista de autorizados + porteiro em `auth.users` |
| 003 | cracha conferido a cada consulta; coluna `ativo` |
| 004 a/b/c | derruba TODA politica antiga pelo catalogo e recria |
