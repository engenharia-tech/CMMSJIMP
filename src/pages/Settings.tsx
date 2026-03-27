import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Bell, Shield, Globe, Database, User, Save, CheckCircle, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { toast } from 'sonner';
import { getSettings, updateSettings } from '@/services/maintenanceService';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    labor_rate: 50,
    company_name: 'JIMP Industrial',
    address: 'Rua Industrial, 123',
    default_preventive_interval: 30,
    default_predictive_interval: 90
  });

  useEffect(() => {
    const fetchSettings = async () => {
      const data = await getSettings();
      setSettings(data);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateSettings(settings);
      toast.success(t('settings_saved', 'Settings saved successfully'));
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(t('settings_error', 'Erro ao salvar configurações'));
    } finally {
      setLoading(false);
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    toast.success(t('language_changed', 'Language changed successfully'));
  };

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{t('settings')}</h2>
            <p className="text-slate-500 mt-1">{t('settings_desc_full', 'Configure your application preferences and system settings.')}</p>
          </div>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
            {t('save_changes', 'Save Changes')}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                  <User className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{t('company_settings', 'Configurações da Empresa')}</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('company_name', 'Nome da Empresa')}</label>
                  <input 
                    type="text" 
                    value={settings.company_name} 
                    onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('address', 'Endereço')}</label>
                  <input 
                    type="text" 
                    value={settings.address} 
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20" 
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                  <Globe className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{t('localization', 'Localization')}</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <p className="font-bold text-slate-900">{t('language', 'Language')}</p>
                    <p className="text-xs text-slate-500 font-medium">{t('select_preferred_language', 'Select your preferred language.')}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => changeLanguage('pt')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${i18n.language === 'pt' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                    >
                      Português
                    </button>
                    <button 
                      onClick={() => changeLanguage('en')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${i18n.language === 'en' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                    >
                      English
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{t('maintenance_settings', 'Configurações de Manutenção')}</h3>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{t('labor_hourly_rate', 'Custo da Mão de Obra (Hora)')}</p>
                      <p className="text-xs text-slate-500 font-medium">{t('labor_rate_desc', 'Custo por hora de manutenção para cálculo de custos.')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-slate-400" />
                      <input 
                        type="number" 
                        value={settings.labor_rate} 
                        onChange={(e) => setSettings({ ...settings, labor_rate: parseFloat(e.target.value) })}
                        className="w-20 px-2 py-1 bg-white border border-slate-200 rounded text-center font-bold" 
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{t('default_maintenance_interval', 'Intervalo Padrão de Manutenção')}</p>
                      <p className="text-xs text-slate-500 font-medium">{t('default_interval_desc', 'Dias padrão para a próxima manutenção preventiva.')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        value={settings.default_preventive_interval} 
                        onChange={(e) => setSettings({ ...settings, default_preventive_interval: parseInt(e.target.value) })}
                        className="w-16 px-2 py-1 bg-white border border-slate-200 rounded text-center font-bold" 
                      />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('days', 'Dias')}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{t('predictive_interval', 'Intervalo Preditivo')}</p>
                      <p className="text-xs text-slate-500 font-medium">{t('predictive_interval_desc', 'Dias padrão para a próxima manutenção preditiva.')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        value={settings.default_predictive_interval} 
                        onChange={(e) => setSettings({ ...settings, default_predictive_interval: parseInt(e.target.value) })}
                        className="w-16 px-2 py-1 bg-white border border-slate-200 rounded text-center font-bold" 
                      />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('days', 'Dias')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                  <Bell className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{t('notifications', 'Notifications')}</h3>
              </div>
              <div className="space-y-4">
                {[
                  { id: 'email', label: t('email_notifications', 'Email Notifications'), desc: t('email_notif_desc', 'Receive maintenance alerts via email.') },
                  { id: 'push', label: t('push_notifications', 'Push Notifications'), desc: t('push_notif_desc', 'Receive real-time browser notifications.') },
                  { id: 'critical', label: t('critical_alerts', 'Critical Alerts Only'), desc: t('critical_notif_desc', 'Only notify for high priority failures.') }
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <p className="font-bold text-slate-900">{item.label}</p>
                      <p className="text-xs text-slate-500 font-medium">{item.desc}</p>
                    </div>
                    <div className="w-12 h-6 bg-slate-200 rounded-full relative cursor-pointer">
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 p-8 rounded-3xl text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full -mr-16 -mt-16 blur-3xl" />
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <Database className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold">{t('system_status', 'System Status')}</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 font-medium">{t('database', 'Database')}</span>
                  <span className="text-green-400 font-bold flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" />
                    {t('connected', 'Connected')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 font-medium">{t('api_version', 'API Version')}</span>
                  <span className="text-slate-300 font-bold">v2.4.0</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 font-medium">{t('storage', 'Storage')}</span>
                  <span className="text-slate-300 font-bold">4.2 GB / 10 GB</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{t('security', 'Security')}</h3>
              </div>
              <p className="text-xs text-slate-500 font-medium mb-6">
                {t('security_desc', 'Manage your account security and access tokens.')}
              </p>
              <div className="space-y-3">
                <button className="w-full py-3 bg-slate-100 text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">
                  {t('change_password', 'Change Password')}
                </button>
                <button 
                  onClick={() => toast.info(t('backup_started', 'Backup do sistema iniciado...'))}
                  className="w-full py-3 bg-blue-50 text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Database className="w-4 h-4" />
                  {t('generate_backup', 'Gerar Backup do Sistema')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
