import { useMemo, useState, useEffect } from 'react';
import { Plus, Heart, Calendar, Sparkles, X } from 'lucide-react';
import type { Item, Outfit, OutfitItem, WearLog, Occasion, Season, Slot } from '../lib/types';
import { OCCASIONS, SEASONS, OCCASION_LABEL, SEASON_LABEL } from '../lib/types';
import { Modal } from '../components/Modal';
import {
  createOutfit, updateOutfit, deleteOutfit, toggleOutfitFavorite, logWear,
} from '../lib/db';
import {
  generateOutfitSuggestions, getRecentlyWornOutfitIds, getOutfitWearCount,
  type OutfitSuggestion, getCurrentSeason,
} from '../lib/recommend';

interface OutfitsViewProps {
  items: Item[];
  outfits: Outfit[];
  outfitItems: OutfitItem[];
  wearLog: WearLog[];
  repeatWindowDays: number;
  onDataChanged: () => void;
}

const SLOT_LABEL: Record<Slot, string> = {
  top: 'Top', bottom: 'Bottom', dress: 'Dress', outerwear: 'Outerwear',
  shoes: 'Shoes', accessory: 'Accessory', undergarment: 'Undergarment', other: 'Other',
};

export function OutfitsView({ items, outfits, outfitItems, wearLog, repeatWindowDays, onDataChanged }: OutfitsViewProps) {
  const [tab, setTab] = useState<'saved' | 'suggest'>('suggest');
  const [occasion, setOccasion] = useState<Occasion>('casual');
  const [season, setSeason] = useState<Season | 'current'>('current');
  const [tempC, setTempC] = useState<number | ''>('');
  const [showOutfitForm, setShowOutfitForm] = useState(false);
  const [editOutfit, setEditOutfit] = useState<Outfit | null>(null);
  const [detailOutfit, setDetailOutfit] = useState<Outfit | null>(null);
  const [wearModalOutfit, setWearModalOutfit] = useState<Outfit | null>(null);

  const recentOutfitIds = useMemo(() => getRecentlyWornOutfitIds(wearLog, repeatWindowDays), [wearLog, repeatWindowDays]);

  const suggestions = useMemo(() => {
    if (items.length === 0) return [];
    return generateOutfitSuggestions(items, {
      occasion,
      season: season === 'current' ? getCurrentSeason() : season,
      weatherTempC: tempC === '' ? undefined : Number(tempC),
      repeatWindowDays,
    });
  }, [items, occasion, season, tempC, repeatWindowDays]);

  const itemsByOutfit = useMemo(() => {
    const map: Record<string, OutfitItem[]> = {};
    for (const oi of outfitItems) {
      if (!map[oi.outfit_id]) map[oi.outfit_id] = [];
      map[oi.outfit_id].push(oi);
    }
    return map;
  }, [outfitItems]);

  return (
    <div className="animate-fade-in">
      {/* Tabs */}
      <div className="flex items-center justify-between mb-6">
        <div className="inline-flex bg-ink-100 rounded-xl p-1">
          <button
            onClick={() => setTab('suggest')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              tab === 'suggest' ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500'
            }`}
          >
            <Sparkles size={16} /> Suggest
          </button>
          <button
            onClick={() => setTab('saved')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              tab === 'saved' ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500'
            }`}
          >
            <Heart size={16} /> Saved ({outfits.length})
          </button>
        </div>
        {tab === 'saved' && (
          <button onClick={() => { setEditOutfit(null); setShowOutfitForm(true); }} className="btn-primary">
            <Plus size={18} /> New Outfit
          </button>
        )}
      </div>

      {tab === 'suggest' ? (
        <SuggestTab
          occasion={occasion}
          setOccasion={setOccasion}
          season={season}
          setSeason={setSeason}
          tempC={tempC}
          setTempC={setTempC}
          suggestions={suggestions}
          onSave={(suggestion) => {
            setEditOutfit(null);
            setShowOutfitForm(true);
            // Pre-fill handled via state below
            window.dispatchEvent(new CustomEvent('prefill-outfit', { detail: suggestion }));
          }}
          onWear={(suggestion) => setWearModalOutfit(buildTempOutfit(suggestion))}
        />
      ) : (
        <SavedTab
          outfits={outfits}
          itemsByOutfit={itemsByOutfit}
          wearLog={wearLog}
          recentOutfitIds={recentOutfitIds}
          onEdit={(o) => { setEditOutfit(o); setShowOutfitForm(true); }}
          onDetail={setDetailOutfit}
          onWear={setWearModalOutfit}
          onToggleFav={async (o) => { await toggleOutfitFavorite(o.id, !o.is_favorite); onDataChanged(); }}
          onDelete={async (o) => {
            if (confirm(`Delete outfit "${o.name}"?`)) { await deleteOutfit(o.id); onDataChanged(); }
          }}
        />
      )}

      <OutfitFormModal
        open={showOutfitForm}
        onClose={() => setShowOutfitForm(false)}
        onSaved={onDataChanged}
        outfit={editOutfit}
        items={items}
        existingItems={editOutfit ? itemsByOutfit[editOutfit.id] ?? [] : []}
      />

      {detailOutfit && (
        <OutfitDetailModal
          outfit={detailOutfit}
          items={itemsByOutfit[detailOutfit.id] ?? []}
          wearCount={getOutfitWearCount(wearLog, detailOutfit.id)}
          onClose={() => setDetailOutfit(null)}
          onWear={() => { setWearModalOutfit(detailOutfit); setDetailOutfit(null); }}
          onEdit={() => { setEditOutfit(detailOutfit); setDetailOutfit(null); setShowOutfitForm(true); }}
        />
      )}

      {wearModalOutfit && (
        <WearModal
          outfit={wearModalOutfit}
          onClose={() => setWearModalOutfit(null)}
          onLogged={onDataChanged}
        />
      )}
    </div>
  );
}

