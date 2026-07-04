/*
# Wardrobe Manager — Initial Schema (single-tenant, no auth)

## Purpose
A personal wardrobe management and outfit planning app. Users catalog clothing items,
build outfits, track wear history, and log wash/maintenance. No sign-in is required,
so this is a single-tenant schema: all data is shared/public and policies use
`TO anon, authenticated`.

## New Tables

1. `items` — individual clothing items in the digital wardrobe
   - `id` (uuid, pk)
   - `name` (text, not null) — user-given label, e.g. "Blue Oxford Shirt"
   - `image_url` (text) — Supabase Storage public URL of the uploaded photo
   - `category` (text, not null) — top | bottom | dress | outerwear | shoes | accessory | undergarment | other
   - `sub_type` (text) — finer grain, e.g. "t-shirt", "jeans", "sneakers"
   - `color` (text) — primary color, e.g. "navy"
   - `color_hex` (text) — hex code for swatch display
   - `brand` (text)
   - `season` (text[]) — array of seasons: spring, summer, fall, winter, all
   - `occasions` (text[]) — array: casual, formal, work, party, athletic, lounge, outdoor
   - `condition` (text) — new | excellent | good | fair | poor
   - `notes` (text)
   - `last_worn_date` (date) — denormalized for quick "not worn recently" queries
   - `last_washed_date` (date) — denormalized for wash reminders
   - `wear_count` (int, default 0) — denormalized total wears
   - `created_at` (timestamptz)

2. `outfits` — named combinations of items
   - `id` (uuid, pk)
   - `name` (text, not null)
   - `occasion` (text) — primary occasion this outfit suits
   - `season` (text[]) — seasons this outfit fits
   - `notes` (text)
   - `is_favorite` (boolean, default false)
   - `created_at` (timestamptz)

3. `outfit_items` — join table (outfit <-> items, with slot role)
   - `id` (uuid, pk)
   - `outfit_id` (uuid, fk -> outfits.id, cascade)
   - `item_id` (uuid, fk -> items.id, cascade)
   - `slot` (text, not null) — top | bottom | dress | outerwear | shoes | accessory | other
   - UNIQUE (outfit_id, slot) — one item per slot per outfit

4. `wear_log` — every time an outfit (or standalone item) is worn
   - `id` (uuid, pk)
   - `outfit_id` (uuid, fk -> outfits.id, cascade, nullable) — null if logging a lone item
   - `item_id` (uuid, fk -> items.id, cascade, nullable) — set when logging a lone item
   - `worn_date` (date, not null)
   - `occasion` (text) — context worn for
   - `notes` (text)
   - `created_at` (timestamptz)
   - CHECK that at least one of outfit_id / item_id is non-null

5. `wash_log` — every wash/maintenance event for an item
   - `id` (uuid, pk)
   - `item_id` (uuid, fk -> items.id, cascade)
   - `washed_date` (date, not null)
   - `method` (text) — machine | hand | dry-clean | spot
   - `notes` (text)
   - `created_at` (timestamptz)

6. `settings` — single-row table for app preferences
   - `id` (int, pk, always 1)
   - `wash_reminder_days` (int, default 14) — flag items not washed in N days
   - `repeat_window_days` (int, default 7) — avoid repeating outfits within N days
   - `default_location` (text) — for weather lookups
   - `updated_at` (timestamptz)

## Indexes
- `items.category`, `items.last_worn_date`, `items.last_washed_date`
- `outfit_items.outfit_id`, `outfit_items.item_id`
- `wear_log.worn_date`, `wear_log.outfit_id`, `wear_log.item_id`
- `wash_log.item_id`, `wash_log.washed_date`

## Security
- RLS enabled on every table.
- All policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because this is an intentionally single-tenant, no-auth app — the data is shared/public.

## Notes
1. Denormalized counters on `items` (wear_count, last_worn_date, last_washed_date) are
   maintained by the app on insert into wear_log / wash_log for fast list queries.
2. `settings` is enforced single-row via a unique constraint on id and a default row.
*/

-- ===== items =====
CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text,
  category text NOT NULL CHECK (category IN ('top','bottom','dress','outerwear','shoes','accessory','undergarment','other')),
  sub_type text,
  color text,
  color_hex text,
  brand text,
  season text[] DEFAULT '{}',
  occasions text[] DEFAULT '{}',
  condition text CHECK (condition IS NULL OR condition IN ('new','excellent','good','fair','poor')),
  notes text,
  last_worn_date date,
  last_washed_date date,
  wear_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_last_worn ON items(last_worn_date);
CREATE INDEX IF NOT EXISTS idx_items_last_washed ON items(last_washed_date);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_items" ON items;
CREATE POLICY "anon_select_items" ON items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_items" ON items;
CREATE POLICY "anon_insert_items" ON items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_items" ON items;
CREATE POLICY "anon_update_items" ON items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_items" ON items;
CREATE POLICY "anon_delete_items" ON items FOR DELETE TO anon, authenticated USING (true);

