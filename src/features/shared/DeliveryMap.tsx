import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { cn } from '../../ds';

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  kind: 'store' | 'home' | 'courier' | 'courier-busy';
  label?: string;
}

const PIN: Record<MapPoint['kind'], { bg: string; svg: string; size: number }> = {
  store: { bg: '#181c2e', size: 34, svg: '<path d="M4 10h16l-1-5H5zM5 10v9h14v-9M9 19v-5h6v5"/>' },
  home: { bg: '#d92d2d', size: 34, svg: '<path d="M4 11 12 4l8 7v9H4z"/><path d="M10 20v-5h4v5"/>' },
  courier: { bg: '#ff7622', size: 38, svg: '<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17h4l3-7h4l1 7M13 10l-2-3H8"/>' },
  'courier-busy': { bg: '#2459c9', size: 34, svg: '<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17h4l3-7h4l1 7M13 10l-2-3H8"/>' },
};

const icons = new Map<string, L.DivIcon>();
function icon(kind: MapPoint['kind']) {
  if (!icons.has(kind)) {
    const p = PIN[kind];
    icons.set(
      kind,
      L.divIcon({
        className: '',
        iconSize: [p.size, p.size],
        iconAnchor: [p.size / 2, p.size / 2],
        html: `<span style="display:grid;place-items:center;width:${p.size}px;height:${p.size}px;border-radius:50%;background:${p.bg};color:#fff;box-shadow:0 4px 12px rgb(0 0 0/30%);border:3px solid #fff"><svg viewBox="0 0 24 24" width="${p.size * 0.5}" height="${p.size * 0.5}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${p.svg}</svg></span>`,
      }),
    );
  }
  return icons.get(kind)!;
}

/**
 * Posição que desliza até o alvo em ~1 s (o entregador anda no mapa em vez de pular
 * a cada atualização de GPS).
 */
function useGlide(target: { lat: number; lng: number }, ms = 1000) {
  const [pos, setPos] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const e = t * (2 - t);
      const p = { lat: a.lat + (target.lat - a.lat) * e, lng: a.lng + (target.lng - a.lng) * e };
      from.current = p;
      setPos(p);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target.lat, target.lng, ms]);
  return pos;
}

function PointMarker({ p }: { p: MapPoint }) {
  const moving = p.kind === 'courier' || p.kind === 'courier-busy';
  const glided = useGlide(p);
  const pos = moving ? glided : p;
  return (
    <Marker position={[pos.lat, pos.lng]} icon={icon(p.kind)} zIndexOffset={moving ? 1000 : 0}>
      {p.label && <Tooltip direction="top" offset={[0, -16]}>{p.label}</Tooltip>}
    </Marker>
  );
}

/** Enquadra os pontos quando a lista muda (não a cada movimento do entregador) */
function Fit({ points, path }: { points: MapPoint[]; path?: [number, number][] | null }) {
  const map = useMap();
  const key = points.map((p) => p.id).join(',') + (path ? `:${path.length > 1}` : '');
  useEffect(() => {
    const all: [number, number][] = [...points.map((p) => [p.lat, p.lng] as [number, number]), ...(path ?? [])];
    if (!all.length) return;
    if (all.length === 1) map.setView(all[0], 15);
    else map.fitBounds(L.latLngBounds(all), { padding: [48, 48], maxZoom: 16 });
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/**
 * Mapa com loja, destino e entregador.
 * `path`: o caminho pelas ruas (de useRoute), desenhado como linha com um brilho que percorre
 * o trajeto até o destino.
 */
export function DeliveryMap({ points, path, className }: { points: MapPoint[]; path?: [number, number][] | null; className?: string }) {
  const center = points[0] ?? { lat: -23.5617, lng: -46.6559 };
  return (
    <div className={cn('relative isolate overflow-hidden rounded-card bg-field', className)}>
      <MapContainer center={[center.lat, center.lng]} zoom={14} scrollWheelZoom={false} className="size-full" attributionControl>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
        {path && path.length > 1 && (
          <>
            <Polyline positions={path} pathOptions={{ color: '#181c2e', weight: 7, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }} />
            <Polyline positions={path} pathOptions={{ color: '#ff7622', weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round' }} />
            <Polyline positions={path} pathOptions={{ color: '#ffffff', weight: 5, opacity: 0.85, lineCap: 'round', className: 'route-pulse' }} />
          </>
        )}
        {points.map((p) => (
          <PointMarker key={p.id} p={p} />
        ))}
        <Fit points={points} path={path} />
      </MapContainer>
    </div>
  );
}
