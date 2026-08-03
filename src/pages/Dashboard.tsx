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
            <button className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-colors">
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
            value={new Intl.NumberFormat(i18n.language === 'pt' ? 'pt-BR' : 'en-US', {
              style: 'currency',
              currency: i18n.language === 'pt' ? 'BRL' : 'USD'
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
