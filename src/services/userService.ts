import { supabase, handleSupabaseError } from '../supabase';
import { User } from '../types';

/**
 * Nome unico por inscricao.
 *
 * Todos os canais usavam nome FIXO ('equipment_changes', 'order_changes',
 * 'parts_changes'). Quando duas telas escutam o mesmo nome ao mesmo tempo, o
 * supabase-js devolve o canal JA inscrito, e registrar um aviso nele depois
 * do subscribe() derruba o app com:
 *   cannot add `postgres_changes` callbacks for realtime:... after `subscribe()`
 * O 'parts_changes' estava em DOIS arquivos, entao a colisao era garantida.
 */
const canalUnico = (nome: string) =>
  `${nome}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;


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
    .channel(canalUnico('profiles_changes'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchUsers)
    .subscribe();

  return () => {
    // removeChannel tira o canal do cliente; unsubscribe deixava o registro
    // para tras e o nome continuava ocupado.
    supabase.removeChannel(subscription);
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
