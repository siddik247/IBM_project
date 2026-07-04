export type Category = 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'accessory' | 'undergarment' | 'other';
export type Slot = Category;
export type Condition = 'new' | 'excellent' | 'good' | 'fair' | 'poor';
export type Season = 'spring' | 'summer' | 'fall' | 'winter' | 'all';
export type Occasion = 'casual' | 'formal' | 'work' | 'party' | 'athletic' | 'lounge' | 'outdoor';
export type WashMethod = 'machine' | 'hand' | 'dry-clean' | 'spot';

export interface Item {
  id: string;
  name: string;
  image_url: string | null;
  category: Category;
  sub_type: string | null;
  color: string | null;
  color_hex: string | null;
  brand: string | null;
  season: Season[];
  occasions: Occasion[];
  condition: Condition | null;
  notes: string | null;
  last_worn_date: string | null;
  last_washed_date: string | null;
  wear_count: number;
  created_at: string;
}

export interface Outfit {
  id: string;
  name: string;
  occasion: Occasion | null;
  season: Season[];
  notes: string | null;
  is_favorite: boolean;
  created_at: string;
}

export interface OutfitItem {
  id: string;
  outfit_id: string;
  item_id: string;
  slot: Slot;
  item?: Item;
}

export interface WearLog {
  id: string;
  outfit_id: string | null;
  item_id: string | null;
  worn_date: string;
  occasion: Occasion | null;
  notes: string | null;
  created_at: string;
}

export interface WashLog {
  id: string;
  item_id: string;
  washed_date: string;
  method: WashMethod | null;
  notes: string | null;
  created_at: string;
}

export interface Settings {
  id: number;
  wash_reminder_days: number;
  repeat_window_days: number;
  default_location: string | null;
  updated_at: string;
}

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'top', label: 'Tops' },
  { value: 'bottom', label: 'Bottoms' },
  { value: 'dress', label: 'Dresses' },
  { value: 'outerwear', label: 'Outerwear' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'accessory', label: 'Accessories' },
  { value: 'undergarment', label: 'Undergarments' },
  { value: 'other', label: 'Other' },
];

export const OCCASIONS: { value: Occasion; label: string }[] = [
  { value: 'casual', label: 'Casual' },
  { value: 'formal', label: 'Formal' },
  { value: 'work', label: 'Work' },
  { value: 'party', label: 'Party' },
  { value: 'athletic', label: 'Athletic' },
  { value: 'lounge', label: 'Lounge' },
  { value: 'outdoor', label: 'Outdoor' },
];

export const SEASONS: { value: Season; label: string }[] = [
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'fall', label: 'Fall' },
  { value: 'winter', label: 'Winter' },
  { value: 'all', label: 'All Season' },
];

export const CONDITIONS: { value: Condition; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

export const WASH_METHODS: { value: WashMethod; label: string }[] = [
  { value: 'machine', label: 'Machine Wash' },
  { value: 'hand', label: 'Hand Wash' },
  { value: 'dry-clean', label: 'Dry Clean' },
  { value: 'spot', label: 'Spot Clean' },
];

export const CATEGORY_LABEL: Record<Category, string> = {
  top: 'Tops',
  bottom: 'Bottoms',
  dress: 'Dresses',
  outerwear: 'Outerwear',
  shoes: 'Shoes',
  accessory: 'Accessories',
  undergarment: 'Undergarments',
  other: 'Other',
};

export const OCCASION_LABEL: Record<Occasion, string> = {
  casual: 'Casual',
  formal: 'Formal',
  work: 'Work',
  party: 'Party',
  athletic: 'Athletic',
  lounge: 'Lounge',
  outdoor: 'Outdoor',
};

export const SEASON_LABEL: Record<Season, string> = {
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
  winter: 'Winter',
  all: 'All Season',
};

export const CONDITION_LABEL: Record<Condition, string> = {
  new: 'New',
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};
