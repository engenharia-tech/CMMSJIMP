/**
 * A tela "O projeto": a memória do CMMS JIMP dentro do próprio CMMS.
 *
 * Pedido do Edson (06/10/2026): "Crie uma, algo dentro do site, com tudo que a
 * gente fez, todas as decisões desde o início, e uma leitura para outra conta,
 * deixe 100% alinhado, para que eu possa trabalhar com outra conta."
 *
 * O conteúdo NÃO mora aqui — mora em src/dados/projeto.ts, e o botão de baixar
 * gera o documento da outra conta dos mesmos dados. Ver o aviso em
 * src/dados/projeto-tipos.ts sobre por que não existe uma segunda cópia.
 *
 * Só o admin alcança esta tela (a rota em App.tsx e o menu em Sidebar.tsx usam
 * a mesma régua): ela conta como o acesso é desenhado por dentro, e isso não é
 * assunto para a tela de quem só registra manutenção.
 */
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  BookOpen, Download, Copy, Search, ChevronRight, AlertTriangle,
  CheckCircle2, AlertCircle, Quote, Terminal,
} from 'lucide-react';
import { META, PROJETO } from '@/dados/projeto';
import { montarMarkdown, type Bloco, type Secao } from '@/dados/projeto-tipos';
import { cn } from '@/lib/utils';

/** Todo o texto de um bloco, para a busca saber onde procurar. */
function textoDoBloco(b: Bloco): string {
  switch (b.tipo) {
    case 'texto': return b.texto;
    case 'lista': return b.itens.join(' ');
    case 'aviso': return b.texto;
    case 'decisao': return `${b.quando} ${b.fala} ${b.virou} ${b.estado || ''}`;
    case 'tabela': return [...b.cabecalho, ...b.linhas.flat()].join(' ');
    case 'passo': return `${b.titulo} ${b.detalhe} ${b.comando || ''}`;
  }
}

const CORES_AVISO: Record<string, { caixa: string; icone: React.ElementType }> = {
  critico: {
    caixa: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/40 text-red-900 dark:text-red-200',
    icone: AlertTriangle,
  },
  atencao: {
    caixa: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200',
    icone: AlertCircle,
  },
  ok: {
    caixa: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200',
    icone: CheckCircle2,
  },
};

/**
 * Negrito de **asteriscos**, itálico de *um asterisco* e `código`, sem puxar
 * uma biblioteca de markdown inteira para três marcações.
 *
 * ⚠ A ordem do regex importa: `\*\*...\*\*` tem de vir ANTES de `\*...\*`,
 * senão o negrito é lido como dois itálicos vazios e os asteriscos aparecem
 * crus na tela — foi o que aconteceu na primeira versão com as citações.
 */
