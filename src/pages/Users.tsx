import React, { useState, useEffect } from 'react';
import { UserPlus, Shield, User as UserIcon, Trash2, Mail, Lock, Check, X, AlertCircle, Edit2 } from 'lucide-react';
import { supabase } from '@/supabase';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';

interface Profile {
  id: string;
  full_name: string;
  role: 'admin' | 'engineer' | 'operator';
  email?: string;
}

export default function Users() {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'operator' as Profile['role']
  });

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      toast.error(t('failed_fetch_users'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || t('failed_to_create_account'));

      toast.success(t('user_created_success'));
      setIsAdding(false);
      setFormData({ email: '', password: '', fullName: '', role: 'operator' });
      fetchProfiles();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          role: formData.role
        })
        .eq('id', editingProfile.id);

      if (error) throw error;
      toast.success(t('user_updated_success', 'Usuário atualizado com sucesso'));
      setEditingProfile(null);
      setFormData({ email: '', password: '', fullName: '', role: 'operator' });
      fetchProfiles();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (profile: Profile) => {
    setEditingProfile(profile);
    setFormData({
      email: profile.email || '',
      password: '', // Don't show password
      fullName: profile.full_name,
      role: profile.role
    });
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm(t('delete_user_confirm'))) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      toast.success(t('profile_removed'));
      fetchProfiles();
    } catch (error: any) {
      toast.error(t('failed_delete_profile'));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{t('user_management')}</h2>
          <p className="text-slate-500 font-medium">{t('user_management_desc')}</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-all active:scale-95"
        >
          <UserPlus className="w-5 h-5" />
          {t('add_new_user')}
        </button>
      </div>

      <AnimatePresence>
        {(isAdding || editingProfile) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-600" />
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {editingProfile ? t('edit_user', 'Editar Usuário') : t('register_new_employee')}
              </h3>
              <button onClick={() => { setIsAdding(false); setEditingProfile(null); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <form onSubmit={editingProfile ? handleUpdateUser : handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('full_name')}</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    required
                    type="text"
                    value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="e.g. John Doe"
                  />
                </div>
              </div>

              {!editingProfile && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('email_address')}</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="john@company.com"
                    />
                  </div>
                </div>
              )}

              {!editingProfile && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('initial_password')}</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      required
                      type="password"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder={t('min_6_chars')}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('system_role')}</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
                  >
                    <option value="operator">{t('operator')}</option>
                    <option value="engineer">{t('engineer')}</option>
                    <option value="admin">{t('admin')}</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-2 flex items-center gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? t('saving') : (editingProfile ? t('update_user', 'Atualizar Usuário') : t('confirm_registration'))}
                </button>
                {!editingProfile && (
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-4 rounded-2xl border border-amber-100">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-xs font-bold leading-tight">{t('user_login_immediate')}</p>
                  </div>
                )}
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-bottom border-slate-200">
                <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">{t('employee')}</th>
                <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">{t('system_role')}</th>
                <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">{t('status')}</th>
                <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 tracking-tight">{profile.full_name}</p>
                        <p className="text-xs text-slate-500 font-medium">{profile.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      profile.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                      profile.role === 'engineer' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                      'bg-slate-50 text-slate-600 border-slate-100'
                    }`}>
                      {t(profile.role)}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-xs font-bold text-slate-600">{t('active')}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEditing(profile)}
                        className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(profile.id)}
                        className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {profiles.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <UserIcon className="w-12 h-12 text-slate-200 mb-4" />
                      <p className="text-slate-500 font-medium">{t('no_users_found', 'Nenhum usuário encontrado.')}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
