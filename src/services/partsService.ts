import { supabase, handleSupabaseError } from '../supabase';
import { Part } from '../types';

let partsSubscribers: ((data: Part[]) => void)[] = [];

export const fetchParts = async () => {
  const { data, error } = await supabase
    .from('parts')
    .select('*')
    .order('part_name', { ascending: true });
  
  if (error) handleSupabaseError(error, 'LIST parts');
  
  const result = data || [];
  partsSubscribers.forEach(cb => cb(result));
  return result;
};

export const getParts = (callback: (data: Part[]) => void) => {
  partsSubscribers.push(callback);
  fetchParts();

  const subscription = supabase
    .channel('parts_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'parts' }, fetchParts)
    .subscribe();

  return () => {
    partsSubscribers = partsSubscribers.filter(cb => cb !== callback);
    supabase.removeChannel(subscription);
  };
};

export const addPart = async (data: Omit<Part, 'id'>) => {
  const { error } = await supabase.from('parts').insert(data);
  if (error) handleSupabaseError(error, 'CREATE parts');
  await fetchParts();
};

export const updatePart = async (id: string, data: Partial<Part>) => {
  const { error } = await supabase.from('parts').update(data).eq('id', id);
  if (error) handleSupabaseError(error, 'UPDATE parts');
  await fetchParts();
};

export const deletePart = async (id: string) => {
  const { data: apagadas, error } = await supabase.from('parts').delete().eq('id', id).select('id');
  if (!error && (!apagadas || apagadas.length === 0)) throw new Error('Nenhum registro foi alterado. Voce provavelmente nao tem permissao para esta acao - fale com o administrador.');
  if (error) handleSupabaseError(error, 'DELETE parts');
  await fetchParts();
};
