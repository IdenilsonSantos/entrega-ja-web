import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Junta classes e resolve conflitos (a última vence): `cn('p-4', props.className)`.
 * O tailwind-merge precisa conhecer os tokens próprios para não descartar, por exemplo,
 * `rounded-card` quando vem junto de `rounded-full`.
 */
const merge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ['sm', 'field', 'btn', 'card', 'panel'],
      shadow: ['card', 'pop', 'ring'],
      spacing: ['tap', 'field', 'cta'],
    },
  },
});

export const cn = (...inputs: ClassValue[]) => merge(clsx(inputs));
