/**
 * Atalho de DESENVOLVIMENTO (npm run dev).
 *
 * O servidor de verdade mora em api/index.ts, porque e de la que a
 * Vercel monta a funcao. Aqui so acrescentamos o vite e ficamos
 * ouvindo a porta - nada disto roda em producao.
 */
import app from "./api/index.js";

const PORTA = 3000;

async function subir() {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);

  app.listen(PORTA, "0.0.0.0", () => {
    console.log(`Servidor de desenvolvimento em http://localhost:${PORTA}`);
  });
}

subir().catch((err) => {
  console.error("Falha ao subir o servidor de desenvolvimento:", err);
});
