import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import type { Settings } from '../lib/types';
import { updateSettings } from '../lib/db';
import { Modal } from '../components/Modal';

interface SettingsViewProps {
  settings: Settings | null;
  onSettingsChanged: () => void;
}

export function SettingsView({ settings, onSettingsChanged }: SettingsViewProps) {
  const [washDays, setWashDays] = useState(14);
  const [repeatDays, setRepeatDays] = useState(7);
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setWashDays(settings.wash_reminder_days);
      setRepeatDays(settings.repeat_window_days);
      setLocation(settings.default_location ?? '');
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateSettings({
        wash_reminder_days: washDays,
        repeat_window_days: repeatDays,
        default_location: location.trim() || null,
      });
      onSettingsChanged();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-6">
          <SettingsIcon size={20} className="text-ink-500" />
          <h2 className="font-display text-xl font-semibold text-ink-900">Preferences</h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className="label">Wash Reminder (days)</label>
            <p className="text-xs text-ink-400 mb-2">Items not washed in this many days will be flagged as needing wash.</p>
            <input
              type="number"
              min={1}
              max={90}
              className="input"
              value={washDays}
              onChange={(e) => setWashDays(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="label">Outfit Repeat Window (days)</label>
            <p className="text-xs text-ink-400 mb-2">Outfits worn within this window are flagged as "recently worn" to encourage variety.</p>
            <input
              type="number"
              min={1}
              max={60}
              className="input"
              value={repeatDays}
              onChange={(e) => setRepeatDays(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="label">Default Location (optional)</label>
            <p className="text-xs text-ink-400 mb-2">Used for weather-based outfit suggestions.</p>
            <input
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. San Francisco, CA"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
            </button>
            {saved && <span className="text-sm text-success-600 font-medium animate-fade-in">Saved!</span>}
          </div>
        </div>
      </div>

      <div className="card p-6 mt-4">
        <h3 className="font-display text-lg font-semibold text-ink-900 mb-3">About</h3>
        <p className="text-sm text-ink-600 leading-relaxed">
          Wardrobe is a personal clothing management app that helps you catalog your wardrobe,
          plan outfits, track wear history, and manage laundry. It suggests outfit combinations
          based on occasion, season, and weather — while encouraging variety by flagging recently
          worn outfits and items that need washing.
        </p>
      </div>

      {error && (
        <Modal open={!!error} onClose={() => setError(null)} title="Error" size="sm">
          <p className="text-sm text-error-600">{error}</p>
        </Modal>
      )}
    </div>
  );
}
