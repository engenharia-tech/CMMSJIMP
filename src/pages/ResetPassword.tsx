import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { supabase, isSupabaseConfigured } from '@/supabase';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigate, Navigate } from 'react-router-dom';

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // Listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event on reset page:', event);
      
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        console.log('Recovery session established');
        setIsSessionReady(true);
        setError(null);
      }
    });

    const checkInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('Initial session found');
        setIsSessionReady(true);
      } else {
        // If no session after 3 seconds, show error
        setTimeout(() => {
          if (!isSessionReady) {
            console.warn('No session found after timeout');
            setError(t('session_expired_or_invalid'));
          }
        }, 3000);
      }
    };

    checkInitialSession();
    return () => subscription.unsubscribe();
  }, [t, isSessionReady]);

  if (!isSupabaseConfigured) {
    return <Navigate to="/login" replace />;
  }

  const resetSchema = z.object({
    password: z.string().min(6, t('password_min_length')),
    confirmPassword: z.string().min(6, t('password_min_length')),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('passwords_dont_match'),
    path: ['confirmPassword'],
  });

  type ResetFormValues = z.infer<typeof resetSchema>;

  const { register, handleSubmit, formState: { errors } } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetFormValues) => {
    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password
      });
      
      if (updateError) throw updateError;
      
      toast.success(t('password_updated_success'));
      
      // Clear session after password update to force re-login
      await supabase.auth.signOut();
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      console.error('Reset password error:', err);
      toast.error(err.message || t('failed_to_update_password'));
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative z-10 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{t('reset_link_error')}</h2>
          <p className="text-slate-400 text-sm mb-8">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-4 bg-white text-slate-900 rounded-xl font-black text-lg shadow-xl hover:bg-slate-100 transition-all active:scale-95"
          >
            {t('back_to_login')}
          </button>
        </div>
      </div>
    );
  }

  if (!isSessionReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t('verifying_session')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Logo size="lg" className="rotate-3 shadow-xl shadow-blue-900/40 bg-white/5 rounded-2xl p-2" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter">CMMS JIMP</h1>
        </div>

        <div className="bg-white/5 p-4 rounded-xl mb-8 border border-white/5 text-center">
          <h2 className="text-sm font-bold text-white mb-1">{t('reset_password')}</h2>
          <p className="text-[10px] text-slate-400">{t('enter_new_password')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                {...register('password')}
                type="password"
                placeholder={t('new_password')}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
            </div>
            {errors.password && (
              <p className="text-red-400 text-xs font-medium pl-2">{errors.password.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                {...register('confirmPassword')}
                type="password"
                placeholder={t('confirm_new_password')}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-red-400 text-xs font-medium pl-2">{errors.confirmPassword.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-white text-slate-900 rounded-xl font-black text-lg shadow-xl hover:bg-slate-100 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:active:scale-100"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-slate-900/20 border-t-slate-900 rounded-full animate-spin" />
            ) : (
              t('update_password')
            )}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
          <div className="flex items-center gap-4 text-left p-3 bg-white/5 rounded-xl border border-white/5">
            <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
            <p className="text-[10px] text-slate-400 leading-tight">{t('secure_rbac')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
