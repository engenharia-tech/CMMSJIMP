import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Wrench, 
  ClipboardList, 
  Calendar, 
  DollarSign, 
  BrainCircuit, 
  Settings,
  Package,
  Users,
  LogOut,
  X,
  QrCode,
  ExternalLink,
  Globe
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Logo } from './Logo';
import { cn } from '@/lib/utils';
import { signOut } from '@/supabase';
import { toast } from 'sonner';

const navItems = [
  { icon: LayoutDashboard, label: 'dashboard', path: '/' },
  { icon: Wrench, label: 'equipment', path: '/equipment' },
  { icon: ClipboardList, label: 'maintenance_orders', path: '/orders' },
  { icon: QrCode, label: 'scanner', path: '/orders?view=scanner' },
  { icon: Calendar, label: 'maintenance_planning', path: '/preventive' },
  { icon: Package, label: 'parts', path: '/parts' },
  { icon: DollarSign, label: 'costs', path: '/costs' },
  { icon: BrainCircuit, label: 'ai_analytics', path: '/analytics' },
  { icon: Users, label: 'users', path: '/users', somenteAdmin: true },
  { icon: Settings, label: 'settings', path: '/settings' },
];

interface SidebarProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ user, isOpen, onClose }: SidebarProps) {
  const { t } = useTranslation();
  // Mesma regra da rota em App.tsx, para o menu nao contradizer o acesso.
  const ehAdmin = user?.role === 'admin' || user?.email === 'efariaseng0@gmail.com';
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success(t('logout_success'));
      navigate('/login');
    } catch (error) {
      toast.error(t('logout_error'));
    }
  };

  return (
    <aside className={cn(
      "w-64 bg-slate-900 text-white h-screen flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300 lg:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <div>
            <h1 className="text-xl font-bold tracking-tighter text-blue-400 leading-none">CMMS JIMP</h1>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-semibold leading-none">{t('industrial_maintenance')}</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="lg:hidden p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {/* O item Usuarios so aparece para o admin. A rota ja era protegida
            em App.tsx - quem clicava era devolvido -, mas mostrar um menu que
            nao leva a lugar nenhum e confuso. */}
        {navItems
          .filter((item) => !item.somenteAdmin || ehAdmin)
          .map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => {
              if (window.innerWidth < 1024) onClose();
            }}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
              isActive 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{t(item.label)}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="px-4 py-2">
        <a
          href="https://www.jimpnexus.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-4 py-2.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 border border-blue-500/20 rounded-xl transition-all duration-200 group text-sm font-semibold"
        >
          <div className="flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-blue-400 group-hover:rotate-12 transition-transform" />
            <span>{t('back_to_portal')}</span>
          </div>
          <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </a>
      </div>

      <div className="p-4 border-t border-slate-800 space-y-2">
        <button
          onClick={() => {
            navigate('/settings?tab=profile');
            if (window.innerWidth < 1024) onClose();
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-slate-800 transition-all text-left group cursor-pointer border border-transparent hover:border-slate-700/60"
          title="Editar meu perfil e alterar senha"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-xs font-black shrink-0 shadow-md group-hover:scale-105 group-hover:ring-2 group-hover:ring-blue-400 transition-all">
            {(user?.full_name || user?.user_metadata?.full_name)?.split(' ').map((n: string) => n[0]).join('') || user?.email?.[0].toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate text-white group-hover:text-blue-300 transition-colors">
              {user?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || t('user')}
            </p>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[10px] text-blue-400 truncate uppercase tracking-widest font-black">
                {t(user?.role || 'operator')}
              </span>
              <span className="text-[9px] text-slate-400 group-hover:text-blue-300 font-semibold transition-colors">
                Editar
              </span>
            </div>
          </div>
        </button>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          {t('logout')}
        </button>
      </div>
    </aside>
  );
}
