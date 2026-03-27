import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { addEquipment } from '@/services/maintenanceService';
import { Criticality, EquipmentStatus } from '@/types';
import { toast } from 'sonner';

const schema = z.object({
  registration_number: z.string().min(1, "Required"),
  equipment_name: z.string().min(1, "Required"),
  sector: z.string().min(1, "Required"),
  type: z.string().min(1, "Required"),
  manufacturer: z.string().min(1, "Required"),
  model: z.string().min(1, "Required"),
  serial_number: z.string().min(1, "Required"),
  acquisition_date: z.string().min(1, "Required"),
  criticality: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['active', 'inactive', 'maintenance']),
  expected_life: z.number().min(1),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AddEquipmentModal({ isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      criticality: 'medium',
      status: 'active',
      expected_life: 10,
    }
  });

  const onSubmit = async (data: FormData) => {
    try {
      console.log('AddEquipmentModal: Attempting to add equipment with data:', data);
      await addEquipment(data);
      console.log('AddEquipmentModal: Equipment added successfully');
      toast.success(t('equipment_added_success', 'Equipment added successfully'));
      onClose();
    } catch (error: any) {
      console.error('AddEquipmentModal: Add equipment error:', error);
      let errorMessage = error.message || t('equipment_added_error', 'Failed to add equipment');
      
      if (errorMessage.includes('schema cache') || errorMessage.includes('not found')) {
        errorMessage = "Tabela 'equipment' não encontrada. Por favor, execute o script SQL no seu painel do Supabase.";
      } else {
        if (error.details) {
          errorMessage += ` - ${error.details}`;
        }
        if (error.hint) {
          errorMessage += ` (${error.hint})`;
        }
      }
      
      toast.error(errorMessage);
    }
  };

  const onInvalid = (errors: any) => {
    console.warn('AddEquipmentModal: Form validation errors:', errors);
    toast.error(t('check_form_errors', 'Please check the form for errors'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transition-colors">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 transition-colors">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('add_new_equipment')}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('registration_number')}</label>
              <input {...register('registration_number')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors" />
              {errors.registration_number && <p className="text-xs text-red-500">{t('required')}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('equipment_name')}</label>
              <input {...register('equipment_name')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors" />
              {errors.equipment_name && <p className="text-xs text-red-500">{t('required')}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('sector')}</label>
              <input {...register('sector')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors" />
              {errors.sector && <p className="text-xs text-red-500">{t('required')}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('type')}</label>
              <select {...register('type')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors">
                <option value="Equipamento">{t('equipment_type')}</option>
                <option value="Predial">{t('building_type')}</option>
                <option value="Veículo">{t('vehicle_type')}</option>
                <option value="TI/Escritório">{t('it_type')}</option>
                <option value="Outros">{t('other_type')}</option>
              </select>
              {errors.type && <p className="text-xs text-red-500">{t('required')}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('manufacturer')}</label>
              <input {...register('manufacturer')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors" />
              {errors.manufacturer && <p className="text-xs text-red-500">{t('required')}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('model')}</label>
              <input {...register('model')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors" />
              {errors.model && <p className="text-xs text-red-500">{t('required')}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('serial_number')}</label>
              <input {...register('serial_number')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors" />
              {errors.serial_number && <p className="text-xs text-red-500">{t('required')}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('acquisition_date')}</label>
              <input type="date" {...register('acquisition_date')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors" />
              {errors.acquisition_date && <p className="text-xs text-red-500">{t('required')}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('expected_life')} ({t('years')})</label>
              <input type="number" {...register('expected_life', { valueAsNumber: true })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors" />
              {errors.expected_life && <p className="text-xs text-red-500">{t('required')}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('criticality')}</label>
              <select {...register('criticality')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors">
                <option value="low">{t('low')}</option>
                <option value="medium">{t('medium')}</option>
                <option value="high">{t('high')}</option>
                <option value="critical">{t('critical')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('status')}</label>
              <select {...register('status')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors">
                <option value="active">{t('active')}</option>
                <option value="inactive">{t('inactive')}</option>
                <option value="maintenance">{t('maintenance')}</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('notes')}</label>
            <textarea {...register('notes')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none min-h-[100px] transition-colors" />
          </div>
          
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 transition-colors">
            <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">{t('cancel')}</button>
            <button type="submit" disabled={isSubmitting} className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-all disabled:opacity-50">
              {isSubmitting ? t('saving') : t('add_equipment')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

