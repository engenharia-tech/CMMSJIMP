import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, MoreVertical, Wrench, AlertTriangle, CheckCircle, Clock, Edit2, X, History, QrCode, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getEquipment, hardDeleteEquipment } from '@/services/maintenanceService';
import { supabase, getUserProfile } from '../supabase';
import { Equipment, UserRole } from '@/types';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { cn } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { AddEquipmentModal } from '@/components/modals/AddEquipmentModal';
import { EditEquipmentModal } from '@/components/modals/EditEquipmentModal';
import { AddOrderModal } from '@/components/modals/AddOrderModal';
import { MaintenanceHistoryModal } from '@/components/modals/MaintenanceHistoryModal';
import { QRCodeModal } from '@/components/modals/QRCodeModal';
import { ConfirmationModal } from '@/components/modals/ConfirmationModal';
import { toast } from 'sonner';

const criticalityColors = {
  low: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30',
  medium: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-100 dark:border-yellow-900/30',
  high: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/30',
  critical: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30',
};

const statusIcons = {
  active: <CheckCircle className="w-4 h-4 text-green-500" />,
  inactive: <AlertTriangle className="w-4 h-4 text-slate-400 dark:text-slate-500" />,
  maintenance: <Clock className="w-4 h-4 text-yellow-500" />,
  obsolete: <X className="w-4 h-4 text-red-500" />,
};

