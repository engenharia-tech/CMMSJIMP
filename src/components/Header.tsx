import React from 'react';
import { Search, Bell, Globe, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function Header() {
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const nextLng = i18n.language === 'pt' ? 'en' : 'pt';
    i18n.changeLanguage(nextLng);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder={t('global_search')} 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={toggleLanguage}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors flex items-center gap-2 text-sm font-medium text-slate-600"
        >
          <Globe className="w-5 h-5" />
          <span className="uppercase">{i18n.language}</span>
        </button>
        
        <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600">
          <Bell className="w-5 h-5" />
        </button>
        
        <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600">
          <Moon className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
