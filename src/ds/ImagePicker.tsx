import { Camera, ImagePlus, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { assetUrl } from '../lib/api';
import { cn } from './cn';

/**
 * Escolher e enviar uma foto. Mostra a prévia na hora; `onUpload` envia o arquivo e
 * devolve quando terminar (o componente mostra o carregando).
 */
export function ImagePicker({ value, onUpload, label = 'Enviar foto', shape = 'rect', className }: { value?: string | null; onUpload: (file: File) => Promise<unknown>; label?: string; shape?: 'rect' | 'circle' | 'wide'; className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const src = preview ?? (value ? assetUrl(value) : null);

  const pick = async (file?: File) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      await onUpload(file);
    } catch {
      setPreview(null);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <button
      type="button"
      onClick={() => input.current?.click()}
      className={cn(
        'group relative grid shrink-0 place-items-center overflow-hidden border-2 border-dashed border-line bg-field text-muted transition hover:border-primary hover:text-primary',
        shape === 'circle' ? 'size-24 rounded-full' : shape === 'wide' ? 'aspect-[18/7] w-full rounded-card' : 'aspect-[4/3] w-full rounded-card',
        className,
      )}
      aria-label={label}
    >
      {src ? <img src={src} alt="" className="absolute inset-0 size-full object-cover" /> : <span className="grid justify-items-center gap-1 text-[13px] font-bold"><ImagePlus size={24} />{label}</span>}
      {src && (
        <span className="absolute right-2 bottom-2 grid size-9 place-items-center rounded-full bg-navy/80 text-white opacity-90 group-hover:opacity-100">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
        </span>
      )}
      <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => pick(e.target.files?.[0])} />
    </button>
  );
}
