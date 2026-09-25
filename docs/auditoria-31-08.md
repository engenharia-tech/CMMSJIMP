# Auditoria do CMMS JIMP — 31/08/2026

Tudo aqui foi **medido**, não estimado. Cada achado traz como foi comprovado.

> ⚠ **Correção de 25/09/2026.** Este arquivo foi salvo às 14:05 de 31/08, **um
> minuto depois** de as migrações 006a/b/c serem escritas (14:04). Os três
> "Corrigido pela migração …" abaixo eram, naquele momento, **intenção — não
> aplicação**: ninguém tinha colado nada no banco, e um arquivo `.sql` neste
> repositório não vale nada até alguém colá-lo no SQL Editor à mão (não existe
> runner de migração neste projeto). Foi assim que a `010` e as `011b/011c`
> ficaram escritas e sem valer.
>
> Em 25/09 os três foram **provados no banco no ar**, com sessão real de
> operador, escrevendo e desfazendo. O que cada um respondeu está abaixo, em
> cada achado. Agora "corrigido" quer dizer corrigido.

## 🔴 Críticos (comprovados em produção)

### 1. Um operador vira administrador sozinho
Com a sessão do Enio (operador), uma única chamada trocou o próprio `role`
para `admin`. A política permitia editar a própria linha, e `role` era só mais
uma coluna dela. **Revertido no ato.** Corrigido pela migração `006a`.
**Provado em 25/09/2026:** com a sessão do Enio, `PATCH /profiles {role:"admin"}`
responde `42501 — "Somente o administrador altera o cargo."` e o papel dele
continua `engineer`. A porta está fechada.

### 2. Qualquer pessoa autorizada apaga equipamento
Operador apagou um equipamento de teste (`204`). Apagar equipamento leva junto
as ordens de manutenção dele (cascata). Corrigido pela `006b`: apagar passa a
ser do admin; ler, criar e editar seguem liberados.
**Provado em 25/09/2026:** criei um equipamento temporário como admin, o operador
mandou apagar e o equipamento **continuou lá** (o banco devolve "pronto" com zero
linhas — é assim que ele recusa). O admin apagou em seguida; nada sobrou.

### 3. Qualquer pessoa autorizada muda a taxa de mão de obra
Operador regravou `settings` (`204`). Essa taxa governa **todo** o cálculo de
custo do sistema. Corrigido pela `006c`.
**Provado em 25/09/2026:** o operador mandou gravar `labor_rate = 999` e a taxa
continuou **50**. ⚠ A primeira tentativa desta prova não valeu: o banco recusou
por falta de `WHERE`, não pela regra — erro do teste, não do sistema. Refeita com
o `id` na consulta, e aí sim a regra é que barrou.

## 🟠 Dependências

16 vulnerabilidades: **1 crítica, 8 altas**, 5 moderadas, 2 baixas.
Destaques: `protobufjs` (crítica), `xlsx` (alta, sem correção publicada),
`react-router`, `vite`, `postcss`, `nanoid`, `ws`, `path-to-regexp`.

A maioria chega por dependência de dependência. `xlsx` é o caso chato: a versão
do npm está parada; o próprio projeto recomenda instalar do site deles.

## 🟡 Funcionalidade quebrada

**Foto de equipamento nunca funcionou.** O depósito `equipment-photos` não
existe no Supabase — não há nenhum bucket criado. Todos os `photo_url` estão
vazios. A tela oferece o envio e ele falha.

## 🔵 Dívida técnica

- `@google/genai` 1.46 → 2.19 (uma versão maior atrás)
- `express` 4 → 5, `lucide-react` 0.546 → 1.38, `motion` 12 → 13
- 24 pacotes com atualização disponível; a maioria é menor e segura
- Bundle único de 2,2 MB — sem divisão por rota; a primeira abertura carrega tudo
- `i18n` tem textos em inglês e português misturados em telas já traduzidas

## ⚪ Cadastro

16 patrimônios repetidos (eram 23; 10 duplicatas sem histórico foram removidas).
14 são máquinas diferentes dividindo código. Erros de digitação criam máquinas
fantasma: `DUBRADEIRA`, `LAESER`, setor `COTE DOBRA`.

## O que já estava certo

- RLS ligada nas 5 tabelas, anônimo barrado
- QR público por função com colunas escolhidas a dedo
- Cadastro só pelo admin, com porteiro no banco
- Suspensão cortando acesso na hora
- Chaves fora do navegador; nenhuma jamais commitada
