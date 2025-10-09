import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://umnqrqfwiytjegsjhhxh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtbnFycWZ3aXl0amVnc2poaHhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NjA5MTEsImV4cCI6MjA3NTQzNjkxMX0.Lyoq693gxHojyIGjsomNE7-lNBxrvZlC3318ggJOn48';
export const supabase = createClient(supabaseUrl, supabaseKey);