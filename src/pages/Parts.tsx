import React, { useEffect, useState } from 'react';
import { Plus, Search, Package, AlertTriangle, Edit2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getParts, deletePart } from '@/services/partsService';
import { Part } from '@/types';
import { toast } from 'sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AddPartModal } from '@/components/modals/AddPartModal';

export default function PartsPage() {
  const { t } = useTranslation();
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const unsub = getParts((data) => {
      setParts(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('delete_confirm', 'Are you sure you want to delete this part?'))) return;
    try {
      await deletePart(id);
      toast.success(t('part_deleted', 'Part deleted successfully'));
    } catch (error) {
      toast.error(t('delete_error', 'Failed to delete part'));
    }
  };

  const filteredParts = parts.filter(p => 
    p.part_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.part_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('parts_inventory')}</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{t('manage_parts_desc', 'Manage your spare parts and stock levels.')}</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            {t('add_part', 'Add Part')}
          </button>
        </div>

        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input 
              type="text" 
              placeholder={t('search_parts_placeholder', 'Search by name or code...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 transition-colors">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('part', 'Part')}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('stock', 'Stock')}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('unit_cost', 'Unit Cost')}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('supplier', 'Supplier')}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredParts.map((part) => (
                  <tr key={part.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 transition-colors">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{part.part_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{part.part_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${part.stock_quantity <= part.minimum_stock ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {part.stock_quantity}
                        </span>
                        {part.stock_quantity <= part.minimum_stock && (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">
                      R$ {part.unit_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {part.supplier}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(part.id)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredParts.length === 0 && !loading && (
            <div className="p-20 text-center">
              <p className="text-slate-500 dark:text-slate-400">{t('no_parts_found', 'No parts found.')}</p>
            </div>
          )}
        </div>

        <AddPartModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
      </div>
    </ErrorBoundary>
  );
}

