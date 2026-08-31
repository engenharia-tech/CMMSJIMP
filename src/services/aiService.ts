import { Equipment, MaintenanceOrder } from "../types";
import { supabase } from "../supabase";

/**
 * A chave da Gemini NAO existe aqui.
 * Ela vive no servidor (rotas /api/ai/*), fora do alcance do navegador.
 * Este arquivo so leva a pergunta e traz a resposta.
 */
async function chamarIA(rota: string, corpo: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Sua sessao expirou. Entre novamente para usar a IA.");

  const resposta = await fetch(rota, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(corpo),
  });

  let dados: any = null;
  try {
    dados = await resposta.json();
  } catch {
    throw new Error("O servidor devolveu uma resposta inesperada.");
  }

  if (!resposta.ok) {
    throw new Error(dados?.error || "Nao foi possivel falar com a IA.");
  }
  return dados;
}

export async function analyzeFailures(orders: MaintenanceOrder[], equipment: Equipment[]) {
  return chamarIA("/api/ai/analyze", { orders, equipment });
}

export async function askAi(question: string, orders: MaintenanceOrder[], equipment: Equipment[]) {
  const pergunta = question.toLowerCase().trim();
  if (pergunta.includes("quem criou voce") || pergunta.includes("quem criou você") ||
      pergunta.includes("por quem voce foi criado") || pergunta.includes("por quem você foi criado")) {
    return "Fui criada por Edson Farias, aquele cheiroso, lindo, maravilhoso ❤️";
  }

  const dados = await chamarIA("/api/ai/ask", { question, orders, equipment });
  return dados?.answer || "Nao foi possivel gerar uma resposta.";
}
