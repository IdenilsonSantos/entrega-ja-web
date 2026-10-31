declare const __DEMO_TOOLS__: boolean;

/**
 * Ferramentas de teste (simulador de deslocamento do entregador, atalhos de contas demo no login).
 * Ligadas em desenvolvimento ou com VITE_DEMO_TOOLS=true no build. A constante é trocada pelo
 * Vite na hora do build: em produção vira `false` e o código delas é removido do pacote.
 */
export const DEMO_TOOLS = __DEMO_TOOLS__;
