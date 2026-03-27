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
  LogOut
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
  { icon: Calendar, label: 'maintenance_planning', path: '/preventive' },
  { icon: Package, label: 'parts', path: '/parts' },
  { icon: DollarSign, label: 'costs', path: '/costs' },
  { icon: BrainCircuit, label: 'ai_analytics', path: '/analytics' },
  { icon: Users, label: 'users', path: '/users' },
  { icon: Settings, label: 'settings', path: '/settings' },
];

export function Sidebar({ user }: { user: any }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully");
      navigate('/login');
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  return (
    <aside className="w-64 bg-slate-900 text-white h-screen flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6 flex items-center gap-3">
        <Logo size="sm" />
        <div>
          <h1 className="text-xl font-bold tracking-tighter text-blue-400 leading-none">CMMS JIMP</h1>
          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-semibold leading-none">{t('industrial_maintenance')}</p>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
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
      
      <div className="p-4 border-t border-slate-800 space-y-2">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">
            {user?.user_metadata?.full_name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.user_metadata?.full_name || 'User'}</p>
            <p className="text-xs text-slate-400 truncate capitalize">{t(user?.role || 'operator')}</p>
          </div>
        </div>
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
