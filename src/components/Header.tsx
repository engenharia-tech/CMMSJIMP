import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Globe, Moon, Sun, Check, Trash2, Menu, ExternalLink, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onMenuClick: () => void;
  user?: any;
}

export function Header({ onMenuClick, user }: HeaderProps) {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);

  const toggleLanguage = () => {
    const nextLng = i18n.language === 'pt' ? 'en' : 'pt';
    i18n.changeLanguage(nextLng);
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40 transition-colors">
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-600 dark:text-slate-400"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="relative w-full max-w-96 hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder={t('global_search')} 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <a
          href="https://www.jimpnexus.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-sm shadow-blue-500/20 active:scale-95 shrink-0"
          title={t('back_to_portal')}
        >
          <ExternalLink className="w-4 h-4" />
          <span className="hidden sm:inline">{t('back_to_portal')}</span>
          <span className="sm:hidden">{t('portal')}</span>
        </a>

        <button 
          onClick={toggleLanguage}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          <Globe className="w-5 h-5" />
          <span className="uppercase">{i18n.language}</span>
        </button>
        
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400 relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white">{t('notifications')}</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={markAllAsRead}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400 transition-colors"
                    title={t('mark_all_as_read')}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={clearNotifications}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400 transition-colors"
                    title={t('clear_notifications')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-8 h-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">{t('no_notifications')}</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      onClick={() => markAsRead(n.id)}
                      className={cn(
                        "p-4 border-b border-slate-50 dark:border-slate-700/50 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors",
                        !n.read && "bg-blue-50/30 dark:bg-blue-900/10"
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <p className={cn(
                          "text-sm font-bold",
                          n.type === 'warning' ? 'text-amber-600' : 
                          n.type === 'error' ? 'text-red-600' : 
                          n.type === 'success' ? 'text-green-600' : 'text-blue-600'
                        )}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-slate-400">
                          {format(n.timestamp, 'HH:mm', { 
                            locale: i18n.language.startsWith('en') ? enUS : ptBR 
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        
        <button 
          onClick={toggleTheme}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400"
          title={theme === 'light' ? t('dark_mode') : t('light_mode')}
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>

        <button
          onClick={() => navigate('/settings?tab=profile')}
          className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 transition-all text-left group"
          title="Meu Perfil e Alterar Senha"
        >
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            {(user?.full_name || user?.user_metadata?.full_name)?.split(' ').map((n: string) => n[0]).join('') || user?.email?.[0].toUpperCase() || 'U'}
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {user?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || t('user')}
            </p>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider leading-none mt-0.5">
              {t(user?.role || 'operator')}
            </p>
          </div>
        </button>
      </div>
    </header>
  );
}

