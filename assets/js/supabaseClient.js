import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = "https://zqtnkyxtbevvijaqdcnb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_k0cLGHqJMQF_AAJdmop91g_MqrVWlLa";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);