export default function EquipmentPage() {
  const { t } = useTranslation();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [maintenanceCounts, setMaintenanceCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [selectedEquipmentForOrder, setSelectedEquipmentForOrder] = useState<Equipment | null>(null);
  const [selectedEquipmentForHistory, setSelectedEquipmentForHistory] = useState<Equipment | null>(null);
  const [selectedEquipmentForQRCode, setSelectedEquipmentForQRCode] = useState<Equipment | null>(null);
  const [equipmentToDelete, setEquipmentToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('operator');

  const [view, setView] = useState<'grid' | 'reports'>('grid');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showObsolete, setShowObsolete] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const profile = await getUserProfile(user.id);
        setUserRole(profile?.role || 'operator');
      }
    };
    fetchUserRole();

    const unsub = getEquipment(async (data) => {
      setEquipment(data);
      setLoading(false);
      
      // Fetch maintenance counts for each equipment
      const counts: Record<string, number> = {};
      for (const item of data) {
        const { count } = await supabase
          .from('maintenance_orders')
          .select('*', { count: 'exact', head: true })
          .eq('equipment_id', item.id);
        counts[item.id] = count || 0;
      }
      setMaintenanceCounts(counts);
    });
    return unsub;
  }, []);

  const handleHardDelete = async () => {
    if (!equipmentToDelete) return;
    try {
      setIsDeleting(true);
      await hardDeleteEquipment(equipmentToDelete);
      toast.success(t('equipment_deleted_success', 'Equipamento excluído permanentemente'));
      setEquipmentToDelete(null);
    } catch (error: any) {
      toast.error(error.message || t('equipment_deleted_error', 'Erro ao excluir equipamento'));
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredEquipment = equipment.filter(e => {
    if (!showObsolete && e.status === 'obsolete') return false;
    if (showObsolete && e.status !== 'obsolete') return false;
    if (typeFilter !== 'all' && e.type !== typeFilter) return false;
    if (searchQuery && !e.equipment_name.toLowerCase().includes(searchQuery.toLowerCase()) && !e.registration_number.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('equipment')}</h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">{t('manage_assets', 'Manage and track your industrial assets.')}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors">
              <button 
                onClick={() => setView('grid')}
                className={cn(
                  "flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  view === 'grid' ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                {t('grid', 'Grid')}
              </button>
              <button 
                onClick={() => setView('reports')}
                className={cn(
                  "flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  view === 'reports' ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                {t('equipment_reports')}
              </button>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" />
              {t('add_equipment')}
            </button>
          </div>
        </div>

        {view === 'grid' ? (
          <>
            {/* Filters and Search */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('search_placeholder')}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white transition-colors"
                />
              </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors">
                <button
                  onClick={() => setShowObsolete(false)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                    !showObsolete 
                      ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm" 
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  <CheckCircle className="w-4 h-4" />
                  {t('active_tab', 'Ativo')}
                </button>
                <button
                  onClick={() => setShowObsolete(true)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                    showObsolete 
                      ? "bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 shadow-sm" 
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  <Trash2 className="w-4 h-4" />
                  {t('obsolete_tab', 'Obsoleto')}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select 
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-slate-600 dark:text-slate-400 transition-colors"
                >
                  <option value="all">{t('all_types', 'All Types')}</option>
                  <option value="Equipamento">{t('equipment_type')}</option>
                  <option value="Predial">{t('building_type')}</option>
                  <option value="Veículo">{t('vehicle_type')}</option>
                  <option value="TI/Escritório">{t('it_type')}</option>
                  <option value="Outros">{t('other_type')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Equipment Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredEquipment.map((item) => (
              <div key={item.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-all group">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div 
                      className="flex items-center gap-3 cursor-pointer group/info"
                      onClick={() => {
                        setSelectedEquipmentForQRCode(item);
                        setShowQRCodeModal(true);
                      }}
                    >
                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover/info:bg-blue-50 dark:group-hover/info:bg-blue-900/20 group-hover/info:text-blue-600 dark:group-hover/info:text-blue-400 transition-colors overflow-hidden">
                        {item.photo_url ? (
                          <img src={item.photo_url} alt={item.equipment_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Wrench className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white leading-tight group-hover/info:text-blue-600 dark:group-hover/info:text-blue-400 transition-colors">{item.equipment_name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-0.5">{item.registration_number}</p>
                      </div>
                    </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => {
                            setSelectedEquipmentForHistory(item);
                            setShowHistoryModal(true);
                          }}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-lg text-slate-400 transition-colors"
                          title={t('maintenance_history')}
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setEditingEquipment(item)}
                          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg text-slate-400 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {showObsolete && userRole === 'admin' && (
                          <button 
                            onClick={() => setEquipmentToDelete(item.id)}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg text-slate-400 transition-colors"
                            title={t('delete_permanently', 'Excluir Permanentemente')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('sector')}</p>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.sector}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('type')}</p>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.type}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('status')}</p>
                        <div className="flex items-center gap-1.5">
                          {statusIcons[item.status]}
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 capitalize">{t(item.status)}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('maintenance_count')}</p>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{maintenanceCounts[item.id] || 0}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 transition-colors">
                      <div className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        criticalityColors[item.criticality]
                      )}>
                        {t(item.criticality)}
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setSelectedEquipmentForOrder(item);
                            setShowAddOrderModal(true);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          {t('create_action')}
                        </button>
                        <div 
                          onClick={() => {
                            setSelectedEquipmentForQRCode(item);
                            setShowQRCodeModal(true);
                          }}
                          className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-white dark:hover:bg-slate-700 transition-colors"
                        >
                          <QRCodeSVG 
                            value={`cmms-jimp://equipment/${item.id}`} 
                            size={24} 
                            bgColor="transparent"
                            fgColor="currentColor"
                            className="text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-bottom border-slate-200 dark:border-slate-800">
                    <th className="px-6 py-4 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('registration_number')}</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('equipment_name')}</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('type')}</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('sector')}</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('maintenance_count')}</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('status')}</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('criticality')}</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredEquipment.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">{item.registration_number}</td>
                      <td className="px-6 py-4">
                        <div 
                          className="flex items-center gap-3 cursor-pointer group/table-info"
                          onClick={() => {
                            setSelectedEquipmentForQRCode(item);
                            setShowQRCodeModal(true);
                          }}
                        >
                          <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden group-hover/table-info:bg-blue-50 dark:group-hover/table-info:bg-blue-900/20 transition-colors">
                            {item.photo_url ? (
                              <img src={item.photo_url} alt={item.equipment_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <Wrench className="w-4 h-4 text-slate-400 group-hover/table-info:text-blue-600 transition-colors" />
                            )}
                          </div>
                          <span className="text-sm font-bold text-slate-900 dark:text-white group-hover/table-info:text-blue-600 dark:group-hover/table-info:text-blue-400 transition-colors">{item.equipment_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">{item.type}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">{item.sector}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">{maintenanceCounts[item.id] || 0}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          {statusIcons[item.status]}
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 capitalize">{t(item.status)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                          criticalityColors[item.criticality]
                        )}>
                          {t(item.criticality)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => {
                              setSelectedEquipmentForHistory(item);
                              setShowHistoryModal(true);
                            }}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-lg text-slate-400 transition-colors"
                            title={t('maintenance_history')}
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedEquipmentForOrder(item);
                              setShowAddOrderModal(true);
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            {t('create_action')}
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedEquipmentForQRCode(item);
                              setShowQRCodeModal(true);
                            }}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-lg text-slate-400 transition-colors"
                            title={t('view_qrcode', 'Ver QR Code')}
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          {showObsolete && userRole === 'admin' && (
                            <button 
                              onClick={() => setEquipmentToDelete(item.id)}
                              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg text-slate-400 transition-colors"
                              title={t('delete_permanently', 'Excluir Permanentemente')}
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
          </div>
        )}

        {equipment.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 transition-colors">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <Wrench className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('no_equipment_found')}</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{t('start_adding_equipment')}</p>
          </div>
        )}


        <AddEquipmentModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
        <EditEquipmentModal 
          isOpen={!!editingEquipment} 
          onClose={() => setEditingEquipment(null)} 
          equipment={editingEquipment}
        />
        <AddOrderModal 
          isOpen={showAddOrderModal} 
          onClose={() => {
            setShowAddOrderModal(false);
            setSelectedEquipmentForOrder(null);
          }}
          initialEquipmentId={selectedEquipmentForOrder?.id}
          initialActionType="corrective"
        />
        <MaintenanceHistoryModal
          isOpen={showHistoryModal}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedEquipmentForHistory(null);
          }}
          equipment={selectedEquipmentForHistory}
        />
        <QRCodeModal
          isOpen={showQRCodeModal}
          onClose={() => {
            setShowQRCodeModal(false);
            setSelectedEquipmentForQRCode(null);
          }}
          equipment={selectedEquipmentForQRCode}
        />
        <ConfirmationModal
          isOpen={!!equipmentToDelete}
          onClose={() => setEquipmentToDelete(null)}
          onConfirm={handleHardDelete}
          title={t('confirm_hard_delete_title', 'Excluir Permanentemente')}
          message={t('confirm_hard_delete_message', 'Tem certeza que deseja excluir este equipamento permanentemente? Esta ação não pode ser desfeita e todos os dados relacionados serão perdidos.')}
          isLoading={isDeleting}
        />
      </div>
    </ErrorBoundary>
  );
}
