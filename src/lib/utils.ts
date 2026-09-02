import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


/**
 * O app detecta o idioma do navegador, que no Brasil vem como 'pt-BR'.
 * Comparar com === 'pt' dava FALSO e o sistema inteiro exibia dolar em vez
 * de real - no Painel, em Custos, nas pecas e nos custos da ordem.
 */
export function ehPortugues(idioma?: string) {
  return (idioma || '').toLowerCase().startsWith('pt');
}


/**
 * Data legivel (dd/mm/aaaa). A tela mostrava o valor cru do banco,
 * '2026-09-01T00:00:00+00:00', em Custos e na lista de Ordens.
 */
export function dataBR(valor?: string | null) {
  if (!valor) return '-';
  const d = new Date(valor);
  if (isNaN(d.getTime())) return String(valor).slice(0, 10);
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}
