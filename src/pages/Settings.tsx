import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Globe, 
  Database, 
  User, 
  Save, 
  CheckCircle, 
  DollarSign, 
  Moon, 
  Sun, 
  Lock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Building2, 
  Wrench, 
  X,
  Mail,
  ShieldCheck
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getSettings, updateSettings, getSystemStats } from '@/services/maintenanceService';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { supabase } from '@/supabase';
import { motion, AnimatePresence } from 'motion/react';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { notifications, clearNotifications } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const currentTabParam = searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState<'profile' | 'company' | 'maintenance' | 'system'>(
    (currentTabParam as any) || 'profile'
  );

  const [loading, setLoading] = useState(false);
  
  // User Profile & Password States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileRole, setProfileRole] = useState('operator');
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Password States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const [stats, setStats] = useState({
    databaseStatus: 'connected',
    apiVersion: 'v2.4.0',
    storageUsed: 4.2,
    storageTotal: 10,
    lastBackup: ''
  });

  const [settings, setSettings] = useState({
    labor_rate: 50,
    company_name: 'JIMP Industrial',
    address: 'Rua Industrial, 123',
    default_preventive_interval: 30,
    default_predictive_interval: 90,
    default_corrective_time: 24,
    sector_costs: {} as Record<string, number>
  });

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['profile', 'company', 'maintenance', 'system'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
          setProfileEmail(user.email || '');

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (profile) {
            setProfileName(profile.full_name || user.user_metadata?.full_name || '');
            setProfileRole(profile.role || 'operator');
          } else {
            setProfileName(user.user_metadata?.full_name || user.email?.split('@')[0] || '');
          }
        }
      } catch (err) {
        console.error('Error loading user profile:', err);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsData, statsData] = await Promise.all([
          getSettings(),
          getSystemStats()
        ]);
        setSettings({
          ...settingsData,
          sector_costs: settingsData.sector_costs || {
            'Produção': 100,
            'Logística': 80,
            'Qualidade': 60,
            'Manutenção': 50,
            'Utilidades': 90
          }
        });
        setStats(statsData);
      } catch (err) {
        console.error('Error loading system settings:', err);
      }
    };
    fetchData();
  }, []);

  const handleTabChange = (tab: 'profile' | 'company' | 'maintenance' | 'system') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) {
      toast.error('Nenhum usuário autenticado.');
      return;
    }

    if (!profileName.trim()) {
      toast.error('O nome não pode estar em branco.');
      return;
    }

    setProfileLoading(true);
    try {
      // 1. Update public.profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: profileName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (profileError) throw profileError;

      // 2. Update auth user metadata
      await supabase.auth.updateUser({
        data: { full_name: profileName.trim() }
      });

      toast.success('Seus dados foram atualizados com sucesso!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Erro ao salvar alterações no perfil.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || newPassword.length < 6) {
      toast.error('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas digitadas não coincidem.');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Sua senha foi alterada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
      setIsPasswordModalOpen(false);
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Falha ao alterar senha. Verifique sua conexão.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateSettings(settings);
      toast.success(t('settings_saved'));
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(t('settings_error'));
    } finally {
      setLoading(false);
    }
  };

  const updateSectorCost = (sector: string, cost: number) => {
    setSettings({
      ...settings,
      sector_costs: {
        ...settings.sector_costs,
        [sector]: cost
      }
    });
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    toast.success(t('language_changed'));
  };

  return (
    <ErrorBoundary>
      <div className="space-y-8 pb-24">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('settings')}</h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">Gerencie seu perfil de acesso, segurança e parâmetros da plataforma</p>
          </div>
          {activeTab !== 'profile' && (
            <button 
              onClick={handleSave}
              disabled={loading}
              className="hidden sm:flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
              {t('save_changes')}
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => handleTabChange('profile')}
            className={cn(
              "flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap",
              activeTab === 'profile'
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
            )}
          >
            <User className="w-4 h-4" />
            Meu Perfil & Senha
          </button>
          <button
            onClick={() => handleTabChange('company')}
            className={cn(
              "flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap",
              activeTab === 'company'
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
            )}
          >
            <Building2 className="w-4 h-4" />
            Empresa & Custos
          </button>
          <button
            onClick={() => handleTabChange('maintenance')}
            className={cn(
              "flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap",
              activeTab === 'maintenance'
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
            )}
          >
            <Wrench className="w-4 h-4" />
            Manutenção
          </button>
          <button
            onClick={() => handleTabChange('system')}
            className={cn(
              "flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap",
              activeTab === 'system'
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
            )}
          >
            <Globe className="w-4 h-4" />
            Sistema & Notificações
          </button>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">

            {/* TAB 1: MEU PERFIL & SENHA */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* Profile Card */}
                <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-blue-600/30 shrink-0">
                      {profileName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || profileEmail?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Meus Dados Pessoais</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-xs font-black uppercase tracking-wider">
                          {t(profileRole)}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">Conta ativa</span>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                          {t('full_name')}
                        </label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                          <input
                            type="text"
                            required
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            placeholder="Seu nome completo"
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white font-medium"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                          {t('email_address')} (Acesso)
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                          <input
                            type="email"
                            readOnly
                            value={profileEmail}
                            className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-2xl py-3.5 pl-12 pr-4 text-slate-600 dark:text-slate-400 font-mono text-sm cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={profileLoading}
                        className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                      >
                        {profileLoading ? (
                          <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Salvar Alterações do Perfil
                      </button>
                    </div>
                  </form>
                </div>

                {/* Change Password Card */}
                <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Alteração de Senha</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Defina uma nova senha segura para sua conta</p>
                    </div>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between ml-1">
                          <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            Nova Senha
                          </label>
                          <span className="text-[10px] text-slate-400">Mínimo 6 caracteres</span>
                        </div>
                        <div className="relative">
                          <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                          <input
                            required
                            minLength={6}
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Nova senha"
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white font-mono text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                          Confirmar Nova Senha
                        </label>
                        <div className="relative">
                          <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                          <input
                            required
                            minLength={6}
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repita a nova senha"
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white font-mono text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={passwordLoading}
                        className="px-6 py-3.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-2xl font-bold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                      >
                        {passwordLoading ? (
                          <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        )}
                        Atualizar Minha Senha
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* TAB 2: EMPRESA & CUSTOS */}
            {activeTab === 'company' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-600 dark:text-slate-400">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('company_settings')}</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('company_name')}</label>
                      <input 
                        type="text" 
                        value={settings.company_name ?? ''} 
                        onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white font-medium" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('address')}</label>
                      <input 
                        type="text" 
                        value={settings.address ?? ''} 
                        onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white font-medium" 
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center text-green-600 dark:text-green-400">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('sector_costs')}</h3>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t('sector_costs_desc')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(settings.sector_costs).map(([sector, cost]) => (
                      <div key={sector} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="font-bold text-slate-900 dark:text-white">{sector}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">BRL/hr</span>
                          <input 
                            type="number" 
                            value={cost ?? ''} 
                            onChange={(e) => updateSectorCost(sector, parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-center font-bold dark:text-white" 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: MANUTENÇÃO */}
            {activeTab === 'maintenance' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <Database className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('maintenance_settings')}</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{t('labor_hourly_rate')}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('labor_rate_desc')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-slate-400" />
                          <input 
                            type="number" 
                            value={settings.labor_rate ?? ''} 
                            onChange={(e) => setSettings({ ...settings, labor_rate: parseFloat(e.target.value) || 0 })}
                            className="w-20 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-center font-bold dark:text-white" 
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{t('default_maintenance_interval')}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('default_interval_desc')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            value={settings.default_preventive_interval ?? ''} 
                            onChange={(e) => setSettings({ ...settings, default_preventive_interval: parseInt(e.target.value) || 0 })}
                            className="w-16 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-center font-bold dark:text-white" 
                          />
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('days')}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{t('predictive_interval')}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('predictive_interval_desc')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            value={settings.default_predictive_interval ?? ''} 
                            onChange={(e) => setSettings({ ...settings, default_predictive_interval: parseInt(e.target.value) || 0 })}
                            className="w-16 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-center font-bold dark:text-white" 
                          />
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('days')}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{t('corrective_time')}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('corrective_time_desc')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            value={settings.default_corrective_time ?? ''} 
                            onChange={(e) => setSettings({ ...settings, default_corrective_time: parseInt(e.target.value) || 0 })}
                            className="w-16 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-center font-bold dark:text-white" 
                          />
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">hrs</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SISTEMA & NOTIFICAÇÕES */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Globe className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('localization')}</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{t('language')}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('select_preferred_language')}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => changeLanguage('pt')}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${i18n.language === 'pt' ? 'bg-blue-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                        >
                          Português
                        </button>
                        <button 
                          onClick={() => changeLanguage('en')}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${i18n.language === 'en' ? 'bg-blue-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                        >
                          English
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{t('theme')}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('select_theme')}</p>
                      </div>
                      <button 
                        onClick={toggleTheme}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                      >
                        {theme === 'light' ? (
                          <>
                            <Moon className="w-4 h-4" />
                            {t('dark_mode')}
                          </>
                        ) : (
                          <>
                            <Sun className="w-4 h-4" />
                            {t('light_mode')}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <Bell className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('notifications')}</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{t('recent_notifications')}</p>
                      <button 
                        onClick={clearNotifications}
                        className="text-xs font-bold text-red-600 hover:text-red-700 transition-colors"
                      >
                        {t('clear_all')}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {notifications.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-4">{t('no_notifications')}</p>
                      ) : (
                        notifications.slice(0, 5).map((n) => (
                          <div key={n.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <p className="font-bold text-sm text-slate-900 dark:text-white">{n.title}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: System Status & Quick Security */}
          <div className="space-y-6">
            <div className="bg-slate-900 dark:bg-blue-900/20 p-8 rounded-3xl text-white relative overflow-hidden border border-transparent dark:border-blue-500/20 shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full -mr-16 -mt-16 blur-3xl" />
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
                  <Database className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold">{t('system_status')}</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 font-medium">{t('database')}</span>
                  <span className={cn(
                    "font-bold flex items-center gap-1.5",
                    stats.databaseStatus === 'connected' ? "text-green-400" : "text-red-400"
                  )}>
                    <CheckCircle className="w-4 h-4" />
                    {stats.databaseStatus === 'connected' ? t('connected') : t('disconnected')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 font-medium">{t('api_version')}</span>
                  <span className="text-slate-300 font-bold">{stats.apiVersion}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 font-medium">{t('storage')}</span>
                  <span className="text-slate-300 font-bold">{stats.storageUsed} GB / {stats.storageTotal} GB</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-600 dark:text-slate-400">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('security')}</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-6 leading-relaxed">
                Gerencie as credenciais da sua conta e proteja o acesso à plataforma industrial.
              </p>
              <div className="space-y-3">
                <button 
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  {t('change_password')}
                </button>
                <button 
                  onClick={() => toast.info(t('backup_started'))}
                  className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Database className="w-4 h-4" />
                  {t('generate_backup')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Modal */}
        <AnimatePresence>
          {isPasswordModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
              >
                <button
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shrink-0">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">{t('change_password')}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Atualize sua senha de login</p>
                  </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        Nova Senha
                      </label>
                      <span className="text-[10px] text-slate-400">Mínimo 6 dígitos</span>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                      <input
                        required
                        minLength={6}
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Digite a nova senha"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                      Confirmar Nova Senha
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                      <input
                        required
                        minLength={6}
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirme a nova senha"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsPasswordModalOpen(false)}
                      className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-sm transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {passwordLoading ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      Salvar Senha
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
