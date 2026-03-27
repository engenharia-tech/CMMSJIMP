import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Toaster } from 'sonner';
import { supabase, getUserProfile, isSupabaseConfigured } from './supabase';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './i18n';

// Pages
import Dashboard from './pages/Dashboard';
import EquipmentPage from './pages/Equipment';
import MaintenanceOrdersPage from './pages/MaintenanceOrders';
import AnalyticsPage from './pages/Analytics';
import UsersPage from './pages/Users';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import MaintenancePlanningPage from './pages/MaintenancePlanning';
import PartsPage from './pages/Parts';
import CostsPage from './pages/Costs';
import SettingsPage from './pages/Settings';

import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';

export default function App() {
  const { t } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await getUserProfile(session.user.id);
          setUser({ ...session.user, role: profile?.role || 'operator' });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Safety timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change event:', event, 'User:', session?.user?.email);
      try {
        if (session?.user) {
          console.log('Fetching profile for user after auth change...');
          const profile = await getUserProfile(session.user.id);
          console.log('Profile loaded:', profile?.role);
          setUser({ ...session.user, role: profile?.role || 'operator' });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Auth state change failed:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    console.log('Current user state:', user?.email, 'Role:', user?.role);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white/5 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white/10 shadow-2xl text-center">
          <div className="w-20 h-20 bg-amber-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-amber-500/30">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter mb-4">{t('configuration_required')}</h1>
          <p className="text-slate-400 font-medium mb-8">
            {t('supabase_env_missing')}
          </p>
          <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-left">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">{t('next_steps')}</p>
            <ul className="text-sm text-slate-300 space-y-2 list-disc pl-4">
              <li>{t('open_settings_menu')}</li>
              <li>{t('add_required_vars')}</li>
              <li>{t('refresh_app')}</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/reset-password" element={<ResetPassword />} />
            {!user ? (
              <>
                <Route path="/login" element={<Login />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </>
            ) : (
              <Route element={<Layout user={user} />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/equipment" element={<EquipmentPage />} />
                <Route path="/orders" element={<MaintenanceOrdersPage />} />
                <Route path="/preventive" element={<MaintenancePlanningPage />} />
                <Route path="/parts" element={<PartsPage />} />
                <Route path="/costs" element={<CostsPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/users" element={(user.role === 'admin' || user.email === 'efariaseng0@gmail.com') ? <UsersPage /> : <Navigate to="/" replace />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            )}
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </ThemeProvider>
  );
}

