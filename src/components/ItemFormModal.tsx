import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { ImageUpload } from './ImageUpload';
import { MultiSelect } from './MultiSelect';
import { createItem, updateItem, deleteItem, deleteItemImage, type ItemInput } from '../lib/db';
import {
  CATEGORIES, OCCASIONS, SEASONS, CONDITIONS,
  type Item, type Category, type Occasion, type Season, type Condition,
} from '../lib/types';

interface ItemFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  item?: Item | null;
}

const COLOR_PRESETS = [
  { name: 'Black', hex: '#1a1a1a' },
  { name: 'White', hex: '#f8f8f8' },
  { name: 'Navy', hex: '#1e3a5f' },
  { name: 'Gray', hex: '#808080' },
  { name: 'Beige', hex: '#d4c5a9' },
  { name: 'Brown', hex: '#6b4423' },
  { name: 'Olive', hex: '#6b6b3a' },
  { name: 'Burgundy', hex: '#6b1f2e' },
  { name: 'Red', hex: '#c0392b' },
  { name: 'Pink', hex: '#e8a0b8' },
  { name: 'Orange', hex: '#e67e22' },
  { name: 'Yellow', hex: '#f1c40f' },
  { name: 'Green', hex: '#27ae60' },
  { name: 'Teal', hex: '#16a085' },
  { name: 'Blue', hex: '#2980b9' },
  { name: 'Purple', hex: '#8e44ad' },
];

export function ItemFormModal({ open, onClose, onSaved, item }: ItemFormModalProps) {
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>('top');
  const [subType, setSubType] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const [colorHex, setColorHex] = useState<string | null>(null);
  const [brand, setBrand] = useState('');
  const [season, setSeason] = useState<Season[]>([]);
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [condition, setCondition] = useState<Condition | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (item) {
      setName(item.name);
      setImageUrl(item.image_url);
      setCategory(item.category);
      setSubType(item.sub_type ?? '');
      setColor(item.color);
      setColorHex(item.color_hex);
      setBrand(item.brand ?? '');
      setSeason(item.season ?? []);
      setOccasions(item.occasions ?? []);
      setCondition(item.condition);
      setNotes(item.notes ?? '');
    } else {
      setName('');
      setImageUrl(null);
      setCategory('top');
      setSubType('');
      setColor(null);
      setColorHex(null);
      setBrand('');
      setSeason([]);
      setOccasions([]);
      setCondition(null);
      setNotes('');
    }
    setError(null);
  }, [open, item]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input: ItemInput = {
        name: name.trim(),
        image_url: imageUrl,
        category,
        sub_type: subType.trim() || null,
        color,
        color_hex: colorHex,
        brand: brand.trim() || null,
        season,
        occasions,
        condition,
        notes: notes.trim() || null,
      };
      if (item) {
        if (item.image_url && item.image_url !== imageUrl) {
          await deleteItemImage(item.image_url);
        }
        await updateItem(item.id, input);
      } else {
        await createItem(input);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    setSaving(true);
    try {
      if (item.image_url) await deleteItemImage(item.image_url);
      await deleteItem(item.id);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? 'Edit Item' : 'Add Clothing Item'}
      size="lg"
      footer={
        <>
          {item && (
            <button onClick={handleDelete} disabled={saving} className="btn-danger mr-auto">
              Delete
            </button>
          )}
          <button onClick={onClose} disabled={saving} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : item ? 'Save Changes' : 'Add Item'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-5">
        <ImageUpload value={imageUrl} onChange={setImageUrl} />
        <div className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Blue Oxford Shirt"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <select
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Sub-type</label>
              <input
                className="input"
                value={subType}
                onChange={(e) => setSubType(e.target.value)}
                placeholder="e.g. t-shirt, jeans"
              />
            </div>
          </div>
          <div>
            <label className="label">Brand</label>
            <input
              className="input"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Uniqlo"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <label className="label">Color</label>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((c) => {
              const selected = color === c.name;
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => {
                    if (selected) {
                      setColor(null);
                      setColorHex(null);
                    } else {
                      setColor(c.name);
                      setColorHex(c.hex);
                    }
                  }}
                  className={`flex items-center gap-1.5 rounded-full pl-1.5 pr-3 py-1 text-xs font-medium border transition-all ${
                    selected ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600 hover:border-ink-300'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-ink-200"
                    style={{ backgroundColor: c.hex }}
                  />
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Seasons</label>
            <MultiSelect
              options={SEASONS}
              value={season}
              onChange={(v) => setSeason(v as Season[])}
              placeholder="Any season"
            />
          </div>
          <div>
            <label className="label">Occasions</label>
            <MultiSelect
              options={OCCASIONS}
              value={occasions}
              onChange={(v) => setOccasions(v as Occasion[])}
              placeholder="Any occasion"
            />
          </div>
        </div>

        <div>
          <label className="label">Condition</label>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map((c) => {
              const selected = condition === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCondition(selected ? null : c.value)}
                  className={`chip ${selected ? 'chip-active' : 'chip-idle'}`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea
            className="input min-h-[80px] resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any extra details..."
          />
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-error-600 bg-error-50 rounded-lg px-3 py-2">{error}</p>}
    </Modal>
  );
}
