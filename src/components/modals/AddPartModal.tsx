import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { addPart } from '@/services/partsService';
import { toast } from 'sonner';

const schema = z.object({
  part_code: z.string().min(1, "Required"),
  part_name: z.string().min(1, "Required"),
  stock_quantity: z.number().min(0),
  minimum_stock: z.number().min(0),
  unit_cost: z.number().min(0),
  supplier: z.string().min(1, "Required"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AddPartModal({ isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      stock_quantity: 0,
      minimum_stock: 5,
      unit_cost: 0,
    }
  });

  const onSubmit = async (data: FormData) => {
    try {
      await addPart(data);
      toast.success(t('part_added_success', 'Part added successfully'));
      onClose();
    } catch (error: any) {
      toast.error(error.message || t('part_added_error', 'Failed to add part'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transition-colors">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 transition-colors">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('add_new_part', 'Adicionar Nova Peça')}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('part_code', 'Código da Peça')}</label>
              <input {...register('part_code')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors" />
              {errors.part_code && <p className="text-xs text-red-500">{t('required')}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('part_name', 'Nome da Peça')}</label>
              <input {...register('part_name')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors" />
              {errors.part_name && <p className="text-xs text-red-500">{t('required')}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('stock_quantity', 'Quantidade em Estoque')}</label>
              <input type="number" {...register('stock_quantity', { valueAsNumber: true })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors" />
              {errors.stock_quantity && <p className="text-xs text-red-500">{t('required')}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('minimum_stock', 'Estoque Mínimo')}</label>
              <input type="number" {...register('minimum_stock', { valueAsNumber: true })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors" />
              {errors.minimum_stock && <p className="text-xs text-red-500">{t('required')}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('unit_cost', 'Custo Unitário')}</label>
              <input type="number" step="0.01" {...register('unit_cost', { valueAsNumber: true })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors" />
              {errors.unit_cost && <p className="text-xs text-red-500">{t('required')}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('supplier', 'Fornecedor')}</label>
              <input {...register('supplier')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors" />
              {errors.supplier && <p className="text-xs text-red-500">{t('required')}</p>}
            </div>
          </div>
          
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 transition-colors">
            <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">{t('cancel')}</button>
            <button type="submit" disabled={isSubmitting} className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-all disabled:opacity-50">
              {isSubmitting ? t('saving') : t('add_part')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

