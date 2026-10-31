import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';
import { Button, IconButton, Input, MoneyInput, Select } from '../../ds';
import type { OptionGroup } from '../../lib/types';

const uid = () => Math.random().toString(36).slice(2, 10);
const move = <T,>(list: T[], i: number, d: -1 | 1) => {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const c = [...list];
  [c[i], c[j]] = [c[j], c[i]];
  return c;
};

/** Regras do grupo em linguagem de balcão, em vez de "mínimo/máximo" */
const RULES = [
  { value: 'one', label: 'Escolher 1 (obrigatório)', min: 1, max: 1 },
  { value: 'opt1', label: 'Escolher até 1 (opcional)', min: 0, max: 1 },
  { value: 'many', label: 'Escolher vários (opcional)', min: 0, max: 0 },
  { value: 'reqmany', label: 'Escolher pelo menos 1', min: 1, max: 0 },
];
const ruleOf = (g: OptionGroup) => (g.min === 1 && g.max === 1 ? 'one' : g.min === 0 && g.max === 1 ? 'opt1' : g.min >= 1 ? 'reqmany' : 'many');

/**
 * Grupos de opções do produto: "Ponto da carne" (escolher 1), "Adicionais" (até 3, com preço)…
 */
export function OptionGroupsEditor({ value, onChange }: { value: OptionGroup[]; onChange: (v: OptionGroup[]) => void }) {
  const set = (i: number, g: OptionGroup) => onChange(value.map((x, j) => (j === i ? g : x)));
  return (
    <div className="grid gap-4">
      {value.map((g, i) => {
        const rule = ruleOf(g);
        const multi = rule === 'many' || rule === 'reqmany';
        return (
          <fieldset key={g.id} className="grid gap-3 rounded-card border border-line p-4">
            <div className="flex items-center gap-2">
              <Input aria-label="Nome do grupo" value={g.name} onChange={(e) => set(i, { ...g, name: e.target.value })} placeholder="Ex.: Adicionais" className="h-11 font-bold" />
              <IconButton icon={ArrowUp} label="Subir grupo" variant="ghost" size="sm" disabled={i === 0} onClick={() => onChange(move(value, i, -1))} />
              <IconButton icon={ArrowDown} label="Descer grupo" variant="ghost" size="sm" disabled={i === value.length - 1} onClick={() => onChange(move(value, i, 1))} />
              <IconButton icon={Trash2} label="Apagar grupo" variant="ghost" size="sm" onClick={() => onChange(value.filter((_, j) => j !== i))} />
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
              <Select
                aria-label="Regra de escolha"
                className="h-11"
                value={rule}
                onChange={(e) => {
                  const r = RULES.find((x) => x.value === e.target.value)!;
                  set(i, { ...g, min: r.min, max: r.max || Math.max(2, g.options.length) });
                }}
              >
                {RULES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
              {multi && (
                <label className="flex items-center gap-2 text-sm text-muted">
                  no máximo
                  <Input type="number" min={1} max={20} value={g.max} onChange={(e) => set(i, { ...g, max: Math.max(1, Number(e.target.value)) })} className="h-11 w-20" />
                </label>
              )}
            </div>
            <ul className="grid gap-2">
              {g.options.map((o, k) => (
                <li key={o.id} className="grid grid-cols-[1fr_130px_auto] items-center gap-2">
                  <Input aria-label="Opção" value={o.name} onChange={(e) => set(i, { ...g, options: g.options.map((x, j) => (j === k ? { ...x, name: e.target.value } : x)) })} placeholder="Ex.: Bacon" className="h-11" />
                  <MoneyInput aria-label="Preço adicional" value={o.priceCents} onChange={(c) => set(i, { ...g, options: g.options.map((x, j) => (j === k ? { ...x, priceCents: c ?? 0 } : x)) })} className="h-11" />
                  <IconButton icon={X} label="Remover opção" variant="ghost" size="sm" onClick={() => set(i, { ...g, options: g.options.filter((_, j) => j !== k) })} />
                </li>
              ))}
            </ul>
            <Button variant="ghost" size="sm" icon={Plus} className="justify-self-start" onClick={() => set(i, { ...g, options: [...g.options, { id: uid(), name: '', priceCents: 0 }] })}>
              Adicionar opção
            </Button>
          </fieldset>
        );
      })}
      <Button variant="outline" icon={Plus} className="justify-self-start" onClick={() => onChange([...value, { id: uid(), name: '', min: 0, max: 3, options: [{ id: uid(), name: '', priceCents: 0 }] }])}>
        Novo grupo de opções
      </Button>
    </div>
  );
}
