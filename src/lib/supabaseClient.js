import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cpvikfjbcbsodbkcczex.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_46fyrbxZKO9hxk55EOWeyw_ZzQpIdMF'

export const supabase = createClient(supabaseUrl, supabaseKey)
