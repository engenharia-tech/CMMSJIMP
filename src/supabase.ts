import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Sanitize inputs: trim whitespace and remove trailing slashes
const supabaseUrl = rawUrl.trim().replace(/\/$/, '');
const supabaseAnonKey = rawKey.trim();

export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') && 
  supabaseUrl.includes('.supabase.co')
);

// Use placeholders to prevent crash during initialization if env vars are missing
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

export const signInWithEmail = async (email: string, password: string) => {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  console.log('Attempting sign in for:', email);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.error('Sign in error:', error);
      throw error;
    }
    console.log('Sign in successful');
    return data;
  } catch (err) {
    console.error('Sign in exception:', err);
    throw err;
  }
};

export const signUpWithEmail = async (email: string, password: string, fullName: string) => {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });
  if (error) throw error;
  return data;
};

export const signInWithGoogle = async () => {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const resetPasswordForEmail = async (email: string) => {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  
  // Get the current origin and ensure it doesn't have a trailing slash
  const origin = window.location.origin.replace(/\/$/, '');
  const redirectTo = `${origin}/reset-password`;
  
  console.log('Requesting password reset with redirect to:', redirectTo);
  
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (error) throw error;
  return data;
};

export const getUserProfile = async (userId: string) => {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  console.log('Fetching profile for user:', userId);
  
  // Create a timeout promise to prevent hanging the entire app
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
  );

  try {
    const fetchPromise = supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    // Race the fetch against the timeout
    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
      throw error;
    }
    console.log('Profile fetched successfully:', data);
    return data;
  } catch (err) {
    console.warn('Profile fetch failed or timed out, using default role:', err);
    // Return a default structure instead of throwing to prevent blocking the UI
    return { role: 'operator', full_name: 'User' };
  }
};

export const handleSupabaseError = (error: any, operation: string) => {
  console.error(`Supabase Error during ${operation}:`, error);
  throw error;
};
