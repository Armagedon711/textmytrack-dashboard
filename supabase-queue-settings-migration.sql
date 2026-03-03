-- Run this in Supabase SQL Editor (Dashboard → SQL Editor) to add queue config columns to dj_profiles.

ALTER TABLE dj_profiles
  ADD COLUMN IF NOT EXISTS auto_delete_duplicates boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS duplicate_scope text DEFAULT 'both' CHECK (duplicate_scope IN ('requests', 'approved', 'both')),
  ADD COLUMN IF NOT EXISTS auto_reject_explicit boolean DEFAULT false;
