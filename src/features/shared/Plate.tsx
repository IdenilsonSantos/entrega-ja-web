import { cn } from '../../ds';

/** Placa no padrão Mercosul, para a cliente reconhecer a moto ou o carro na rua */
export function Plate({ plate, className }: { plate: string; className?: string }) {
  const p = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return (
    <span className={cn('inline-grid w-[104px] overflow-hidden rounded-[5px] border-2 border-ink bg-white text-center leading-none', className)} aria-label={`Placa ${p}`}>
      <span className="bg-[#1c3f94] py-[2px] text-[7px] font-bold tracking-[0.2em] text-white">BRASIL</span>
      <span className="py-1 font-mono text-[17px] font-bold tracking-[0.08em] text-[#111]">{p.length === 7 ? `${p.slice(0, 3)}${p.slice(3)}` : p}</span>
    </span>
  );
}