-- ===== outfits =====
CREATE TABLE IF NOT EXISTS outfits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  occasion text,
  season text[] DEFAULT '{}',
  notes text,
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_outfits" ON outfits;
CREATE POLICY "anon_select_outfits" ON outfits FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_outfits" ON outfits;
CREATE POLICY "anon_insert_outfits" ON outfits FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_outfits" ON outfits;
CREATE POLICY "anon_update_outfits" ON outfits FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_outfits" ON outfits;
CREATE POLICY "anon_delete_outfits" ON outfits FOR DELETE TO anon, authenticated USING (true);

-- ===== outfit_items =====
CREATE TABLE IF NOT EXISTS outfit_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id uuid NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  slot text NOT NULL CHECK (slot IN ('top','bottom','dress','outerwear','shoes','accessory','undergarment','other')),
  UNIQUE (outfit_id, slot)
);
CREATE INDEX IF NOT EXISTS idx_outfit_items_outfit ON outfit_items(outfit_id);
CREATE INDEX IF NOT EXISTS idx_outfit_items_item ON outfit_items(item_id);

ALTER TABLE outfit_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_outfit_items" ON outfit_items;
CREATE POLICY "anon_select_outfit_items" ON outfit_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_outfit_items" ON outfit_items;
CREATE POLICY "anon_insert_outfit_items" ON outfit_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_outfit_items" ON outfit_items;
CREATE POLICY "anon_update_outfit_items" ON outfit_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_outfit_items" ON outfit_items;
CREATE POLICY "anon_delete_outfit_items" ON outfit_items FOR DELETE TO anon, authenticated USING (true);

-- ===== wear_log =====
CREATE TABLE IF NOT EXISTS wear_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id uuid REFERENCES outfits(id) ON DELETE CASCADE,
  item_id uuid REFERENCES items(id) ON DELETE CASCADE,
  worn_date date NOT NULL,
  occasion text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (outfit_id IS NOT NULL OR item_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_wear_log_date ON wear_log(worn_date);
CREATE INDEX IF NOT EXISTS idx_wear_log_outfit ON wear_log(outfit_id);
CREATE INDEX IF NOT EXISTS idx_wear_log_item ON wear_log(item_id);

ALTER TABLE wear_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_wear_log" ON wear_log;
CREATE POLICY "anon_select_wear_log" ON wear_log FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_wear_log" ON wear_log;
CREATE POLICY "anon_insert_wear_log" ON wear_log FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_wear_log" ON wear_log;
CREATE POLICY "anon_update_wear_log" ON wear_log FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_wear_log" ON wear_log;
CREATE POLICY "anon_delete_wear_log" ON wear_log FOR DELETE TO anon, authenticated USING (true);

-- ===== wash_log =====
CREATE TABLE IF NOT EXISTS wash_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  washed_date date NOT NULL,
  method text CHECK (method IS NULL OR method IN ('machine','hand','dry-clean','spot')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wash_log_item ON wash_log(item_id);
CREATE INDEX IF NOT EXISTS idx_wash_log_date ON wash_log(washed_date);

ALTER TABLE wash_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_wash_log" ON wash_log;
CREATE POLICY "anon_select_wash_log" ON wash_log FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_wash_log" ON wash_log;
CREATE POLICY "anon_insert_wash_log" ON wash_log FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_wash_log" ON wash_log;
CREATE POLICY "anon_update_wash_log" ON wash_log FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_wash_log" ON wash_log;
CREATE POLICY "anon_delete_wash_log" ON wash_log FOR DELETE TO anon, authenticated USING (true);

-- ===== settings =====
CREATE TABLE IF NOT EXISTS settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  wash_reminder_days int NOT NULL DEFAULT 14,
  repeat_window_days int NOT NULL DEFAULT 7,
  default_location text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_settings" ON settings;
CREATE POLICY "anon_select_settings" ON settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_settings" ON settings;
CREATE POLICY "anon_insert_settings" ON settings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_settings" ON settings;
CREATE POLICY "anon_update_settings" ON settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_settings" ON settings;
CREATE POLICY "anon_delete_settings" ON settings FOR DELETE TO anon, authenticated USING (true);

-- Seed the single settings row
INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ===== Storage bucket for item photos =====
INSERT INTO storage.buckets (id, name, public)
VALUES ('wardrobe', 'wardrobe', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anon to read/upload/delete in the wardrobe bucket
DROP POLICY IF EXISTS "anon_read_wardrobe_bucket" ON storage.objects;
CREATE POLICY "anon_read_wardrobe_bucket" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'wardrobe');

DROP POLICY IF EXISTS "anon_insert_wardrobe_bucket" ON storage.objects;
CREATE POLICY "anon_insert_wardrobe_bucket" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'wardrobe');

DROP POLICY IF EXISTS "anon_update_wardrobe_bucket" ON storage.objects;
CREATE POLICY "anon_update_wardrobe_bucket" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'wardrobe') WITH CHECK (bucket_id = 'wardrobe');

DROP POLICY IF EXISTS "anon_delete_wardrobe_bucket" ON storage.objects;
CREATE POLICY "anon_delete_wardrobe_bucket" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'wardrobe');
