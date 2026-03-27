-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'operator',
  department TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Add email column if it doesn't exist (for existing tables)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='email') THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
  END IF;
END $$;

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
  parts_used TEXT[], -- Legacy field
  parts_list JSONB DEFAULT '[]'::jsonb,
  labor_hours NUMERIC DEFAULT 0,
  labor_cost NUMERIC DEFAULT 0,
  parts_cost NUMERIC DEFAULT 0,
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

-- Create settings table
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT DEFAULT 'JIMP Industrial',
  address TEXT DEFAULT 'Rua Industrial, 123',
  labor_rate NUMERIC DEFAULT 50,
  default_preventive_interval INTEGER DEFAULT 30,
  default_predictive_interval INTEGER DEFAULT 90,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_first_user BOOLEAN;
BEGIN
  -- Check if this is the first user
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO is_first_user;

  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Usuário Novo'),
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'role', 
      CASE WHEN is_first_user THEN 'admin' ELSE 'operator' END
    )
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Set up Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Function to check if user is admin without recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.is_admin());

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

CREATE POLICY "Allow authenticated users to read settings" ON public.settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert settings" ON public.settings
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update settings" ON public.settings
  FOR UPDATE TO authenticated USING (true);
