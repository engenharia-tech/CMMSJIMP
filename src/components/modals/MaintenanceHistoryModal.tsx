import React, { useEffect, useState } from 'react';
import { X, Wrench, Calendar, Clock, CheckCircle2, AlertCircle, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MaintenanceOrder, Equipment } from '@/types';
import { supabase } from '@/supabase';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  equipment: Equipment | null;
}

export function MaintenanceHistoryModal({ isOpen, onClose, equipment }: Props) {
  const { t, i18n } = useTranslation();
  const [orders, setOrders] = useState<MaintenanceOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && equipment) {
      const fetchHistory = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('maintenance_orders')
          .select('*')
          .eq('equipment_id', equipment.id)
          .order('request_date', { ascending: false });
        
        if (!error) {
          setOrders(data || []);
        }
        setLoading(false);
      };
      fetchHistory();
    }
  }, [isOpen, equipment]);

  if (!isOpen || !equipment) return null;

  const locale = i18n.language === 'pt' ? ptBR : enUS;

  const statusColors = {
    open: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30',
    in_progress: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-100 dark:border-yellow-900/30',
    completed: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/30',
    canceled: 'bg-slate-50 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-900/30',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('maintenance_history')}</h3>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">{equipment.equipment_name} ({equipment.registration_number})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
              <p className="text-slate-500 font-medium">{t('loading', 'Carregando...')}</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">{t('no_history_found')}</h4>
              <p className="text-slate-500 dark:text-slate-400 mt-1">{t('no_history_message', 'Este equipamento ainda não possui ordens de manutenção registradas.')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md transition-all group">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        order.action_type === 'corrective' ? 'bg-red-50 dark:bg-red-900/20 text-red-600' : 
                        order.action_type === 'preventive' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' :
                        'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600'
                      )}>
                        {order.action_type === 'corrective' ? <AlertCircle className="w-5 h-5" /> : 
                         order.action_type === 'preventive' ? <CheckCircle2 className="w-5 h-5" /> :
                         <Clock className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-black text-slate-900 dark:text-white">{order.order_number}</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                            statusColors[order.status as keyof typeof statusColors]
                          )}>
                            {t(order.status)}
                          </span>
                        </div>
                        <h5 className="font-bold text-slate-700 dark:text-slate-300">{order.description}</h5>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(order.request_date), 'PPP', { locale })}
                          </div>
                          {order.completion_date && (
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <CheckCircle2 className="w-3 h-3" />
                              {t('completed_at', 'Concluído em')}: {format(new Date(order.completion_date), 'PPP', { locale })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 pt-4 md:pt-0 border-t md:border-0 border-slate-100 dark:border-slate-800">
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{t('total_cost')}</p>
                        <p className="text-lg font-black text-slate-900 dark:text-white">
                          R$ {order.maintenance_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>
                  {order.action_taken && (
                    <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{t('action_taken')}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{order.action_taken}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-slate-600 transition-all active:scale-95"
          >
            {t('close', 'Fechar')}
          </button>
        </div>
      </div>
    </div>
  );
}
