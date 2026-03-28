import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2, DollarSign, Clock, Package, CheckCircle2, AlertTriangle, ClipboardList } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MaintenanceOrder, Part, OrderPart, UserRole } from '@/types';
import { getParts, updateOrder, getSettings, updateEquipment, deleteOrder } from '@/services/maintenanceService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ConfirmationModal } from './ConfirmationModal';
import { supabase, getUserProfile } from '@/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: MaintenanceOrder;
}

export function EditOrderModal({ isOpen, onClose, order }: Props) {
  const { t } = useTranslation();
  const [parts, setParts] = useState<Part[]>([]);
  const [selectedParts, setSelectedParts] = useState<OrderPart[]>(order.parts_list || []);
  const [laborHours, setLaborHours] = useState<number>(order.labor_hours || 0);
  const [actionTaken, setActionTaken] = useState<string>(order.action_taken || '');
  const [laborRate, setLaborRate] = useState<number>(50);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('operator');

  useEffect(() => {
    if (isOpen) {
      getParts(setParts);
      const fetchSettings = async () => {
        const settings = await getSettings();
        setLaborRate(settings.labor_rate || 50);
      };
      fetchSettings();

      const fetchUserRole = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const profile = await getUserProfile(user.id);
          setUserRole(profile?.role || 'operator');
        }
      };
      fetchUserRole();

      setSelectedParts(order.parts_list || []);
      setLaborHours(order.labor_hours || 0);
      setActionTaken(order.action_taken || '');
    }
  }, [isOpen, order]);

  const handleAddPart = (partId: string) => {
    const part = parts.find(p => p.id === partId);
    if (!part) return;

    const existing = selectedParts.find(p => p.part_id === partId);
    if (existing) {
      setSelectedParts(selectedParts.map(p => 
        p.part_id === partId ? { ...p, quantity: p.quantity + 1 } : p
      ));
    } else {
      setSelectedParts([...selectedParts, {
        part_id: part.id,
        part_name: part.part_name,
        quantity: 1,
        unit_cost: part.unit_cost
      }]);
    }
  };

  const handleRemovePart = (partId: string) => {
    setSelectedParts(selectedParts.filter(p => p.part_id !== partId));
  };

  const handleUpdateQuantity = (partId: string, quantity: number) => {
    if (quantity < 1) return;
    setSelectedParts(selectedParts.map(p => 
      p.part_id === partId ? { ...p, quantity } : p
    ));
  };

  const partsCost = selectedParts.reduce((acc, p) => acc + (p.unit_cost * p.quantity), 0);
  const laborCost = laborHours * laborRate;
  const totalCost = partsCost + laborCost;

  const handleSave = async (conclude: boolean = false) => {
    setLoading(true);
    try {
      const updateData: Partial<MaintenanceOrder> = {
        parts_list: selectedParts,
        labor_hours: laborHours,
        labor_cost: laborCost,
        parts_cost: partsCost,
        maintenance_cost: totalCost,
        action_taken: actionTaken,
        status: conclude ? 'completed' : 'in_progress'
      };

      if (conclude) {
        updateData.completion_date = new Date().toISOString();
      }

      await updateOrder(order.id, updateData);

      if (conclude) {
        await updateEquipment(order.equipment_id, { status: 'active' });
        toast.success(t('order_completed_success', 'Ordem finalizada com sucesso'));
      } else {
        toast.success(t('order_updated_success', 'Ordem atualizada com sucesso'));
      }
      
      onClose();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error(t('order_updated_error', 'Erro ao atualizar ordem'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setLoading(true);
    try {
      await deleteOrder(order.id);
      toast.success(t('order_deleted_success', 'Ordem excluída com sucesso'));
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error(t('order_deleted_error', 'Erro ao excluir ordem'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{t('manage_order_costs', 'Gerenciar Custos da Ordem')}</h3>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{order.order_number}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Labor Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                <Clock className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-slate-900">{t('labor', 'Mão de Obra')}</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('labor_hours', 'Horas de Trabalho')}</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="number" 
                    step="0.5"
                    value={laborHours}
                    onChange={(e) => setLaborHours(parseFloat(e.target.value) || 0)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('labor_cost', 'Custo de Mão de Obra')}</label>
                <div className="h-10 flex items-center px-4 bg-white border border-slate-200 rounded-xl font-bold text-slate-700">
                  <DollarSign className="w-4 h-4 text-slate-400 mr-1" />
                  {laborCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  <span className="ml-2 text-[10px] text-slate-400 font-normal">({laborRate}/h)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Taken Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
                <ClipboardList className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-slate-900">{t('action_taken', 'Ações Realizadas')}</h4>
            </div>
            <textarea 
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              placeholder={t('action_taken_placeholder', 'Descreva o que foi feito...')}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none font-medium min-h-[100px]"
            />
          </div>

          {/* Parts Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
                  <Package className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-slate-900">{t('parts', 'Peças')}</h4>
              </div>
              <select 
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddPart(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">+ {t('add_part', 'Adicionar Peça')}</option>
                {parts.map(p => (
                  <option key={p.id} value={p.id}>{p.part_name} ({p.part_code}) - {p.unit_cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</option>
                ))}
              </select>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">{t('part', 'Peça')}</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">{t('quantity', 'Qtd')}</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">{t('unit_cost', 'Custo Unit.')}</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">{t('total', 'Total')}</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedParts.map((p) => (
                    <tr key={p.part_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold text-slate-700">{p.part_name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <input 
                            type="number" 
                            value={p.quantity}
                            onChange={(e) => handleUpdateQuantity(p.part_id, parseInt(e.target.value) || 1)}
                            className="w-12 px-1 py-1 bg-slate-50 border border-slate-200 rounded text-center text-xs font-bold"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs font-medium text-slate-500">{p.unit_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-bold text-slate-900">{(p.unit_cost * p.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => handleRemovePart(p.part_id)}
                          className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {selectedParts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs font-medium italic">
                        {t('no_parts_added', 'Nenhuma peça adicionada a esta ordem.')}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-50/50 font-bold border-t border-slate-200">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-slate-500">{t('total_parts_cost', 'Total Peças')}</td>
                    <td className="px-4 py-3 text-right text-slate-900">{partsCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Summary */}
        <div className="p-6 md:p-8 bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-8 w-full md:w-auto">
            <div className="text-center md:text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{t('labor', 'Mão de Obra')}</p>
              <p className="text-lg font-bold">R$ {laborCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="text-center md:text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{t('parts', 'Peças')}</p>
              <p className="text-lg font-bold">R$ {partsCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="hidden md:block h-10 w-px bg-white/10" />
            <div className="text-center md:text-left w-full md:w-auto pt-4 md:pt-0 border-t border-white/10 md:border-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">{t('total_cost', 'Custo Total')}</p>
              <p className="text-2xl font-black text-blue-400">R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="flex gap-2 justify-center sm:justify-start">
              {userRole === 'admin' && (
                <button 
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-bold text-red-400 hover:text-red-600 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('delete')}
                </button>
              )}
              <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors">{t('cancel')}</button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => handleSave(false)}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3 bg-slate-800 text-white rounded-xl font-bold shadow-lg hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {t('save_costs', 'Salvar')}
              </button>
              <button 
                onClick={() => handleSave(true)}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-900/40 hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                <CheckCircle2 className="w-4 h-4" />
                {t('conclude_order', 'Concluir')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title={t('confirm_delete_order_title', 'Excluir Ordem')}
        message={t('confirm_delete_order_message', 'Tem certeza que deseja excluir esta ordem de manutenção? Esta ação não pode ser desfeita.')}
        isLoading={loading}
      />
    </div>
  );
}
