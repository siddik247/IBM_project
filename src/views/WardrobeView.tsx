import { useMemo, useState } from 'react';
import { Plus, Search, SlidersHorizontal, Droplet, Sparkles } from 'lucide-react';
import type { Item } from '../lib/types';
import { CATEGORIES, OCCASIONS, SEASONS, type Category, type Occasion, type Season } from '../lib/types';
import { ItemCard } from '../components/ItemCard';
import { ItemFormModal } from '../components/ItemFormModal';

interface WardrobeViewProps {
  items: Item[];
  onItemsChanged: () => void;
  onItemSelected: (item: Item) => void;
}

type SortKey = 'recent' | 'name' | 'worn' | 'unworn';

export function WardrobeView({ items, onItemsChanged, onItemSelected }: WardrobeViewProps) {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<Category | 'all'>('all');
  const [filterOccasion, setFilterOccasion] = useState<Occasion | 'all'>('all');
  const [filterSeason, setFilterSeason] = useState<Season | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);

  const filtered = useMemo(() => {
    let result = [...items];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((i) =>
        i.name.toLowerCase().includes(q) ||
        i.brand?.toLowerCase().includes(q) ||
        i.sub_type?.toLowerCase().includes(q) ||
        i.color?.toLowerCase().includes(q)
      );
    }
    if (filterCat !== 'all') result = result.filter((i) => i.category === filterCat);
    if (filterOccasion !== 'all') result = result.filter((i) => i.occasions?.includes(filterOccasion));
    if (filterSeason !== 'all') result = result.filter((i) => i.season?.includes(filterSeason) || i.season?.includes('all'));

    switch (sortKey) {
      case 'name': result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'worn': result.sort((a, b) => (b.wear_count - a.wear_count)); break;
      case 'unworn': result.sort((a, b) => (a.wear_count - b.wear_count)); break;
      default: result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return result;
  }, [items, search, filterCat, filterOccasion, filterSeason, sortKey]);

  const needsWashCount = items.filter((i) => {
    if (i.wear_count === 0) return false;
    if (!i.last_washed_date) return true;
    return Math.floor((Date.now() - new Date(i.last_washed_date).getTime()) / 86400000) > 14;
  }).length;
  const unwornCount = items.filter((i) => i.wear_count === 0).length;

  const activeFilters = (filterCat !== 'all' ? 1 : 0) + (filterOccasion !== 'all' ? 1 : 0) + (filterSeason !== 'all' ? 1 : 0);

  return (
    <div className="animate-fade-in">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-ink-500 text-xs font-semibold uppercase tracking-wide mb-1">
            <Sparkles size={14} className="text-brand-500" /> Total Items
          </div>
          <div className="text-2xl font-display font-semibold text-ink-900">{items.length}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-ink-500 text-xs font-semibold uppercase tracking-wide mb-1">
            <Droplet size={14} className="text-accent-500" /> Need Wash
          </div>
          <div className="text-2xl font-display font-semibold text-ink-900">{needsWashCount}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-ink-500 text-xs font-semibold uppercase tracking-wide mb-1">
            <Sparkles size={14} className="text-brand-500" /> Never Worn
          </div>
          <div className="text-2xl font-display font-semibold text-ink-900">{unwornCount}</div>
        </div>
      </div>

      {/* Search + actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-10"
            placeholder="Search by name, brand, color..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary ${activeFilters > 0 ? 'border-brand-400 text-brand-700' : ''}`}
        >
          <SlidersHorizontal size={16} />
          Filters
          {activeFilters > 0 && (
            <span className="ml-1 bg-brand-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </button>
        <button onClick={() => { setEditItem(null); setFormOpen(true); }} className="btn-primary">
          <Plus size={18} /> Add Item
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card p-4 mb-4 animate-scale-in space-y-4">
          <div>
            <label className="label">Category</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterCat('all')}
                className={`chip ${filterCat === 'all' ? 'chip-active' : 'chip-idle'}`}
              >
                All
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setFilterCat(filterCat === c.value ? 'all' : c.value)}
                  className={`chip ${filterCat === c.value ? 'chip-active' : 'chip-idle'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Occasion</label>
              <select
                className="input"
                value={filterOccasion}
                onChange={(e) => setFilterOccasion(e.target.value as Occasion | 'all')}
              >
                <option value="all">All occasions</option>
                {OCCASIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Season</label>
              <select
                className="input"
                value={filterSeason}
                onChange={(e) => setFilterSeason(e.target.value as Season | 'all')}
              >
                <option value="all">All seasons</option>
                {SEASONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Sort by</label>
            <div className="flex flex-wrap gap-2">
              {([
                { v: 'recent', l: 'Recently Added' },
                { v: 'name', l: 'Name A-Z' },
                { v: 'worn', l: 'Most Worn' },
                { v: 'unworn', l: 'Least Worn' },
              ] as { v: SortKey; l: string }[]).map((s) => (
                <button
                  key={s.v}
                  onClick={() => setSortKey(s.v)}
                  className={`chip ${sortKey === s.v ? 'chip-active' : 'chip-idle'}`}
                >
                  {s.l}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-ink-100 flex items-center justify-center mx-auto mb-4">
            <Search size={28} className="text-ink-300" />
          </div>
          <h3 className="font-display text-lg font-semibold text-ink-700 mb-1">
            {items.length === 0 ? 'Your wardrobe is empty' : 'No items match your filters'}
          </h3>
          <p className="text-sm text-ink-500 mb-4">
            {items.length === 0 ? 'Add your first clothing item to get started.' : 'Try adjusting your search or filters.'}
          </p>
          {items.length === 0 && (
            <button onClick={() => { setEditItem(null); setFormOpen(true); }} className="btn-primary">
              <Plus size={18} /> Add Your First Item
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {filtered.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onClick={() => onItemSelected(item)}
              onMenu={(e) => { e.stopPropagation(); setEditItem(item); setFormOpen(true); }}
            />
          ))}
        </div>
      )}

      <ItemFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={onItemsChanged}
        item={editItem}
      />
    </div>
  );
}
