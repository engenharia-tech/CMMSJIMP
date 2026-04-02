import { supabase, handleSupabaseError, isSupabaseConfigured } from '../supabase';
import { Equipment, MaintenanceOrder, Part } from '../types';

// Equipment Services
let equipmentSubscribers: ((data: Equipment[]) => void)[] = [];

export const fetchEquipment = async () => {
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .order('equipment_name');
  
  if (error) {
    if (error.code === 'PGRST116' || error.message?.includes('schema cache')) {
      console.error('Table "equipment" not found. Please run the SQL schema in your Supabase dashboard.');
    }
    handleSupabaseError(error, 'LIST equipment');
  }
  
  const result = data || [];
  equipmentSubscribers.forEach(cb => cb(result));
  return result;
};

export const getEquipment = (callback: (data: Equipment[]) => void) => {
  equipmentSubscribers.push(callback);
  fetchEquipment();

  const subscription = supabase
    .channel('equipment_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment' }, fetchEquipment)
    .subscribe();

  return () => {
    equipmentSubscribers = equipmentSubscribers.filter(cb => cb !== callback);
    supabase.removeChannel(subscription);
  };
};

export const addEquipment = async (data: Omit<Equipment, 'id'>) => {
  if (!isSupabaseConfigured) {
    throw new Error('O Supabase não está configurado. Por favor, verifique as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
  }

  console.log('maintenanceService: addEquipment called');
  
  // Create a timeout to prevent hanging
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout: A conexão com o banco de dados demorou muito. Verifique sua internet ou se o Supabase está configurado corretamente.')), 15000)
  );

  try {
    const { error } = await Promise.race([
      supabase.from('equipment').insert(data),
      timeoutPromise
    ]) as any;
    
    if (error) {
      console.error('maintenanceService: addEquipment error:', error.message || error);
      handleSupabaseError(error, 'CREATE equipment');
    }
    
    // Trigger immediate refresh for all subscribers
    await fetchEquipment();
    
    console.log('maintenanceService: addEquipment success');
  } catch (err: any) {
    console.error('maintenanceService: addEquipment exception:', err.message || 'Unknown error');
    throw err;
  }
};

export const updateEquipment = async (id: string, data: Partial<Equipment>) => {
  const { error } = await supabase.from('equipment').update(data).eq('id', id);
  if (error) handleSupabaseError(error, 'UPDATE equipment');
  await fetchEquipment();
};

export const deleteEquipment = async (id: string) => {
  // Soft delete: mark as obsolete instead of deleting
  const { error } = await supabase.from('equipment').update({ status: 'obsolete' }).eq('id', id);
  if (error) handleSupabaseError(error, 'DELETE equipment (soft)');
  await fetchEquipment();
};

export const hardDeleteEquipment = async (id: string) => {
  const { error } = await supabase.from('equipment').delete().eq('id', id);
  if (error) handleSupabaseError(error, 'DELETE equipment (hard)');
  await fetchEquipment();
};

export const getEquipmentMaintenanceCount = async (equipmentId: string) => {
  const { count, error } = await supabase
    .from('maintenance_orders')
    .select('*', { count: 'exact', head: true })
    .eq('equipment_id', equipmentId);
  
  if (error) handleSupabaseError(error, 'COUNT maintenance_orders');
  return count || 0;
};

// Settings Services
export const getSettings = async () => {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .single();
  
  if (error && error.code !== 'PGRST116') handleSupabaseError(error, 'GET settings');
  
  // Return default settings if none exist
  return data || {
    labor_rate: 50,
    company_name: 'JIMP Industrial',
    address: 'Rua Industrial, 123',
    default_preventive_interval: 30,
    default_predictive_interval: 90
  };
};

export const updateSettings = async (data: any) => {
  // Check if settings exist
  const { data: existing } = await supabase.from('settings').select('id').single();
  
  if (existing) {
    const { error } = await supabase.from('settings').update(data).eq('id', existing.id);
    if (error) handleSupabaseError(error, 'UPDATE settings');
  } else {
    const { error } = await supabase.from('settings').insert(data);
    if (error) handleSupabaseError(error, 'CREATE settings');
  }
};

// Maintenance Order Services
let orderSubscribers: ((data: MaintenanceOrder[]) => void)[] = [];

