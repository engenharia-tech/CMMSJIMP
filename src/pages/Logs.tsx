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
  const [aberto, setAberto] = useState<number | null>(null);

  const carregar = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const { data, error } = await supabase
        .from('registro_atividade')
        .select('*')
        .order('quando', { ascending: false })
        .limit(LIMITE);
      if (error) throw error;
      setRegistros((data || []) as Registro[]);
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

  useEffect(() => { carregar(); }, []);

  const visiveis = useMemo(() => {
    const texto = busca.trim().toLowerCase();
    return registros.filter((r) => {
      if (filtroAcao !== 'todas' && r.acao !== filtroAcao) return false;
      if (filtroTabela !== 'todas' && r.tabela !== filtroTabela) return false;
      if (!texto) return true;
      return [r.descricao, r.quem_nome, r.quem_email, NOME_DA_TABELA[r.tabela] || r.tabela]
        .some((c) => (c || '').toLowerCase().includes(texto));
    });
  }, [registros, busca, filtroAcao, filtroTabela]);

  const contagem = useMemo(() => ({
    criou: registros.filter((r) => r.acao === 'criou').length,
    alterou: registros.filter((r) => r.acao === 'alterou').length,
    apagou: registros.filter((r) => r.acao === 'apagou').length,
  }), [registros]);

  const exportar = () => {
    const linhas = visiveis.map((r) => ({
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
                        </p>

                        {mudancas.length > 0 && (
                          <button
                            onClick={() => setAberto(expandido ? null : r.id)}
                            className="mt-2 flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {expandido ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            {mudancas.length} campo(s) alterado(s)
                          </button>
                        )}

                        {expandido && mudancas.length > 0 && (
                          <div className="mt-3 space-y-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                            {mudancas.map(([c, v]) => (
                              <div key={c} className="text-xs flex flex-wrap items-baseline gap-2">
                                <span className="font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{campo(c)}</span>
                                <span className="text-red-600 dark:text-red-400 line-through break-all">{valor(v.de)}</span>
                                <span className="text-slate-400">→</span>
                                <span className="text-emerald-700 dark:text-emerald-400 font-semibold break-all">{valor(v.para)}</span>
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
            Mostrando os {LIMITE} registros mais recentes. Use a busca e os filtros para chegar ao que procura.
          </p>
        )}
      </div>
    </ErrorBoundary>
  );
}
