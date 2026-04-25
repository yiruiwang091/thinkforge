/**
 * ThinkForge — Supabase Client
 * ==============================
 * 全局单例，所有组件 import { supabase } from './lib/supabase' 即可使用。
 *
 * Publishable key 可以安全地放在前端代码里（类似原来的 anon key）。
 * 真正的权限控制由 Supabase 的 Row Level Security (RLS) 策略负责。
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fkrodeaypvfsjccafqyz.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_5Ut6KUPAOVPLV4bclW7qig_locmU_bT'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
