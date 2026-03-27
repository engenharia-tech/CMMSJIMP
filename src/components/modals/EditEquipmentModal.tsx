import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { updateEquipment } from '@/services/maintenanceService';
import { Equipment } from '@/types';
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
  equipment: Equipment | null;
}

export function EditEquipmentModal({ isOpen, onClose, equipment }: Props) {
  const { t } = useTranslation();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (equipment) {
      reset({
        registration_number: equipment.registration_number,
        equipment_name: equipment.equipment_name,
        sector: equipment.sector,
        type: equipment.type,
        manufacturer: equipment.manufacturer,
        model: equipment.model,
        serial_number: equipment.serial_number,
        acquisition_date: equipment.acquisition_date,
        criticality: equipment.criticality,
        status: equipment.status,
        expected_life: equipment.expected_life,
        notes: equipment.notes || '',
      });
    }
  }, [equipment, reset]);

  const onSubmit = async (data: FormData) => {
    if (!equipment) return;
    try {
      await updateEquipment(equipment.id, data);
      toast.success(t('equipment_updated_success', 'Equipment updated successfully'));
      onClose();
    } catch (error: any) {
      toast.error(error.message || t('equipment_updated_error', 'Failed to update equipment'));
    }
  };

  if (!isOpen || !equipment) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-xl font-bold text-slate-900">{t('edit_equipment', 'Editar Equipamento')}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('registration_number')}</label>
              <input {...register('registration_number')} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" />
              {errors.registration_number && <p className="text-xs text-red-500">{t('required')}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('equipment_name')}</label>
              <input {...register('equipment_name')} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" />
              {errors.equipment_name && <p className="text-xs text-red-500">{t('required')}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('sector')}</label>
              <input {...register('sector')} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" />
              {errors.sector && <p className="text-xs text-red-500">{t('required')}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('type')}</label>
              <select {...register('type')} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none">
                <option value="Equipamento">{t('equipment_type')}</option>
                <option value="Predial">{t('building_type')}</option>
                <option value="Veículo">{t('vehicle_type')}</option>
                <option value="TI/Escritório">{t('it_type')}</option>
                <option value="Outros">{t('other_type')}</option>
              </select>
              {errors.type && <p className="text-xs text-red-500">{t('required')}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('manufacturer')}</label>
              <input {...register('manufacturer')} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" />
              {errors.manufacturer && <p className="text-xs text-red-500">{t('required')}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('model')}</label>
              <input {...register('model')} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" />
              {errors.model && <p className="text-xs text-red-500">{t('required')}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('serial_number')}</label>
              <input {...register('serial_number')} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" />
              {errors.serial_number && <p className="text-xs text-red-500">{t('required')}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('acquisition_date')}</label>
              <input type="date" {...register('acquisition_date')} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" />
              {errors.acquisition_date && <p className="text-xs text-red-500">{t('required')}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('expected_life')} ({t('years')})</label>
              <input type="number" {...register('expected_life', { valueAsNumber: true })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" />
              {errors.expected_life && <p className="text-xs text-red-500">{t('required')}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('criticality')}</label>
              <select {...register('criticality')} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none">
                <option value="low">{t('low')}</option>
                <option value="medium">{t('medium')}</option>
                <option value="high">{t('high')}</option>
                <option value="critical">{t('critical')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('status')}</label>
              <select {...register('status')} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none">
                <option value="active">{t('active')}</option>
                <option value="inactive">{t('inactive')}</option>
                <option value="maintenance">{t('maintenance')}</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('notes')}</label>
            <textarea {...register('notes')} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none min-h-[100px]" />
          </div>
          
          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">{t('cancel')}</button>
            <button type="submit" disabled={isSubmitting} className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-all disabled:opacity-50">
              {isSubmitting ? t('saving') : t('save_changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
