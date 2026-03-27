import { supabase, handleSupabaseError } from '../supabase';
import { Part } from '../types';

export const getParts = (callback: (data: Part[]) => void) => {
  const fetchParts = async () => {
    const { data, error } = await supabase
      .from('parts')
      .select('*')
      .order('part_name', { ascending: true });
    
    if (error) handleSupabaseError(error, 'LIST parts');
    callback(data || []);
  };

  fetchParts();

  const subscription = supabase
    .channel('parts_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'parts' }, fetchParts)
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
};

export const addPart = async (data: Omit<Part, 'id'>) => {
  const { error } = await supabase.from('parts').insert(data);
  if (error) handleSupabaseError(error, 'CREATE parts');
};

export const updatePart = async (id: string, data: Partial<Part>) => {
  const { error } = await supabase.from('parts').update(data).eq('id', id);
  if (error) handleSupabaseError(error, 'UPDATE parts');
};

export const deletePart = async (id: string) => {
  const { error } = await supabase.from('parts').delete().eq('id', id);
  if (error) handleSupabaseError(error, 'DELETE parts');
};
