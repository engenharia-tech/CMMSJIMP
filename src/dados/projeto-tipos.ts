/**
 * Os tipos da memória do projeto, e o gerador do documento de passagem.
 *
 * 🔴 POR QUE ISTO EXISTE EM UM LUGAR SÓ.
 * A tela "O projeto" (src/pages/Projeto.tsx) e o documento que a outra conta
 * Claude lê (docs/PASSAGEM PARA OUTRA CONTA - CMMS.md) saem DOS MESMOS DADOS,
 * em src/dados/projeto.ts. Não existe uma segunda cópia do texto.
 *
 * Isso não é capricho de organização: este projeto já foi mordido três vezes
 * por documento que dizia uma coisa e banco que dizia outra — a conferência
 * com "ESPERADO: 7 linhas" de antes da migração 006, o retrato do banco que
 * listava migrações como aplicadas sem ninguém ter conferido, e a auditoria
 * que dava três defeitos como corrigidos um minuto depois de os arquivos
 * nascerem. Texto duplicado envelhece em velocidades diferentes. Aqui, mexer
 * num lugar muda os dois.
 */

export type Nivel = 'critico' | 'atencao' | 'ok';

export type Bloco =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'lista'; itens: string[] }
  | { tipo: 'aviso'; nivel: Nivel; texto: string }
  | { tipo: 'decisao'; quando: string; fala: string; virou: string; estado?: string }
  | { tipo: 'tabela'; cabecalho: string[]; linhas: string[][] }
  | { tipo: 'passo'; titulo: string; detalhe: string; comando?: string };

export interface Secao {
  id: string;
  numero: number;
  titulo: string;
  /** Uma linha dizendo para que serve a seção. Aparece embaixo do título. */
  subtitulo: string;
  blocos: Bloco[];
}

export interface MetaProjeto {
  /** Data do retrato, escrita à mão: é a data em que estes números foram MEDIDOS. */
  medidoEm: string;
  app: string;
  noAr: string;
  codigo: string;
  banco: string;
  repositorio: string;
}

// --------------------------------------------------------------------------
// O gerador do documento. Markdown puro, sem dependência nenhuma, para poder
// rodar tanto no navegador (botão de baixar na tela) quanto no node (script).
// --------------------------------------------------------------------------

function escaparCelula(c: string) {
  return c.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function blocoParaMarkdown(b: Bloco): string {
  switch (b.tipo) {
    case 'texto':
      return b.texto;

    case 'lista':
      return b.itens.map((i) => `- ${i}`).join('\n');

    case 'aviso': {
      const marca = b.nivel === 'critico' ? '🔴' : b.nivel === 'atencao' ? '⚠' : '✅';
      return `> ${marca} ${b.texto.replace(/\n/g, '\n> ')}`;
    }

    case 'decisao': {
      const linhas = [`**${b.quando}** — ele disse:`, '', `> *"${b.fala}"*`, '', `O que isso virou: ${b.virou}`];
      if (b.estado) linhas.push('', `Estado hoje: ${b.estado}`);
      return linhas.join('\n');
    }

    case 'tabela': {
      const cab = `| ${b.cabecalho.map(escaparCelula).join(' | ')} |`;
      const sep = `|${b.cabecalho.map(() => '---').join('|')}|`;
      const corpo = b.linhas.map((l) => `| ${l.map(escaparCelula).join(' | ')} |`).join('\n');
      return [cab, sep, corpo].join('\n');
    }

    case 'passo': {
      const linhas = [`**${b.titulo}**`, '', b.detalhe];
      if (b.comando) linhas.push('', '```bash', b.comando, '```');
      return linhas.join('\n');
    }
  }
}

export function montarMarkdown(meta: MetaProjeto, secoes: Secao[]): string {
  const cabecalho = [
    `# ${meta.app} — passagem para outra conta`,
    '',
    `> **Leia este arquivo inteiro antes de mexer em qualquer coisa.** Ele é a memória do`,
    `> projeto: o que o app é, o que o Edson decidiu, o que está provado funcionando, o que`,
    `> está quebrado e o que falta. Memória de conversa não viaja entre contas Claude — este`,
    `> arquivo é a ponte.`,
    '',
    `| | |`,
    `|---|---|`,
    `| Retrato medido em | **${meta.medidoEm}** |`,
    `| No ar | ${meta.noAr} |`,
    `| Código | \`${meta.codigo}\` |`,
    `| Banco | ${meta.banco} |`,
    `| Repositório | ${meta.repositorio} |`,
    '',
    `⚠ **Este arquivo é GERADO.** Ele sai de \`src/dados/projeto.ts\` pelo comando`,
    '`npx tsx scripts/gerar-passagem.ts`. A mesma fonte desenha a tela **O projeto** dentro',
    'do app. Para corrigir qualquer coisa aqui, corrija lá e gere de novo — se você editar',
    'este arquivo à mão, a tela e o documento passam a discordar, que é o defeito que este',
    'projeto já teve três vezes.',
    '',
    '## Índice',
    '',
    ...secoes.map((s) => `${s.numero}. [${s.titulo}](#${s.numero}-${s.titulo.toLowerCase().replace(/[^a-z0-9áàâãéêíóôõúç ]/gi, '').trim().replace(/\s+/g, '-')}) — ${s.subtitulo}`),
    '',
    '---',
    '',
  ];

  const corpo = secoes.map((s) => {
    const partes = [`## ${s.numero}. ${s.titulo}`, '', `*${s.subtitulo}*`, ''];
    for (const b of s.blocos) {
      partes.push(blocoParaMarkdown(b), '');
    }
    return partes.join('\n');
  });

  return [...cabecalho, corpo.join('\n---\n\n')].join('\n').replace(/\n{4,}/g, '\n\n\n') + '\n';
}
