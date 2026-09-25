import * as XLSX from 'xlsx';
import { toast } from 'sonner';

/**
 * Um jeito so de gerar relatorio, para as telas nao divergirem.
 *
 * Cada aba do app tem o seu (Painel, Equipamentos, Ordens, Peças, Custos) e
 * antes cada uma resolvia do seu jeito - a de Custos chegou a gravar o codigo
 * interno do equipamento no lugar do nome.
 */
export interface Aba {
  nome: string;
  linhas: Record<string, any>[];
  larguras?: number[];
}

export function baixarPlanilha(abas: Aba[], arquivo: string) {
  const comDados = abas.filter((a) => a.linhas.length > 0);
  if (comDados.length === 0) {
    toast.error('Não há dados para exportar.');
    return false;
  }

  const wb = XLSX.utils.book_new();
  for (const aba of comDados) {
    const ws = XLSX.utils.json_to_sheet(aba.linhas);
    if (aba.larguras) ws['!cols'] = aba.larguras.map((wch) => ({ wch }));
    // O Excel corta nome de aba em 31 caracteres e recusa alguns sinais.
    XLSX.utils.book_append_sheet(wb, ws, aba.nome.slice(0, 31));
  }

  const dia = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${arquivo}_${dia}.xlsx`);
  const total = comDados.reduce((n, a) => n + a.linhas.length, 0);
  toast.success(`Relatório gerado: ${total} linha(s) em ${comDados.length} aba(s).`);
  return true;
}

/** Data legivel; vazio vira traço, para a celula não ficar ambígua. */
export function dia(valor?: string | null) {
  if (!valor) return '';
  const d = new Date(valor);
  return isNaN(d.getTime()) ? String(valor).slice(0, 10) : d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

/** Dias entre a abertura e a conclusão (ou até hoje, se segue aberta). */
export function diasEntre(inicio?: string | null, fim?: string | null) {
  if (!inicio) return '';
  const a = new Date(inicio).getTime();
  const b = fim ? new Date(fim).getTime() : Date.now();
  return Math.max(0, Math.round((b - a) / 86400000));
}
