import { supabase, handleSupabaseError } from '../supabase';
import { Equipment, MaintenanceOrder, Part } from '../types';

// Equipment Services
export const getEquipment = (callback: (data: Equipment[]) => void) => {
  const fetchEquipment = async () => {
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
    callback(data || []);
  };

  fetchEquipment();

  const subscription = supabase
    .channel('equipment_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment' }, fetchEquipment)
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

export const addEquipment = async (data: Omit<Equipment, 'id'>) => {
  console.log('maintenanceService: addEquipment called with:', data);
  const { error } = await supabase.from('equipment').insert(data);
  if (error) {
    console.error('maintenanceService: addEquipment error:', error);
    handleSupabaseError(error, 'CREATE equipment');
  }
  console.log('maintenanceService: addEquipment success');
};

export const updateEquipment = async (id: string, data: Partial<Equipment>) => {
  const { error } = await supabase.from('equipment').update(data).eq('id', id);
  if (error) handleSupabaseError(error, 'UPDATE equipment');
};

export const deleteEquipment = async (id: string) => {
  // Soft delete: mark as obsolete instead of deleting
  const { error } = await supabase.from('equipment').update({ status: 'obsolete' }).eq('id', id);
  if (error) handleSupabaseError(error, 'DELETE equipment (soft)');
};

export const hardDeleteEquipment = async (id: string) => {
  const { error } = await supabase.from('equipment').delete().eq('id', id);
  if (error) handleSupabaseError(error, 'DELETE equipment (hard)');
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
export const getOrders = (callback: (data: MaintenanceOrder[]) => void) => {
  const fetchOrders = async () => {
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
    callback(data || []);
  };

  fetchOrders();

  const subscription = supabase
    .channel('order_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_orders' }, fetchOrders)
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

export const addOrder = async (data: Omit<MaintenanceOrder, 'id'>) => {
  console.log('maintenanceService: addOrder called with:', data);
  
  // Get next sequential order number
  const { data: nextNumber, error: seqError } = await supabase.rpc('get_next_order_number');
  if (seqError) {
    console.error('Error generating order number:', seqError);
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from('maintenance_orders').insert({
    ...data,
    order_number: nextNumber || data.order_number,
    created_by: user?.id,
    labor_hours: data.labor_hours || 0,
    labor_cost: data.labor_cost || 0,
    parts_cost: data.parts_cost || 0,
    maintenance_cost: data.maintenance_cost || 0
  });
  if (error) {
    console.error('maintenanceService: addOrder error:', error);
    handleSupabaseError(error, 'CREATE maintenance_orders');
  }
  console.log('maintenanceService: addOrder success');
};

export const updateOrder = async (id: string, data: Partial<MaintenanceOrder>) => {
  const { error } = await supabase.from('maintenance_orders').update(data).eq('id', id);
  if (error) handleSupabaseError(error, 'UPDATE maintenance_orders');
};

export const deleteOrder = async (id: string) => {
  const { error } = await supabase.from('maintenance_orders').delete().eq('id', id);
  if (error) handleSupabaseError(error, 'DELETE maintenance_orders');
};

// Parts Services
export const getParts = (callback: (data: Part[]) => void) => {
  const fetchParts = async () => {
    const { data, error } = await supabase
      .from('parts')
      .select('*')
      .order('part_name');
    
    if (error) handleSupabaseError(error, 'LIST parts');
    callback(data || []);
  };

  fetchParts();

  const subscription = supabase
    .channel('parts_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'parts' }, fetchParts)
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
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
