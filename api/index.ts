/**
 * Ponte para a Vercel.
 *
 * O import do server.ts acontece dentro de um try: se ele explodir ao
 * carregar, a funcao NAO morre calada com FUNCTION_INVOCATION_FAILED -
 * ela responde dizendo qual foi o erro. Sem isto, toda rota vira um 500
 * opaco e so o log da Vercel conta a historia.
 */
let handler: any;

try {
  const mod = await import("../server");
  handler = mod.app;
} catch (erro: any) {
  const detalhe = {
    erro: "A funcao nao conseguiu carregar.",
    nome: erro?.name || "Error",
    mensagem: String(erro?.message || erro).slice(0, 500),
    origem: String(erro?.stack || "").split("\n").slice(1, 4).map((l: string) => l.trim()),
  };
  console.error("Falha ao carregar server.ts:", detalhe);
  handler = (_req: any, res: any) => {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(detalhe, null, 2));
  };
}

export default handler;
