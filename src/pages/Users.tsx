import React, { useState, useEffect } from 'react';
import { UserPlus, Shield, User as UserIcon, Trash2, Mail, Lock, Check, X, AlertCircle, Edit2, KeyRound, Copy, ExternalLink } from 'lucide-react';
import { supabase } from '@/supabase';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ConfirmationModal } from '@/components/modals/ConfirmationModal';

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
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
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
      console.error("Fetch profiles error:", error);
      if (error.code === 'PGRST116' || error.message?.includes('relation "public.profiles" does not exist')) {
        toast.error(t('supabase_schema_missing'));
      } else {
        toast.error(`${t('failed_fetch_users')}: ${error.message || 'Unknown error'}`);
      }
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
        body: JSON.stringify({
          email: formData.email,
          fullName: formData.fullName,
          role: formData.role,
          clientOrigin: window.location.origin
        })
      });

      const responseText = await response.text();
      let result: any = {};
      try {
        result = JSON.parse(responseText);
      } catch (parseErr) {
        console.error("Non-JSON API response:", responseText);
        throw new Error(`Erro no servidor (${response.status}): Por favor, verifique se as variáveis do Supabase Admin estão configuradas.`);
      }

      if (!response.ok) {
        const errorMsg = result.error === 'user_already_registered' ? t('user_already_registered') : (result.error || t('failed_to_create_account'));
        throw new Error(errorMsg);
      }

      toast.success(t('user_created_invite_info'));
      if (result.inviteLink) {
        setCreatedInviteLink(result.inviteLink);
      }
      setIsAdding(false);
      setFormData({ email: '', fullName: '', role: 'operator' });
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
      toast.success(t('user_updated_success'));
      setEditingProfile(null);
      setFormData({ email: '', fullName: '', role: 'operator' });
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
      fullName: profile.full_name,
      role: profile.role
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    toast.success(t('invite_link_copied'));
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleDeleteUser = (userId: string) => {
    setUserToDelete(userId);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userToDelete);

      if (error) throw error;
      toast.success(t('profile_removed'));
      setUserToDelete(null);
      fetchProfiles();
    } catch (error: any) {
      toast.error(t('failed_delete_profile'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {!profiles.length && !loading && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl flex items-center gap-3 text-amber-700 dark:text-amber-400 transition-colors">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-bold">
            {t('admin_setup_warning')}
          </p>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{t('user_management')}</h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">{t('user_management_desc')}</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-all active:scale-95"
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
            className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden transition-colors"
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-600" />
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {editingProfile ? t('edit_user') : t('register_new_employee')}
              </h3>
              <button onClick={() => { setIsAdding(false); setEditingProfile(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400 dark:text-slate-500" />
              </button>
            </div>

            <form onSubmit={editingProfile ? handleUpdateUser : handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t('full_name')}</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                  <input
                    required
                    type="text"
                    value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    placeholder="e.g. John Doe"
                  />
                </div>
              </div>

              {!editingProfile && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t('email_address')}</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                      placeholder="john@company.com"
                    />
                  </div>
                </div>
              )}

              {!editingProfile && (
                <div className="md:col-span-2 p-4 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-2xl flex items-center gap-3.5 text-blue-900 dark:text-blue-200 transition-colors">
                  <KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <p className="text-xs font-semibold leading-relaxed">
                    {t('invite_user_notice')}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t('system_role')}</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none text-slate-900 dark:text-white"
                  >
                    <option value="operator" className="dark:bg-slate-900">{t('operator')}</option>
                    <option value="engineer" className="dark:bg-slate-900">{t('engineer')}</option>
                    <option value="admin" className="dark:bg-slate-900">{t('admin')}</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-2 flex items-center gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-slate-900 dark:bg-slate-800 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-slate-800 dark:hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? t('saving') : (editingProfile ? t('update_user') : t('confirm_registration'))}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-bottom border-slate-200 dark:border-slate-800">
                <th className="px-8 py-6 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('employee')}</th>
                <th className="px-8 py-6 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('system_role')}</th>
                <th className="px-8 py-6 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('status')}</th>
                <th className="px-8 py-6 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {profiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center transition-colors">
                        <UserIcon className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 dark:text-white tracking-tight">{profile.full_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{profile.email || profile.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      profile.role === 'admin' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/30' :
                      profile.role === 'engineer' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30' :
                      'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700'
                    }`}>
                      {t(profile.role)}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{t('active')}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEditing(profile)}
                        className="p-3 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(profile.id)}
                        className="p-3 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
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
                      <UserIcon className="w-12 h-12 text-slate-200 dark:text-slate-800 mb-4" />
                      <p className="text-slate-500 dark:text-slate-400 font-medium">{t('no_users_found')}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View (Cards) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {profiles.map((profile) => (
            <div key={profile.id} className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center transition-colors">
                    <UserIcon className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 dark:text-white tracking-tight leading-tight">{profile.full_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{profile.email || profile.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => startEditing(profile)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500 transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDeleteUser(profile.id)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-slate-400 dark:text-slate-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  profile.role === 'admin' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/30' :
                  profile.role === 'engineer' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30' :
                  'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700'
                }`}>
                  {t(profile.role)}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{t('active')}</span>
                </div>
              </div>
            </div>
          ))}
          {profiles.length === 0 && !loading && (
            <div className="px-8 py-20 text-center">
              <div className="flex flex-col items-center justify-center">
                <UserIcon className="w-12 h-12 text-slate-200 dark:text-slate-800 mb-4" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">{t('no_users_found')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={confirmDeleteUser}
        title={t('delete_user_title')}
        message={t('delete_user_confirm')}
        isLoading={isDeleting}
      />

      {/* Direct Invite Link Modal */}
      <AnimatePresence>
        {createdInviteLink && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative"
            >
              <button
                onClick={() => setCreatedInviteLink(null)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shrink-0">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">{t('first_access')}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('user_created_invite_info')}</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Você também pode copiar o link abaixo e enviá-lo diretamente para o colaborador (via WhatsApp, Teams ou E-mail):
                </p>
                <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
                  <input
                    readOnly
                    type="text"
                    value={createdInviteLink}
                    className="w-full bg-transparent px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(createdInviteLink)}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all active:scale-95"
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedLink ? "Copiado!" : t('copy_invite_link')}
                  </button>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setCreatedInviteLink(null)}
                  className="px-6 py-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-all"
                >
                  Concluído
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

  );
}
