import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Wrench, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Activity, 
  Calendar, 
  ShieldCheck,
  ArrowLeft,
  History
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabase';
import { Equipment, MaintenanceOrder } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function PublicMachineStatus() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [activeOrders, setActiveOrders] = useState<MaintenanceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        // Esta pagina e publica (QR Code na maquina), entao NAO le as tabelas
        // direto: usa funcoes que devolvem so as colunas que podem aparecer
        // no chao de fabrica. Ver supabase/migrations/001.
        const { data: eqData, error: eqError } = await supabase
          .rpc('get_public_machine_status', { p_id: id })
          .maybeSingle();

        if (eqError) throw eqError;
        if (!eqData) throw new Error('Equipamento nao encontrado');
        setEquipment(eqData as Equipment);

        const { data: ordersData, error: ordersError } = await supabase
          .rpc('get_public_machine_orders', { p_id: id });

        if (ordersError) throw ordersError;
        setActiveOrders((ordersData || []) as MaintenanceOrder[]);

      } catch (err: any) {
        console.error('Error fetching public status:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Consultando status da máquina...</p>
      </div>
    );
  }

  if (error || !equipment) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-3xl flex items-center justify-center mb-6 border border-red-100 dark:border-red-900/30">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Máquina não encontrada</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-xs mb-8">
          O QR Code escaneado não corresponde a nenhum equipamento ativo no sistema.
        </p>
        <button 
          onClick={() => navigate('/')}
          className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold transition-transform active:scale-95"
        >
          Voltar ao Início
        </button>
      </div>
    );
  }

  const hasMaintenance = activeOrders.length > 0;
  const isStopped = equipment.status === 'maintenance' || equipment.status === 'inactive';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-12 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-10 transition-colors">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-sm font-black uppercase tracking-widest text-slate-400">Check-up Rápido</h1>
            <span className="text-xs font-bold text-blue-500">{equipment.registration_number}</span>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Machine Identity Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all">
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6 overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg">
              {equipment.photo_url ? (
                <img src={equipment.photo_url} alt={equipment.equipment_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <Wrench className="w-10 h-10 text-slate-400" />
              )}
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-1">{equipment.equipment_name}</h2>
            <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs">{equipment.sector}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className={cn(
              "p-4 rounded-3xl border flex flex-col items-center justify-center text-center transition-all",
              isStopped 
                ? "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400" 
                : "bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30 text-green-600 dark:text-green-400"
            )}>
              <Activity className="w-6 h-6 mb-2" />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Status</span>
              <span className="text-sm font-black uppercase">{t(equipment.status)}</span>
            </div>
            <div className={cn(
              "p-4 rounded-3xl border flex flex-col items-center justify-center text-center transition-all",
              hasMaintenance 
                ? "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30 text-amber-600 dark:text-amber-400" 
                : "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400"
            )}>
              <ShieldCheck className="w-6 h-6 mb-2" />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Manutenção</span>
              <span className="text-sm font-black uppercase">{hasMaintenance ? 'Em Aberto' : 'Em Dia'}</span>
            </div>
          </div>
        </div>

        {/* Maintenance Details */}
        {hasMaintenance ? (
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest px-2">Ordens Ativas</h3>
            {activeOrders.map(order => (
              <div key={order.id} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-xl",
                      order.priority === 'critical' || order.priority === 'high' ? "bg-red-100 dark:bg-red-900/30 text-red-600" : "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                    )}>
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{order.order_number}</p>
                      <h4 className="font-bold text-slate-900 dark:text-white">{t(order.action_type)}</h4>
                    </div>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                    order.status === 'in_progress' ? "bg-yellow-50 text-yellow-600 border-yellow-100" : "bg-red-50 text-red-600 border-red-100"
                  )}>
                    {t(order.status)}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">Aberta em: {format(new Date(order.request_date), 'dd/MM/yyyy')}</span>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Descrição do Problema</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                      {order.problem_description || 'Nenhuma descrição detalhada fornecida.'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-green-500/10 border border-green-500/20 rounded-3xl p-8 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-black text-green-600 dark:text-green-400 tracking-tight">Tudo em Ordem</h3>
            <p className="text-green-600/70 dark:text-green-400/70 text-sm font-medium mt-1">
              Esta máquina não possui manutenções pendentes no momento.
            </p>
          </div>
        )}

        {/* Technical Info Section */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 transition-colors">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Informações Técnicas
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
              <span className="text-xs font-bold text-slate-500 uppercase">Criticidade</span>
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                equipment.criticality === 'critical' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
              )}>
                {t(equipment.criticality)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
              <span className="text-xs font-bold text-slate-500 uppercase">Tipo</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white uppercase">{t(equipment.type)}</span>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="pt-4">
          <button 
            onClick={() => navigate('/login')}
            className="w-full flex items-center justify-center gap-3 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
          >
            <History className="w-5 h-5" />
            Acessar Painel Completo
          </button>
        </div>
      </div>
    </div>
  );
}
