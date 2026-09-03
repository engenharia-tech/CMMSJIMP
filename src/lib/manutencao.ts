/**
 * A REGRA da proxima manutencao, em um lugar so.
 *
 * Tres partes do sistema precisam dela: a tela de Planejamento, o sino de
 * notificacoes e o aviso diario por e-mail. Antes cada uma tinha a sua copia,
 * e o sino ainda usava a regra velha - o numero global de 30 dias -, entao
 * avisava coisa diferente do que a tela mostrava.
 *
 * A ordem de prioridade e:
 *   1. data MARCADA para aquele equipamento (vence tudo);
 *   2. ultima manutencao daquele tipo + prazo DA MAQUINA;
 *   3. ultima manutencao + prazo padrao das Configuracoes.
 *
 * O servidor (api/index.ts) repete esta regra porque nao pode importar de
 * src/ - o construtor da Vercel nao leva esses arquivos junto. Ao mexer aqui,
 * mexa la tambem.
 */
export type TipoManutencao = 'preventive' | 'predictive';

export interface RegraManutencao {
  proxima: Date;
  marcada: boolean;
  intervalo: number;
  atrasada: boolean;
  diasRestantes: number;
}

const DIA = 24 * 60 * 60 * 1000;

export function proximaManutencao(
  equipamento: any,
  ordens: any[],
  configuracoes: any,
  tipo: TipoManutencao = 'preventive',
  hoje: Date = new Date()
): RegraManutencao {
  const dataMarcada = tipo === 'preventive'
    ? equipamento?.preventive_scheduled_date
    : equipamento?.predictive_scheduled_date;

  const intervalo =
    (tipo === 'preventive' ? equipamento?.preventive_interval_days : equipamento?.predictive_interval_days) ||
    (tipo === 'preventive' ? configuracoes?.default_preventive_interval : configuracoes?.default_predictive_interval) ||
    (tipo === 'preventive' ? 30 : 90);

  const ultima = (ordens || [])
    .filter((o) => o.equipment_id === equipamento?.id && o.action_type === tipo)
    .sort((a, b) => new Date(b.request_date).getTime() - new Date(a.request_date).getTime())[0];

  // Sem historico, a base NAO pode ser 'hoje': a data escorregaria um dia a
  // cada dia e a maquina nunca venceria. Ancoramos na aquisicao (ou no
  // cadastro), que e uma data fixa.
  const ancora = ultima
    ? new Date(ultima.request_date)
    : new Date(equipamento?.acquisition_date || equipamento?.created_at || hoje);

  const doCiclo = new Date(ancora.getTime() + intervalo * DIA);

  // Data marcada JA CUMPRIDA nao vale mais: se houve manutencao daquele tipo
  // na data marcada ou depois, ela foi atendida e o ciclo volta a mandar.
  // Sem isto a maquina ficaria 'vencida' para sempre, mesmo depois de feita.
  const cumprida = !!(dataMarcada && ultima &&
    new Date(ultima.request_date) >= new Date(`${String(dataMarcada).slice(0, 10)}T00:00:00`));

  const usaMarcada = !!dataMarcada && !cumprida;
  const proxima = usaMarcada ? new Date(`${String(dataMarcada).slice(0, 10)}T12:00:00`) : doCiclo;

  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const inicioProxima = new Date(proxima.getFullYear(), proxima.getMonth(), proxima.getDate());
  const diasRestantes = Math.round((inicioProxima.getTime() - inicioHoje.getTime()) / DIA);

  return {
    proxima,
    marcada: usaMarcada,
    intervalo,
    atrasada: diasRestantes < 0,
    diasRestantes,
  };
}
