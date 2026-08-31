# CMMS JIMP — Gestão de Manutenção Industrial

App de manutenção da Joinville Implementos: cadastro de equipamentos, ordens de
manutenção, preventivas, peças, custos e indicadores. Cada máquina tem um QR Code
que abre uma tela de status **sem exigir login**.

## Como rodar

```bash
npm install
npm run dev          # http://localhost:3000
```

Antes do primeiro `npm run dev`, crie o `.env.local` (copie de `.env.example`):

| Variável | Onde pegar |
|---|---|
| `VITE_SUPABASE_URL` | `https://buqfrfphieeahlnxhnpp.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | mesma tela, seção *Service Role* |

> ⚠️ A `service_role` ignora a segurança de linha do banco e faz o que quiser.
> Ela vive só no `.env.local` (fora do git) e nas variáveis da Vercel.
> **Nunca no `.env.example`**, que é o único arquivo de env que o `.gitignore`
> deixa passar de propósito.

Conferir se compila antes de publicar — a Vercel checa os tipos e um erro que o
Vite ignora localmente prende a produção no último build bom:

```bash
npm run lint
```

## Banco de dados

Supabase, projeto `buqfrfphieeahlnxhnpp`. O esquema inicial está em
`supabase_schema.sql`; as mudanças posteriores em `supabase/migrations/`, em
ordem numérica. Aplicar pelo SQL Editor do painel do Supabase.

Tabelas: `profiles`, `equipment`, `maintenance_orders`, `parts`, `settings`.

### A tela pública do QR Code

`/status/:id` roda sem login. Ela **não lê as tabelas direto** — usa duas funções
`SECURITY DEFINER` que devolvem colunas escolhidas a dedo, um equipamento por vez:

- `get_public_machine_status(uuid)`
- `get_public_machine_orders(uuid)`

Assim nada de custo, fornecedor ou dinheiro chega ao anônimo, e ninguém consegue
baixar a lista inteira de equipamentos. Ao mexer nessa tela, mantenha o caminho
pelas funções.

## Estrutura

```
src/pages/         telas
src/services/      acesso ao banco
src/components/    UI e modais
server.ts          Express: rotas /api (vira função serverless na Vercel)
api/index.ts       ponte para a Vercel
```

## Publicação

Vercel. O `vercel.json` manda `/api/*` para o Express e todo o resto para o SPA.
As três variáveis acima precisam estar cadastradas no projeto da Vercel.
