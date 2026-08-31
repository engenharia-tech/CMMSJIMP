/**
 * Ponte para a Vercel.
 *
 * O server.ts e carregado na PRIMEIRA requisicao, dentro de um try. Se
 * ele explodir, a funcao responde dizendo qual foi o erro em vez de
 * morrer calada com FUNCTION_INVOCATION_FAILED.
 *
 * Sem `await` no topo do arquivo de proposito: se o construtor da Vercel
 * nao aceitar top-level await, o BUILD falha e a versao antiga fica no
 * ar - e o diagnostico nunca chega.
 */
let carregando: Promise<any> | null = null;

function carregaApp() {
  if (!carregando) {
    carregando = import("../server").then((mod: any) => mod.app);
  }
  return carregando;
}

export default async function handler(req: any, res: any) {
  try {
    const app = await carregaApp();
    return app(req, res);
  } catch (erro: any) {
    carregando = null; // deixa tentar de novo na proxima requisicao
    const detalhe = {
      erro: "A funcao nao conseguiu carregar o servidor.",
      nome: erro?.name || "Error",
      mensagem: String(erro?.message || erro).slice(0, 500),
      origem: String(erro?.stack || "").split("\n").slice(1, 4).map((l: string) => l.trim()),
    };
    console.error("Falha ao carregar server.ts:", detalhe);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(detalhe, null, 2));
  }
}
