import { Navigation, Square } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '../../ds';
import { useShift } from './shift';

/**
 * Ferramenta de TESTE: anda com o entregador até o alvo (loja ou cliente) em passos de
 * ~60 m a cada 2 s. Só é incluída no pacote com DEMO_TOOLS (desenvolvimento ou
 * VITE_DEMO_TOOLS=true); em produção o entregador usa o GPS do aparelho.
 */
export default function Simulator({ target, label }: { target: { lat: number; lng: number }; label: string }) {
  const { simulate, simulating, setSimulating, position } = useShift();
  const pos = useRef(position);
  pos.current = position;

  useEffect(() => {
    if (!simulating || !simulate) return;
    const t = setInterval(() => {
      const p = pos.current ?? { lat: target.lat + 0.01, lng: target.lng + 0.01 };
      const dLat = target.lat - p.lat;
      const dLng = target.lng - p.lng;
      const dist = Math.hypot(dLat, dLng);
      const step = 0.0006; // ~60 m
      const next = dist <= step ? target : { lat: p.lat + (dLat / dist) * step, lng: p.lng + (dLng / dist) * step };
      simulate(next);
      if (dist <= step) setSimulating(false);
    }, 2000);
    return () => clearInterval(t);
  }, [simulating, simulate, target.lat, target.lng, setSimulating]);

  if (!simulate) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card border border-dashed border-warn p-3 text-[13px] text-warn">
      <span className="flex-1">Teste: simular o deslocamento até {label}.</span>
      <Button size="sm" variant="outline" icon={simulating ? Square : Navigation} onClick={() => setSimulating(!simulating)}>
        {simulating ? 'Parar' : 'Simular'}
      </Button>
    </div>
  );
}
