/** Localização do navegador como Promise, com mensagem de erro em português */
export function currentPosition(timeout = 10000): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Seu navegador não informa a localização'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(new Error(e.code === e.PERMISSION_DENIED ? 'Permita o acesso à localização para continuar' : 'Não foi possível obter sua localização')),
      { enableHighAccuracy: true, timeout, maximumAge: 15000 },
    );
  });
}

/** Ponto padrão quando a pessoa não compartilha a localização (Av. Paulista, SP) */
export const DEFAULT_POINT = { lat: -23.5617, lng: -46.6559 };

/** Busca de endereço → coordenadas (OpenStreetMap / Nominatim) */
export async function geocode(query: string): Promise<{ lat: number; lng: number; label: string }[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=br&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'accept-language': 'pt-BR' } });
  if (!res.ok) return [];
  const rows = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  return rows.map((r) => ({ lat: Number(r.lat), lng: Number(r.lon), label: r.display_name }));
}
