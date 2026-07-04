import type { Item, WearLog, Occasion, Season, Slot, Category } from './types';

export interface RecommendationContext {
  occasion: Occasion;
  season?: Season;
  weatherTempC?: number;
  repeatWindowDays: number;
}

export interface OutfitSuggestion {
  slots: { slot: Slot; item: Item | null }[];
  score: number;
  reasons: string[];
}

const SEASON_MATCH: Record<Season, Season[]> = {
  spring: ['spring', 'all'],
  summer: ['summer', 'all'],
  fall: ['fall', 'all'],
  winter: ['winter', 'all'],
  all: ['spring', 'summer', 'fall', 'winter', 'all'],
};

function currentSeason(date = new Date()): Season {
  const m = date.getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'fall';
  return 'winter';
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
}

function isRecentlyWorn(item: Item, windowDays: number): boolean {
  const ds = daysSince(item.last_worn_date);
  return ds !== null && ds < windowDays;
}

function needsWash(item: Item, washWindowDays: number): boolean {
  if (!item.last_washed_date) return item.wear_count > 0;
  const ds = daysSince(item.last_washed_date);
  return ds !== null && ds > washWindowDays && item.wear_count > 0;
}

function seasonOk(item: Item, season: Season): boolean {
  if (!item.season || item.season.length === 0) return true;
  if (item.season.includes('all')) return true;
  return SEASON_MATCH[season].some((s) => item.season.includes(s));
}

function occasionOk(item: Item, occasion: Occasion): boolean {
  if (!item.occasions || item.occasions.length === 0) return true;
  return item.occasions.includes(occasion);
}

function tempOk(item: Item, tempC?: number): boolean {
  if (tempC === undefined) return true;
  if (tempC >= 22) {
    // warm — avoid heavy outerwear
    return item.category !== 'outerwear' || (item.sub_type?.toLowerCase().includes('light') ?? false);
  }
  if (tempC <= 10) {
    // cold — prefer outerwear if present, but don't exclude
    return true;
  }
  return true;
}

function scoreItem(item: Item, ctx: RecommendationContext): number {
  let score = 50;
  // Occasion match
  if (occasionOk(item, ctx.occasion)) score += 20; else score -= 25;
  // Season match
  const season = ctx.season ?? currentSeason();
  if (seasonOk(item, season)) score += 15; else score -= 15;
  // Temperature
  if (tempOk(item, ctx.weatherTempC)) score += 5; else score -= 10;
  // Freshness — reward not recently worn
  if (!isRecentlyWorn(item, ctx.repeatWindowDays)) score += 15; else score -= 20;
  // Condition
  if (item.condition === 'new') score += 8;
  else if (item.condition === 'excellent') score += 5;
  else if (item.condition === 'good') score += 2;
  else if (item.condition === 'fair') score -= 5;
  else if (item.condition === 'poor') score -= 15;
  // Penalize items needing wash
  if (needsWash(item, 14)) score -= 25;
  return score;
}

const SLOT_ORDER: Slot[] = ['dress', 'top', 'bottom', 'outerwear', 'shoes', 'accessory', 'undergarment', 'other'];

function categoryToSlot(cat: Category): Slot {
  return cat;
}

