-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'operator',
  department TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create equipment table
CREATE TABLE IF NOT EXISTS public.equipment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_number TEXT NOT NULL,
  equipment_name TEXT NOT NULL,
  sector TEXT NOT NULL,
  type TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  acquisition_date DATE,
  criticality TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'active',
  expected_life INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create maintenance_orders table
CREATE TABLE IF NOT EXISTS public.maintenance_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  sector TEXT NOT NULL,
  request_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  requester TEXT NOT NULL,
  operator TEXT,
  action_type TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  root_cause TEXT,
  problem_description TEXT NOT NULL,
  action_taken TEXT,
  parts_used TEXT[],
  downtime_hours NUMERIC DEFAULT 0,
  maintenance_cost NUMERIC DEFAULT 0,
  completion_date TIMESTAMP WITH TIME ZONE,
  next_preventive_date DATE,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create parts table
CREATE TABLE IF NOT EXISTS public.parts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  part_code TEXT NOT NULL,
  part_name TEXT NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  minimum_stock INTEGER DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  supplier TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- For simplicity in this industrial app, allow all authenticated users to manage equipment and orders
CREATE POLICY "Allow authenticated users to read equipment" ON public.equipment
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert equipment" ON public.equipment
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update equipment" ON public.equipment
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete equipment" ON public.equipment
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read orders" ON public.maintenance_orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert orders" ON public.maintenance_orders
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update orders" ON public.maintenance_orders
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete orders" ON public.maintenance_orders
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read parts" ON public.parts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert parts" ON public.parts
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update parts" ON public.parts
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete parts" ON public.parts
  FOR DELETE TO authenticated USING (true);
