import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, ClipboardList, AlertCircle, CheckCircle2, Clock, MoreVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getOrders, getEquipment, updateOrder, updateEquipment } from '@/services/maintenanceService';
import { MaintenanceOrder, Equipment } from '@/types';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { AddOrderModal } from '@/components/modals/AddOrderModal';
import { EditOrderModal } from '@/components/modals/EditOrderModal';
import { toast } from 'sonner';

const statusColors = {
  open: 'bg-red-50 text-red-600 border-red-100',
  in_progress: 'bg-yellow-50 text-yellow-600 border-yellow-100',
  completed: 'bg-green-50 text-green-600 border-green-100',
};

const priorityColors = {
  low: 'text-blue-500',
  medium: 'text-yellow-500',
  high: 'text-orange-500',
  critical: 'text-red-600 font-black',
};

export default function MaintenanceOrdersPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<MaintenanceOrder[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<MaintenanceOrder | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    const unsubOrders = getOrders((data) => {
      setOrders(data);
      setLoading(false);
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

  const handleEditOrder = (order: MaintenanceOrder) => {
    setSelectedOrder(order);
    setShowEditModal(true);
  };

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{t('maintenance_orders')}</h2>
            <p className="text-slate-500 mt-1">{t('maintenance_desc')}</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            {t('new_order')}
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder={t('search_orders_placeholder')} 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
              <Filter className="w-4 h-4" />
              {t('filters')}
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2" />
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
              <button className="px-3 py-1 text-xs font-bold bg-white text-blue-600 rounded-md shadow-sm border border-slate-200">{t('all')}</button>
              <button className="px-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-700">{t('open')}</button>
              <button className="px-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-700">{t('in_progress')}</button>
              <button className="px-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-700">{t('completed')}</button>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">{t('order_number_label')}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">{t('equipment')}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">{t('type')}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">{t('priority')}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">{t('status')}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">{t('maintenance_cost')}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">{t('date')}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-900">{order.order_number}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-700">
                        {equipment.find(e => e.id === order.equipment_id)?.equipment_name || order.equipment_id}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{order.sector}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                      order.action_type === 'preventive' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-orange-50 text-orange-600 border-orange-100"
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
                    <span className="text-xs font-bold text-slate-900">
                      {order.maintenance_cost ? `R$ ${order.maintenance_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-500 font-medium">{order.request_date}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {order.status !== 'completed' && (
                        <button 
                          onClick={() => handleCompleteOrder(order)}
                          className="p-2 hover:bg-green-50 rounded-lg text-green-600 transition-colors"
                          title={t('complete_order', 'Finalizar Ordem')}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => handleEditOrder(order)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 group-hover:text-blue-600 transition-colors"
                        title={t('edit_order_costs', 'Gerenciar Custos')}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {orders.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <ClipboardList className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">{t('no_orders_found')}</h3>
              <p className="text-slate-500 mt-1">{t('all_systems_running')}</p>
            </div>
          )}
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
      </div>
    </ErrorBoundary>
  );
}
