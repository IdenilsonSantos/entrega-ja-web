import { useEffect, useState } from 'react';

/** true enquanto a media query vale (atualiza quando a janela muda de tamanho) */
export function useMedia(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    on();
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return match;
}

/** Divide a lista em linhas de `cols` itens (grades virtualizadas: cada linha é um item da lista) */
export const chunk = <T extends { id: string }>(list: T[], cols: number) =>
  Array.from({ length: Math.ceil(list.length / cols) }, (_, i) => list.slice(i * cols, i * cols + cols)).map((items) => ({ id: items.map((x) => x.id).join('+'), items }));
