import React, { useEffect, useState } from 'react';
import { Calendar, Search, Filter, Clock, CheckCircle, AlertTriangle, FileText, Download, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getOrders, getEquipment, getSettings } from '@/services/maintenanceService';
import { MaintenanceOrder, Equipment, ActionType, Settings } from '@/types';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { format, isAfter, addDays, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { AddOrderModal } from '@/components/modals/AddOrderModal';
import { cn } from '@/lib/utils';

export default function MaintenancePlanningPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<MaintenanceOrder[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActionType>('preventive');
  const [reportMonth, setReportMonth] = useState(new Date().getMonth());
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

  useEffect(() => {
    const unsubOrders = getOrders((data) => {
      setOrders(data);
    });
    const unsubEquip = getEquipment(setEquipment);
    
    const loadSettings = async () => {
      const s = await getSettings();
      setSettings(s);
      setLoading(false);
    };
    
    loadSettings();

    return () => {
      unsubOrders();
      unsubEquip();
    };
  }, []);

  const filteredOrders = orders.filter(o => o.action_type === activeTab);

  const upcomingMaintenance = equipment.filter(e => {
    if (activeTab === 'corrective') {
      return e.status === 'maintenance' || e.status === 'inactive';
    }
    return true;
  }).map(e => {
    const lastOrder = orders
      .filter(o => o.equipment_id === e.id && o.action_type === activeTab)
      .sort((a, b) => new Date(b.request_date).getTime() - new Date(a.request_date).getTime())[0];
    
    let interval = 0;
    if (activeTab === 'preventive') {
      interval = settings?.default_preventive_interval || 30;
    } else if (activeTab === 'predictive') {
      interval = settings?.default_predictive_interval || 90;
    }
    
    const nextDate = lastOrder ? addDays(parseISO(lastOrder.request_date), interval) : addDays(new Date(), interval);
    
    return {
      ...e,
      last_maintenance: lastOrder?.request_date || t('never', 'Never'),
      next_maintenance: activeTab === 'corrective' ? format(new Date(), 'yyyy-MM-dd') : format(nextDate, 'yyyy-MM-dd'),
      is_overdue: activeTab === 'corrective' ? true : (interval > 0 ? isAfter(new Date(), nextDate) : false)
    };
  }).sort((a, b) => new Date(a.next_maintenance).getTime() - new Date(b.next_maintenance).getTime());

  const handleExportReport = () => {
    const startDate = startOfMonth(new Date(reportYear, reportMonth));
    const endDate = endOfMonth(new Date(reportYear, reportMonth));

    const reportData = orders.filter(o => {
      const orderDate = parseISO(o.request_date);
      return isWithinInterval(orderDate, { start: startDate, end: endDate });
    }).map(o => ({
      [t('order_number_label')]: o.order_number,
      [t('equipment')]: equipment.find(e => e.id === o.equipment_id)?.equipment_name || 'N/A',
      [t('type')]: t(`${o.action_type}_type`),
      [t('date')]: format(parseISO(o.request_date), 'dd/MM/yyyy'),
      [t('status')]: t(o.status),
      [t('cost')]: o.maintenance_cost
    }));

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Maintenance Report");
    XLSX.writeFile(wb, `Maintenance_Report_${reportYear}_${reportMonth + 1}.xlsx`);
  };

  const handleCreateAction = (item: Equipment) => {
    setSelectedEquipment(item);
    setShowAddOrderModal(true);
  };

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('maintenance_planning')}</h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">{t('manage_maintenance_types', 'Manage preventive, predictive and corrective actions.')}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors">
              <select 
                value={reportMonth} 
                onChange={(e) => setReportMonth(parseInt(e.target.value))}
                className="bg-transparent text-sm font-bold text-slate-600 dark:text-slate-400 outline-none flex-1"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i} value={i} className="dark:bg-slate-900">{format(new Date(2024, i, 1), 'MMMM', { locale: ptBR })}</option>
                ))}
              </select>
              <select 
                value={reportYear} 
                onChange={(e) => setReportYear(parseInt(e.target.value))}
                className="bg-transparent text-sm font-bold text-slate-600 dark:text-slate-400 outline-none flex-1"
              >
                {[2024, 2025, 2026].map(y => (
                  <option key={y} value={y} className="dark:bg-slate-900">{y}</option>
                ))}
              </select>
              <button 
                onClick={handleExportReport}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors w-full sm:w-auto"
              >
                <Download className="w-4 h-4" />
                {t('export_report')}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit transition-colors">
          {(['preventive', 'predictive', 'corrective'] as ActionType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
                activeTab === tab 
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-lg shadow-blue-900/5 scale-105" 
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              )}
            >
              {t(`${tab}_type`)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">{t('next_7_days', 'Next 7 Days')}</h3>
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white">
              {upcomingMaintenance.filter(m => {
                const diff = new Date(m.next_maintenance).getTime() - new Date().getTime();
                return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
              }).length}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center text-red-600 dark:text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">{t('overdue', 'Overdue')}</h3>
            </div>
            <p className="text-3xl font-black text-red-600 dark:text-red-400">
              {upcomingMaintenance.filter(m => m.is_overdue).length}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400">
                <CheckCircle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">{t('completed_month', 'Completed (Month)')}</h3>
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white">
              {orders.filter(o => o.status === 'completed' && o.action_type === activeTab && new Date(o.request_date).getMonth() === new Date().getMonth()).length}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('equipment')}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('last_maintenance')}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('next_maintenance')}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('status')}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {upcomingMaintenance.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white">{item.equipment_name}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{item.registration_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {item.last_maintenance}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-bold ${item.is_overdue ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {format(parseISO(item.next_maintenance), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {item.is_overdue ? (
                          <span className="px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-full text-[10px] font-black uppercase tracking-widest">
                            {t('overdue', 'Atrasada')}
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 rounded-full text-[10px] font-black uppercase tracking-widest">
                            {t('scheduled', 'Agendada')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleCreateAction(item)}
                        className="flex items-center gap-2 ml-auto px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        {t('create_action')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View (Cards) */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {upcomingMaintenance.map((item) => (
              <div key={item.id} className="p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900 dark:text-white leading-tight">{item.equipment_name}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-0.5">{item.registration_number}</span>
                  </div>
                  {item.is_overdue ? (
                    <span className="px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {t('overdue', 'Atrasada')}
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {t('scheduled', 'Agendada')}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('last_maintenance')}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{item.last_maintenance}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('next_maintenance')}</p>
                    <p className={`text-sm font-bold ${item.is_overdue ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {format(parseISO(item.next_maintenance), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => handleCreateAction(item)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t('create_action')}
                </button>
              </div>
            ))}
          </div>
        </div>


        {selectedEquipment && (
          <AddOrderModal 
            isOpen={showAddOrderModal} 
            onClose={() => {
              setShowAddOrderModal(false);
              setSelectedEquipment(null);
            }}
            initialEquipmentId={selectedEquipment.id}
            initialActionType={activeTab}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