export const fetchOrders = async () => {
  const { data, error } = await supabase
    .from('maintenance_orders')
    .select('*')
    .order('request_date', { ascending: false });
  
  if (error) {
    if (error.code === 'PGRST116' || error.message?.includes('schema cache')) {
      console.error('Table "maintenance_orders" not found. Please run the SQL schema in your Supabase dashboard.');
    }
    handleSupabaseError(error, 'LIST maintenance_orders');
  }
  
  const result = data || [];
  orderSubscribers.forEach(cb => cb(result));
  return result;
};

export const getOrders = (callback: (data: MaintenanceOrder[]) => void) => {
  orderSubscribers.push(callback);
  fetchOrders();

  const subscription = supabase
    .channel('order_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_orders' }, fetchOrders)
    .subscribe();

  return () => {
    orderSubscribers = orderSubscribers.filter(cb => cb !== callback);
    supabase.removeChannel(subscription);
  };
};

export const addOrder = async (data: Omit<MaintenanceOrder, 'id'>) => {
  if (!isSupabaseConfigured) {
    throw new Error('O Supabase não está configurado.');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Usuário não autenticado.');
  }

  console.log('maintenanceService: addOrder called');
  
  // Create a timeout to prevent hanging
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout: A conexão com o banco de dados demorou muito.')), 15000)
  );

  try {
    // Get next sequential order number
    const { data: nextNumber, error: seqError } = await supabase.rpc('get_next_order_number');
    if (seqError) {
      console.error('Error generating order number:', seqError.message || seqError);
    }

    const insertPromise = supabase.from('maintenance_orders').insert({
      ...data,
      order_number: nextNumber || data.order_number,
      created_by: user?.id,
      labor_hours: data.labor_hours || 0,
      labor_cost: data.labor_cost || 0,
      parts_cost: data.parts_cost || 0,
      maintenance_cost: data.maintenance_cost || 0
    });

    const { error } = await Promise.race([insertPromise, timeoutPromise]) as any;
    
    if (error) {
      console.error('maintenanceService: addOrder error:', error.message || error);
      handleSupabaseError(error, 'CREATE maintenance_orders');
    }
    
    // Trigger immediate refresh for all subscribers
    await fetchOrders();
    
    console.log('maintenanceService: addOrder success');
  } catch (err: any) {
    console.error('maintenanceService: addOrder exception:', err.message || 'Unknown error');
    throw err;
  }
};

export const updateOrder = async (id: string, data: Partial<MaintenanceOrder>) => {
  const { error } = await supabase.from('maintenance_orders').update(data).eq('id', id);
  if (error) handleSupabaseError(error, 'UPDATE maintenance_orders');
  await fetchOrders();
};

export const deleteOrder = async (id: string) => {
  const { error } = await supabase.from('maintenance_orders').delete().eq('id', id);
  if (error) handleSupabaseError(error, 'DELETE maintenance_orders');
  await fetchOrders();
};

// Parts Services
let partsSubscribers: ((data: Part[]) => void)[] = [];

export const fetchParts = async () => {
  const { data, error } = await supabase
    .from('parts')
    .select('*')
    .order('part_name');
  
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
  const { error } = await supabase.from('parts').delete().eq('id', id);
  if (error) handleSupabaseError(error, 'DELETE parts');
  await fetchParts();
};

// KPI Calculations
export const calculateKPIs = (orders: MaintenanceOrder[], equipment: Equipment[]) => {
  const totalFailures = orders.filter(o => o.action_type === 'corrective').length;
  const totalRepairTime = orders.reduce((acc, o) => acc + o.downtime_hours, 0);
  
  const mttr = totalFailures > 0 ? totalRepairTime / totalFailures : 0;
  const totalOperatingTime = equipment.length * 720;
  const mtbf = totalFailures > 0 ? (totalOperatingTime - totalRepairTime) / totalFailures : totalOperatingTime;
  const availability = (mtbf + mttr) > 0 ? (mtbf / (mtbf + mttr)) * 100 : 100;

  return {
    mttr: mttr.toFixed(1),
    mtbf: mtbf.toFixed(1),
    availability: availability.toFixed(1),
    totalFailures,
    totalCost: orders.reduce((acc, o) => acc + o.maintenance_cost, 0)
  };
};
