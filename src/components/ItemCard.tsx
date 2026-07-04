import { MoreVertical, Droplet, Calendar, Sparkles } from 'lucide-react';
import type { Item } from '../lib/types';
import { CATEGORY_LABEL, CONDITION_LABEL } from '../lib/types';

interface ItemCardProps {
  item: Item;
  onClick?: () => void;
  onMenu?: (e: React.MouseEvent) => void;
  compact?: boolean;
}

export function ItemCard({ item, onClick, onMenu, compact = false }: ItemCardProps) {
  const wornDays = item.last_worn_date
    ? Math.floor((Date.now() - new Date(item.last_worn_date).getTime()) / 86400000)
    : null;
  const washedDays = item.last_washed_date
    ? Math.floor((Date.now() - new Date(item.last_washed_date).getTime()) / 86400000)
    : null;
  const needsWash = item.wear_count > 0 && (washedDays === null || washedDays > 14);

  return (
    <div
      onClick={onClick}
      className="card group cursor-pointer hover:shadow-lift transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
    >
      <div className={`relative ${compact ? 'aspect-square' : 'aspect-[4/5]'} bg-ink-100`}>
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-300">
            <span className="text-3xl font-display">?</span>
          </div>
        )}
        {needsWash && (
          <div className="absolute top-2 left-2 bg-accent-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-soft">
            <Droplet size={10} /> Wash
          </div>
        )}
        {item.wear_count === 0 && (
          <div className="absolute top-2 right-2 bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-soft">
            <Sparkles size={10} /> New
          </div>
        )}
        {onMenu && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMenu(e);
            }}
            className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-white/90 text-ink-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
          >
            <MoreVertical size={16} />
          </button>
        )}
        {item.color_hex && (
          <div
            className="absolute bottom-2 left-2 w-5 h-5 rounded-full border-2 border-white shadow-soft"
            style={{ backgroundColor: item.color_hex }}
          />
        )}
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm text-ink-900 truncate">{item.name}</h3>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className="text-[11px] text-ink-500">{CATEGORY_LABEL[item.category]}</span>
          {item.sub_type && <span className="text-[11px] text-ink-400">· {item.sub_type}</span>}
        </div>
        {!compact && (
          <div className="flex items-center gap-3 mt-2 text-[11px] text-ink-400">
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {wornDays === null ? 'Never worn' : wornDays === 0 ? 'Today' : `${wornDays}d ago`}
            </span>
            <span>· {item.wear_count} wear{item.wear_count !== 1 ? 's' : ''}</span>
          </div>
        )}
        {!compact && item.condition && (
          <div className="mt-1.5">
            <span className="text-[10px] text-ink-400">{CONDITION_LABEL[item.condition]}</span>
          </div>
        )}
      </div>
    </div>
  );
}