function Rico({ texto }: { texto: string }) {
  const pedacos = texto.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return (
    <>
      {pedacos.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) {
          return <strong key={i} className="font-bold text-slate-900 dark:text-white">{p.slice(2, -2)}</strong>;
        }
        if (p.length > 2 && p.startsWith('*') && p.endsWith('*')) {
          return <em key={i} className="italic text-slate-700 dark:text-slate-200">{p.slice(1, -1)}</em>;
        }
        if (p.startsWith('`') && p.endsWith('`')) {
          return (
            <code key={i} className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[0.85em] font-mono text-blue-700 dark:text-blue-300 break-all">
              {p.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function BlocoView({ b }: { b: Bloco }) {
  switch (b.tipo) {
    case 'texto': {
      // Um bloco que começa com '### ' é subtítulo. No documento em Markdown
      // ele já vira título sozinho; aqui precisava de tratamento, senão os
      // três jogos da velha apareciam crus no meio do texto.
      if (b.texto.startsWith('### ')) {
        return (
          <h3 className="pt-4 text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {b.texto.slice(4)}
          </h3>
        );
      }
      return (
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-line">
          <Rico texto={b.texto} />
        </p>
      );
    }

    case 'lista':
      return (
        <ul className="space-y-2">
          {b.itens.map((i, n) => (
            <li key={n} className="flex gap-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              <ChevronRight className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
              <span><Rico texto={i} /></span>
            </li>
          ))}
        </ul>
      );

    case 'aviso': {
      const { caixa, icone: Icone } = CORES_AVISO[b.nivel];
      return (
        <div className={cn('flex gap-3 rounded-2xl border p-4', caixa)}>
          <Icone className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed font-medium whitespace-pre-line"><Rico texto={b.texto} /></p>
        </div>
      );
    }

    case 'decisao':
      return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 overflow-hidden">
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {b.quando}
            </span>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex gap-3">
              <Quote className="w-4 h-4 shrink-0 mt-1 text-blue-500" />
              <p className="text-sm italic leading-relaxed text-slate-900 dark:text-white font-medium">
                {b.fala}
              </p>
            </div>
            <div className="pl-7 space-y-2">
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mr-2">virou</span>
                <Rico texto={b.virou} />
              </p>
              {b.estado && (
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mr-2">hoje</span>
                  <Rico texto={b.estado} />
                </p>
              )}
            </div>
          </div>
        </div>
      );

    case 'tabela':
      return (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60">
              <tr>
                {b.cabecalho.map((c, i) => (
                  <th key={i} className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {b.linhas.map((l, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  {l.map((c, j) => (
                    <td key={j} className={cn(
                      'px-4 py-2.5 align-top text-slate-600 dark:text-slate-300',
                      j === 0 && 'font-semibold text-slate-900 dark:text-white whitespace-nowrap',
                    )}>
                      <Rico texto={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'passo':
      return (
        <div className="space-y-2">
          <p className="text-sm font-bold text-slate-900 dark:text-white">{b.titulo}</p>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300"><Rico texto={b.detalhe} /></p>
          {b.comando && (
            <div className="flex items-start gap-2 rounded-xl bg-slate-900 dark:bg-black/60 px-4 py-3 overflow-x-auto">
              <Terminal className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <code className="text-xs font-mono text-emerald-300 whitespace-pre">{b.comando}</code>
            </div>
          )}
        </div>
      );
  }
}

export default function ProjetoPage() {
  const { t } = useTranslation();
  const [busca, setBusca] = useState('');

  const markdown = useMemo(() => montarMarkdown(META, PROJETO), []);

  const visiveis: Secao[] = useMemo(() => {
    const texto = busca.trim().toLowerCase();
    if (!texto) return PROJETO;
    return PROJETO
      .map((s) => ({
        ...s,
        blocos: s.blocos.filter((b) => textoDoBloco(b).toLowerCase().includes(texto)),
      }))
      .filter((s) => s.blocos.length > 0 || s.titulo.toLowerCase().includes(texto) || s.subtitulo.toLowerCase().includes(texto));
  }, [busca]);

  const achados = visiveis.reduce((n, s) => n + s.blocos.length, 0);

  const baixar = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PASSAGEM PARA OUTRA CONTA - CMMS (${META.medidoEm.replace(/\//g, '-')}).md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('projeto_baixado'));
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      toast.success(t('projeto_copiado'));
    } catch {
      toast.error(t('projeto_copiar_falhou'));
    }
  };

  const irPara = (id: string) => {
    document.getElementById(`secao-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex gap-4">
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/20">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{t('projeto')}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t('projeto_subtitulo')}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={copiar}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Copy className="w-4 h-4" />
            {t('projeto_copiar')}
          </button>
          <button
            onClick={baixar}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-bold text-white shadow-lg shadow-blue-900/20 transition-colors"
          >
            <Download className="w-4 h-4" />
            {t('projeto_baixar')}
          </button>
        </div>
      </div>

      {/* A ficha do projeto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {[
          { r: t('projeto_medido_em'), v: META.medidoEm, destaque: true },
          { r: t('projeto_no_ar'), v: META.noAr },
          { r: t('projeto_codigo'), v: META.codigo },
          { r: t('projeto_banco'), v: META.banco },
          { r: t('projeto_repositorio'), v: META.repositorio },
        ].map((c) => (
          <div key={c.r} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{c.r}</p>
            <p className={cn(
              'mt-1 text-sm break-all',
              c.destaque ? 'font-black text-blue-600 dark:text-blue-400' : 'font-semibold text-slate-700 dark:text-slate-200',
            )}>
              {c.v}
            </p>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={t('projeto_buscar')}
          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {busca && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
            {achados}
          </span>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Índice */}
        <nav className="lg:w-64 shrink-0">
          <div className="lg:sticky lg:top-6 space-y-1">
            {PROJETO.map((s) => (
              <button
                key={s.id}
                onClick={() => irPara(s.id)}
                className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <span className="text-blue-500 font-black mr-2">{s.numero}</span>
                {s.titulo}
              </button>
            ))}
          </div>
        </nav>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0 space-y-8">
          {visiveis.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-12">{t('projeto_nada_encontrado')}</p>
          )}
          {visiveis.map((s) => (
            <section key={s.id} id={`secao-${s.id}`} className="scroll-mt-6 space-y-4">
              <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
                <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  <span className="text-blue-500 mr-2">{s.numero}.</span>
                  {s.titulo}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{s.subtitulo}</p>
              </div>
              <div className="space-y-4">
                {/* O key vai no Fragment: BlocoView devolve uma uniao de elementos
                    e os tipos do React 19 nao aceitam key direto nela. O Fragment
                    nao cria nada no HTML, entao o espacamento do space-y continua. */}
                {s.blocos.map((b, i) => <React.Fragment key={i}><BlocoView b={b} /></React.Fragment>)}
              </div>
            </section>
          ))}
        </div>
      </div>

      <p className="text-xs text-center text-slate-400 dark:text-slate-500 pt-4 border-t border-slate-100 dark:border-slate-800">
        {t('projeto_fonte_unica')}
      </p>
    </div>
  );
}