function buildTempOutfit(_s: OutfitSuggestion): Outfit {
  return {
    id: '__temp__',
    name: 'Quick Outfit',
    occasion: null,
    season: [],
    notes: null,
    is_favorite: false,
    created_at: new Date().toISOString(),
  };
}

// ---------- Suggest Tab ----------

interface SuggestTabProps {
  occasion: Occasion;
  setOccasion: (o: Occasion) => void;
  season: Season | 'current';
  setSeason: (s: Season | 'current') => void;
  tempC: number | '';
  setTempC: (t: number | '') => void;
  suggestions: OutfitSuggestion[];
  onSave: (s: OutfitSuggestion) => void;
  onWear: (s: OutfitSuggestion) => void;
}

function SuggestTab({ occasion, setOccasion, season, setSeason, tempC, setTempC, suggestions, onSave, onWear }: SuggestTabProps) {
  return (
    <div>
      {/* Controls */}
      <div className="card p-4 mb-6 space-y-4">
        <div>
          <label className="label">Occasion</label>
          <div className="flex flex-wrap gap-2">
            {OCCASIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setOccasion(o.value)}
                className={`chip ${occasion === o.value ? 'chip-active' : 'chip-idle'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Season</label>
            <select className="input" value={season} onChange={(e) => setSeason(e.target.value as Season | 'current')}>
              <option value="current">Current season (auto)</option>
              {SEASONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Temperature (°C) — optional</label>
            <input
              type="number"
              className="input"
              placeholder="e.g. 18"
              value={tempC}
              onChange={(e) => setTempC(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Suggestions */}
      {suggestions.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-ink-100 flex items-center justify-center mx-auto mb-4">
            <Sparkles size={28} className="text-ink-300" />
          </div>
          <h3 className="font-display text-lg font-semibold text-ink-700 mb-1">No suggestions yet</h3>
          <p className="text-sm text-ink-500">Add more items to your wardrobe to get outfit recommendations.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suggestions.map((s, idx) => (
            <div key={idx} className="card p-4 hover:shadow-lift transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-semibold text-ink-500 uppercase tracking-wide">
                    Score {Math.round(s.score)}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
                {s.slots.filter((sl) => sl.item).map((sl) => (
                  <div key={sl.slot} className="shrink-0 w-20 text-center">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-ink-100 mb-1">
                      {sl.item!.image_url ? (
                        <img src={sl.item!.image_url} alt={sl.item!.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-ink-300 text-xs">
                          {SLOT_LABEL[sl.slot]}
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-ink-400 font-medium">{SLOT_LABEL[sl.slot]}</div>
                    <div className="text-[10px] text-ink-600 truncate">{sl.item!.name}</div>
                  </div>
                ))}
              </div>
              {s.reasons.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {s.reasons.map((r, i) => (
                    <span key={i} className="text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">{r}</span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => onWear(s)} className="btn-secondary flex-1 text-xs">
                  <Calendar size={14} /> Wear Today
                </button>
                <button onClick={() => onSave(s)} className="btn-secondary text-xs">
                  <Plus size={14} /> Save
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Saved Tab ----------

interface SavedTabProps {
  outfits: Outfit[];
  itemsByOutfit: Record<string, OutfitItem[]>;
  wearLog: WearLog[];
  recentOutfitIds: Set<string>;
  onEdit: (o: Outfit) => void;
  onDetail: (o: Outfit) => void;
  onWear: (o: Outfit) => void;
  onToggleFav: (o: Outfit) => void;
  onDelete: (o: Outfit) => void;
}

function SavedTab({ outfits, itemsByOutfit, wearLog, recentOutfitIds, onEdit, onDetail, onWear, onToggleFav, onDelete }: SavedTabProps) {
  if (outfits.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-ink-100 flex items-center justify-center mx-auto mb-4">
          <Heart size={28} className="text-ink-300" />
        </div>
        <h3 className="font-display text-lg font-semibold text-ink-700 mb-1">No saved outfits yet</h3>
        <p className="text-sm text-ink-500">Create an outfit from your wardrobe items, or save a suggestion.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {outfits.map((o) => {
        const ois = itemsByOutfit[o.id] ?? [];
        const isRecent = recentOutfitIds.has(o.id);
        const wearCount = getOutfitWearCount(wearLog, o.id);
        return (
          <div key={o.id} className="card overflow-hidden hover:shadow-lift transition-all duration-300 group">
            <div className="flex gap-1 p-3 bg-ink-50 h-32 overflow-hidden">
              {ois.slice(0, 4).map((oi) => (
                <div key={oi.id} className="flex-1 min-w-0 rounded-lg overflow-hidden bg-ink-100">
                  {oi.item?.image_url ? (
                    <img src={oi.item.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ink-300 text-[10px]">
                      {SLOT_LABEL[oi.slot]}
                    </div>
                  )}
                </div>
              ))}
              {ois.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-ink-300 text-sm">Empty outfit</div>
              )}
            </div>
            <div className="p-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-sm text-ink-900 truncate flex-1">{o.name}</h3>
                <button onClick={() => onToggleFav(o)} className="shrink-0 p-1 -mr-1">
                  <Heart size={16} className={o.is_favorite ? 'fill-accent-500 text-accent-500' : 'text-ink-300'} />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {o.occasion && <span className="text-[10px] bg-ink-100 text-ink-600 px-2 py-0.5 rounded-full">{OCCASION_LABEL[o.occasion]}</span>}
                {o.season?.map((s) => (
                  <span key={s} className="text-[10px] bg-ink-100 text-ink-600 px-2 py-0.5 rounded-full">{SEASON_LABEL[s]}</span>
                ))}
                {isRecent && <span className="text-[10px] bg-warning-100 text-warning-600 px-2 py-0.5 rounded-full">Worn recently</span>}
                <span className="text-[10px] text-ink-400">{wearCount}× worn</span>
              </div>
              <div className="flex gap-1.5 mt-3">
                <button onClick={() => onWear(o)} className="btn-secondary flex-1 text-xs py-2">
                  <Calendar size={13} /> Wear
                </button>
                <button onClick={() => onDetail(o)} className="btn-secondary text-xs py-2 px-3">View</button>
                <button onClick={() => onEdit(o)} className="btn-ghost text-xs py-2 px-2">Edit</button>
                <button onClick={() => onDelete(o)} className="btn-ghost text-xs py-2 px-2 text-error-500">
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Outfit Form Modal ----------

interface OutfitFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  outfit: Outfit | null;
  items: Item[];
  existingItems: OutfitItem[];
}

function OutfitFormModal({ open, onClose, onSaved, outfit, items, existingItems }: OutfitFormModalProps) {
  const [name, setName] = useState('');
  const [occasion, setOccasion] = useState<Occasion | ''>('');
  const [season, setSeason] = useState<Season[]>([]);
  const [notes, setNotes] = useState('');
  const [slots, setSlots] = useState<Record<Slot, string | null>>({
    top: null, bottom: null, dress: null, outerwear: null,
    shoes: null, accessory: null, undergarment: null, other: null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listen for prefill events from suggestions
  useEffect(() => {
    const handler = (e: Event) => {
      const s = (e as CustomEvent).detail as OutfitSuggestion;
      setName('Outfit ' + new Date().toLocaleDateString());
      setSlots((prev) => {
        const next = { ...prev };
        for (const sl of s.slots) {
          if (sl.item) next[sl.slot] = sl.item.id;
        }
        return next;
      });
      setOccasion('');
    };
    window.addEventListener('prefill-outfit', handler);
    return () => window.removeEventListener('prefill-outfit', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (outfit) {
      setName(outfit.name);
      setOccasion(outfit.occasion ?? '');
      setSeason(outfit.season ?? []);
      setNotes(outfit.notes ?? '');
      const next: Record<Slot, string | null> = {
        top: null, bottom: null, dress: null, outerwear: null,
        shoes: null, accessory: null, undergarment: null, other: null,
      };
      for (const oi of existingItems) next[oi.slot] = oi.item_id;
      setSlots(next);
    } else {
      setName('');
      setOccasion('');
      setSeason([]);
      setNotes('');
      setSlots({ top: null, bottom: null, dress: null, outerwear: null, shoes: null, accessory: null, undergarment: null, other: null });
    }
    setError(null);
  }, [open, outfit, existingItems]);

  const handleSave = async () => {
    if (!name.trim()) { setError('Please enter a name'); return; }
    const slotArr = Object.entries(slots)
      .filter(([, id]) => id)
      .map(([slot, id]) => ({ slot: slot as Slot, item_id: id! }));
    if (slotArr.length === 0) { setError('Select at least one item'); return; }
    setSaving(true);
    setError(null);
    try {
      const input = {
        name: name.trim(),
        occasion: occasion || null,
        season,
        notes: notes.trim() || null,
      };
      if (outfit) {
        await updateOutfit(outfit.id, input, slotArr);
      } else {
        await createOutfit(input, slotArr);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const slotsArr = Object.entries(slots) as [Slot, string | null][];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={outfit ? 'Edit Outfit' : 'Create Outfit'}
      size="lg"
      footer={
        <>
          <button onClick={onClose} disabled={saving} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : outfit ? 'Save' : 'Create'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Outfit Name *</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Monday Office Look" autoFocus />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Occasion</label>
            <select className="input" value={occasion} onChange={(e) => setOccasion(e.target.value as Occasion | '')}>
              <option value="">None</option>
              {OCCASIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Seasons</label>
            <div className="flex flex-wrap gap-1.5">
              {SEASONS.map((s) => {
                const sel = season.includes(s.value);
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSeason(sel ? season.filter((x) => x !== s.value) : [...season, s.value])}
                    className={`chip ${sel ? 'chip-active' : 'chip-idle'}`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div>
          <label className="label">Items</label>
          <p className="text-xs text-ink-400 mb-2">Pick one item per slot. Only categories with items are shown.</p>
          <div className="space-y-2">
            {slotsArr.map(([slot, itemId]) => {
              const slotItems = items.filter((i) => i.category === slot);
              if (slotItems.length === 0) return null;
              return (
                <div key={slot} className="flex items-center gap-3">
                  <span className="w-20 text-xs font-semibold text-ink-600 shrink-0">{SLOT_LABEL[slot]}</span>
                  <select
                    className="input"
                    value={itemId ?? ''}
                    onChange={(e) => setSlots({ ...slots, [slot]: e.target.value || null })}
                  >
                    <option value="">— None —</option>
                    {slotItems.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                  {itemId && (
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-ink-100 shrink-0">
                      {items.find((i) => i.id === itemId)?.image_url && (
                        <img src={items.find((i) => i.id === itemId)!.image_url!} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input min-h-[60px] resize-y" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes about this outfit..." />
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-error-600 bg-error-50 rounded-lg px-3 py-2">{error}</p>}
    </Modal>
  );
}

// ---------- Outfit Detail Modal ----------

function OutfitDetailModal({ outfit, items, wearCount, onClose, onWear, onEdit }: {
  outfit: Outfit; items: OutfitItem[]; wearCount: number; onClose: () => void; onWear: () => void; onEdit: () => void;
}) {
  return (
    <Modal open={true} onClose={onClose} title={outfit.name} size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {items.map((oi) => (
            <div key={oi.id} className="text-center">
              <div className="aspect-square rounded-xl overflow-hidden bg-ink-100 mb-1">
                {oi.item?.image_url ? (
                  <img src={oi.item.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ink-300 text-xs">{SLOT_LABEL[oi.slot]}</div>
                )}
              </div>
              <div className="text-[10px] text-ink-400">{SLOT_LABEL[oi.slot]}</div>
              <div className="text-xs text-ink-700 truncate">{oi.item?.name ?? '—'}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {outfit.occasion && <span className="chip chip-idle">{OCCASION_LABEL[outfit.occasion]}</span>}
          {outfit.season?.map((s) => <span key={s} className="chip chip-idle">{SEASON_LABEL[s]}</span>)}
          <span className="chip chip-idle">{wearCount}× worn</span>
        </div>
        {outfit.notes && <p className="text-sm text-ink-600 bg-ink-50 rounded-xl p-3">{outfit.notes}</p>}
        <div className="flex gap-2">
          <button onClick={onWear} className="btn-primary flex-1"><Calendar size={16} /> Log Wear</button>
          <button onClick={onEdit} className="btn-secondary">Edit</button>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Wear Modal ----------

function WearModal({ outfit, onClose, onLogged }: { outfit: Outfit; onClose: () => void; onLogged: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [occasion, setOccasion] = useState<Occasion | ''>(outfit.occasion ?? '');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLog = async () => {
    setSaving(true);
    setError(null);
    try {
      const outfitId = outfit.id === '__temp__' ? null : outfit.id;
      await logWear({
        outfit_id: outfitId,
        item_id: null,
        worn_date: date,
        occasion: occasion || null,
        notes: notes.trim() || null,
      });
      onLogged();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to log');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Log Outfit Wear"
      size="sm"
      footer={
        <>
          <button onClick={onClose} disabled={saving} className="btn-secondary">Cancel</button>
          <button onClick={handleLog} disabled={saving} className="btn-primary">{saving ? 'Logging...' : 'Log Wear'}</button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Occasion</label>
          <select className="input" value={occasion} onChange={(e) => setOccasion(e.target.value as Occasion | '')}>
            <option value="">None</option>
            {OCCASIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Notes</label>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did it feel?" />
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-error-600 bg-error-50 rounded-lg px-3 py-2">{error}</p>}
    </Modal>
  );
}
