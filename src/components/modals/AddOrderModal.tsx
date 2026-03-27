import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X } from 'lucide-react';
import { addOrder, updateEquipment, getEquipment } from '@/services/maintenanceService';
import { Criticality, OrderStatus, ActionType, Equipment } from '@/types';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  equipmentList?: Equipment[];
  initialEquipmentId?: string;
  initialActionType?: ActionType;
}

export function AddOrderModal({ isOpen, onClose, equipmentList = [], initialEquipmentId, initialActionType }: Props) {
  const { t } = useTranslation();
  const [internalEquipment, setInternalEquipment] = React.useState<Equipment[]>(equipmentList);

  React.useEffect(() => {
    if (equipmentList.length === 0 && isOpen) {
      const unsub = getEquipment(setInternalEquipment);
      return unsub;
    }
  }, [isOpen, equipmentList.length]);

  const schema = z.object({
    equipment_id: z.string().min(1, t('required')),
    order_number: z.string().min(1, t('required')),
    sector: z.string().min(1, t('required')),
    request_date: z.string().min(1, t('required')),
    requester: z.string().min(1, t('required')),
    operator: z.string().min(1, t('required')),
    action_type: z.enum(['preventive', 'corrective', 'predictive']),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    problem_description: z.string().min(1, t('required')),
    downtime_hours: z.number().min(0),
    maintenance_cost: z.number().min(0),
    status: z.enum(['open', 'in_progress', 'completed']),
  });

  type FormData = z.infer<typeof schema>;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      request_date: new Date().toISOString().split('T')[0],
      action_type: initialActionType || 'corrective',
      equipment_id: initialEquipmentId || '',
      priority: 'medium',
      status: 'open',
      downtime_hours: 0,
      maintenance_cost: 0,
    }
  });

  React.useEffect(() => {
    if (isOpen) {
      reset({
        request_date: new Date().toISOString().split('T')[0],
        action_type: initialActionType || 'corrective',
        equipment_id: initialEquipmentId || '',
        priority: 'medium',
        status: 'open',
        downtime_hours: 0,
        maintenance_cost: 0,
        order_number: `OM-${Math.floor(1000 + Math.random() * 9000)}`
      });
    }
  }, [isOpen, initialEquipmentId, initialActionType, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      console.log('AddOrderModal: Attempting to create order with data:', data);
      
      // Create the order
      await addOrder({
        ...data,
        labor_hours: 0,
        labor_cost: 0,
        parts_cost: 0,
        next_preventive_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });

      // If it's a corrective maintenance, update equipment status to 'maintenance'
      if (data.action_type === 'corrective') {
        await updateEquipment(data.equipment_id, { status: 'maintenance' });
      }

      toast.success(t('order_created_success'));
      onClose();
    } catch (error: any) {
      console.error('AddOrderModal: Error creating order:', error);
      let errorMessage = error.message || t('order_created_error');
      
      if (errorMessage.includes('schema cache') || errorMessage.includes('not found')) {
        errorMessage = "Tabela 'maintenance_orders' não encontrada. Por favor, execute o script SQL no seu painel do Supabase.";
      }
      
      toast.error(errorMessage);
    }
  };

  const onInvalid = (errors: any) => {
    console.warn('AddOrderModal: Form validation errors:', errors);
    toast.error(t('check_form_errors'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transition-colors">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('new_maintenance_order')}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('order_number_label')}</label>
              <input {...register('order_number')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900 dark:text-white transition-colors" />
              {errors.order_number && <p className="text-red-500 text-[10px] font-bold">{errors.order_number.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('equipment')}</label>
              <select {...register('equipment_id')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900 dark:text-white transition-colors">
                <option value="" className="dark:bg-slate-900">{t('select_equipment')}</option>
                {(internalEquipment.length > 0 ? internalEquipment : equipmentList).map(e => <option key={e.id} value={e.id} className="dark:bg-slate-900">{e.equipment_name} ({e.registration_number})</option>)}
              </select>
              {errors.equipment_id && <p className="text-red-500 text-[10px] font-bold">{errors.equipment_id.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('sector')}</label>
              <input {...register('sector')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900 dark:text-white transition-colors" />
              {errors.sector && <p className="text-red-500 text-[10px] font-bold">{errors.sector.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('requester')}</label>
              <input {...register('requester')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900 dark:text-white transition-colors" />
              {errors.requester && <p className="text-red-500 text-[10px] font-bold">{errors.requester.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('operator')}</label>
              <input {...register('operator')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900 dark:text-white transition-colors" />
              {errors.operator && <p className="text-red-500 text-[10px] font-bold">{errors.operator.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('type')}</label>
              <select {...register('action_type')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900 dark:text-white transition-colors">
                <option value="preventive" className="dark:bg-slate-900">{t('preventive_type')}</option>
                <option value="corrective" className="dark:bg-slate-900">{t('corrective_type')}</option>
                <option value="predictive" className="dark:bg-slate-900">{t('predictive_type')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('priority')}</label>
              <select {...register('priority')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900 dark:text-white transition-colors">
                <option value="low" className="dark:bg-slate-900">{t('low')}</option>
                <option value="medium" className="dark:bg-slate-900">{t('medium')}</option>
                <option value="high" className="dark:bg-slate-900">{t('high')}</option>
                <option value="critical" className="dark:bg-slate-900">{t('critical')}</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('problem_description')}</label>
            <textarea {...register('problem_description')} rows={3} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none resize-none text-slate-900 dark:text-white transition-colors" />
            {errors.problem_description && <p className="text-red-500 text-[10px] font-bold">{errors.problem_description.message}</p>}
          </div>
          
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">{t('cancel')}</button>
            <button type="submit" disabled={isSubmitting} className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-all disabled:opacity-50">
              {isSubmitting ? t('saving') : t('create_order')}
            </button>
          </div>
        </form>
      </div>
    </div>

  );
}
