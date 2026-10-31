import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import { Alert, Button, Field, Input, useToast } from '../../ds';
import { currentPosition, DEFAULT_POINT, geocode } from '../../lib/geo';

const pin = L.divIcon({
  className: '',
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  html: '<svg width="30" height="40" viewBox="0 0 30 40"><path d="M15 0C6.7 0 0 6.6 0 14.8 0 26 15 40 15 40s15-14 15-25.2C30 6.6 23.3 0 15 0z" fill="#d92d2d"/><circle cx="15" cy="15" r="6" fill="#fff"/></svg>',
});

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), 16));
  }, [lat, lng, map]);
  return null;
}

export type Point = { lat: number; lng: number };

/**
 * Endereço em texto + ponto no mapa. Buscar preenche o pino; arrastar o pino faz o ajuste fino.
 * Usado no endereço da cliente e no endereço da loja.
 */
export function LocationField({ label = 'Endereço', text, onText, point, onPoint, placeholder }: { label?: string; text: string; onText: (v: string) => void; point: Point | null; onPoint: (p: Point) => void; placeholder?: string }) {
  const toast = useToast();
  const [results, setResults] = useState<{ lat: number; lng: number; label: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    if (text.trim().length < 4) return;
    setSearching(true);
    setError(null);
    try {
      const r = await geocode(`${text}, São Paulo`);
      setResults(r);
      if (r[0]) onPoint(r[0]);
      else setError('Endereço não encontrado. Confira a rua e o número, ou arraste o pino no mapa.');
    } catch {
      setError('A busca de endereço não respondeu. Arraste o pino no mapa.');
      if (!point) onPoint(DEFAULT_POINT);
    } finally {
      setSearching(false);
    }
  };

  const locate = async () => {
    try {
      onPoint(await currentPosition());
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const center = point ?? DEFAULT_POINT;
  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label={label}>
          {(p) => <Input {...p} value={text} onChange={(e) => onText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), search())} placeholder={placeholder ?? 'Rua e número'} autoComplete="street-address" />}
        </Field>
        <div className="flex gap-2">
          <Button variant="outline" className="h-field" loading={searching} onClick={search} icon={MapPin}>
            Buscar
          </Button>
          <Button variant="outline" className="h-field px-3.5" onClick={locate} icon={LocateFixed} aria-label="Usar minha localização" title="Usar minha localização" />
        </div>
      </div>
      {results.length > 1 && (
        <ul className="grid divide-y divide-line rounded-field border border-line text-sm">
          {results.map((r) => (
            <li key={`${r.lat},${r.lng}`}>
              <button type="button" className="w-full px-3 py-2 text-left hover:bg-hover" onClick={() => onPoint(r)}>
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <Alert tone="warn">{error}</Alert>}
      <div className="h-56 overflow-hidden rounded-card border border-line">
        <MapContainer center={[center.lat, center.lng]} zoom={15} className="size-full" scrollWheelZoom={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
          {point && (
            <>
              <Marker position={[point.lat, point.lng]} icon={pin} draggable eventHandlers={{ dragend: (e) => onPoint((e.target as L.Marker).getLatLng()) }} />
              <Recenter {...point} />
            </>
          )}
        </MapContainer>
      </div>
      <p className="text-[13px] text-muted">{point ? 'Arraste o pino até a porta, se precisar.' : 'Busque o endereço ou use sua localização para marcar no mapa.'}</p>
    </div>
  );
}
