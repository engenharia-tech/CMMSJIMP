import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, ClipboardList, AlertCircle, CheckCircle2, Clock, MoreVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getOrders, getEquipment, updateOrder, updateEquipment, deleteOrder } from '@/services/maintenanceService';
import { MaintenanceOrder, Equipment, UserRole } from '@/types';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { AddOrderModal } from '@/components/modals/AddOrderModal';
import { EditOrderModal } from '@/components/modals/EditOrderModal';
import { toast } from 'sonner';
import { supabase, getUserProfile } from '../supabase';
import { Trash2 } from 'lucide-react';
import { ConfirmationModal } from '@/components/modals/ConfirmationModal';

const statusColors = {
  open: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30',
  in_progress: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-100 dark:border-yellow-900/30',
  completed: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/30',
};

const priorityColors = {
  low: 'text-blue-500 dark:text-blue-400',
  medium: 'text-yellow-500 dark:text-yellow-400',
  high: 'text-orange-500 dark:text-orange-400',
  critical: 'text-red-600 dark:text-red-400 font-black',
};

export default function MaintenanceOrdersPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<MaintenanceOrder[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<MaintenanceOrder | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('operator');

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const profile = await getUserProfile(user.id);
        setUserRole(profile?.role || 'operator');
      }
    };
    fetchUserRole();

    const unsubOrders = getOrders(async (data) => {
      setOrders(data);
      setLoading(false);

      // Fetch profiles for creators
      const creatorIds = Array.from(new Set(data.map(o => o.created_by).filter(Boolean)));
      if (creatorIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', creatorIds);
        
        if (profileData) {
          const profileMap: Record<string, string> = {};
          profileData.forEach(p => {
            profileMap[p.id] = p.full_name;
          });
          setProfiles(profileMap);
        }
      }
    });
    const unsubEquipment = getEquipment(setEquipment);
    return () => {
      unsubOrders();
      unsubEquipment();
    };
  }, []);

  const handleCompleteOrder = async (order: MaintenanceOrder) => {
    try {
      // Update the order status to completed
      await updateOrder(order.id, { 
        status: 'completed',
        completion_date: new Date().toISOString()
      });

      // Update the equipment status back to active
      await updateEquipment(order.equipment_id, { status: 'active' });

      toast.success(t('order_completed_success', 'Ordem finalizada com sucesso'));
    } catch (error) {
      console.error('Error completing order:', error);
      toast.error(t('order_completed_error', 'Erro ao finalizar ordem'));
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    setOrderToDelete(orderId);
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteOrder(orderToDelete);
      toast.success(t('order_deleted_success', 'Ordem excluída com sucesso'));
      setOrderToDelete(null);
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error(t('order_deleted_error', 'Erro ao excluir ordem'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditOrder = (order: MaintenanceOrder) => {
    setSelectedOrder(order);
    setShowEditModal(true);
  };

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('maintenance_orders')}</h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">{t('maintenance_desc')}</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            {t('new_order')}
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder={t('search_orders_placeholder')} 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white transition-colors"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <Filter className="w-4 h-4" />
              {t('filters')}
            </button>
            <div className="hidden sm:block h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2 transition-colors" />
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 transition-colors overflow-x-auto">
              <button className="whitespace-nowrap px-3 py-1 text-xs font-bold bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-md shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">{t('all')}</button>
              <button className="whitespace-nowrap px-3 py-1 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">{t('open')}</button>
              <button className="whitespace-nowrap px-3 py-1 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">{t('in_progress')}</button>
              <button className="whitespace-nowrap px-3 py-1 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">{t('completed')}</button>
            </div>
          </div>

          {orders.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <ClipboardList className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('no_orders_found')}</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-1">{t('all_systems_running')}</p>
            </div>
          )}
        </div>

        {/* Orders Table (Desktop) / Cards (Mobile) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">{t('order_number_label')}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">{t('equipment')}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">{t('created_by')}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">{t('open_duration')}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">{t('type')}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">{t('priority')}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">{t('status')}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">{t('maintenance_cost')}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">{t('date')}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-900 dark:text-white">{order.order_number}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {equipment.find(e => e.id === order.equipment_id)?.equipment_name || order.equipment_id}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">{order.sector}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {order.created_by ? (profiles[order.created_by] || t('unknown_user', 'Usuário Desconhecido')) : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {order.status !== 'completed' ? (
                        `${differenceInDays(new Date(), new Date(order.request_date))} ${t('days', 'dias')}`
                      ) : (
                        t('completed')
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                      order.action_type === 'preventive' ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30" : "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/30"
                    )}>
                      {t(order.action_type)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full bg-current", priorityColors[order.priority])} />
                      <span className={cn("text-xs font-bold capitalize", priorityColors[order.priority])}>
                        {t(order.priority)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                      statusColors[order.status]
                    )}>
                      {t(order.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {order.maintenance_cost ? `R$ ${order.maintenance_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{order.request_date}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {order.status !== 'completed' && (
                        <button 
                          onClick={() => handleCompleteOrder(order)}
                          className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400 transition-colors"
                          title={t('conclude_order')}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => handleEditOrder(order)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                        title={t('edit_order_costs', 'Gerenciar Custos')}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {userRole === 'admin' && (
                        <button 
                          onClick={() => handleDeleteOrder(order.id)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title={t('delete_order')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>

          {/* Mobile View (Cards) */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {orders.map((order) => (
              <div key={order.id} className="p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900 dark:text-white">{order.order_number}</span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {equipment.find(e => e.id === order.equipment_id)?.equipment_name || order.equipment_id}
                    </span>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                    statusColors[order.status]
                  )}>
                    {t(order.status)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('priority')}</p>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full bg-current", priorityColors[order.priority])} />
                      <span className={cn("text-xs font-bold capitalize", priorityColors[order.priority])}>
                        {t(order.priority)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('type')}</p>
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border inline-block",
                      order.action_type === 'preventive' ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30" : "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/30"
                    )}>
                      {t(order.action_type)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('open_duration')}</p>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {order.status !== 'completed' ? (
                        `${differenceInDays(new Date(), new Date(order.request_date))} ${t('days', 'dias')}`
                      ) : (
                        t('completed')
                      )}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('maintenance_cost')}</p>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {order.maintenance_cost ? `R$ ${order.maintenance_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {order.status !== 'completed' && (
                    <button 
                      onClick={() => handleCompleteOrder(order)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-xs font-bold transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {t('conclude_order')}
                    </button>
                  )}
                  <button 
                    onClick={() => handleEditOrder(order)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-bold transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                    {t('edit_order_costs', 'Custos')}
                  </button>
                  {userRole === 'admin' && (
                    <button 
                      onClick={() => handleDeleteOrder(order.id)}
                      className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <AddOrderModal 
          isOpen={showAddModal} 
          onClose={() => setShowAddModal(false)} 
          equipmentList={equipment}
        />

        {selectedOrder && (
          <EditOrderModal 
            isOpen={showEditModal} 
            onClose={() => {
              setShowEditModal(false);
              setSelectedOrder(null);
            }} 
            order={selectedOrder}
          />
        )}

        <ConfirmationModal
          isOpen={!!orderToDelete}
          onClose={() => setOrderToDelete(null)}
          onConfirm={confirmDeleteOrder}
          title={t('confirm_delete_order_title', 'Excluir Ordem')}
          message={t('confirm_delete_order_message', 'Tem certeza que deseja excluir esta ordem de manutenção? Esta ação não pode ser desfeita.')}
          isLoading={isDeleting}
        />
      </div>
    </ErrorBoundary>
  );
}
