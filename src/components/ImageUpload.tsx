import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { uploadItemImage } from '../lib/db';

interface ImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  className?: string;
}

export function ImageUpload({ value, onChange, className = '' }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const url = await uploadItemImage(file);
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      {value ? (
        <div className="relative group rounded-2xl overflow-hidden bg-ink-100 aspect-square">
          <img src={value} alt="Item" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-ink-950/0 group-hover:bg-ink-950/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="p-2 rounded-lg bg-white/90 text-ink-700 hover:bg-white transition-colors"
              disabled={uploading}
            >
              <Upload size={18} />
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="p-2 rounded-lg bg-white/90 text-error-600 hover:bg-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-ink-950/50 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full aspect-square rounded-2xl border-2 border-dashed border-ink-200 hover:border-brand-400 hover:bg-brand-50/50 transition-colors flex flex-col items-center justify-center gap-2 text-ink-400 hover:text-brand-600"
        >
          {uploading ? (
            <>
              <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
              <span className="text-sm font-medium">Uploading...</span>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-ink-100 flex items-center justify-center">
                <ImageIcon size={24} />
              </div>
              <span className="text-sm font-medium">Upload photo</span>
              <span className="text-xs text-ink-400">PNG, JPG up to 5MB</span>
            </>
          )}
        </button>
      )}
      {error && <p className="mt-1.5 text-xs text-error-600">{error}</p>}
    </div>
  );
}
