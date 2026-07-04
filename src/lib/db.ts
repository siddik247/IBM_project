import { supabase, STORAGE_BUCKET } from './supabase';
import type {
  Item, Outfit, OutfitItem, WearLog, WashLog, Settings,
  Category, Occasion, Season, Condition, WashMethod, Slot,
} from './types';

// ---------- Items ----------

export async function fetchItems(): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchItem(id: string): Promise<Item | null> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface ItemInput {
  name: string;
  image_url?: string | null;
  category: Category;
  sub_type?: string | null;
  color?: string | null;
  color_hex?: string | null;
  brand?: string | null;
  season?: Season[];
  occasions?: Occasion[];
  condition?: Condition | null;
  notes?: string | null;
}

export async function createItem(input: ItemInput): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateItem(id: string, patch: Partial<ItemInput>): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadItemImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `items/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteItemImage(url: string): Promise<void> {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split(`/${STORAGE_BUCKET}/`);
    if (parts.length < 2) return;
    const path = parts[1];
    await supabase.storage.from(STORAGE_BUCKET).remove([path]);
  } catch {
    // best-effort cleanup
  }
}

// ---------- Outfits ----------

export async function fetchOutfits(): Promise<Outfit[]> {
  const { data, error } = await supabase
    .from('outfits')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchOutfitWithItems(outfitId: string): Promise<{ outfit: Outfit; items: OutfitItem[] }> {
  const { data: outfit, error: oe } = await supabase
    .from('outfits')
    .select('*')
    .eq('id', outfitId)
    .maybeSingle();
  if (oe) throw oe;
  if (!outfit) throw new Error('Outfit not found');
  const { data: items, error: ie } = await supabase
    .from('outfit_items')
    .select('*, item:items(*)')
    .eq('outfit_id', outfitId);
  if (ie) throw ie;
  return { outfit, items: items ?? [] };
}

export async function fetchAllOutfitItems(): Promise<OutfitItem[]> {
  const { data, error } = await supabase
    .from('outfit_items')
    .select('*, item:items(*)')
    .order('outfit_id');
  if (error) throw error;
  return data ?? [];
}

export interface OutfitInput {
  name: string;
  occasion?: Occasion | null;
  season?: Season[];
  notes?: string | null;
  is_favorite?: boolean;
}

export async function createOutfit(input: OutfitInput, slots: { slot: Slot; item_id: string }[]): Promise<Outfit> {
  const { data: outfit, error: oe } = await supabase
    .from('outfits')
    .insert(input)
    .select()
    .single();
  if (oe) throw oe;
  if (slots.length) {
    const rows = slots.map((s) => ({ outfit_id: outfit.id, item_id: s.item_id, slot: s.slot }));
    const { error: sie } = await supabase.from('outfit_items').insert(rows);
    if (sie) throw sie;
  }
  return outfit;
}

export async function updateOutfit(id: string, patch: Partial<OutfitInput>, slots?: { slot: Slot; item_id: string }[]): Promise<Outfit> {
  const { data, error } = await supabase
    .from('outfits')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  if (slots) {
    await supabase.from('outfit_items').delete().eq('outfit_id', id);
    if (slots.length) {
      const rows = slots.map((s) => ({ outfit_id: id, item_id: s.item_id, slot: s.slot }));
      const { error: sie } = await supabase.from('outfit_items').insert(rows);
      if (sie) throw sie;
    }
  }
  return data;
}

export async function deleteOutfit(id: string): Promise<void> {
  const { error } = await supabase.from('outfits').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleOutfitFavorite(id: string, value: boolean): Promise<void> {
  const { error } = await supabase.from('outfits').update({ is_favorite: value }).eq('id', id);
  if (error) throw error;
}

// ---------- Wear Log ----------

export async function fetchWearLog(): Promise<WearLog[]> {
  const { data, error } = await supabase
    .from('wear_log')
    .select('*')
    .order('worn_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function logWear(input: { outfit_id?: string | null; item_id?: string | null; worn_date: string; occasion?: Occasion | null; notes?: string | null }): Promise<WearLog> {
  const { data, error } = await supabase
    .from('wear_log')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  // Update denormalized item fields
  if (input.item_id) {
    await supabase.from('items').update({
      last_worn_date: input.worn_date,
      wear_count: (await fetchItem(input.item_id))?.wear_count ? ((await fetchItem(input.item_id))!.wear_count + 1) : 1,
    }).eq('id', input.item_id);
  } else if (input.outfit_id) {
    // Update all items in the outfit
    const { data: ois } = await supabase.from('outfit_items').select('item_id').eq('outfit_id', input.outfit_id);
    if (ois) {
      for (const oi of ois) {
        const item = await fetchItem(oi.item_id);
        await supabase.from('items').update({
          last_worn_date: input.worn_date,
          wear_count: (item?.wear_count ?? 0) + 1,
        }).eq('id', oi.item_id);
      }
    }
  }
  return data;
}

export async function deleteWearLog(id: string): Promise<void> {
  const { error } = await supabase.from('wear_log').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Wash Log ----------

export async function fetchWashLog(): Promise<WashLog[]> {
  const { data, error } = await supabase
    .from('wash_log')
    .select('*')
    .order('washed_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function logWash(input: { item_id: string; washed_date: string; method?: WashMethod | null; notes?: string | null }): Promise<WashLog> {
  const { data, error } = await supabase
    .from('wash_log')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  await supabase.from('items').update({ last_washed_date: input.washed_date }).eq('id', input.item_id);
  return data;
}

export async function deleteWashLog(id: string): Promise<void> {
  const { error } = await supabase.from('wash_log').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Settings ----------

export async function fetchSettings(): Promise<Settings | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateSettings(patch: Partial<Pick<Settings, 'wash_reminder_days' | 'repeat_window_days' | 'default_location'>>): Promise<Settings> {
  const { data, error } = await supabase
    .from('settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select()
    .single();
  if (error) throw error;
  return data;
}
