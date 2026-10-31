import type { ReactNode } from 'react';
import { Wordmark } from '../shared/Shell';

/** Tela de login/cadastro: cabeçalho escuro com o desenho do kit e o formulário num painel claro */
export function AuthLayout({ title, subtitle, children }: { title: ReactNode; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-navy lg:grid lg:grid-cols-[1fr_minmax(480px,560px)]">
      <div className="auth-decor grid content-end gap-3 px-6 pt-12 pb-16 text-center lg:content-center lg:px-16 lg:text-left">
        <Wordmark dark className="justify-self-center lg:justify-self-start" />
        <h1 className="text-[30px] text-white">{title}</h1>
        {subtitle && <p className="text-[15px] text-[#c8cad6]">{subtitle}</p>}
      </div>
      <main className="-mt-6 min-h-[60vh] rounded-t-panel bg-bg px-6 pt-8 pb-12 lg:mt-0 lg:grid lg:content-center lg:rounded-none lg:px-14">
        <div className="mx-auto w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  );
}
