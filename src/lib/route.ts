import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from './api';
import type { VehicleType } from './types';

export type LatLng = { lat: number; lng: number };
export interface Route {
  coordinates: [number, number][];
  distanceKm: number;
  durationMin: number;
  source: 'osrm' | 'mapbox' | 'straight';
}

export const profileFor = (v?: VehicleType | null) => (v === 'BICYCLE' || v === 'SCOOTER' ? 'cycling' : v === 'WALKING' ? 'walking' : 'driving');

/** Distância em metros (aproximação plana, boa para trechos curtos) */
const meters = (a: LatLng, b: LatLng) => {
  const x = (b.lng - a.lng) * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  const y = b.lat - a.lat;
  return Math.sqrt(x * x + y * y) * 111_320;
};

/** Ponto mais próximo de p no segmento a→b (para medir o desvio e cortar o trecho já percorrido) */
function nearestOnSegment(p: LatLng, a: LatLng, b: LatLng) {
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / len)) : 0;
  return { lat: a.lat + t * dy, lng: a.lng + t * dx };
}

/** Onde o entregador está na rota: índice do segmento e distância até ele */
function locate(coords: [number, number][], p: LatLng) {
  let best = { i: 0, d: Infinity };
  for (let i = 0; i < coords.length - 1; i++) {
    const a = { lat: coords[i][0], lng: coords[i][1] };
    const b = { lat: coords[i + 1][0], lng: coords[i + 1][1] };
    const d = meters(p, nearestOnSegment(p, a, b));
    if (d < best.d) best = { i, d };
  }
  return best;
}

/** Só o que falta percorrer: da posição atual até o fim */
export function remaining(coords: [number, number][], p: LatLng): [number, number][] {
  if (coords.length < 2) return coords;
  const { i } = locate(coords, p);
  return [[p.lat, p.lng], ...coords.slice(i + 1)];
}

const OFF_ROUTE_M = 50;

/**
 * Melhor caminho de `from` até `to`, como o Uber: a rota só é pedida de novo quando o
 * entregador sai dela (mais de 50 m) ou o destino muda; no resto do tempo, a linha só
 * encolhe conforme ele anda.
 */
export function useRoute(from: LatLng | null | undefined, to: LatLng | null | undefined, profile: string = 'driving') {
  const [anchor, setAnchor] = useState<LatLng | null>(from ?? null);
  const q = useQuery({
    queryKey: ['route', profile, anchor?.lat.toFixed(4), anchor?.lng.toFixed(4), to?.lat.toFixed(4), to?.lng.toFixed(4)],
    queryFn: () => api.get<Route>(`/routes?from=${anchor!.lat},${anchor!.lng}&to=${to!.lat},${to!.lng}&profile=${profile}`),
    enabled: !!anchor && !!to,
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (!from) return;
    if (!anchor) return setAnchor(from);
    const r = q.data;
    // rota em linha reta (reserva): tenta de novo quando andar um pouco
    if (!r || r.source === 'straight' ? meters(from, anchor) > 150 : locate(r.coordinates, from).d > OFF_ROUTE_M) setAnchor(from);
  }, [from?.lat, from?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const route = q.data;
  if (!route || !from) return { path: route?.coordinates ?? null, route, etaMin: route?.durationMin ?? null };
  const path = remaining(route.coordinates, from);
  // tempo proporcional ao que falta
  const total = route.coordinates.reduce((s, c, i, arr) => (i ? s + meters({ lat: arr[i - 1][0], lng: arr[i - 1][1] }, { lat: c[0], lng: c[1] }) : 0), 0);
  const left = path.reduce((s, c, i, arr) => (i ? s + meters({ lat: arr[i - 1][0], lng: arr[i - 1][1] }, { lat: c[0], lng: c[1] }) : 0), 0);
  const etaMin = total ? Math.max(1, Math.round(route.durationMin * (left / total))) : route.durationMin;
  return { path, route, etaMin };
}
