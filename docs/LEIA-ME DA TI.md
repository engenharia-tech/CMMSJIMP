# CMMS JIMP — cópia para a TI

Este é o **app de manutenção industrial da Joinville Implementos**: as máquinas da
fábrica, as ordens de manutenção, o estoque de peças, o custo de cada intervenção e o
calendário de preventiva. Ele está no ar em **https://cmms.jimpnexus.com** e é usado
todo dia pela manutenção.

---

## 🔴 Três coisas antes de qualquer outra

**1. Esta pasta é um RETRATO, não o original.** O código de verdade vive em
`https://github.com/engenharia-tech/CMMSJIMP` (repositório público) e é de lá que o
site se publica sozinho. Mexer aqui **não muda nada no ar** — e, pior, se alguém
trabalhar aqui achando que é o original, as duas cópias passam a discordar e ninguém
sabe mais qual vale. O arquivo `VERSAO.txt` diz de qual commit este retrato saiu.

**2. Nenhuma chave veio junto, de propósito.** O arquivo `.env.local`, que guarda os
acessos ao banco, **ficou de fora**. Entre eles está a *chave de serviço* do Supabase —
a que pode tudo e passa por cima de todas as regras de proteção do banco. O que veio foi
o `.env.example`, só com os **nomes** das variáveis, sem um único valor.

**3. Não existe banco de teste.** O app fala com o banco de **produção**. Se você
conseguir rodá-lo, qualquer coisa que gravar é real. Olhar pode; escrever, só com a
palavra do Edson.

---

## Por onde começar a entender

Abra **`docs/PASSAGEM PARA OUTRA CONTA - CMMS.md`**. É a memória inteira do projeto, em
oito partes: o que o app é, todas as decisões do Edson desde o início com as palavras
dele, tela por tela, como funciona por dentro, o estado medido do banco, as armadilhas
em que já se caiu, o que falta e o que fazer no primeiro dia.

Esse documento **é gerado** de `src/dados/projeto.ts` e desenha também a tela "O
projeto" dentro do próprio app. Não o edite à mão: corrija a fonte e rode
`npx tsx scripts/gerar-passagem.ts`.

---

## O que é cada pasta

| pasta | o que tem |
|---|---|
| `src/` | tudo o que aparece no navegador: as 14 telas, as regras compartilhadas, os dois idiomas |
| `api/` | o servidor inteiro, num arquivo só (`index.ts`): 7 rotas, o aviso diário por e-mail, a IA |
| `supabase/` | as 23 migrações do banco, em ordem. **Elas não rodam sozinhas** — ver abaixo |
| `docs/` | a memória do projeto e os retratos do banco |
| `scripts/` | o gerador do documento de passagem e este copiador |

---

## Para rodar na sua máquina

```bash
npm install
npm run dev
```

O app sobe em `http://localhost:3000`. **Só vai funcionar com as chaves**: copie o
`.env.example` para `.env.local` e peça os valores ao Edson. Sem eles o app abre e não
conversa com o banco.

Para gerar a versão compilada: `npm run build`. Para conferir os tipos sem compilar:
`npx tsc --noEmit`.

---

## 🔴 A armadilha que mais custou neste projeto

**Não existe nada que aplique migração de banco sozinho.** Um arquivo `.sql` em
`supabase/migrations/` só passa a valer depois que **alguém cola o conteúdo no SQL
Editor do Supabase, à mão**. Já aconteceu de três migrações ficarem escritas, comitadas
e sem valer por semanas — o banco respondia "pronto" e não fazia nada.

Da mesma família: quando a regra de segurança do banco barra alguém, o Supabase **não
devolve erro** — devolve "sucesso, zero linhas". Qualquer teste de escrita tem de
conferir **quantas linhas mudaram**, nunca a ausência de erro.

E um aviso específico: **não rode o arquivo `004` isolado.** Os três (`004a`, `004b`,
`004c`) só funcionam como bloco e na ordem; rodar a `004` sozinha hoje desfaz as
migrações `006` e `010` — o operador volta a poder apagar equipamento, levando as ordens
de manutenção junto, em cascata.

---

## Quem decide o quê

- **Publicar é decisão do Edson.** Nada vai ao ar sem ele.
- **Escrever no banco de produção é decisão do Edson.**
- O banco fica numa conta Supabase separada (`buqfrfphieeahlnxhnpp`), que não é a conta
  principal dele — por isso toda alteração de banco passa por ele.

---

## Para atualizar esta cópia

Na pasta de trabalho do projeto (OneDrive), rodar:

```bash
npx tsx scripts/copiar-para-ti.ts
```

Ele refaz esta pasta do zero, confere **no destino** que nenhuma chave viajou, e para com
erro se algo proibido tiver chegado. Rodar isso a cada publicação mantém o retrato novo.
