export type Criticality = 'low' | 'medium' | 'high' | 'critical';
export type EquipmentStatus = 'active' | 'inactive' | 'maintenance' | 'obsolete';
export type OrderStatus = 'open' | 'in_progress' | 'completed';
export type ActionType = 'preventive' | 'corrective' | 'predictive';
export type UserRole = 'admin' | 'engineer' | 'operator';

export interface Equipment {
  id: string;
  registration_number: string;
  equipment_name: string;
  sector: string;
  type: string; // This will be used for the "flag of types" (Predial, Equipamento, etc.)
  manufacturer: string;
  model: string;
  serial_number: string;
  acquisition_date: string;
  criticality: Criticality;
  status: EquipmentStatus;
  expected_life: number;
  photo_url?: string;
  notes?: string;
  responsible?: string; // Adding a separate field for responsible if needed, but user said "volte para tipo"
}

export interface OrderPart {
  part_id: string;
  part_name: string;
  quantity: number;
  unit_cost: number;
}

export interface MaintenanceOrder {
  id: string;
  equipment_id: string;
  order_number: string;
  sector: string;
  request_date: string;
  requester: string;
  operator: string;
  action_type: ActionType;
  priority: Criticality;
  root_cause?: string;
  problem_description: string;
  action_taken?: string;
  parts_used?: string[]; // Legacy field
  parts_list?: OrderPart[];
  labor_hours: number;
  labor_cost: number;
  parts_cost: number;
  downtime_hours: number;
  maintenance_cost: number; // Total cost
  completion_date?: string;
  next_preventive_date: string;
  status: OrderStatus;
  created_by?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
}

export interface Part {
  id: string;
  part_code: string;
  part_name: string;
  stock_quantity: number;
  minimum_stock: number;
  unit_cost: number;
  supplier: string;
}

export interface Settings {
  id: string;
  company_name: string;
  address: string;
  labor_rate: number;
  default_preventive_interval: number;
  default_predictive_interval: number;
  updated_at?: string;
}
