import { useEffect, useState, useCallback } from 'react';
import { Shirt, Sparkles, Calendar, Droplet, Settings as SettingsIcon, Menu, X } from 'lucide-react';
import type { Item, Outfit, OutfitItem, WearLog, WashLog, Settings } from './lib/types';
import {
  fetchItems, fetchOutfits, fetchAllOutfitItems, fetchWearLog, fetchWashLog, fetchSettings,
} from './lib/db';
import { WardrobeView } from './views/WardrobeView';
import { OutfitsView } from './views/OutfitsView';
import { CalendarView } from './views/CalendarView';
import { WashView } from './views/WashView';
import { SettingsView } from './views/SettingsView';
import { ItemDetailModal } from './components/ItemDetailModal';

type Tab = 'wardrobe' | 'outfits' | 'calendar' | 'wash' | 'settings';

const NAV: { id: Tab; label: string; icon: typeof Shirt }[] = [
  { id: 'wardrobe', label: 'Wardrobe', icon: Shirt },
  { id: 'outfits', label: 'Outfits', icon: Sparkles },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'wash', label: 'Laundry', icon: Droplet },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('wardrobe');
  const [items, setItems] = useState<Item[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [outfitItems, setOutfitItems] = useState<OutfitItem[]>([]);
  const [wearLog, setWearLog] = useState<WearLog[]>([]);
  const [washLog, setWashLog] = useState<WashLog[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [it, ou, ois, wl, wash, set] = await Promise.all([
        fetchItems(), fetchOutfits(), fetchAllOutfitItems(),
        fetchWearLog(), fetchWashLog(), fetchSettings(),
      ]);
      setItems(it);
      setOutfits(ou);
      setOutfitItems(ois);
      setWearLog(wl);
      setWashLog(wash);
      setSettings(set);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const selectedItemWearLogs = wearLog.filter((l) => l.item_id === selectedItem?.id);
  const selectedItemWashLogs = washLog.filter((l) => l.item_id === selectedItem?.id);

  const repeatWindowDays = settings?.repeat_window_days ?? 7;
  const washReminderDays = settings?.wash_reminder_days ?? 14;

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-ink-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-soft">
              <Shirt size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold text-ink-900 leading-none">Wardrobe</h1>
              <p className="text-[10px] text-ink-400 leading-none mt-0.5">Your closet, organized</p>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((n) => {
              const Icon = n.icon;
              const active = tab === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => setTab(n.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    active ? 'bg-brand-600 text-white shadow-soft' : 'text-ink-600 hover:bg-ink-100'
                  }`}
                >
                  <Icon size={16} />
                  {n.label}
                </button>
              );
            })}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="md:hidden p-2 rounded-lg text-ink-600 hover:bg-ink-100"
          >
            {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileNavOpen && (
          <nav className="md:hidden border-t border-ink-100 px-4 py-2 space-y-1 animate-fade-in">
            {NAV.map((n) => {
              const Icon = n.icon;
              const active = tab === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => { setTab(n.id); setMobileNavOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-100'
                  }`}
                >
                  <Icon size={18} />
                  {n.label}
                </button>
              );
            })}
          </nav>
        )}
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 md:pb-8">
        {error && (
          <div className="card p-4 mb-6 bg-error-50 border-error-100">
            <p className="text-sm text-error-600">{error}</p>
            <button onClick={loadAll} className="btn-secondary mt-2 text-xs">Retry</button>
          </div>
        )}

        {loading ? (
          <LoadingState />
        ) : (
          <>
            {tab === 'wardrobe' && (
              <WardrobeView
                items={items}
                onItemsChanged={loadAll}
                onItemSelected={setSelectedItem}
              />
            )}
            {tab === 'outfits' && (
              <OutfitsView
                items={items}
                outfits={outfits}
                outfitItems={outfitItems}
                wearLog={wearLog}
                repeatWindowDays={repeatWindowDays}
                onDataChanged={loadAll}
              />
            )}
            {tab === 'calendar' && (
              <CalendarView
                wearLog={wearLog}
                outfits={outfits}
                outfitItems={outfitItems}
                items={items}
              />
            )}
            {tab === 'wash' && (
              <WashView
                items={items}
                washLog={washLog}
                washReminderDays={washReminderDays}
                onDataChanged={loadAll}
              />
            )}
            {tab === 'settings' && (
              <SettingsView settings={settings} onSettingsChanged={loadAll} />
            )}
          </>
        )}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-lg border-t border-ink-100 px-2 py-1.5 flex justify-around">
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = tab === n.id;
          return (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                active ? 'text-brand-600' : 'text-ink-400'
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{n.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Item detail modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          wearLogs={selectedItemWearLogs}
          washLogs={selectedItemWashLogs}
          onClose={() => setSelectedItem(null)}
          onDataChanged={loadAll}
        />
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card p-4 h-20 animate-pulse bg-ink-100" />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="aspect-[4/5] bg-ink-100 animate-pulse" />
            <div className="p-3 space-y-2">
              <div className="h-3 bg-ink-100 rounded animate-pulse" />
              <div className="h-2 w-2/3 bg-ink-100 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
