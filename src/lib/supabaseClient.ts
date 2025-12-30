
import { createClient } from '@supabase/supabase-js'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'

if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
    if (typeof window !== 'undefined') {
        console.error('Supabase URL or Key is missing in environment variables.');
    }
}

// Fallback to avoid crash if variables are missing, allowing the app to start and show a UI error instead
const url = PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const key = PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(url, key)
