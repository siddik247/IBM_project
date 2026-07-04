import { useMemo, useState } from 'react';
import { Droplet, Droplets, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Item, WashLog } from '../lib/types';
import { WASH_METHODS, type WashMethod } from '../lib/types';
import { Modal } from '../components/Modal';
import { logWash, deleteWashLog } from '../lib/db';

interface WashViewProps {
  items: Item[];
  washLog: WashLog[];
  washReminderDays: number;
  onDataChanged: () => void;
}

export function WashView({ items, washLog, washReminderDays, onDataChanged }: WashViewProps) {
  const [washModalItem, setWashModalItem] = useState<Item | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const itemById = useMemo(() => {
    const map: Record<string, Item> = {};
    for (const i of items) map[i.id] = i;
    return map;
  }, [items]);

  const { needsWash, clean, neverWorn } = useMemo(() => {
    const needs: Item[] = [];
    const clean: Item[] = [];
    const never: Item[] = [];
    for (const i of items) {
      if (i.wear_count === 0) { never.push(i); continue; }
      if (!i.last_washed_date) { needs.push(i); continue; }
      const days = Math.floor((Date.now() - new Date(i.last_washed_date).getTime()) / 86400000);
      if (days > washReminderDays) needs.push(i);
      else clean.push(i);
    }
    return { needsWash: needs, clean, neverWorn: never };
  }, [items, washReminderDays]);

  return (
    <div className="animate-fade-in">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-ink-500 text-xs font-semibold uppercase tracking-wide mb-1">
            <AlertTriangle size={14} className="text-accent-500" /> Need Wash
          </div>
          <div className="text-2xl font-display font-semibold text-ink-900">{needsWash.length}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-ink-500 text-xs font-semibold uppercase tracking-wide mb-1">
            <CheckCircle2 size={14} className="text-success-500" /> Clean
          </div>
          <div className="text-2xl font-display font-semibold text-ink-900">{clean.length}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-ink-500 text-xs font-semibold uppercase tracking-wide mb-1">
            <Droplet size={14} className="text-brand-500" /> Never Worn
          </div>
          <div className="text-2xl font-display font-semibold text-ink-900">{neverWorn.length}</div>
        </div>
      </div>

      {/* Needs wash */}
      <div className="mb-6">
        <h3 className="font-display text-lg font-semibold text-ink-900 mb-3 flex items-center gap-2">
          <Droplets size={18} className="text-accent-500" /> Needs Washing
        </h3>
        {needsWash.length === 0 ? (
          <div className="card p-8 text-center">
            <CheckCircle2 size={32} className="mx-auto mb-2 text-success-500" />
            <p className="text-sm text-ink-500">Everything is clean! No items need washing right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {needsWash.map((item) => {
              const days = item.last_washed_date
                ? Math.floor((Date.now() - new Date(item.last_washed_date).getTime()) / 86400000)
                : null;
              return (
                <div key={item.id} className="card p-3 flex items-center gap-3 hover:shadow-soft transition-all">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-ink-100 shrink-0">
                    {item.image_url && <img src={item.image_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-ink-900 truncate">{item.name}</div>
                    <div className="text-xs text-ink-400">
                      {days === null ? 'Never washed' : `${days} days since wash`}
                      {' · '}{item.wear_count} wears
                    </div>
                  </div>
                  <button
                    onClick={() => setWashModalItem(item)}
                    className="btn-primary text-xs py-2 px-3 shrink-0"
                  >
                    <Droplet size={14} /> Wash
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Clean items */}
      <div className="mb-6">
        <h3 className="font-display text-lg font-semibold text-ink-900 mb-3 flex items-center gap-2">
          <CheckCircle2 size={18} className="text-success-500" /> Recently Cleaned
        </h3>
        {clean.length === 0 ? (
          <div className="card p-6 text-center text-sm text-ink-400">No recently cleaned items.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {clean.slice(0, 8).map((item) => {
              const days = item.last_washed_date
                ? Math.floor((Date.now() - new Date(item.last_washed_date).getTime()) / 86400000)
                : 0;
              return (
                <div key={item.id} className="card p-3 flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-ink-100 shrink-0">
                    {item.image_url && <img src={item.image_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-ink-700 truncate">{item.name}</div>
                    <div className="text-[10px] text-ink-400">{days}d ago</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Wash history button */}
      <div>
        <button onClick={() => setHistoryOpen(true)} className="btn-secondary">
          <Calendar size={16} /> View Wash History ({washLog.length})
        </button>
      </div>

      {/* Wash modal */}
      {washModalItem && (
        <WashModal
          item={washModalItem}
          onClose={() => setWashModalItem(null)}
          onLogged={onDataChanged}
        />
      )}

      {/* History modal */}
      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="Wash History" size="md">
        {washLog.length === 0 ? (
          <div className="text-center py-8 text-ink-400">
            <Droplet size={32} className="mx-auto mb-2 text-ink-300" />
            <p className="text-sm">No wash records yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {washLog.map((log) => {
              const item = itemById[log.item_id];
              return (
                <div key={log.id} className="card p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-ink-100 shrink-0">
                    {item?.image_url && <img src={item.image_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink-900 truncate">{item?.name ?? 'Unknown item'}</div>
                    <div className="text-xs text-ink-400">
                      {new Date(log.washed_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {log.method && ` · ${WASH_METHODS.find((m) => m.value === log.method)?.label ?? log.method}`}
                    </div>
                    {log.notes && <div className="text-xs text-ink-500 mt-0.5">{log.notes}</div>}
                  </div>
                  <button
                    onClick={async () => { await deleteWashLog(log.id); onDataChanged(); }}
                    className="btn-ghost text-xs text-error-500 px-2"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}

function WashModal({ item, onClose, onLogged }: { item: Item; onClose: () => void; onLogged: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<WashMethod | ''>('machine');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLog = async () => {
    setSaving(true);
    setError(null);
    try {
      await logWash({
        item_id: item.id,
        washed_date: date,
        method: method || null,
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
      title={`Wash: ${item.name}`}
      size="sm"
      footer={
        <>
          <button onClick={onClose} disabled={saving} className="btn-secondary">Cancel</button>
          <button onClick={handleLog} disabled={saving} className="btn-primary">{saving ? 'Logging...' : 'Log Wash'}</button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Method</label>
          <select className="input" value={method} onChange={(e) => setMethod(e.target.value as WashMethod | '')}>
            <option value="">None</option>
            {WASH_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Notes</label>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any care notes..." />
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-error-600 bg-error-50 rounded-lg px-3 py-2">{error}</p>}
    </Modal>
  );
}
