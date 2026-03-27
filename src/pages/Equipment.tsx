import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, MoreVertical, Wrench, AlertTriangle, CheckCircle, Clock, Edit2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getEquipment } from '@/services/maintenanceService';
import { Equipment } from '@/types';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { cn } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { AddEquipmentModal } from '@/components/modals/AddEquipmentModal';
import { EditEquipmentModal } from '@/components/modals/EditEquipmentModal';
import { AddOrderModal } from '@/components/modals/AddOrderModal';

const criticalityColors = {
  low: 'bg-blue-50 text-blue-600 border-blue-100',
  medium: 'bg-yellow-50 text-yellow-600 border-yellow-100',
  high: 'bg-orange-50 text-orange-600 border-orange-100',
  critical: 'bg-red-50 text-red-600 border-red-100',
};

const statusIcons = {
  active: <CheckCircle className="w-4 h-4 text-green-500" />,
  inactive: <AlertTriangle className="w-4 h-4 text-slate-400" />,
  maintenance: <Clock className="w-4 h-4 text-yellow-500" />,
};

export default function EquipmentPage() {
  const { t } = useTranslation();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [selectedEquipmentForOrder, setSelectedEquipmentForOrder] = useState<Equipment | null>(null);

  const [view, setView] = useState<'grid' | 'reports'>('grid');

  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    const unsub = getEquipment((data) => {
      setEquipment(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filteredEquipment = equipment.filter(e => {
    if (typeFilter !== 'all' && e.type !== typeFilter) return false;
    return true;
  });

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{t('equipment')}</h2>
            <p className="text-slate-500 mt-1">{t('manage_assets', 'Manage and track your industrial assets.')}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button 
                onClick={() => setView('grid')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  view === 'grid' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {t('grid', 'Grid')}
              </button>
              <button 
                onClick={() => setView('reports')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  view === 'reports' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {t('equipment_reports')}
              </button>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" />
              {t('add_equipment')}
            </button>
          </div>
        </div>

        {view === 'grid' ? (
          <>
            {/* Filters and Search */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder={t('search_placeholder')}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select 
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-slate-600"
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

            {/* Equipment Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredEquipment.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                          <Wrench className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 leading-tight">{item.equipment_name}</h3>
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-0.5">{item.registration_number}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => setEditingEquipment(item)}
                          className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-400 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('sector')}</p>
                        <p className="text-sm font-semibold text-slate-700">{item.sector}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('type')}</p>
                        <p className="text-sm font-semibold text-slate-700">{item.type}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('status')}</p>
                        <div className="flex items-center gap-1.5">
                          {statusIcons[item.status]}
                          <span className="text-sm font-semibold text-slate-700 capitalize">{t(item.status)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
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
                          className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          {t('create_action')}
                        </button>
                        <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:bg-white transition-colors">
                          <QRCodeSVG value={`cmms-jimp://equipment/${item.id}`} size={24} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-bottom border-slate-200">
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">{t('registration_number')}</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">{t('equipment_name')}</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">{t('type')}</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">{t('sector')}</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">{t('status')}</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">{t('criticality')}</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEquipment.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-slate-600">{item.registration_number}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">{item.equipment_name}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-600">{item.type}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-600">{item.sector}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          {statusIcons[item.status]}
                          <span className="text-xs font-bold text-slate-700 capitalize">{t(item.status)}</span>
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
                        <button 
                          onClick={() => {
                            setSelectedEquipmentForOrder(item);
                            setShowAddOrderModal(true);
                          }}
                          className="flex items-center gap-2 ml-auto px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          {t('create_action')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {equipment.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Wrench className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">{t('no_equipment_found')}</h3>
            <p className="text-slate-500 mt-1">{t('start_adding_equipment')}</p>
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
      </div>
    </ErrorBoundary>
  );
}
