import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, PieChart, Calendar, Search, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getOrders } from '@/services/maintenanceService';
import { MaintenanceOrder } from '@/types';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import { useTheme } from '@/contexts/ThemeContext';

export default function CostsPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [orders, setOrders] = useState<MaintenanceOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = getOrders((data) => {
      setOrders(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleExportCosts = () => {
    const reportData = orders.map(o => ({
      [t('order_number_label')]: o.order_number,
      [t('equipment')]: o.equipment_id,
      [t('date')]: format(parseISO(o.request_date), 'dd/MM/yyyy'),
      [t('labor_cost')]: o.labor_cost || 0,
      [t('parts_cost')]: o.parts_cost || 0,
      [t('total_cost')]: o.maintenance_cost || 0,
      [t('status')]: t(o.status)
    }));

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Costs Report");
    XLSX.writeFile(wb, `Maintenance_Costs_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
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
    { name: t('labor', 'Mão de Obra'), value: totalLaborCost },
    { name: t('parts', 'Peças'), value: totalPartsCost }
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('cost_management')}</h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">{t('costs_desc_full', 'Track and analyze your maintenance expenditures.')}</p>
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
              <h3 className="font-bold text-slate-900 dark:text-white">{t('total_cost', 'Total Cost')}</h3>
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white">
              R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">{t('labor_cost', 'Mão de Obra')}</h3>
            </div>
            <p className="text-3xl font-black text-blue-600 dark:text-blue-400">
              R$ {totalLaborCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                <PieChart className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">{t('parts_cost', 'Peças')}</h3>
            </div>
            <p className="text-3xl font-black text-amber-600 dark:text-amber-400">
              R$ {totalPartsCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400">
                <TrendingDown className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">{t('avg_per_order', 'Avg per Order')}</h3>
            </div>
            <p className="text-3xl font-black text-green-600 dark:text-green-400">
              R$ {(orders.length > 0 ? totalCost / orders.length : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">{t('cost_by_part', 'Custo por Peça (Top 10)')}</h3>
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
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, t('cost', 'Custo')]}
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
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">{t('cost_by_sector', 'Custo por Setor')}</h3>
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
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, t('cost', 'Custo')]}
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
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">{t('recent_expenses', 'Despesas Recentes')}</h3>
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
                          L: R$ {order.labor_cost?.toLocaleString('pt-BR')}
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded">
                          P: R$ {order.parts_cost?.toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-900 dark:text-white">R$ {order.maintenance_cost.toLocaleString('pt-BR')}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{order.request_date}</p>
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

