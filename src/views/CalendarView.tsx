import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Shirt } from 'lucide-react';
import type { Item, Outfit, OutfitItem, WearLog } from '../lib/types';
import { OCCASION_LABEL, CATEGORY_LABEL, type Slot } from '../lib/types';
import { Modal } from '../components/Modal';

const SLOT_LABEL: Record<Slot, string> = {
  top: 'Top', bottom: 'Bottom', dress: 'Dress', outerwear: 'Outerwear',
  shoes: 'Shoes', accessory: 'Accessory', undergarment: 'Undergarment', other: 'Other',
};

interface CalendarViewProps {
  wearLog: WearLog[];
  outfits: Outfit[];
  outfitItems: OutfitItem[];
  items: Item[];
}

export function CalendarView({ wearLog, outfits, outfitItems, items }: CalendarViewProps) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const outfitById = useMemo(() => {
    const map: Record<string, Outfit> = {};
    for (const o of outfits) map[o.id] = o;
    return map;
  }, [outfits]);

  const itemsByOutfit = useMemo(() => {
    const map: Record<string, OutfitItem[]> = {};
    for (const oi of outfitItems) {
      if (!map[oi.outfit_id]) map[oi.outfit_id] = [];
      map[oi.outfit_id].push(oi);
    }
    return map;
  }, [outfitItems]);

  const itemById = useMemo(() => {
    const map: Record<string, Item> = {};
    for (const i of items) map[i.id] = i;
    return map;
  }, [items]);

  const wearByDate = useMemo(() => {
    const map: Record<string, WearLog[]> = {};
    for (const log of wearLog) {
      if (!map[log.worn_date]) map[log.worn_date] = [];
      map[log.worn_date].push(log);
    }
    return map;
  }, [wearLog]);

  const days = useMemo(() => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstDay = new Date(year, m, 1);
    const lastDay = new Date(year, m + 1, 0);
    const startWeekday = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) {
      cells.push(`${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    return cells;
  }, [month]);

  const today = new Date().toISOString().slice(0, 10);
  const monthLabel = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const selectedLogs = selectedDate ? wearByDate[selectedDate] ?? [] : [];

  return (
    <div className="animate-fade-in">
      <div className="card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold text-ink-900">{monthLabel}</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              className="p-2 rounded-lg text-ink-500 hover:bg-ink-100 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              className="p-2 rounded-lg text-ink-500 hover:bg-ink-100 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
            <button
              onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); }}
              className="ml-1 btn-secondary text-xs py-2"
            >
              Today
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-center text-[10px] sm:text-xs font-semibold text-ink-400 uppercase py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days.map((date, i) => {
            if (!date) return <div key={i} />;
            const logs = wearByDate[date] ?? [];
            const isToday = date === today;
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(date)}
                className={`relative aspect-square rounded-lg sm:rounded-xl border text-left p-1.5 transition-all hover:shadow-soft ${
                  isToday ? 'border-brand-400 bg-brand-50' : 'border-ink-100 hover:border-ink-200'
                } ${selectedDate === date ? 'ring-2 ring-brand-500' : ''}`}
              >
                <div className={`text-xs font-medium ${isToday ? 'text-brand-700' : 'text-ink-600'}`}>
                  {Number(date.slice(8))}
                </div>
                {logs.length > 0 && (
                  <div className="absolute bottom-1 left-1 right-1 flex gap-0.5 flex-wrap">
                    {logs.slice(0, 3).map((log) => {
                      const outfit = log.outfit_id ? outfitById[log.outfit_id] : null;
                      const ois = outfit ? itemsByOutfit[outfit.id] ?? [] : [];
                      const firstItem = ois[0]?.item ?? (log.item_id ? itemById[log.item_id] : null);
                      return (
                        <div
                          key={log.id}
                          className="w-3 h-3 sm:w-4 sm:h-4 rounded-full overflow-hidden bg-ink-200 border border-white"
                        >
                          {firstItem?.image_url && (
                            <img src={firstItem.image_url} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                      );
                    })}
                    {logs.length > 3 && (
                      <span className="text-[8px] text-ink-400 font-bold">+{logs.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent wear log */}
      <div className="mt-6">
        <h3 className="font-display text-lg font-semibold text-ink-900 mb-3">Recent Wear History</h3>
        <div className="space-y-2">
          {wearLog.slice(0, 10).map((log) => {
            const outfit = log.outfit_id ? outfitById[log.outfit_id] : null;
            const ois = outfit ? itemsByOutfit[outfit.id] ?? [] : [];
            const loneItem = log.item_id ? itemById[log.item_id] : null;
            return (
              <div key={log.id} className="card p-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-ink-100 shrink-0 flex items-center justify-center">
                  {ois[0]?.item?.image_url ? (
                    <img src={ois[0].item.image_url} alt="" className="w-full h-full object-cover" />
                  ) : loneItem?.image_url ? (
                    <img src={loneItem.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Shirt size={20} className="text-ink-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-ink-900 truncate">
                    {outfit?.name ?? loneItem?.name ?? 'Unknown'}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-ink-400">
                    <CalendarDays size={12} />
                    {new Date(log.worn_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    {log.occasion && <span>· {OCCASION_LABEL[log.occasion]}</span>}
                  </div>
                </div>
              </div>
            );
          })}
          {wearLog.length === 0 && (
            <div className="card p-8 text-center text-ink-400 text-sm">
              No wear history yet. Log an outfit to start tracking.
            </div>
          )}
        </div>
      </div>

      {/* Day detail modal */}
      <Modal
        open={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        title={selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : ''}
        size="md"
      >
        {selectedLogs.length === 0 ? (
          <div className="text-center py-8 text-ink-400">
            <CalendarDays size={32} className="mx-auto mb-2 text-ink-300" />
            <p className="text-sm">Nothing worn on this day.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedLogs.map((log) => {
              const outfit = log.outfit_id ? outfitById[log.outfit_id] : null;
              const ois = outfit ? itemsByOutfit[outfit.id] ?? [] : [];
              const loneItem = log.item_id ? itemById[log.item_id] : null;
              return (
                <div key={log.id} className="card p-3">
                  <div className="font-medium text-sm text-ink-900 mb-2">
                    {outfit?.name ?? loneItem?.name ?? 'Standalone item'}
                  </div>
                  {log.occasion && <span className="chip chip-idle mb-2">{OCCASION_LABEL[log.occasion]}</span>}
                  {ois.length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                      {ois.map((oi) => (
                        <div key={oi.id} className="shrink-0 w-16 text-center">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-ink-100 mb-1">
                            {oi.item?.image_url && <img src={oi.item.image_url} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <div className="text-[10px] text-ink-400">{SLOT_LABEL[oi.slot]}</div>
                        </div>
                      ))}
                    </div>
                  ) : loneItem ? (
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-ink-100">
                        {loneItem.image_url && <img src={loneItem.image_url} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <span className="text-sm text-ink-600">{CATEGORY_LABEL[loneItem.category]}</span>
                    </div>
                  ) : null}
                  {log.notes && <p className="text-xs text-ink-500 mt-2 bg-ink-50 rounded-lg p-2">{log.notes}</p>}
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}
