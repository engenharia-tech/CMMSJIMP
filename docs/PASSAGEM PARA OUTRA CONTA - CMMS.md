# CMMS JIMP — gestão de manutenção industrial — passagem para outra conta

> **Leia este arquivo inteiro antes de mexer em qualquer coisa.** Ele é a memória do
> projeto: o que o app é, o que o Edson decidiu, o que está provado funcionando, o que
> está quebrado e o que falta. Memória de conversa não viaja entre contas Claude — este
> arquivo é a ponte.

| | |
|---|---|
| Retrato medido em | **06/10/2026** |
| No ar | cmms.jimpnexus.com |
| Código | `app/Manutenção/cmms-jimp` |
| Banco | Supabase buqfrfphieeahlnxhnpp (outra conta) |
| Repositório | github.com/engenharia-tech/CMMSJIMP |

⚠ **Este arquivo é GERADO.** Ele sai de `src/dados/projeto.ts` pelo comando
`npx tsx scripts/gerar-passagem.ts`. A mesma fonte desenha a tela **O projeto** dentro
do app. Para corrigir qualquer coisa aqui, corrija lá e gere de novo — se você editar
este arquivo à mão, a tela e o documento passam a discordar, que é o defeito que este
projeto já teve três vezes.

## Índice

1. [Leia isto primeiro](#1-leia-isto-primeiro) — O que o app é, onde ele mora, e as cinco regras que não se quebram
2. [O que o Edson decidiu](#2-o-que-o-edson-decidiu) — A linha do tempo das ordens dele, com as palavras dele — é o que nenhuma conta nova tem como adivinhar
3. [O que o app faz hoje](#3-o-que-o-app-faz-hoje) — Tela por tela, quem vê cada uma, e os defeitos medidos que ainda estão de pé
4. [Como funciona por dentro](#4-como-funciona-por-dentro) — O servidor, o banco, quem pode o quê, e como se publica
5. [O estado medido](#5-o-estado-medido) — Os números do banco no ar e o que está provado funcionando — medido em 06/10/2026
6. [As armadilhas](#6-as-armadilhas) — Os erros que já foram cometidos aqui e a regra que nasceu de cada um — é a seção que mais economiza dia
7. [O que falta](#7-o-que-falta) — Em ordem, separando o que espera decisão dele do que é trabalho
8. [O primeiro dia da conta nova](#8-o-primeiro-dia-da-conta-nova) — A ordem exata para chegar, conferir que nada quebrou, e só então mexer

---

## 1. Leia isto primeiro

*O que o app é, onde ele mora, e as cinco regras que não se quebram*

O **CMMS JIMP** é o app de manutenção industrial da Joinville Implementos. Ele guarda as máquinas da fábrica, as ordens de manutenção, o estoque de peças, o custo de cada intervenção e o calendário de preventiva. Quem usa no dia a dia é a manutenção; quem manda é o Edson.

O app nasceu no Google AI Studio e foi trazido para cá. Hoje nada mais depende daquela plataforma — só a chave da IA, que vive em `aistudio.google.com/apikey`.

| o que | onde | quem manda |
|---|---|---|
| O código | `app/Manutenção/cmms-jimp` no OneDrive | é daqui que se mexe |
| No ar | `cmms.jimpnexus.com` (Vercel, plano Hobby) | segue o branch `main` |
| O repositório | `github.com/engenharia-tech/CMMSJIMP` | push em `main` publica |
| O banco | Supabase `buqfrfphieeahlnxhnpp` | 🔴 está em **outra conta** Supabase |
| As chaves | `.env.local` (fora do git) e as variáveis da Vercel | nunca no código |

> 🔴 AS CINCO REGRAS QUE NÃO SE QUEBRAM
> 
> 1. **Publicar é decisão dele.** Eu preparo o commit; ele diz quando vai ao ar.
> 2. **Não existe runner de migração.** Um arquivo `.sql` em `supabase/migrations/` só vale depois de alguém colar no SQL Editor do Supabase, à mão. Arquivo no repositório não prova nada sobre o banco.
> 3. **Nunca escrever no banco vivo para testar sem desfazer.** Se precisar provar uma regra escrevendo, escreva e devolva ao valor original no mesmo comando, e confira o estado final.
> 4. **Nunca pedir nem aceitar senha, chave de serviço ou token no chat.** Eles moram no `.env.local` e nas variáveis da Vercel.
> 5. **Tela aberta é a única prova de tela.** API respondendo 200 não é entrega.

**Como o Edson fala e o que ele espera.** Ele não é programador e não quer explicação de código: quer saber o que mudou, quanto custa e se está funcionando. Ele desconfia — com razão — de "está pronto" sem prova, porque já ouviu isso de mim sobre coisa que não estava. Então: medir antes de afirmar, dizer o número, e dizer também o que ficou ruim.

> ⚠ Este app é SÓ manutenção. O APPCUSTOS (custo de produto) e o JimpNexus Pedidos são outros apps, de outras sessões, e não se misturam com este. Se a sua sessão é do CMMS, não traga assunto de lá para a mesa.

---

## 2. O que o Edson decidiu

*A linha do tempo das ordens dele, com as palavras dele — é o que nenhuma conta nova tem como adivinhar*

Esta é a parte que importa mais. O código se lê; as decisões, não. Elas estão em ordem de quando foram ditas.

### 24 de agosto — o app chega

**24/08/2026** — ele disse:

> *"dentro de os apps que ja ajustei contigo e já estão no ar, preciso fazer mais 1. leia o que eu já fiz com o google ia studio e ja esta funcionando, e vamos continuar daqui"*

O que isso virou: A origem de tudo. O app já existia e funcionava no Google AI Studio; o trabalho foi trazê-lo para cá e torná-lo próprio.

**24/08/2026** — ele disse:

> *"é outro banco de outra conta https://buqfrfphieeahlnxhnpp.supabase.co"*

O que isso virou: Ele avisou sem eu perguntar. **É a informação mais importante da infraestrutura**: o banco não está na conta Supabase dos outros apps.

Estado hoje: Vale hoje. Por isso toda migração é escrita por mim e **colada por ele** no SQL Editor desse projeto.

**24/08/2026** — ele disse:

> *"ha eu larguei env. exemple dentro de C:\Users\efari\OneDrive - Joinville Implementos\app\Manutenção\cmms-jimp"*

O que isso virou: Chave não se pede no chat: ele deixa em arquivo. As chaves vivem em `.env.local` e nas variáveis da Vercel.

**24/08/2026** — ele disse:

> *"sim, pode escrever a migração"*

O que isso virou: Autorizou a migração 001 — fechar a tabela de pessoas (qualquer um com a chave pública lia nome, e-mail e cargo de todos) e abrir só o estreito do QR Code por duas funções que devolvem colunas escolhidas a dedo.

### 31 de agosto — o dia longo: sair do AI Studio, fechar o acesso, e sete defeitos

**31/08/2026** — ele disse:

> *"quero retirar da google ia e deixar só aqui. qual é o proximo passo? me direcione pois faz dias que conversamos"*

O que isso virou: O app deixou de depender do AI Studio. Hoje nada mais aponta para lá — só a chave do Gemini, que nasceu naquela conta.

**31/08/2026** — ele disse:

> *"rodo tudo isso?"*

O que isso virou: O rito que vale até hoje: **eu escrevo o SQL, ele cola.** Esta pergunta dele, feita com a migração inteira na mão, é a origem da armadilha nº 1 deste app.

**31/08/2026** — ele disse:

> *"mantém a IA, mas tira a chave do navegador"*

O que isso virou: A chave do Gemini estava dentro do site, ao alcance de um F12. A IA continuou; a chave foi para o servidor. Hoje o modelo é o `gemini-3-flash-preview`.

**31/08/2026** — ele disse:

> *"Eu quero que somente eu possa criar os usuários, e autorizálos via. Administração. Ninguém possa criar sua conta e entrar na, base. Esse é o meu desejo. Autentificação, depois tem que ser via email, assim como fizemos. Com a aba k p engenharia, pode usar o mesmo servidor com as mesmas. Senhas que já está lá só leia nas credenciais lá"*

O que isso virou: **A regra mestra do acesso.** Ninguém cria conta; ele autoriza pela tela de Administração; a entrada é por convite no e-mail, reusando o servidor de e-mail do app de KPI.

Estado hoje: Vale hoje: 6 pessoas na lista — a dele (administrador) e cinco operadores.

**31/08/2026** — ele disse:

> *"sim, faz o porteiro olhar quem entra também"*

O que isso virou: A regra anterior só barrava conta NOVA; quem já existia seguia entrando. Com isto, **tirar alguém da lista corta o acesso na hora**, com a sessão já aberta no navegador dele.

Estado hoje: Provado em 25/09 e de novo em 06/10 — é a prova central da seção 5.

**31/08/2026** — ele disse:

> *"apaga a conta duplicada do leonardo sem o s esta errado"*

O que isso virou: Havia uma conta com o domínio digitado errado (sem o "s" de implementos), sem perfil — e ela **conseguia entrar**, sendo tratada como operador. Apagada.

**31/08/2026** — ele disse:

> *"pode publicar e deixar o repositório privado. Sobre o email host, o email post, email user, email pass, email from. Isso aí não estaria no skpi de engenharia, seria importante você fazer, de forma coerente, buscando as informações lá dentro"*

O que isso virou: Autorizou publicar; e as credenciais do e-mail vieram do app de KPI, sem gerar senha nova.

Estado hoje: ⚠ A parte do "repositório privado" **não deu certo** — ver a decisão de voltar a público, logo abaixo.

**31/08/2026** — ele disse:

> *"voltei pra público"*

O que isso virou: **Decisão negativa, e correta.** Eu havia recomendado fechar o repositório sem conferir o que isso implicava: o plano Hobby da Vercel não constrói repositório privado de ORGANIZAÇÃO, e todo deploy virou `Blocked` — nem tentava construir. O site congelou. Voltar a público destravou na hora.

Estado hoje: O código segue público. Fechar de verdade só movendo para a conta pessoal dele (onde privado passa no Hobby).

**31/08/2026** — ele disse:

> *"não consigo sair do adm."*

O que isso virou: A frase que destravou o defeito mais perigoso do dia: a tela de redefinir senha liberava o formulário para **qualquer sessão existente**. Ele, logado como administrador, abrindo um convite já usado, trocaria a **própria** senha achando que definia a de outra pessoa.

Estado hoje: Consertado: só vale a sessão nascida do link do convite.

**31/08/2026** — ele disse:

> *"funcionou, consegui definir a senha e entrar"*

O que isso virou: O ciclo inteiro percorrido por ele: cadastro → convite por e-mail → definir senha → primeiro login.

**31/08/2026** — ele disse:

> *"Quero que voce feche o codigo, termine isso. Eu nao vou rotacionar o. service_role, Creio que ja esteja correto pelo que eu te passei, e eu quero que voce analise todo o projeto vendo vulnerabilidade"*

O que isso virou: **Decisão negativa sobre a chave de serviço**, e ele estava certo: eu havia soado o alarme sem medir. Conferido depois — a chave nunca saiu da máquina dele, nenhum commit tem chave dentro.

Estado hoje: A chave nunca foi trocada, por decisão dele.

**31/08/2026** — ele disse:

> *"Preciso que voce crie uma regra que nao permita que ferramentas de mesmo codigo sejam gravadas, porque quando eu fiz esse aplicativo eu criei uma regra que impedia, elas que geravam numero sequencial"*

O que isso virou: A trava de patrimônio repetido (migração 005). ⚠ A regra que ele lembrava **existia, mas era outra**: a numeração automática das ORDENS (`OM-0001/26`). O patrimônio do equipamento sempre foi texto livre — por isso os repetidos entraram sem resistência.

**31/08/2026** — ele disse:

> *"Sobre o FJ 01 deixe como eu instrui a regra"*

O que isso virou: **Os repetidos que já existem FICAM.** A trava vale daqui para a frente; a limpeza é da manutenção, com a plaqueta na mão.

**31/08/2026** — ele disse:

> *"faz o seguinte, corrige nos que ficaram para traz, nao quero lixo residiual"*

O que isso virou: Mas o que era lixo de verdade saiu: registros de teste e sobras. A regra dele: cadastro sujo é problema, mesmo que não quebre nada.

**31/08/2026** — ele disse:

> *"FJ 22 e FJ 23 pode juntar, mantenha o do setor teto"*

O que isso virou: Decisão de cadastro, caso a caso. Mostra como ele decide repetido: pela realidade da fábrica, não pelo que está mais bonito no banco.

**31/08/2026** — ele disse:

> *"nao est FUNCIONANDO MAIS AS ABERTAS E EM ANDAMENTOS OU QUALQUER OUTRA, NAO CONSIGO VISUALIZAR OU EDITAR, VC MEXEU EM ALGO"*

O que isso virou: Em letras garrafais, e ele desconfiou de mim. **Não era regressão minha**: os filtros e a busca das Ordens sempre foram botões sem nenhuma ação ligada, e a coluna de AÇÕES ficava fora da tela, numa rolagem lateral sem nenhum sinal visível.

Estado hoje: Consertado: filtros e busca funcionam, e a coluna de ações ficou presa na borda direita.

**31/08/2026** — ele disse:

> *"sim, faz o botao de suspender faz tudo o que sugeriu"*

O que isso virou: Suspender e remover usuário pela tela. ⚠ Apagar, antes, removia só o perfil: a conta continuava no login e o e-mail continuava autorizado — a pessoa seguia entrando.

### 2 e 3 de setembro — o uso real cobra, e nasce o agendamento

**02/09/2026** — ele disse:

> *"Desde a nossa última atualização, usuários como Enio. Estou com problemas do cadastro de, lançar o planejamento manutenção ou coisa assim. Dá uma olhada e corrige."*

O que isso virou: Era a tela inteira caindo: todos os canais de tempo real usavam nome fixo, e duas telas escutando o mesmo nome derrubavam o app.

**03/09/2026** — ele disse:

> *"A partir de agendamento tem uma intenção preventiva para o Ed funcionar não está funcionando. Preciso que você analise, corrija, conserte e que possa ser programado manutenções trinta, sessenta, noventa"*

O que isso virou: **A preventiva nunca teve agendamento de verdade.** A tela calculava "última ordem + um número global de 30 dias" para a fábrica inteira — compressor, lixadeira e ponte rolante no mesmo ciclo. Virou prazo por máquina: 30, 60, 90, 180 ou 365 dias.

**03/09/2026** — ele disse:

> *"sim, preciso agendar data específica também"*

O que isso virou: Além do ciclo, uma **data marcada** por máquina, que vence o ciclo. A tela diz de onde veio a data ("data marcada" ou "pelo ciclo") — sem isso ninguém sabe qual regra está valendo.

**03/09/2026** — ele disse:

> *"faz o aviso por email quando a data chegar, e faz piscar a tela chamando a atençao para que ele de atenbçao"*

O que isso virou: O aviso diário por e-mail (todo dia às 8h de Brasília) e a linha vermelha pulsando na tela, com faixa no topo. Se não há nada vencendo, **não manda e-mail** — aviso que sempre chega vira ruído.

**03/09/2026** — ele disse:

> *"Todas as máquinas que não tiverem manutenção, prévia já trava trinta dias em todas pra que seja obrigado a fazer manutenção. Depois o cara da manutenção ajuste pra o período que for necessário. Sessenta, noventa, um ano."*

O que isso virou: **A trava dos 30 dias**: nenhuma máquina fica sem preventiva. E ele já disse, na mesma frase, que a manutenção depois ajusta.

Estado hoje: Está acontecendo exatamente assim: hoje são 78 máquinas em 30 dias, 69 em 365, 15 em 90, 6 em 60 e 3 em 180 — alguém ajustou, como ele mandou. Só 4 ficaram sem prazo nenhum.

### 14 e 25 de setembro — permissão de estoque, relatórios e o diário

**14/09/2026** — ele disse:

> *"de permissão para os operadores exluirem peças"*

O que isso virou: Migração 010. ⚠ Ela libera **qualquer pessoa autorizada**, não só quem tem cargo de operador — equipamento e ordem continuam só com o administrador, porque apagar equipamento leva as ordens junto, em cascata.

Estado hoje: 🔴 Esta migração ficou **escrita e sem valer** até 25/09: o banco respondia "pronto" e a peça continuava lá.

**25/09/2026** — ele disse:

> *"Preciso que abra a opção de exportar relatório dentro das ordens de manutenção com a possibilidade de preencher o que foi feito por cada uh, equipamento. Então, preciso ter um, um campo de observações onde o operador de manutenção escreva o que fez."*

O que isso virou: O relatório das Ordens, com 22 colunas, incluindo **O QUE FOI FEITO**. Na mesma rodada, todas as telas ganharam relatório e o do Painel virou completo, com 6 abas.

**25/09/2026** — ele disse:

> *"crie uma tela de logs, para que seja sabido o que foi criado o que foi excluido"*

O que isso virou: O **Registro de Atividade**: um gatilho dentro do banco grava criação, alteração (com de/para campo a campo) e exclusão (guardando a linha apagada) em 6 tabelas. Só o administrador lê, e **ninguém** — nem ele — consegue forjar ou apagar linha.

Estado hoje: Vivo e em uso: 378 linhas desde 28/09.

### 6 de outubro — a passagem

**06/10/2026** — ele disse:

> *"Crie uma, algo dentro do site, com tudo que a gente fez, todas as decisões desde o início, e uma leitura para outra conta, deixe 100% alinhado, para que eu possa trabalhar com outra conta."*

O que isso virou: Esta tela e o documento que você está lendo.

> ⚠ O QUE ESTAS DECISÕES ENSINAM SOBRE COMO ELE TRABALHA
> 
> · Ele **confere**. Perguntou se eu tinha medido antes de aceitar que a chave de serviço era um risco — e eu não tinha.
> · Ele **abre a tela**. Cinco dos sete defeitos de 31/08 só apareceram quando ele usou o app, não nos meus testes.
> · Ele **decide por caso** quando é cadastro ("mantenha o do setor teto"), e por regra quando é sistema ("não quero lixo residual").
> · Ele **diz não**: não assinou o plano pago, não trocou a chave de serviço, não deixou os repetidos antigos serem apagados.
> · Quando reclama em letras garrafais, geralmente há defeito — mas nem sempre o que ele imagina. Medir antes de concordar.

---

## 3. O que o app faz hoje

*Tela por tela, quem vê cada uma, e os defeitos medidos que ainda estão de pé*

É um site só, sem instalação: abre no navegador e no celular. Menu à esquerda, 12 itens, dois deles só para o administrador. **Três endereços são públicos e não pedem senha**: a tela de entrar, a de redefinir senha e a página do QR Code da máquina. Todo o resto exige sessão.

| tela | para que serve | quem vê |
|---|---|---|
| Painel | Os números do dia: equipamentos ativos, falhas, custo, pendências, MTBF/MTTR/disponibilidade e dois gráficos. Exporta relatório completo de 6 abas. | todos |
| Equipamentos | O cadastro das 175 máquinas, em grade com foto, em tabela, ou pelo Scanner (câmera). Histórico por máquina e o QR Code para imprimir. | todos |
| Ordens de manutenção | A lista das 131 ordens, com filtros, busca e a coluna de ações. É onde se fecha a ordem e onde o custo nasce. | todos |
| Planejamento | Três abas: Preventiva, Preditiva e Corretiva. É aqui que se escolhe o prazo (30/60/90/180/365) e a data marcada de cada máquina. | todos |
| Peças | As 39 peças, com estoque, mínimo, custo e fornecedor. Abaixo do mínimo fica vermelho. | todos |
| Custos | Custo total, mão de obra, peças, média por ordem; as 10 peças que mais custaram e o custo por setor. | todos |
| Análise com IA | Um relatório da IA sobre padrões de falha e previsões, e um bate-papo. Os dados que a IA vê são só os que aquela pessoa poderia ver. | todos |
| Usuários | Criar, suspender e remover. Ninguém cria a própria conta. | 🔴 só admin |
| Registro de Atividade | Quem criou, alterou e apagou o quê, com de/para. Contadores olham o banco inteiro; exporta tudo o que bate com o filtro. | 🔴 só admin |
| O projeto | Esta tela: a memória do projeto e a passagem para outra conta. | 🔴 só admin |
| Configurações | Quatro abas: meu perfil, empresa e custos, manutenção, sistema. | todos (só admin grava) |
| Página do QR (pública) | Sem senha: foto, nome, setor, patrimônio, situação e as ordens em aberto da máquina — sem custo e sem fornecedor. | qualquer um |

**A regra da próxima manutenção, em palavras.** Ela vive num arquivo só porque três lugares precisam dela — a tela de Planejamento, o sino de avisos e o e-mail diário — e antes cada um tinha a sua cópia (o sino avisava coisa diferente do que a tela mostrava). A ordem é: **1)** se a máquina tem data marcada e ela ainda não foi cumprida, vale a data marcada; **2)** senão, última manutenção daquele tipo + o prazo DA MÁQUINA; **3)** senão, o prazo padrão das Configurações. Sem histórico, a base é a data de aquisição (ou a do cadastro) — nunca "hoje", senão a data escorrega um dia a cada dia e a máquina nunca vence.

> 🔴 O QR CODE QUE SE COLA NA MÁQUINA NÃO ABRE A PÁGINA PÚBLICA.
> Medido no código: a janela do QR Code gera o endereço `/equipment/<id>`, que é tela de DENTRO do sistema e exige login. Quem apontar a câmera na etiqueta cai no login. A página pública — que existe, está protegida e devolve só as colunas certas — fica em `/status/<id>` e **ninguém chega nela pelo QR**. É o defeito mais caro da lista: a página foi construída com cuidado de segurança e está inalcançável no chão de fábrica.

> 🔴 SALVAR AS CONFIGURAÇÕES DÁ ERRO.
> A tela manda para o banco um campo "custo por setor" (`sector_costs`) que **não existe na tabela**. Conferido agora no banco: `column settings.sector_costs does not exist`. Então as abas Empresa e Manutenção não gravam — inclusive a taxa por hora, que governa todo o cálculo de custo.

> ⚠ TRÊS NÚMEROS DO PAINEL NÃO SÃO MEDIDOS, E UM FILTRO NUNCA ACHA NADA.
> · As setinhas "+12%", "−5%" e "+8%" dos cartões estão **escritas à mão no código** e nunca mudam, aconteça o que acontecer.
> · **MTTR = 0 h e disponibilidade = 100%** porque a coluna de horas paradas está zerada nas 131 ordens — e nenhuma tela do app pede esse número. O indicador existe, a medição não.
> · O filtro por tipo dos Equipamentos **nunca acha nada**: a lista oferece "equipment" e o cadastro grava "equipment_type" (todas as 175). Escolher qualquer tipo esvazia a tela.
> · A coluna "Causa raiz" dos relatórios sai sempre vazia: não há campo em tela nenhuma para preenchê-la.
> · A busca do cabeçalho, no topo de todas as telas, não tem ação ligada — é enfeite.

**Seis telas exportam planilha** (.xlsx, com a data no nome): Painel (6 abas), Equipamentos, Ordens (22 colunas, com O QUE FOI FEITO), Peças, Custos e Registro de Atividade. Quase todas usam o mesmo gerador (`src/lib/relatorio.ts`) — o Planejamento e as Ordens ainda montam a planilha por conta própria.

**Dois idiomas**, português e inglês, num arquivo só (`src/i18n.ts`). O português é a rede de segurança: se o navegador vier em qualquer outra língua, cai no português. ⚠ Nunca comparar idioma por igualdade — o navegador devolve `pt-BR`, e um `=== 'pt'` fez o sistema inteiro mostrar dinheiro em dólar.

---

## 4. Como funciona por dentro

*O servidor, o banco, quem pode o quê, e como se publica*

**O servidor inteiro cabe num arquivo**, `api/index.ts`. Na Vercel ele vira uma única função que atende tudo que começa com `/api`. O `server.ts` da raiz é só o atalho de `npm run dev`. ⚠ O README diz o contrário disso — não acredite nele neste ponto.

| rota | o que faz | quem pode chamar |
|---|---|---|
| `/api/health` | diz se o servidor está vivo, qual modelo de IA e **se** a chave existe (nunca o valor) | qualquer um, sem login |
| `/api/ai/analyze` | o relatório da IA: padrões de falha, previsões, sugestões | com login |
| `/api/ai/ask` | o bate-papo com a IA | com login |
| `/api/admin/create-user` | cria a conta e manda o convite por e-mail | 🔴 só admin |
| `/api/admin/delete-user` | remove dos TRÊS lugares: login, lista de autorizados e perfil | 🔴 só admin |
| `/api/admin/set-user-active` | suspende ou libera — vale na hora | 🔴 só admin |
| `/api/cron/manutencoes` | o aviso diário por e-mail, 11:00 UTC (8h de Brasília) | só a Vercel, com o segredo |

**`clienteDoChamador`: por que o servidor age COMO VOCÊ e não como "o sistema".** O servidor tem duas formas de falar com o banco. A chave de serviço pode tudo e ignora as regras — mas ela é **invisível para o registro de atividade**, que gravaria "sistema apagou usuário". Criar, apagar e suspender são as três operações mais graves do app; seriam justamente as anônimas. Por isso as escritas em tabela passam a usar o token de quem chamou, e a chave de serviço ficou só onde não há alternativa (criar a conta de login). **Provado**: suspender o Enio pela tela grava "Edson Farias", não "sistema".

**O banco: 7 tabelas.** `equipment` (as máquinas), `maintenance_orders` (as ordens), `parts` (o estoque), `profiles` (nome, e-mail e cargo), `usuarios_autorizados` (o porteiro: quem pode entrar, se está ativo, quem autorizou), `settings` (uma linha só, com os padrões da empresa) e `registro_atividade` (o diário).

⚠ **A autorização mora em DUAS tabelas**, e isso já divergiu: `profiles` diz o cargo, `usuarios_autorizados` diz se entra. Quem decide o acesso é a segunda.

**Quem pode o quê, em uma frase.** Toda regra do banco pergunta antes: *esta pessoa está na lista e com o crachá ativo?* Quem está, lê tudo, cria e edita equipamento, ordem e peça, e **apaga peça**. Só o administrador apaga equipamento (leva as ordens junto, em cascata) e ordem, muda as configurações, muda cargo ou e-mail de alguém, e lê o registro de atividade. O anônimo não alcança tabela nenhuma — a página do QR passa por duas funções que devolvem colunas escolhidas a dedo, uma máquina por vez.

> 🔴 A MIGRAÇÃO SÓ VALE DEPOIS DE COLADA. Não existe runner neste projeto. Escrever o `.sql` e comitar não muda um bit no banco — alguém tem de colar no SQL Editor do Supabase. E o editor **corta colagem longa, de forma irregular** (4.811 bytes numa vez, 2.307 noutra), então migração vai em blocos de ~700 bytes e sempre separada do relatório que a confere.

**Como se publica.** Não há pacote a montar: é `git push` no `main` do GitHub, e a Vercel constrói sozinha. O ramo local chama-se `publicar`. ⚠ Existe também um ramo `master` abandonado, com **9 commits que não estão na linha que publica** — quem der checkout nele por engano trabalha em cima de uma versão velha.

**As variáveis de ambiente** (só os nomes; os valores vivem no `.env.local` e na Vercel): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `CRON_SECRET`, e as cinco do e-mail (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`). ⚠ No `.env.local` da máquina a chave da IA está **vazia** — localmente a IA não funciona, e isso é esperado: ela só existe na Vercel.

**O aviso diário.** A Vercel chama a rota uma vez por dia; ela calcula o que venceu e o que vence hoje e manda para os administradores. Se não há nada, não manda. ⚠ Ele olha **só a preventiva** — e, como hoje a preventiva está com zero vencidas, o e-mail não está saindo. Isso é o desenho funcionando, não defeito; mas vale saber antes de estranhar o silêncio.

---

## 5. O estado medido

*Os números do banco no ar e o que está provado funcionando — medido em 06/10/2026*

> ✅ O app está **em uso de verdade**. O registro de atividade tem **378 linhas**, de 28/09 às 13:53 a 06/10 às 03:42, e **todas as 378 são do Enio Nunes da Silveira** — o operador da manutenção. Ele alterou 344 coisas, criou 32 e apagou 2. No dia 05/10 sozinho foram 236 ações. Isto não é um app entregue e parado: é um app que alguém abre todo dia.

| o que | quanto | detalhe |
|---|---|---|
| Equipamentos | 175 | 173 ativos · 1 em manutenção · 1 obsoleto · 24 setores · 6 de criticidade alta |
| Ordens de manutenção | 131 | 128 concluídas · 3 abertas · 93 corretivas · 37 preventivas · 1 preditiva |
| Custo somado das ordens | R$ 18.477,70 | soma de `maintenance_cost` nas 131 |
| Peças em estoque | 39 | cadastro de peça, com mínimo e custo unitário |
| Pessoas com acesso | 6 | 1 admin (Edson) e 5 operadores, todas ativas |
| Registro de atividade | 378 linhas | equipamentos 281 · peças 64 · ordens 33 |
| Configurações | mão de obra R$ 50/h | preventiva padrão 30 dias · preditiva 90 · corretiva 24 h |

**As 23 migrações, e o que está provado.** São 18 arquivos que mudam o banco e 5 que só leem (os `_relatorio.sql`, que não mudam um bit). Dos 18, **17 estão provados valendo** por comportamento — escrevendo e desfazendo, com sessão real de operador e de admin. O único que não dá para provar é a `004c`, que só RENOMEIA regras: o resultado é idêntico ao que já existia, então nem se consegue distinguir, nem importa.

| a regra | provada como | quando |
|---|---|---|
| `001` — ninguém anônimo lê a lista de pessoas | consulta anônima a `profiles` responde `42501 permission denied`; as duas funções do QR respondem 200 sem login | 25/09 |
| `002` — ninguém entra sem convite | a lista de autorizados existe e só o admin a lê | 25/09 |
| `003` + `004` — tirar da lista corta o acesso NA HORA | 🔴 a prova central: com o MESMO token já aberto, o operador ativo lê as 5 tabelas; suspenso, lê **zero em todas**; reliberado, volta a ler | 06/10 |
| `005a/b` — patrimônio repetido é barrado | cadastrar de novo o patrimônio `27` responde *"O patrimonio 27 ja pertence a: MAQUINA DE SOLDA"* | 06/10 |
| `006a` — ninguém se promove a administrador | o operador tentando virar admin responde *"Somente o administrador altera o cargo."* | 06/10 |
| `006b` — só o admin apaga equipamento | equipamento temporário: o operador mandou apagar e ele **continuou lá** | 06/10 |
| `006c` — só o admin muda as configurações | o operador mandou gravar mão de obra 999 e a taxa continuou **50** | 06/10 |
| `007` — regras das fotos | anônimo enviando → 403 · operador **envia** · operador apagando → 403 · admin apaga | 06/10 |
| `008` + `009` — prazo e data por máquina | as 4 colunas existem e vêm preenchidas | 25/09 |
| `010` — o operador apaga peça | o operador apaga e a peça some. Antes o banco dizia "pronto" e a peça ficava | 25/09 |
| `011a/b/c` — o registro de atividade | as 6 tabelas gravam; a rota de administração grava o NOME do admin, não "sistema"; nem o admin consegue forjar ou apagar linha | 25/09 |

> 🔴 NÃO COLE O ARQUIVO `004` achando que está completando algo. Os três (`004a`, `004b`, `004c`) só funcionam como bloco e na ordem, e rodar a `004` sozinha hoje **desfaz a 006 e a 010**: o operador volta a apagar equipamento — levando as ordens de manutenção junto, em cascata — e a regravar a taxa de mão de obra, que governa todo o cálculo de custo.

**O registro de atividade é prova, não anotação.** Ninguém escreve nele pela porta do app: a tabela não tem política de inserção nenhuma. Quem grava é um gatilho que roda por dentro do banco, nas 6 tabelas que importam. O admin **lê** e não consegue inserir, alterar nem apagar; o operador não vê nada; o anônimo leva `permission denied`. A única coisa que apaga dali é a chave de serviço — e isso é inevitável, porque é a mesma chave que faz o sistema funcionar.

---

## 6. As armadilhas

*Os erros que já foram cometidos aqui e a regra que nasceu de cada um — é a seção que mais economiza dia*

> 🔴 AS QUATRO QUE MAIS CUSTARAM, EM UMA LINHA CADA:
> 1. **O banco recusa dizendo "pronto".** Quando a regra barra, não vem erro: vem 204 com zero linhas. A tela dizia "removido" e nada tinha sido removido.
> 2. **Migração no repositório não vale nada** até alguém colar. A 010 e as 011b/011c ficaram escritas e sem valer por semanas.
> 3. **Regra de segurança no Postgres SOMA, não substitui.** Basta UMA liberar. Derrube as antigas varrendo o catálogo, nunca pelo nome.
> 4. **Só o comportamento prova.** Cinco dos sete defeitos de 31/08 só apareceram quando ele abriu a tela.

### Quando a prova mente

- **Prova que não sabe falhar não é prova.** Para mostrar que a chave da IA saiu do navegador, eu procurei a chave no arquivo publicado e não achei. Isso não vale nada sozinho — uma busca quebrada "passa" igual. Só valeu quando voltei de propósito ao código antigo e **vi a chave aparecer**.
- **Prova pelo mesmo caminho do defeito.** Conferi um deploy duas vezes pelo caminho errado e fiz o Edson olhar a Vercel à toa: primeiro procurei o nome de uma função dentro do arquivo publicado (a compilação encurta nomes, nunca apareceria), depois comparei a soma de verificação local com a publicada (elas diferem sempre, porque as variáveis entram na construção).
- **Prova que passa pelo motivo errado.** Ao provar que só o admin muda as configurações, a primeira tentativa "passou" — mas o banco havia recusado por falta de cláusula na consulta, não pela regra. Erro do teste, não defeito do sistema, e teria entrado como prova.
- **Reproduzir pelo caminho errado não reproduz.** Para provar que o travamento das telas tinha acabado, comecei navegando por endereço — e assim o app recarrega a cada vez e o defeito nunca aparece. Só valeu clicando no menu, oito trocas seguidas.
- **Resposta vazia por falha de rede é igual a resposta vazia por não haver dado.** Aconteceu três vezes num dia só. Uma lista vazia não prova ausência: pergunte pelo nome e veja se vem "não existe".
- **Conferência que passa verde por olhar o número errado.** Dois dos meus arquivos de conferência mentiam: um trazia "ESPERADO: 7 linhas", contagem de ANTES de uma migração — daria "conforme" justamente no cenário em que ela nunca rodou. O outro **calava** quando a trava não existia: ausência saía como silêncio, nunca como alarme.
- **Documento que diz "corrigido" um minuto depois do arquivo nascer é intenção, não aplicação.** Dois documentos deste repositório davam como resolvido o que ninguém tinha medido.

### Quando o conserto abre outro buraco

- 🔴 **O pior buraco do dia foi criado por mim.** Uma política que eu havia escrito horas antes deixava a pessoa editar a própria linha — e o cargo era só mais uma coluna dela. Um operador virou administrador com uma chamada. **Permissão de "editar a própria linha" precisa dizer QUAIS colunas**: a regra de linha não separa coluna sozinha.
- **Defeito que eu introduzi consertando outra coisa.** A trava do crachá, recém-posta, corria atrás do evento de troca de senha e disputava a mesma fechadura — a troca de senha falhava.
- **Gatilho de registro que estoura desfaz o trabalho de quem está usando.** Se a tabela do diário sumisse, o mecânico não conseguiria fechar a ordem dele. A gravação inteira ficou dentro de um tratamento que engole o erro e avisa no log do servidor: perder uma linha de diário é ruim; travar a manutenção é pior.
- **Alarme que aponta para tudo não aponta para nada.** A trava de 30 dias, cumprida ao pé da letra, pôs 161 máquinas vencendo no MESMO dia. O risco real era a equipe aprender a ignorar a tela vermelha.
- **Alarme sem medir.** Eu chamei de grave a chave de serviço no arquivo de exemplo e recomendei trocá-la — o que derrubaria o site junto. Ele perguntou se eu tinha conferido. Não tinha: a chave nunca saiu da máquina dele.

### Quando a ferramenta engana

- **O painel do Supabase abre no último projeto visitado.** A migração 001 falhou com "a coluna photo_url não existe" — não era defeito do SQL: era o editor aberto em outro banco. Há três bancos parecidos. **Identifique pelo conteúdo, nunca pelo nome.**
- **O arquivo de esquema do projeto mente sobre o banco** — errou a coluna `photo_url` e errou os nomes das regras de segurança, e foi esse segundo erro que deixou um usuário suspenso lendo tudo.
- **Repositório privado de organização não constrói no plano Hobby.** Os deploys viram `Blocked` — nem tenta construir — e o site congela na versão anterior, parecendo que "nada acontece".
- **Religar a integração não republica**, e variável de ambiente nova não entra em publicação que já existe.
- **Servidor que morre calado: faça-o falar.** Toda rota `/api` respondia erro desde março, inclusive a que só diz "ok". Eu anunciei uma causa errada; a resposta veio quando publiquei o servidor dizendo o próprio erro — ele morava no lugar errado e o construtor não o levava junto.
- **O e-mail de convite chegava apontando para `localhost`**, porque a configuração do Supabase vinha dos tempos do AI Studio. Sempre conferir o endereço de retorno do link gerado, não a intenção do código.
- **Depósito "público" libera leitura, não envio.** A foto de equipamento nunca funcionou: primeiro porque o depósito não existia, depois porque faltava a regra de envio.

### Coisas pequenas que custaram caro

- **Uma letra no código do idioma** pôs tudo em dólar: o navegador devolve `pt-BR` e o código perguntava `=== 'pt'`. Vinte lugares em oito arquivos.
- **A data da preventiva escorregava** e a máquina nunca vencia: sem histórico, a base era HOJE, então a próxima data andava um dia a cada dia. Eram 161 de 170 máquinas assim.
- **Canal de tempo real com nome fixo** derruba a tela inteira quando duas telas escutam o mesmo nome.
- **Erro engolido e nunca repetido:** a coluna "criado por" dizia "unknown_user" para sempre, porque a busca dos nomes falhava em silêncio logo após o login e nada tentava de novo.
- **Botões decorativos** são o defeito mais comum deste app: filtros, busca e "Exportar Relatório" que nunca fizeram nada. Ainda há um na busca do cabeçalho.
- **O botão existia e ninguém alcançava:** a coluna de ações ficava fora da tela, numa rolagem lateral sem nenhum sinal visível.
- **Minha edição não pegou e eu não conferi:** o convite saiu com "Senha: undefined" na mão do usuário.
- **Tirar os acentos "por precaução"** deixou o e-mail com cara de rascunho. Era medo infundado.
- **Filtro e contador que só veem a janela carregada.** No Registro de Atividade, exclusão é o evento mais raro — logo o primeiro a cair fora da janela. O cartão diria 0 justamente para a pergunta que motivou a tela.

> 🔴 E A ARMADILHA QUE AINDA ESTÁ ARMADA: **rodar o arquivo `004` hoje DESFAZ a `006` e a `010`.** Os três (`004a`, `004b`, `004c`) só funcionam como bloco e na ordem. Rodar a `004` isolada derruba as regras atuais e recria apenas as daquela época: o operador volta a apagar equipamento — levando as ordens em cascata — e a regravar a taxa de mão de obra.

---

## 7. O que falta

*Em ordem, separando o que espera decisão dele do que é trabalho*

> 🔴 ESPERANDO O BOTÃO DELE — há trabalho pronto e **não publicado**:
> · 1 commit local (`70ff710`, as conferências corrigidas e o retrato medido das 23 migrações) que nunca foi para o GitHub;
> · 3 arquivos alterados e nem comitados: o conserto da **data impossível** (abaixo).
> Enquanto isso não sobe, o site segue na versão anterior.

**1. O conserto da data impossível, pronto e fora do ar.** Duas máquinas têm data de aquisição digitada errada: `fj02` (ponte rolante 02 VERMELHA) com **20258-08-10** e `fj94` (máquina de solda) com **0022-07-09**. A regra antiga levava essa data crua para a tela e o **Planejamento inteiro ficava em branco**. O conserto está escrito em `src/lib/manutencao.ts`, `api/index.ts` e `src/pages/MaintenancePlanning.tsx`: data com ano fora de 1900–2100 é pulada, e a tela mostra `—` em vez de estourar. Provado: o defeito aparece nos 2 cadastros reais com a regra antiga e a regra de agora devolve data usável nos 4 casos de teste. **Falta publicar** — e falta ele dizer qual é a data certa das duas máquinas (o mais provável é `2025-08-10` e `2022-07-09`, mas isso é palpite meu sobre o dado dele).

**2. Quatro defeitos medidos no código e no banco, todos de pé hoje.** Nenhum derruba o app, e todos têm conserto pequeno — mas três deles fazem a tela mentir, que é pior do que falhar:

· 🔴 **O QR Code colado na máquina não abre a página pública.** Ele aponta para a tela de dentro do sistema; quem apontar a câmera cai no login. A página pública existe, está protegida e ninguém chega nela pelo caminho que foi feito para isso.
· 🔴 **Salvar as Configurações dá erro**, porque a tela manda um campo que não existe na tabela. A taxa por hora — que governa todo o custo — não grava.
· **O filtro por tipo dos Equipamentos esvazia a lista sempre** (compara "equipment" com "equipment_type").
· **MTTR 0 h e disponibilidade 100%** no Painel, porque ninguém nunca informou hora parada — e não existe campo no app para informar. Junto, as setinhas "+12%", "−5%" e "+8%" são fixas no código.

**3. A aba Preditiva nunca foi configurada, e por isso diz que 171 de 175 máquinas estão vencidas.** Medido hoje: nenhuma máquina tem prazo preditivo próprio e nenhuma tem data preditiva marcada, então todas caem no padrão de 90 dias contado desde a aquisição — e vencem. Existe **1 ordem preditiva** no banco inteiro. Ou a aba se configura, ou ela devia ficar escondida: hoje ela só ensina a ignorar vermelho. **Decisão dele.**

**4. A pilha de preventivas se desfez — mas virou outra pilha.** Em 25/09, 153 das 175 máquinas venciam no mesmo dia (03/10). Alguém espalhou as datas desde então (o registro mostra 236 ações do Enio em 05/10). Hoje está assim: **93 máquinas em 05/11**, 27 em 06/11, 13 em 09/10, 6 em 10/10, 6 em 07/11 e o resto espalhado — mais **6 máquinas sem data nenhuma**. A pilha andou um mês; ela não foi desfeita. No dia 05/11 a tela vai piscar em 93 máquinas de uma vez, e alarme que aparece em tudo ensina todo mundo a ignorar alarme.

**5. Nenhuma ordem preventiva foi registrada desde 01/10.** As datas estão sendo ajustadas na mão, mas a manutenção preventiva não está virando ordem no sistema. Sem ordem não há histórico, e sem histórico a próxima data continua saindo da data marcada em vez de sair do que foi feito. Vale perguntar a ele se é assim que ele quer.

**6. 14 códigos de patrimônio repetidos, em 29 máquinas.** O pior é o **FJ110 com três**: APERTADEIRA e APERTADEIRA BATERIA em ACESSÓRIOS, e uma LIXADEIRA em PINTURA. Vários são digitação em cima de máquina que já existia — `FJ050` e `FJ051` têm uma "DUBRADEIRA", e `FJ052` tem uma "LAESER" no setor "CORTE DOBRA" enquanto as irmãs estão em "COTE DOBRA". Histórico e custo se misturam, e o QR da máquina fica ambíguo. **Ele já decidiu que os que existem ficam** — a limpeza é da manutenção, com a plaqueta na mão. A trava impede NOVOS repetidos desde a migração 005.

**7. O código está público.** O repositório `engenharia-tech/CMMSJIMP` é público porque o plano Hobby da Vercel **não constrói repositório privado de organização** — quando se tornou privado, todo deploy virou `Blocked` e o site congelou na versão anterior. Ele disse que não assinaria o plano pago. O caminho que sobra é mover o repositório para a conta pessoal dele, onde privado passa no Hobby. Nunca houve segredo no histórico — isso foi conferido commit por commit.

**8. Dois ajustes pequenos, nenhum urgente.** (a) O Enio está como `engineer` nos perfis e `operator` na lista de autorizados; hoje não muda nada (no código só `admin` abre porta, `engineer` é só a cor da etiqueta), mas se a conta dele for recriada pela tela ele volta rebaixado, calado. (b) Se alguém mudar o próprio nome, aquela linha do registro aparece com o nome **novo** no campo "quem" — o e-mail está sempre certo. Conserto de uma linha, quando ele quiser.

**9. Limpeza de cadastro, decisão dele.** Nomes digitados errado que ainda estão lá: `DUBRADEIRA`, `LAESER`, e o setor `COTE DOBRA` convivendo com `CORTE DOBRA`. São 24 setores escritos à mão, sem lista fixa — por isso divergem. Uma lista fechada de setores resolveria na origem.

> ⚠ E uma coisa que não é do app: na Vercel, conferir se a opção de **usar os dados deste projeto para melhorar modelos** está desligada. Ela apareceu ligada numa inspeção anterior e nunca foi confirmada como desligada.

---

## 8. O primeiro dia da conta nova

*A ordem exata para chegar, conferir que nada quebrou, e só então mexer*

> ⚠ Faça os passos 1 a 5 ANTES de escrever uma linha de código. Eles levam poucos minutos e já pouparam dias: três vezes neste projeto eu trabalhei em cima de uma suposição errada sobre o estado do banco.

**1. Ler este documento inteiro, e depois a memória longa**

Este arquivo é o retrato. A história detalhada de 24/08 a 02/09 está na memória `cmms-jimp-manutencao.md` — se a sua conta não a tem, ela está na pasta de memória exportada; copie para a sua.

**2. Conferir que o site está no ar e com qual configuração**

A resposta diz o modelo de IA em uso e se a chave existe. Se `temChaveIA` vier `false`, as duas telas de IA não funcionam e o motivo é a chave, não o código.

```bash
curl -s https://cmms.jimpnexus.com/api/health
```

**3. Conferir que o código compila e que não há trabalho pendente de outra sessão**

🔴 O `git status` importa muito aqui: este diretório é compartilhado entre sessões, e já houve conserto meu esperando em arquivo não comitado. Nunca comite em bloco o que você não escreveu — veja o diff primeiro.

```bash
cd "app/Manutenção/cmms-jimp"
git status --short
git status -sb | head -1
npx tsc --noEmit
```

**4. Conferir o banco por fora, sem escrever nada**

Isto conta as linhas das tabelas que importam com a chave de serviço do `.env.local`. Compare com os números da seção 5: se divergirem muito, alguém trabalhou no meio e o retrato envelheceu.

```bash
svc=$(grep ^SUPABASE_SERVICE_ROLE_KEY= .env.local | cut -d= -f2-)
H=https://buqfrfphieeahlnxhnpp.supabase.co/rest/v1
for t in equipment maintenance_orders parts profiles registro_atividade; do
  printf "%-22s" "$t"
  curl -s -D - -o /dev/null -H "apikey: $svc" -H "Authorization: Bearer $svc" \
    -H "Prefer: count=exact" -H "Range: 0-0" "$H/$t?select=id" |
    grep -i ^content-range | tr -d "\r" | sed "s#.*/##"
done
```

**5. Conferir que as regras do banco continuam valendo**

A prova central é a suspensão: com o mesmo token já aberto, um operador suspenso tem de passar a ler ZERO linhas nas 5 tabelas. Se ele continuar lendo, alguma regra se desfez e isso é a coisa mais grave que pode acontecer neste app. Faça a suspensão pela rota `/api/admin/set-user-active` e **relibere no mesmo comando**, conferindo o estado final.

**6. Para rodar na sua máquina**

O `npm run dev` sobe o app na porta 3000 lendo o `.env.local`. Ele fala com o banco de PRODUÇÃO — não há banco de teste. Então: olhar pode, escrever só com cuidado e desfazendo.

```bash
npm install
npm run dev
```

**7. Para publicar**

Publicar é push no `main` do GitHub: a Vercel constrói e troca o site. **É decisão dele** — prepare o commit, mostre o que muda, e espere a palavra.

```bash
git add -A && git commit -m "..." && git push origin HEAD:main
```

**8. Para corrigir este próprio documento**

Corrija `src/dados/projeto.ts` e gere de novo. Nunca edite o `.md` à mão: a tela "O projeto" lê a mesma fonte, e texto duplicado envelhece em velocidades diferentes.

```bash
npx tsx scripts/gerar-passagem.ts
```