export function generateOutfitSuggestions(
  items: Item[],
  ctx: RecommendationContext,
  maxResults = 6,
): OutfitSuggestion[] {
  const season = ctx.season ?? currentSeason();
  const eligible = items.filter((i) => occasionOk(i, ctx.occasion) && seasonOk(i, season));
  if (eligible.length === 0) return [];

  // Group by slot
  const bySlot: Record<Slot, Item[]> = {
    top: [], bottom: [], dress: [], outerwear: [], shoes: [], accessory: [], undergarment: [], other: [],
  };
  for (const item of eligible) {
    bySlot[categoryToSlot(item.category)].push(item);
  }

  // Score each item per slot
  const scored: Record<Slot, { item: Item; score: number }[]> = {
    top: [], bottom: [], dress: [], outerwear: [], shoes: [], accessory: [], undergarment: [], other: [],
  };
  for (const slot of SLOT_ORDER) {
    scored[slot] = bySlot[slot]
      .map((item) => ({ item, score: scoreItem(item, ctx) }))
      .sort((a, b) => b.score - a.score);
  }

  const suggestions: OutfitSuggestion[] = [];

  // Strategy 1: Dress-based outfit (if dresses available)
  if (bySlot.dress.length > 0) {
    for (let d = 0; d < Math.min(3, bySlot.dress.length); d++) {
      const dress = scored.dress[d];
      const slots: { slot: Slot; item: Item | null }[] = [{ slot: 'dress', item: dress.item }];
      const reasons: string[] = [`${dress.item.name} matches ${ctx.occasion}`];
      // Add shoes
      if (scored.shoes.length > 0) {
        const shoe = scored.shoes.find((s) => !isRecentlyWorn(s.item, ctx.repeatWindowDays)) ?? scored.shoes[0];
        slots.push({ slot: 'shoes', item: shoe.item });
        reasons.push(`${shoe.item.name} pairs well`);
      }
      // Add outerwear if cold
      if (ctx.weatherTempC !== undefined && ctx.weatherTempC <= 15 && scored.outerwear.length > 0) {
        slots.push({ slot: 'outerwear', item: scored.outerwear[0].item });
        reasons.push('Layered for the weather');
      }
      // Add accessory
      if (scored.accessory.length > 0) {
        slots.push({ slot: 'accessory', item: scored.accessory[0].item });
      }
      suggestions.push({ slots, score: dress.score, reasons });
    }
  }

  // Strategy 2: Top + Bottom combos
  if (bySlot.top.length > 0 && bySlot.bottom.length > 0) {
    const topN = Math.min(4, bySlot.top.length);
    const bottomN = Math.min(3, bySlot.bottom.length);
    for (let t = 0; t < topN; t++) {
      for (let b = 0; b < bottomN; b++) {
        if (suggestions.length >= maxResults) break;
        const top = scored.top[t];
        const bottom = scored.bottom[b];
        // Avoid same-color top+bottom
        if (top.item.color && bottom.item.color && top.item.color === bottom.item.color) continue;
        const slots: { slot: Slot; item: Item | null }[] = [
          { slot: 'top', item: top.item },
          { slot: 'bottom', item: bottom.item },
        ];
        const reasons: string[] = [`${top.item.name} + ${bottom.item.name}`];
        if (scored.shoes.length > 0) {
          const shoe = scored.shoes.find((s) => !isRecentlyWorn(s.item, ctx.repeatWindowDays)) ?? scored.shoes[0];
          slots.push({ slot: 'shoes', item: shoe.item });
        }
        if (ctx.weatherTempC !== undefined && ctx.weatherTempC <= 15 && scored.outerwear.length > 0) {
          slots.push({ slot: 'outerwear', item: scored.outerwear[0].item });
          reasons.push('Layered for the weather');
        }
        if (scored.accessory.length > 0) {
          slots.push({ slot: 'accessory', item: scored.accessory[0].item });
        }
        const score = top.score + bottom.score;
        suggestions.push({ slots, score, reasons });
      }
    }
  }

  // Sort by score and dedupe
  const seen = new Set<string>();
  const unique = suggestions
    .sort((a, b) => b.score - a.score)
    .filter((s) => {
      const key = s.slots.map((sl) => sl.item?.id).join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, maxResults);

  return unique;
}

export function getRecentlyWornOutfitIds(wearLog: WearLog[], windowDays: number): Set<string> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);
  const ids = new Set<string>();
  for (const log of wearLog) {
    if (log.outfit_id && new Date(log.worn_date) >= cutoff) {
      ids.add(log.outfit_id);
    }
  }
  return ids;
}

export function getItemsNeedingWash(items: Item[], washWindowDays: number): Item[] {
  return items.filter((i) => needsWash(i, washWindowDays));
}

export function getNeverWornItems(items: Item[]): Item[] {
  return items.filter((i) => i.wear_count === 0);
}

export function getOutfitWearCount(wearLog: WearLog[], outfitId: string): number {
  return wearLog.filter((l) => l.outfit_id === outfitId).length;
}

export function getItemWearCount(wearLog: WearLog[], itemId: string): number {
  return wearLog.filter((l) => l.item_id === itemId).length;
}

export function getCurrentSeason(): Season {
  return currentSeason();
}
