import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { updateEquipment, deleteEquipment } from '@/services/maintenanceService';
import { uploadEquipmentPhoto } from '@/lib/storage';
import { Equipment } from '@/types';
import { toast } from 'sonner';
import { ConfirmationModal } from './ConfirmationModal';

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
  status: z.enum(['active', 'inactive', 'maintenance', 'obsolete']),
  expected_life: z.number().min(1),
  photo_url: z.string().url("Invalid URL").or(z.literal("")).optional(),
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
  const [uploading, setUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const photoUrl = watch('photo_url');

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
        photo_url: equipment.photo_url || '',
        notes: equipment.notes || '',
      });
      setPhotoPreview(null);
    }
  }, [equipment, reset]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      setUploading(true);
      const url = await uploadEquipmentPhoto(file);
      setValue('photo_url', url);
      toast.success(t('photo_uploaded', 'Photo uploaded successfully'));
    } catch (error) {
      toast.error(t('upload_error', 'Error uploading photo'));
      setPhotoPreview(null);
    } finally {
      setUploading(false);
    }
  };

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

  const handleDelete = async () => {
    if (!equipment) return;
    try {
      await deleteEquipment(equipment.id);
      toast.success(t('equipment_obsolete_success', 'Equipamento marcado como obsoleto'));
      onClose();
    } catch (error: any) {
      toast.error(error.message || t('equipment_obsolete_error', 'Erro ao marcar equipamento como obsoleto'));
    }
  };

  if (!isOpen || !equipment) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transition-colors">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 transition-colors">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('edit_equipment', 'Editar Equipamento')}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
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
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('photo_url')}</label>
              <div className="flex flex-col md:flex-row gap-4 items-start">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all overflow-hidden relative group"
                >
                  {photoPreview || photoUrl ? (
                    <>
                      <img src={photoPreview || photoUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Upload className="w-6 h-6 text-white" />
                      </div>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center px-2">
                        {uploading ? t('uploading') : t('select_photo')}
                      </span>
                    </>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 w-full space-y-4">
                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium italic">
                      {t('photo_upload_hint', 'Upload a photo of the equipment to help with identification. Images are compressed automatically.')}
                    </p>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <input 
                      {...register('photo_url')} 
                      placeholder="https://..." 
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors text-sm" 
                    />
                    {errors.photo_url && <p className="text-xs text-red-500">{errors.photo_url.message}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('notes')}</label>
            <textarea {...register('notes')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none min-h-[100px] transition-colors" />
          </div>
          
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center transition-colors">
            <button 
              type="button" 
              onClick={() => setShowDeleteConfirm(true)} 
              className="px-6 py-2 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
            >
              {t('delete_equipment', 'Excluir Equipamento')}
            </button>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">{t('cancel')}</button>
              <button type="submit" disabled={isSubmitting} className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-all disabled:opacity-50">
                {isSubmitting ? t('saving') : t('save_changes')}
              </button>
            </div>
          </div>
        </form>
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={t('confirm_obsolete_title', 'Marcar como Obsoleto')}
        message={t('confirm_obsolete_message', 'Tem certeza que deseja marcar este equipamento como obsoleto? Ele não aparecerá mais na lista ativa, mas seu histórico será mantido.')}
      />
    </div>
  );
}
