import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, PieChart, Calendar, Search, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getOrders, getEquipment } from '@/services/maintenanceService';
import { MaintenanceOrder } from '@/types';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import { useTheme } from '@/contexts/ThemeContext';
import { ehPortugues, dataBR } from '@/lib/utils';
import { baixarPlanilha, dia } from '@/lib/relatorio';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function CostsPage() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const [orders, setOrders] = useState<MaintenanceOrder[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = getOrders((data) => {
      setOrders(data);
      setLoading(false);
    });
    const unsubEq = getEquipment(setEquipment);
    return () => { unsub(); unsubEq(); };
  }, []);

  /**
   * Relatorio de custos, em tres abas.
   *
   * O de antes tinha 7 colunas e uma aba so - nao dava para responder "qual
   * maquina esta me custando caro" nem "quanto gastei com peca". Agora vem o
   * lancamento, o acumulado POR EQUIPAMENTO e o acumulado POR SETOR, que sao
   * as duas perguntas que a manutencao faz quando olha custo.
   */
  const handleExportCosts = () => {
    const nome = (id?: string) => equipment.find((e) => e.id === id)?.equipment_name || '-';
    const patr = (id?: string) => equipment.find((e) => e.id === id)?.registration_number || '-';

    const lancamentos = orders.map((o) => ({
      'No da ordem': o.order_number,
      'Equipamento': nome(o.equipment_id),
      'Patrimonio': patr(o.equipment_id),
      'Setor': o.sector || '',
      'Tipo': t(o.action_type),
      'Status': t(o.status),
      'Data': dia(o.request_date),
      'O QUE FOI FEITO': o.action_taken || '',
      'Pecas usadas': (o.parts_list || []).map((x: any) => x.part_name + ' (' + x.quantity + ')').join(' | '),
      'Horas': o.labor_hours || 0,
      'Mao de obra (R$)': o.labor_cost || 0,
      'Pecas (R$)': o.parts_cost || 0,
      'Total (R$)': o.maintenance_cost || 0,
      'Parada (h)': o.downtime_hours || 0,
    }));

    const porEquip: Record<string, any> = {};
    for (const o of orders) {
      const k = o.equipment_id || '(sem equipamento)';
      porEquip[k] = porEquip[k] || { ordens: 0, mo: 0, pecas: 0, total: 0, parada: 0 };
      porEquip[k].ordens += 1;
      porEquip[k].mo += o.labor_cost || 0;
      porEquip[k].pecas += o.parts_cost || 0;
      porEquip[k].total += o.maintenance_cost || 0;
      porEquip[k].parada += o.downtime_hours || 0;
    }
    const equipamentos = Object.entries(porEquip)
      .sort((a: any, b: any) => b[1].total - a[1].total)
      .map(([id, v]: any) => ({
        'Equipamento': nome(id),
        'Patrimonio': patr(id),
        'Ordens': v.ordens,
        'Mao de obra (R$)': Number(v.mo.toFixed(2)),
        'Pecas (R$)': Number(v.pecas.toFixed(2)),
        'Total (R$)': Number(v.total.toFixed(2)),
        'Parada (h)': v.parada,
        'Custo medio por ordem (R$)': Number((v.total / v.ordens).toFixed(2)),
      }));

    const porSetor: Record<string, any> = {};
    for (const o of orders) {
      const k = (o.sector || '(sem setor)').trim();
      porSetor[k] = porSetor[k] || { ordens: 0, total: 0, parada: 0 };
      porSetor[k].ordens += 1;
      porSetor[k].total += o.maintenance_cost || 0;
      porSetor[k].parada += o.downtime_hours || 0;
    }
    const setores = Object.entries(porSetor)
      .sort((a: any, b: any) => b[1].total - a[1].total)
      .map(([setor, v]: any) => ({
        'Setor': setor,
        'Ordens': v.ordens,
        'Custo (R$)': Number(v.total.toFixed(2)),
        'Parada (h)': v.parada,
      }));

    baixarPlanilha(
      [
        { nome: 'Lancamentos', linhas: lancamentos, larguras: [13, 26, 12, 16, 12, 12, 11, 55, 30, 7, 16, 14, 13, 11] },
        { nome: 'Por equipamento', linhas: equipamentos, larguras: [28, 13, 8, 16, 14, 13, 11, 24] },
        { nome: 'Por setor', linhas: setores, larguras: [22, 9, 14, 11] },
      ],
      'CMMS_Custos'
    );
  };

  const totalCost = orders.reduce((acc, curr) => acc + (curr.maintenance_cost || 0), 0);
  const totalLaborCost = orders.reduce((acc, curr) => acc + (curr.labor_cost || 0), 0);
  const totalPartsCost = orders.reduce((acc, curr) => acc + (curr.parts_cost || 0), 0);
  
  const monthlyCost = orders
    .filter(o => new Date(o.request_date).getMonth() === new Date().getMonth())
    .reduce((acc, curr) => acc + (curr.maintenance_cost || 0), 0);

  const costBySector = orders.reduce((acc: any, curr) => {
    acc[curr.sector] = (acc[curr.sector] || 0) + (curr.maintenance_cost || 0);
    return acc;
  }, {});

  const costByPart = orders.reduce((acc: any, curr) => {
    if (curr.parts_list) {
      curr.parts_list.forEach(p => {
        acc[p.part_name] = (acc[p.part_name] || 0) + (p.unit_cost * p.quantity);
      });
    }
    return acc;
  }, {});

  const sectorChartData = Object.keys(costBySector).map(sector => ({
    name: sector,
    value: costBySector[sector]
  })).sort((a, b) => b.value - a.value);

  const partsChartData = Object.keys(costByPart).map(part => ({
    name: part,
    value: costByPart[part]
  })).sort((a, b) => b.value - a.value).slice(0, 10);

  const breakdownData = [
    { name: t('labor'), value: totalLaborCost },
    { name: t('parts'), value: totalPartsCost }
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(ehPortugues(i18n.language) ? 'pt-BR' : 'en-US', {
      style: 'currency',
      currency: ehPortugues(i18n.language) ? 'BRL' : 'USD'
    }).format(value);
  };

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('cost_management')}</h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">{t('costs_desc_full')}</p>
          </div>
          <button 
            onClick={handleExportCosts}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 dark:bg-slate-800 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 dark:hover:bg-slate-700 transition-all active:scale-95"
          >
            <Download className="w-5 h-5" />
            {t('export_report')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-slate-900 dark:bg-slate-800 rounded-xl flex items-center justify-center text-white">
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">{t('total_cost')}</h3>
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white">
              {formatCurrency(totalCost)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">{t('labor_cost')}</h3>
            </div>
            <p className="text-3xl font-black text-blue-600 dark:text-blue-400">
              {formatCurrency(totalLaborCost)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                <PieChart className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">{t('parts_cost')}</h3>
            </div>
            <p className="text-3xl font-black text-amber-600 dark:text-amber-400">
              {formatCurrency(totalPartsCost)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400">
                <TrendingDown className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">{t('avg_per_order')}</h3>
            </div>
            <p className="text-3xl font-black text-green-600 dark:text-green-400">
              {formatCurrency(orders.length > 0 ? totalCost / orders.length : 0)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">{t('cost_by_part')}</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={partsChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120} 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 600, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                  />
                  <Tooltip 
                    cursor={{ fill: theme === 'dark' ? '#0f172a' : '#f8fafc' }}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                      color: theme === 'dark' ? '#ffffff' : '#000000'
                    }}
                    itemStyle={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}
                    formatter={(value: number) => [formatCurrency(value), t('cost')]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {partsChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">{t('cost_by_sector')}</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100} 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: 600, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                  />
                  <Tooltip 
                    cursor={{ fill: theme === 'dark' ? '#0f172a' : '#f8fafc' }}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                      color: theme === 'dark' ? '#ffffff' : '#000000'
                    }}
                    itemStyle={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}
                    formatter={(value: number) => [formatCurrency(value), t('cost')]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {sectorChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-2 transition-colors">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">{t('recent_expenses')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orders.slice(0, 6).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-700 transition-colors">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{order.order_number}</p>
                      <div className="flex gap-2 mt-0.5">
                        <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                          L: {formatCurrency(order.labor_cost || 0)}
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded">
                          P: {formatCurrency(order.parts_cost || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-900 dark:text-white">{formatCurrency(order.maintenance_cost)}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{dataBR(order.request_date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

