import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollText, Search, Download, Plus, Pencil, Trash2,
  RefreshCw, ChevronDown, ChevronRight, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/supabase';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { baixarPlanilha } from '@/lib/relatorio';

/**
 * Registro de atividade: o que foi criado, alterado e apagado.
 *
 * A tela so LE. Quem escreve e o gatilho no banco (migracao 011), que roda
 * como dono — nada aqui pode forjar nem apagar uma linha do registro.
 */

interface Registro {
  id: number;
  quando: string;
  transacao: number;
  tabela: string;
  acao: 'criou' | 'alterou' | 'apagou';
  registro_id: string | null;
  descricao: string | null;
  quem_nome: string | null;
  quem_email: string | null;
  alteracoes: Record<string, { de: any; para: any }> | null;
  dados: Record<string, any> | null;
}

const NOME_DA_TABELA: Record<string, string> = {
  equipment: 'Equipamento',
  maintenance_orders: 'Ordem de manutenção',
  parts: 'Peça',
  profiles: 'Usuário',
  usuarios_autorizados: 'Autorização de acesso',
  settings: 'Configurações',
};

/** Nome de campo em português, para a linha de alteração ser legível. */
const NOME_DO_CAMPO: Record<string, string> = {
  equipment_name: 'equipamento', registration_number: 'patrimônio', sector: 'setor',
  criticality: 'criticidade', status: 'status', manufacturer: 'fabricante',
  model: 'modelo', serial_number: 'nº de série', acquisition_date: 'aquisição',
  expected_life: 'vida útil', photo_url: 'foto', notes: 'observações',
  preventive_interval_days: 'preventiva a cada (dias)',
  predictive_interval_days: 'preditiva a cada (dias)',
  preventive_scheduled_date: 'data marcada (preventiva)',
  predictive_scheduled_date: 'data marcada (preditiva)',
  order_number: 'nº da ordem', requester: 'solicitante', operator: 'executante',
  action_type: 'tipo', priority: 'prioridade', root_cause: 'causa raiz',
  problem_description: 'problema relatado', action_taken: 'o que foi feito',
  labor_hours: 'horas', labor_cost: 'mão de obra', parts_cost: 'peças',
  maintenance_cost: 'custo total', downtime_hours: 'parada (h)',
  completion_date: 'conclusão', parts_list: 'peças usadas',
  part_code: 'código', part_name: 'peça', stock_quantity: 'estoque',
  minimum_stock: 'estoque mínimo', unit_cost: 'custo unitário',
  supplier: 'fornecedor', unit: 'unidade',
  full_name: 'nome', email: 'e-mail', role: 'cargo', ativo: 'ativo',
  company_name: 'empresa', labor_rate: 'taxa de mão de obra',
};

const campo = (c: string) => NOME_DO_CAMPO[c] || c;

