import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogIn, ShieldCheck, Mail, Lock, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { signInWithEmail, resetPasswordForEmail } from '@/supabase';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';

export default function Login() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const loginSchema = z.object({
    email: z.string().email(t('invalid_email')),
    password: z.string().min(6, t('password_min_length')),
  });

  const firstAccessSchema = z.object({
    email: z.string().email(t('invalid_email')),
  });

  const forgotPasswordSchema = z.object({
    email: z.string().email(t('invalid_email')),
  });

  type LoginFormValues = z.infer<typeof loginSchema>;
  type FirstAccessFormValues = z.infer<typeof firstAccessSchema>;
  type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const firstAccessForm = useForm<FirstAccessFormValues>({
    resolver: zodResolver(firstAccessSchema),
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onLoginSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    
    const safetyTimeout = setTimeout(() => {
      setIsLoading(false);
      toast.error(t('login_timeout'));
    }, 30000);

    try {
      const result = await signInWithEmail(data.email, data.password);
      clearTimeout(safetyTimeout);
      
      if (result) {
        toast.success(t('logged_in_success'));
        const from = (location.state as any)?.from || '/';
        navigate(from, { replace: true });
      }
    } catch (error: any) {
      clearTimeout(safetyTimeout);
      
      let message = t('failed_to_sign_in');
      if (error.message === 'Supabase is not configured') {
        message = t('supabase_config_missing');
      } else if (error.message?.includes('fetch')) {
        message = t('network_error');
      } else if (error.message) {
        message = error.message;
      }
      
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const onFirstAccessSubmit = async (data: FirstAccessFormValues) => {
    setIsLoading(true);
    try {
      // Send password creation / first access link to user directly via Supabase
      await resetPasswordForEmail(data.email);
      toast.success(t('first_access_link_sent'));
      setIsFirstAccess(false);
    } catch (error: any) {
      console.error('First access error:', error);
      toast.error(error.message || t('unauthorized_email'));
    } finally {
      setIsLoading(false);
    }
  };

  const onForgotPasswordSubmit = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true);
    try {
      await resetPasswordForEmail(data.email);
      toast.success(t('password_reset_email_sent'));
      setIsForgotPassword(false);
    } catch (error: any) {
      console.error('Forgot password error:', error);
      toast.error(error.message || t('failed_to_send_reset_email'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
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
          <p className="text-slate-400 font-medium uppercase tracking-widest text-[10px]">{t('industrial_intelligence')}</p>
        </div>

        <div className="bg-white/5 p-4 rounded-xl mb-8 border border-white/5 text-center">
          <h2 className="text-sm font-bold text-white mb-1">
            {isForgotPassword ? t('reset_password') : isFirstAccess ? t('first_access') : t('restricted_access')}
          </h2>
          <p className="text-[10px] text-slate-400">
            {isForgotPassword ? t('enter_email_to_reset') : isFirstAccess ? t('first_access_desc') : t('sign_in_credentials')}
          </p>
        </div>

        {isForgotPassword ? (
          <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)} className="space-y-4">
            <div className="space-y-1">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  {...forgotPasswordForm.register('email')}
                  type="email"
                  placeholder={t('email_address')}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>
              {forgotPasswordForm.formState.errors.email && (
                <p className="text-red-400 text-xs font-medium pl-2">{forgotPasswordForm.formState.errors.email.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-lg shadow-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:active:scale-100"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Mail className="w-6 h-6" />
                  {t('send_reset_link')}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsForgotPassword(false)}
              className="w-full py-3 text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('back_to_login')}
            </button>
          </form>
        ) : isFirstAccess ? (
          <form onSubmit={firstAccessForm.handleSubmit(onFirstAccessSubmit)} className="space-y-4">
            <div className="space-y-1">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  {...firstAccessForm.register('email')}
                  type="email"
                  placeholder={t('email_address')}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>
              {firstAccessForm.formState.errors.email && (
                <p className="text-red-400 text-xs font-medium pl-2">{firstAccessForm.formState.errors.email.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-lg shadow-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:active:scale-100"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-6 h-6" />
                  {t('create_password')}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsFirstAccess(false)}
              className="w-full py-3 text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('back_to_login')}
            </button>
          </form>
        ) : (
          <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
            <div className="space-y-1">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  {...loginForm.register('email')}
                  type="email"
                  placeholder={t('email_address')}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>
              {loginForm.formState.errors.email && (
                <p className="text-red-400 text-xs font-medium pl-2">{loginForm.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  {...loginForm.register('password')}
                  type="password"
                  placeholder={t('password')}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>
              {loginForm.formState.errors.password && (
                <p className="text-red-400 text-xs font-medium pl-2">{loginForm.formState.errors.password.message}</p>
              )}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="text-[10px] font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest"
              >
                {t('forgot_password')}
              </button>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-white text-slate-900 rounded-xl font-black text-lg shadow-xl hover:bg-slate-100 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:active:scale-100"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-slate-900/20 border-t-slate-900 rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-6 h-6" />
                  {t('sign_in')}
                </>
              )}
            </button>
          </form>
        )}

        {!isForgotPassword && !isFirstAccess && (
          <div className="mt-6 flex items-center justify-center gap-4 text-center">
            <button
              onClick={() => {
                setIsFirstAccess(true);
                setIsForgotPassword(false);
              }}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              {t('first_access')}
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={() => navigate('/reset-password')}
              className="text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest"
            >
              Cole o Link / Token
            </button>
          </div>
        )}

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
