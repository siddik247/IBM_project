import { useState } from 'react';
import { Calendar, Droplet, Edit2, Trash2, Shirt } from 'lucide-react';
import type { Item, WearLog, WashLog } from '../lib/types';
import {
  CATEGORY_LABEL, CONDITION_LABEL, OCCASION_LABEL, SEASON_LABEL,
} from '../lib/types';
import { Modal } from './Modal';
import { ItemFormModal } from './ItemFormModal';
import { logWear, logWash, deleteItem } from '../lib/db';

interface ItemDetailModalProps {
  item: Item;
  wearLogs: WearLog[];
  washLogs: WashLog[];
  onClose: () => void;
  onDataChanged: () => void;
}

export function ItemDetailModal({ item, wearLogs, washLogs, onClose, onDataChanged }: ItemDetailModalProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [wearOpen, setWearOpen] = useState(false);
  const [washOpen, setWashOpen] = useState(false);

  const itemWearLogs = wearLogs.filter((l) => l.item_id === item.id).sort((a, b) => b.worn_date.localeCompare(a.worn_date));
  const itemWashLogs = washLogs.filter((l) => l.item_id === item.id).sort((a, b) => b.washed_date.localeCompare(a.washed_date));

  return (
    <>
      <Modal open={true} onClose={onClose} title={item.name} size="md">
        <div className="space-y-4">
          {item.image_url && (
            <div className="rounded-2xl overflow-hidden bg-ink-100 aspect-[4/3]">
              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            <span className="chip chip-idle">{CATEGORY_LABEL[item.category]}</span>
            {item.sub_type && <span className="chip chip-idle">{item.sub_type}</span>}
            {item.color && (
              <span className="chip chip-idle flex items-center gap-1.5">
                {item.color_hex && <span className="w-3 h-3 rounded-full border border-ink-200" style={{ backgroundColor: item.color_hex }} />}
                {item.color}
              </span>
            )}
            {item.brand && <span className="chip chip-idle">{item.brand}</span>}
            {item.condition && <span className="chip chip-idle">{CONDITION_LABEL[item.condition]}</span>}
          </div>

          {/* Occasions & seasons */}
          {(item.occasions?.length > 0 || item.season?.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {item.occasions?.length > 0 && (
                <div>
                  <div className="label">Occasions</div>
                  <div className="flex flex-wrap gap-1">
                    {item.occasions.map((o) => <span key={o} className="chip chip-idle text-[10px]">{OCCASION_LABEL[o]}</span>)}
                  </div>
                </div>
              )}
              {item.season?.length > 0 && (
                <div>
                  <div className="label">Seasons</div>
                  <div className="flex flex-wrap gap-1">
                    {item.season.map((s) => <span key={s} className="chip chip-idle text-[10px]">{SEASON_LABEL[s]}</span>)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-ink-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-display font-semibold text-ink-900">{item.wear_count}</div>
              <div className="text-[10px] text-ink-400 uppercase tracking-wide">Wears</div>
            </div>
            <div className="bg-ink-50 rounded-xl p-3 text-center">
              <div className="text-sm font-medium text-ink-700">
                {item.last_worn_date ? new Date(item.last_worn_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
              </div>
              <div className="text-[10px] text-ink-400 uppercase tracking-wide">Last Worn</div>
            </div>
            <div className="bg-ink-50 rounded-xl p-3 text-center">
              <div className="text-sm font-medium text-ink-700">
                {item.last_washed_date ? new Date(item.last_washed_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
              </div>
              <div className="text-[10px] text-ink-400 uppercase tracking-wide">Last Wash</div>
            </div>
          </div>

          {item.notes && (
            <div className="bg-ink-50 rounded-xl p-3">
              <div className="label">Notes</div>
              <p className="text-sm text-ink-600">{item.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={() => setWearOpen(true)} className="btn-secondary flex-1 text-xs">
              <Calendar size={14} /> Log Wear
            </button>
            <button onClick={() => setWashOpen(true)} className="btn-secondary flex-1 text-xs">
              <Droplet size={14} /> Log Wash
            </button>
            <button onClick={() => setEditOpen(true)} className="btn-secondary text-xs px-3">
              <Edit2 size={14} />
            </button>
            <button
              onClick={async () => {
                if (confirm(`Delete "${item.name}"?`)) { await deleteItem(item.id); onDataChanged(); onClose(); }
              }}
              className="btn-ghost text-xs text-error-500 px-2"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* History */}
          {(itemWearLogs.length > 0 || itemWashLogs.length > 0) && (
            <div className="space-y-3 pt-2">
              {itemWearLogs.length > 0 && (
                <div>
                  <div className="label">Wear History</div>
                  <div className="space-y-1">
                    {itemWearLogs.slice(0, 5).map((l) => (
                      <div key={l.id} className="flex items-center gap-2 text-xs text-ink-500">
                        <Shirt size={12} className="text-ink-400" />
                        {new Date(l.worn_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {l.occasion && <span className="text-ink-400">· {OCCASION_LABEL[l.occasion]}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {itemWashLogs.length > 0 && (
                <div>
                  <div className="label">Wash History</div>
                  <div className="space-y-1">
                    {itemWashLogs.slice(0, 5).map((l) => (
                      <div key={l.id} className="flex items-center gap-2 text-xs text-ink-500">
                        <Droplet size={12} className="text-ink-400" />
                        {new Date(l.washed_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {l.method && <span className="text-ink-400">· {l.method}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {editOpen && (
        <ItemFormModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={onDataChanged}
          item={item}
        />
      )}

      {wearOpen && (
        <QuickLogModal
          title={`Log Wear: ${item.name}`}
          dateLabel="Worn Date"
          onLog={async (date, notes) => { await logWear({ item_id: item.id, worn_date: date, notes: notes || null }); }}
          onClose={() => setWearOpen(false)}
          onLogged={onDataChanged}
        />
      )}

      {washOpen && (
        <QuickLogModal
          title={`Log Wash: ${item.name}`}
          dateLabel="Washed Date"
          onLog={async (date, notes) => { await logWash({ item_id: item.id, washed_date: date, notes: notes || null }); }}
          onClose={() => setWashOpen(false)}
          onLogged={onDataChanged}
        />
      )}
    </>
  );
}

function QuickLogModal({ title, dateLabel, onLog, onClose, onLogged }: {
  title: string; dateLabel: string;
  onLog: (date: string, notes: string) => Promise<void>;
  onClose: () => void; onLogged: () => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    setSaving(true);
    setError(null);
    try {
      await onLog(date, notes.trim());
      onLogged();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button onClick={onClose} disabled={saving} className="btn-secondary">Cancel</button>
          <button onClick={handle} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Log'}</button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">{dateLabel}</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Notes</label>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional..." />
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-error-600 bg-error-50 rounded-lg px-3 py-2">{error}</p>}
    </Modal>
  );
}