function valor(v: any): string {
  if (v === null || v === undefined || v === '') return '(vazio)';
  if (typeof v === 'boolean') return v ? 'sim' : 'não';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

const quandoBR = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const ESTILO_DA_ACAO: Record<string, { cor: string; Icone: any; rotulo: string }> = {
  criou:   { cor: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30', Icone: Plus,   rotulo: 'criou' },
  alterou: { cor: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/30',                  Icone: Pencil, rotulo: 'alterou' },
  apagou:  { cor: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/30',                        Icone: Trash2, rotulo: 'apagou' },
};

const LIMITE = 500;

export default function LogsPage() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroAcao, setFiltroAcao] = useState<'todas' | 'criou' | 'alterou' | 'apagou'>('todas');
  const [filtroTabela, setFiltroTabela] = useState<string>('todas');
  const [contagem, setContagem] = useState({ criou: 0, alterou: 0, apagou: 0 });
  const [total, setTotal] = useState(0);
  const [aberto, setAberto] = useState<number | null>(null);

  /**
   * A consulta e montada no SERVIDOR.
   *
   * A primeira versao baixava as 500 mais recentes e filtrava em memoria - e
   * exclusao e o evento mais raro dos tres, entao era o primeiro a cair fora da
   * janela: o cartao "apagou" mostraria 0 e o filtro devolveria lista vazia,
   * justo a pergunta que motivou a tela.
   */
  const consulta = () => {
    let q = supabase.from('registro_atividade').select('*');
    if (filtroAcao !== 'todas') q = q.eq('acao', filtroAcao);
    if (filtroTabela !== 'todas') q = q.eq('tabela', filtroTabela);
    const texto = busca.trim();
    if (texto) {
      const like = `%${texto.replace(/[%_,]/g, '')}%`;
      q = q.or(`descricao.ilike.${like},quem_nome.ilike.${like},quem_email.ilike.${like}`);
    }
    return q;
  };

  const carregar = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const { data, error } = await consulta()
        .order('quando', { ascending: false })
        .limit(LIMITE);
      if (error) throw error;
      setRegistros((data || []) as Registro[]);

      // Os contadores contam o BANCO INTEIRO, nao o que veio na pagina: um
      // cartao em negrito dizendo 0 exclusoes e uma afirmacao, nao uma amostra.
      const contar = async (acao: string) => {
        let c = supabase.from('registro_atividade').select('id', { count: 'exact', head: true });
        if (filtroTabela !== 'todas') c = c.eq('tabela', filtroTabela);
        const { count } = await c.eq('acao', acao);
        return count || 0;
      };
      const [criou, alterou, apagou] = await Promise.all([
        contar('criou'), contar('alterou'), contar('apagou'),
      ]);
      setContagem({ criou, alterou, apagou });
      setTotal(criou + alterou + apagou);
    } catch (e: any) {
      // Sem a migracao 011 no banco, a tabela nao existe: dizer isso em vez
      // de mostrar uma tela vazia que parece "nunca aconteceu nada".
      const semTabela = /does not exist|schema cache|registro_atividade/i.test(e?.message || '');
      setErro(semTabela
        ? 'O registro de atividade ainda não foi criado no banco de dados.'
        : (e?.message || 'Não foi possível ler o registro.'));
    } finally {
      setCarregando(false);
    }
  };

  // Espera a digitacao parar antes de ir ao banco.
  useEffect(() => {
    const t = setTimeout(carregar, busca ? 350 : 0);
    return () => clearTimeout(t);
  }, [filtroAcao, filtroTabela, busca]);

  // O banco ja filtrou; aqui so agrupamos o que veio junto na mesma transacao.
  const visiveis = registros;

  const irmaos = useMemo(() => {
    const n: Record<string, number> = {};
    for (const r of registros) n[r.transacao] = (n[r.transacao] || 0) + 1;
    return n;
  }, [registros]);

  /**
   * Exporta TUDO o que bate com o filtro, nao so a pagina na tela - um
   * relatorio truncado em silencio e pior do que nenhum.
   */
  const exportar = async () => {
    const { data, error } = await consulta().order('quando', { ascending: false }).limit(20000);
    if (error) { toast.error('Nao foi possivel montar o relatorio.'); return; }
    const todos = (data || []) as Registro[];
    const linhas = todos.map((r) => ({
      'Quando': quandoBR(r.quando),
      'Quem': r.quem_nome || '',
      'E-mail': r.quem_email || '',
      'Ação': r.acao,
      'Onde': NOME_DA_TABELA[r.tabela] || r.tabela,
      'Registro': r.descricao || '',
      'O que mudou': r.alteracoes
        ? Object.entries(r.alteracoes).map(([c, v]: [string, any]) => `${campo(c)}: ${valor(v.de)} > ${valor(v.para)}`).join(' | ')
        : '',
    }));
    baixarPlanilha([{ nome: 'Registro', linhas, larguras: [18, 24, 28, 10, 22, 38, 70] }], 'CMMS_Registro_Atividade');
  };

  return (
    <ErrorBoundary>
      <div className="space-y-8 pb-20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <ScrollText className="w-6 h-6 sm:w-8 sm:h-8 text-slate-500 dark:text-slate-400" />
              Registro de Atividade
            </h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
              O que foi criado, alterado e apagado no sistema — e por quem.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={carregar}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95"
            >
              <RefreshCw className={`w-5 h-5 ${carregando ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button
              onClick={exportar}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-all active:scale-95"
            >
              <Download className="w-5 h-5" />
              Exportar Relatório
            </button>
          </div>
        </div>

        {erro && (
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40">
            <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900 dark:text-amber-200">{erro}</p>
              <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                Peça ao administrador para aplicar a migração 011 no banco de dados.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          {(['criou', 'alterou', 'apagou'] as const).map((a) => {
            const e = ESTILO_DA_ACAO[a];
            return (
              <button
                key={a}
                onClick={() => setFiltroAcao(filtroAcao === a ? 'todas' : a)}
                className={`p-5 rounded-2xl border text-left transition-all ${e.cor} ${filtroAcao === a ? 'ring-2 ring-offset-2 ring-blue-500/40 dark:ring-offset-slate-950' : ''}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <e.Icone className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{e.rotulo}</span>
                </div>
                <p className="text-3xl font-black">{contagem[a]}</p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por equipamento, ordem, peça ou pessoa..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white transition-colors"
            />
          </div>
          <select
            value={filtroTabela}
            onChange={(e) => setFiltroTabela(e.target.value)}
            className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="todas">Tudo</option>
            {Object.entries(NOME_DA_TABELA).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
          {carregando ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : visiveis.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-8">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <ScrollText className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="font-bold text-slate-900 dark:text-white">Nada registrado por aqui</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                {registros.length > 0
                  ? 'Nenhum registro bate com a busca ou os filtros.'
                  : 'O registro guarda o que acontecer daqui em diante — o que veio antes não foi gravado.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {visiveis.map((r) => {
                const e = ESTILO_DA_ACAO[r.acao] || ESTILO_DA_ACAO.alterou;
                const mudancas: [string, any][] = r.alteracoes ? Object.entries(r.alteracoes) : [];
                // Numa exclusao nao ha 'de/para': o que interessa e a linha que
                // deixou de existir. Ela vem em 'dados' e nao era mostrada.
                const apagado: [string, any][] = r.acao === 'apagou' && r.dados
                  ? Object.entries(r.dados).filter(([c, v]) =>
                      v !== null && v !== '' && !['id', 'created_at', 'updated_at'].includes(c))
                  : [];
                const detalhes = mudancas.length > 0 ? mudancas : apagado;
                const rotuloDetalhe = mudancas.length > 0
                  ? `${mudancas.length} campo(s) alterado(s)`
                  : `ver o que foi apagado (${apagado.length} campo(s))`;
                const expandido = aberto === r.id;
                return (
                  <div key={r.id} className="p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-start gap-4">
                      <span className={`shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${e.cor}`}>
                        <e.Icone className="w-3 h-3" />
                        {e.rotulo}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white leading-tight">
                          {r.descricao || '(sem nome)'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {NOME_DA_TABELA[r.tabela] || r.tabela}
                          {' · '}
                          <span className="font-semibold">{r.quem_nome || 'sistema'}</span>
                          {' · '}
                          {quandoBR(r.quando)}
                          {irmaos[r.transacao] > 1 && (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold">
                              +{irmaos[r.transacao] - 1} na mesma acao
                            </span>
                          )}
                        </p>

                        {detalhes.length > 0 && (
                          <button
                            onClick={() => setAberto(expandido ? null : r.id)}
                            className="mt-2 flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {expandido ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            {rotuloDetalhe}
                          </button>
                        )}

                        {expandido && detalhes.length > 0 && (
                          <div className="mt-3 space-y-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700 max-h-72 overflow-y-auto">
                            {detalhes.map(([c, v]) => (
                              <div key={c} className="text-xs flex flex-wrap items-baseline gap-2">
                                <span className="font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{campo(c)}</span>
                                {mudancas.length > 0 ? (
                                  <>
                                    <span className="text-red-600 dark:text-red-400 line-through break-all">{valor(v.de)}</span>
                                    <span className="text-slate-400">&rarr;</span>
                                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold break-all">{valor(v.para)}</span>
                                  </>
                                ) : (
                                  <span className="text-slate-700 dark:text-slate-300 break-all">{valor(v)}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {registros.length >= LIMITE && (
          <p className="text-xs text-center text-slate-400 dark:text-slate-500">
            Mostrando os {LIMITE} mais recentes de {total.toLocaleString('pt-BR')} registros.
            A busca e os filtros consultam o banco inteiro, e o relatório exportado também.
          </p>
        )}
      </div>
    </ErrorBoundary>
  );
}
