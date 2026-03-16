import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://grkdwccuurgvvbovydsf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdya2R3Y2N1dXJndnZib3Z5ZHNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzMyNjIsImV4cCI6MjA4OTI0OTI2Mn0.YCYsRBviaIt5fCzxJBL_jHxGoKYJdgvConYHO7y7bxU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});