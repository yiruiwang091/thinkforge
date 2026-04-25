-- ThinkForge — Supabase Database Schema
-- ========================================
-- 在 Supabase 控制台 SQL Editor 里运行这个文件
-- Dashboard → SQL Editor → New query → 粘贴 → Run

-- ── 星球状态表（每个用户一行，upsert 更新）────────────────────────────────
CREATE TABLE IF NOT EXISTS planet_states (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  traits         jsonb       NOT NULL DEFAULT '{
    "sensation_seeking":    0.5,
    "extraversion":         0.5,
    "intuitive":            0.5,
    "creativity":           0.5,
    "emotional_depth":      0.5,
    "memory_strength":      0.5,
    "language_sensitivity": 0.5,
    "independence":         0.5
  }'::jsonb,
  question_count integer     NOT NULL DEFAULT 0,
  last_active    timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- ── 问答历史表（append-only，按 created_at 排序）────────────────────────
CREATE TABLE IF NOT EXISTS question_history (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question   text        NOT NULL,
  answer     text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Row Level Security：每个用户只能读写自己的数据 ───────────────────────
ALTER TABLE planet_states   ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_history ENABLE ROW LEVEL SECURITY;

-- 用 FOR ALL 一条搞定增删改查
CREATE POLICY "own planet"  ON planet_states   FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own history" ON question_history FOR ALL USING (auth.uid() = user_id);
