import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cpvikfjbcbsodbkcczex.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_46fyrbxZKO9hxk55EOWeyw_ZzQpIdMF'
const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
export const supabaseAdmin = serviceKey ? createClient(supabaseUrl, serviceKey) : null
