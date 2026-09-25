import React, { useEffect, useState } from 'react';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  Zap,
  QrCode,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StatCard } from '@/components/dashboard/StatCard';
import { KPIChart } from '@/components/dashboard/KPIChart';
import { getEquipment, getOrders, calculateKPIs, fetchEquipment, fetchOrders } from '@/services/maintenanceService';
import { Equipment, MaintenanceOrder } from '@/types';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { ehPortugues } from '@/lib/utils';
import { baixarPlanilha, dia, diasEntre } from '@/lib/relatorio';
import { proximaManutencao } from '@/lib/manutencao';
import { supabase } from '@/supabase';

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [orders, setOrders] = useState<MaintenanceOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubEquipment = getEquipment(setEquipment);
    const unsubOrders = getOrders((data) => {
      setOrders(data);
      setLoading(false);
    });

    // Auto-refresh every 30 seconds as requested
    const refreshInterval = setInterval(() => {
      fetchEquipment();
      fetchOrders();
    }, 30000);

    return () => {
      unsubEquipment();
      unsubOrders();
      clearInterval(refreshInterval);
    };
  }, []);

  const kpis = calculateKPIs(orders, equipment);

  /**
   * RELATORIO COMPLETO do sistema, em 6 abas.
   *
   * O primeiro que eu fiz levava so os indicadores e as ordens - o Edson disse
   * que "e pouco". Agora sai tudo o que aconteceu: indicadores, o parque, TODAS
   * as ordens com o que foi feito em cada uma, o estoque, o custo por setor e a
   * situacao da preventiva de cada maquina.
   */
  const exportarRelatorio = async () => {
    if (orders.length === 0 && equipment.length === 0) {
      toast.error('Nao ha dados para exportar.');
      return;
    }

    const { data: parts } = await supabase.from('parts').select('*');
    const { data: settings } = await supabase.from('settings').select('*').maybeSingle();

    const nomeEq = (id?: string) => equipment.find((e) => e.id === id)?.equipment_name || '-';
    const patrimonio = (id?: string) => equipment.find((e) => e.id === id)?.registration_number || '-';
    const doEquip = (id: string) => orders.filter((o) => o.equipment_id === id);

    const indicadores = [
      { Indicador: 'Equipamentos cadastrados', Valor: equipment.length },
      { Indicador: 'Ordens de manutencao', Valor: orders.length },
      { Indicador: 'Abertas', Valor: orders.filter((o) => o.status === 'open').length },
      { Indicador: 'Em andamento', Valor: orders.filter((o) => o.status === 'in_progress').length },
      { Indicador: 'Concluidas', Valor: orders.filter((o) => o.status === 'completed').length },
      { Indicador: 'Falhas (corretivas)', Valor: kpis.totalFailures },
      { Indicador: 'Custo total (R$)', Valor: Number(kpis.totalCost.toFixed(2)) },
      { Indicador: 'MTBF (h)', Valor: kpis.mtbf },
      { Indicador: 'MTTR (h)', Valor: kpis.mttr },
      { Indicador: 'Disponibilidade (%)', Valor: kpis.availability },
      { Indicador: 'Parada total (h)', Valor: orders.reduce((n, o) => n + (o.downtime_hours || 0), 0) },
      { Indicador: 'Pecas cadastradas', Valor: (parts || []).length },
    ];

    const equipamentos = equipment.map((e) => ({
      'Patrimonio': e.registration_number || '',
      'Equipamento': e.equipment_name || '',
      'Setor': e.sector || '',
      'Criticidade': t(e.criticality),
      'Status': t(e.status),
      'Fabricante': e.manufacturer || '',
      'Aquisicao': dia(e.acquisition_date),
      'Ordens': doEquip(e.id).length,
      'Custo acumulado (R$)': Number(doEquip(e.id).reduce((n, o) => n + (o.maintenance_cost || 0), 0).toFixed(2)),
      'Parada (h)': doEquip(e.id).reduce((n, o) => n + (o.downtime_hours || 0), 0),
    }));

    const ordens = orders.map((o) => ({
      'No da ordem': o.order_number,
      'Equipamento': nomeEq(o.equipment_id),
      'Patrimonio': patrimonio(o.equipment_id),
      'Setor': o.sector || '',
      'Tipo': t(o.action_type),
      'Prioridade': t(o.priority),
      'Status': t(o.status),
      'Abertura': dia(o.request_date),
      'Conclusao': dia(o.completion_date),
      'Dias': diasEntre(o.request_date, o.completion_date),
      'Solicitante': o.requester || '',
      'Executante': o.operator || '',
      'Problema relatado': o.problem_description || '',
      'Causa raiz': o.root_cause || '',
      'O QUE FOI FEITO': o.action_taken || '',
      'Pecas usadas': (o.parts_list || []).map((x: any) => x.part_name + ' (' + x.quantity + ')').join(' | '),
      'Horas': o.labor_hours || 0,
      'Mao de obra (R$)': o.labor_cost || 0,
      'Pecas (R$)': o.parts_cost || 0,
      'Total (R$)': o.maintenance_cost || 0,
      'Parada (h)': o.downtime_hours || 0,
    }));

    const pecas = (parts || []).map((p: any) => {
      const est = Number(p.stock_quantity) || 0;
      const min = Number(p.minimum_stock) || 0;
      const custo = Number(p.unit_cost) || 0;
      return {
        'Codigo': p.part_code,
        'Peca': p.part_name,
        'Estoque': est,
        'Minimo': min,
        'Situacao': est <= 0 ? 'SEM ESTOQUE' : est < min ? 'ABAIXO DO MINIMO' : 'ok',
        'Custo unitario (R$)': custo,
        'Valor em estoque (R$)': Number((est * custo).toFixed(2)),
        'Fornecedor': p.supplier || '',
      };
    });

    const porSetor: Record<string, { ordens: number; custo: number; parada: number }> = {};
    for (const o of orders) {
      const chave = (o.sector || '(sem setor)').trim();
      porSetor[chave] = porSetor[chave] || { ordens: 0, custo: 0, parada: 0 };
      porSetor[chave].ordens += 1;
      porSetor[chave].custo += o.maintenance_cost || 0;
      porSetor[chave].parada += o.downtime_hours || 0;
    }
    const setores = Object.entries(porSetor)
      .sort((a, b) => b[1].custo - a[1].custo)
      .map(([setor, v]) => ({
        'Setor': setor,
        'Ordens': v.ordens,
        'Custo (R$)': Number(v.custo.toFixed(2)),
        'Parada (h)': v.parada,
      }));

    const preventiva = equipment
      .filter((e) => e.status !== 'obsolete')
      .map((e) => {
        const r = proximaManutencao(e, orders, settings, 'preventive');
        return {
          'Patrimonio': e.registration_number || '',
          'Equipamento': e.equipment_name || '',
          'Setor': e.sector || '',
          'A cada (dias)': r.intervalo,
          'Proxima': r.proxima.toLocaleDateString('pt-BR'),
          'Origem': r.marcada ? 'data marcada' : 'pelo ciclo',
          'Situacao': r.atrasada ? 'VENCIDA' : r.diasRestantes === 0 ? 'HOJE' : 'faltam ' + r.diasRestantes + ' dia(s)',
        };
      })
      .sort((a, b) => (a['Situacao'].indexOf('VENC') === 0 ? -1 : 1));

    baixarPlanilha(
      [
        { nome: 'Indicadores', linhas: indicadores, larguras: [34, 18] },
        { nome: 'Equipamentos', linhas: equipamentos, larguras: [13, 30, 16, 12, 12, 20, 12, 9, 20, 11] },
        { nome: 'Ordens', linhas: ordens, larguras: [13, 26, 12, 16, 12, 11, 12, 11, 11, 6, 16, 16, 40, 24, 55, 30, 7, 14, 12, 12, 10] },
        { nome: 'Pecas', linhas: pecas, larguras: [14, 34, 10, 10, 18, 18, 20, 22] },
        { nome: 'Custo por setor', linhas: setores, larguras: [22, 9, 16, 11] },
        { nome: 'Preventiva', linhas: preventiva, larguras: [13, 30, 16, 13, 12, 14, 20] },
      ],
      'CMMS_Relatorio_Completo'
    );
  };


  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-slate-200 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-80" />
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-80" />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('dashboard')}</h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">{t('real_time_kpis')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="https://www.jimpnexus.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
            >
              <ExternalLink className="w-4 h-4" />
              {t('back_to_portal')}
            </a>
            <Link 
              to="/orders?view=scanner"
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-bold shadow-lg hover:opacity-90 transition-all active:scale-95"
            >
              <QrCode className="w-4 h-4" />
              {t('scanner')}
            </Link>
            <div className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 shadow-sm transition-colors">
              {t('last_30_days')}
            </div>
            <button
              onClick={exportarRelatorio}
              className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-colors"
            >
              {t('export_report')}
            </button>
          </div>
        </div>


        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title={t('active_equipment')} 
            value={equipment.filter(e => e.status === 'active').length} 
            icon={Activity} 
            color="blue"
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard 
            title={t('monthly_failures')} 
            value={kpis.totalFailures} 
            icon={AlertCircle} 
            color="red"
            trend={{ value: 5, isPositive: false }}
          />
          <StatCard 
            title={t('maintenance_cost')} 
            value={new Intl.NumberFormat(ehPortugues(i18n.language) ? 'pt-BR' : 'en-US', {
              style: 'currency',
              currency: ehPortugues(i18n.language) ? 'BRL' : 'USD'
            }).format(kpis.totalCost)} 
            icon={TrendingUp} 
            color="green"
            trend={{ value: 8, isPositive: true }}
          />
          <StatCard 
            title={t('pending_maintenance')} 
            value={orders.filter(o => o.status !== 'completed').length} 
            icon={Clock} 
            color="yellow"
          />
        </div>

        {/* Industrial KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl shadow-slate-900/20 relative overflow-hidden group">
            <Zap className="absolute -right-4 -top-4 w-32 h-32 text-white/5 group-hover:scale-110 transition-transform duration-500" />
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t('mtbf')}</p>
            <h3 className="text-4xl font-black mt-2">{kpis.mtbf} <span className="text-lg font-normal text-slate-400">hrs</span></h3>
            <p className="text-xs text-slate-500 mt-4">{t('mtbf_desc')}</p>
          </div>
          <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl shadow-slate-900/20 relative overflow-hidden group">
            <BarChart3 className="absolute -right-4 -top-4 w-32 h-32 text-white/5 group-hover:scale-110 transition-transform duration-500" />
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t('mttr')}</p>
            <h3 className="text-4xl font-black mt-2">{kpis.mttr} <span className="text-lg font-normal text-slate-400">hrs</span></h3>
            <p className="text-xs text-slate-500 mt-4">{t('mttr_desc')}</p>
          </div>
          <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl shadow-slate-900/20 relative overflow-hidden group">
            <CheckCircle2 className="absolute -right-4 -top-4 w-32 h-32 text-white/5 group-hover:scale-110 transition-transform duration-500" />
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t('availability')}</p>
            <h3 className="text-4xl font-black mt-2">{kpis.availability}%</h3>
            <p className="text-xs text-slate-500 mt-4">{t('availability_desc')}</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <KPIChart 
            title={t('monthly_cost_title')} 
            data={kpis.monthlyCostData} 
            dataKey="cost" 
            type="area" 
            color="#10b981" 
          />
          <KPIChart 
            title={t('downtime_title')} 
            data={kpis.downtimeData} 
            dataKey="hours" 
            type="bar" 
            color="#ef4444" 
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}
