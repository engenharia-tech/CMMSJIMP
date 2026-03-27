import { supabase, handleSupabaseError } from '../supabase';
import { User } from '../types';

export const getUsers = (callback: (data: User[]) => void) => {
  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) handleSupabaseError(error, 'LIST profiles');
    callback(data || []);
  };

  fetchUsers();

  const subscription = supabase
    .channel('profiles_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchUsers)
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
};

export const updateUser = async (id: string, data: Partial<User>) => {
  const { error } = await supabase.from('profiles').update(data).eq('id', id);
  if (error) handleSupabaseError(error, 'UPDATE profiles');
};

export const deleteUser = async (id: string) => {
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (error) handleSupabaseError(error, 'DELETE profiles');
};
