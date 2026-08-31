# Auditoria do CMMS JIMP — 31/08/2026

Tudo aqui foi **medido**, não estimado. Cada achado traz como foi comprovado.

## 🔴 Críticos (comprovados em produção)

### 1. Um operador vira administrador sozinho
Com a sessão do Enio (operador), uma única chamada trocou o próprio `role`
para `admin`. A política permitia editar a própria linha, e `role` era só mais
uma coluna dela. **Revertido no ato.** Corrigido pela migração `006a`.

### 2. Qualquer pessoa autorizada apaga equipamento
Operador apagou um equipamento de teste (`204`). Apagar equipamento leva junto
as ordens de manutenção dele (cascata). Corrigido pela `006b`: apagar passa a
ser do admin; ler, criar e editar seguem liberados.

### 3. Qualquer pessoa autorizada muda a taxa de mão de obra
Operador regravou `settings` (`204`). Essa taxa governa **todo** o cálculo de
custo do sistema. Corrigido pela `006c`.

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
