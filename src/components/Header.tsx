import React, { useState } from 'react';
import { Search, Bell, Globe, Moon, Sun, Check, Trash2, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { i18n, t } = useTranslation();
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

      <div className="flex items-center gap-4">
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
                    title={t('mark_all_as_read', 'Marcar todas como lidas')}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={clearNotifications}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400 transition-colors"
                    title={t('clear_notifications', 'Limpar notificações')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-8 h-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">{t('no_notifications', 'Nenhuma notificação')}</p>
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
                          {format(n.timestamp, 'HH:mm', { locale: ptBR })}
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
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
}

