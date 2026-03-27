import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/supabase';
import { MaintenanceOrder, Equipment } from '@/types';
import { isAfter, parseISO, addDays } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { t } = useTranslation();

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = (notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: Notification = {
      ...notif,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 50));
    
    // Show toast for new notification
    switch (notif.type) {
      case 'warning':
        toast.warning(notif.title, { description: notif.message });
        break;
      case 'error':
        toast.error(notif.title, { description: notif.message });
        break;
      case 'success':
        toast.success(notif.title, { description: notif.message });
        break;
      default:
        toast.info(notif.title, { description: notif.message });
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  // Check for upcoming/overdue maintenance and low stock
  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        // Fetch equipment, orders, and parts
        const { data: equipment } = await supabase.from('equipment').select('*');
        const { data: orders } = await supabase.from('maintenance_orders').select('*');
        const { data: parts } = await supabase.from('parts').select('*');
        const { data: settings } = await supabase.from('settings').select('*').single();

        if (!equipment || !orders) return;

        // 1. Check for overdue maintenance
        const overdueCount = equipment.filter(e => {
          const lastOrder = orders
            .filter(o => o.equipment_id === e.id && o.action_type === 'preventive')
            .sort((a, b) => new Date(b.request_date).getTime() - new Date(a.request_date).getTime())[0];
          
          const interval = settings?.default_preventive_interval || 30;
          const nextDate = lastOrder ? addDays(parseISO(lastOrder.request_date), interval) : addDays(new Date(), interval);
          return isAfter(new Date(), nextDate);
        }).length;

        if (overdueCount > 0) {
          addNotification({
            title: t('overdue_maintenance_alert', 'Alerta de Manutenção Atrasada'),
            message: t('overdue_maintenance_msg', 'Existem {{count}} equipamentos com manutenção preventiva atrasada.', { count: overdueCount }),
            type: 'warning'
          });
        }

        // 2. Check for open orders
        const openOrders = orders.filter(o => o.status === 'open').length;
        if (openOrders > 0) {
          addNotification({
            title: t('open_orders_alert', 'Ordens de Manutenção Abertas'),
            message: t('open_orders_msg', 'Existem {{count}} ordens de manutenção aguardando início.', { count: openOrders }),
            type: 'info'
          });
        }

        // 3. Check for low stock parts
        if (parts) {
          const lowStockParts = parts.filter(p => p.quantity <= p.min_quantity);
          if (lowStockParts.length > 0) {
            addNotification({
              title: t('low_stock_alert', 'Alerta de Estoque Baixo'),
              message: t('low_stock_msg', 'Existem {{count}} peças com estoque abaixo do mínimo.', { count: lowStockParts.length }),
              type: 'error'
            });
          }
        }

      } catch (error) {
        console.error('Error checking system status for notifications:', error);
      }
    };

    // Initial check
    checkSystemStatus();

    // Set up listeners for real-time updates
    const ordersSubscription = supabase
      .channel('maintenance_orders_realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'maintenance_orders' }, payload => {
        const oldStatus = payload.old.status;
        const newStatus = payload.new.status;
        
        if (oldStatus !== newStatus) {
          addNotification({
            title: t('order_status_updated', 'Status da Ordem Atualizado'),
            message: t('order_status_msg', 'A ordem #{{number}} mudou de {{old}} para {{new}}.', { 
              number: payload.new.order_number,
              old: t(oldStatus),
              new: t(newStatus)
            }),
            type: 'success'
          });
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'maintenance_orders' }, payload => {
        addNotification({
          title: t('new_order_created', 'Nova Ordem de Manutenção'),
          message: t('new_order_msg', 'Uma nova ordem (#{{number}}) foi aberta para {{equipment}}.', { 
            number: payload.new.order_number,
            equipment: payload.new.equipment_name || t('equipment')
          }),
          type: 'info'
        });
      })
      .subscribe();

    const equipmentSubscription = supabase
      .channel('equipment_realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'equipment' }, payload => {
        const oldStatus = payload.old.status;
        const newStatus = payload.new.status;
        
        if (oldStatus !== newStatus) {
          addNotification({
            title: t('equipment_status_updated', 'Status do Equipamento Atualizado'),
            message: t('equipment_status_msg', 'O equipamento {{name}} mudou para {{status}}.', { 
              name: payload.new.equipment_name,
              status: t(newStatus)
            }),
            type: newStatus === 'operational' ? 'success' : 'warning'
          });
        }
      })
      .subscribe();

    const partsSubscription = supabase
      .channel('parts_realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'parts' }, payload => {
        if (payload.new.quantity <= payload.new.min_quantity && payload.old.quantity > payload.new.min_quantity) {
          addNotification({
            title: t('low_stock_critical', 'Estoque Crítico'),
            message: t('low_stock_critical_msg', 'A peça {{name}} atingiu o nível mínimo de estoque.', { 
              name: payload.new.part_name
            }),
            type: 'error'
          });
        }
      })
      .subscribe();

    return () => {
      ordersSubscription.unsubscribe();
      equipmentSubscription.unsubscribe();
      partsSubscription.unsubscribe();
    };
  }, [t]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
