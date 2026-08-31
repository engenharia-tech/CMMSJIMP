import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import fs from "fs";

// .env.local primeiro: e o arquivo que o projeto usa (convencao do Vite) e
// o dotenv nao sobrescreve o que ja leu. Sem isto o servidor local sobe sem
// Supabase nenhum e recusa ate sessao valida com "faca login".
dotenv.config({ path: ".env.local" });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    env: process.env.NODE_ENV,
    vercel: process.env.VERCEL === "1",
    timestamp: new Date().toISOString()
  });
});

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

const supabasePublic = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// ---------------------------------------------------------------------
// CADASTRO DE USUARIO — SO O ADMIN
//
// Desejo do Edson (31/08/2026): ninguem cria a propria conta. O admin
// autoriza pela tela de Administracao e a pessoa recebe um convite por
// e-mail para definir a senha.
//
// Tres travas, nesta ordem:
//   1. quem chamou precisa ter sessao valida E papel 'admin' (aqui);
//   2. o e-mail entra em usuarios_autorizados (a lista de convidados);
//   3. o porteiro no banco (migracao 002) recusa qualquer cadastro que
//      nao esteja na lista — inclusive por fora desta rota.
// ---------------------------------------------------------------------

async function exigeAdmin(req: express.Request) {
  const user = await usuarioDaRequisicao(req);
  if (!user) return { erro: 401, msg: "Faça login para continuar." };
  if (!supabaseAdmin) return { erro: 503, msg: "Servidor sem credencial administrativa." };

  const { data: perfil } = await supabaseAdmin
    .from("profiles").select("role").eq("id", user.id).maybeSingle();

  if (perfil?.role !== "admin") {
    return { erro: 403, msg: "Somente o administrador cadastra usuários." };
  }
  return { user };
}

function transporteDeEmail() {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!host || !user || !pass) return null;

  const port = parseInt(process.env.EMAIL_PORT || "587", 10);
  return nodemailer.createTransport({
    host, port, secure: port === 465, auth: { user, pass }
  });
}

async function enviaConvite(para: string, nome: string, link: string) {
  const transporte = transporteDeEmail();
  if (!transporte) return { enviado: false, motivo: "E-mail não configurado no servidor." };

  const corpo = `
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
      <h2 style="margin-bottom:4px">Bem-vindo ao CMMS JIMP</h2>
      <p style="color:#475569;margin-top:0">Gestão de Manutenção — Joinville Implementos</p>
      <p>Olá, <strong>${nome}</strong>. Seu acesso foi liberado pelo administrador.</p>
      <p>Clique abaixo para definir sua senha e entrar:</p>
      <p style="margin:28px 0">
        <a href="${link}" style="background:#2563eb;color:#fff;padding:14px 28px;
           border-radius:12px;text-decoration:none;font-weight:bold;display:inline-block">
          Definir minha senha
        </a>
      </p>
      <p style="color:#64748b;font-size:13px">
        Se o botão não funcionar, copie este endereço no navegador:<br>
        <span style="word-break:break-all">${link}</span>
      </p>
      <p style="color:#94a3b8;font-size:12px;margin-top:28px">
        Você recebeu este convite porque o administrador cadastrou seu e-mail.
        Não é possível criar conta por conta própria neste sistema.
      </p>
    </div>`;

  try {
    await transporte.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: para,
      subject: "Seu acesso ao CMMS JIMP",
      html: corpo,
    });
    return { enviado: true };
  } catch (err: any) {
    console.error("Falha ao enviar convite:", err?.message || err);
    return { enviado: false, motivo: "Não foi possível enviar o e-mail agora." };
  }
}

app.post("/api/admin/create-user", async (req, res) => {
  try {
    const porteiro = await exigeAdmin(req);
    if (porteiro.erro) return res.status(porteiro.erro).json({ error: porteiro.msg });

    const { email, fullName, role } = req.body || {};
    if (!email || !fullName) {
      return res.status(400).json({ error: "E-mail e nome completo são obrigatórios." });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const papel = ["admin", "engineer", "operator"].includes(role) ? role : "operator";

    const clientOrigin = req.body?.clientOrigin;
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const requestOrigin = req.headers.origin || `${protocol}://${req.headers.host}`;
    const origem = (clientOrigin && String(clientOrigin).startsWith("http")) ? clientOrigin : requestOrigin;
    const redirectTo = `${origem}/reset-password`;

    const admin = supabaseAdmin!;

    // 1. entra na lista de convidados (sem isto, o porteiro do banco recusa)
    const { error: erroLista } = await admin.from("usuarios_autorizados").upsert({
      email: cleanEmail,
      full_name: fullName,
      role: papel,
      autorizado_por: porteiro.user!.email || "admin",
    }, { onConflict: "email" });

    if (erroLista) {
      console.error("Erro ao autorizar e-mail:", erroLista.message);
      return res.status(500).json({ error: "Não foi possível autorizar este e-mail." });
    }

    // 2. cria a conta
    const senhaTemporaria = "Tmp_" + Math.random().toString(36).slice(2) +
                            Math.random().toString(36).slice(2) + "!9";
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password: senhaTemporaria,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (authError) {
      const jaExiste = /already been registered|already exists/i.test(authError.message || "");
      if (jaExiste) {
        return res.status(409).json({ error: "Este e-mail já tem conta no sistema." });
      }
      throw authError;
    }

    const criado = authData?.user;

    // 3. garante o perfil com o papel que o ADMIN escolheu
    if (criado) {
      await admin.from("profiles").upsert({
        id: criado.id,
        full_name: fullName,
        email: cleanEmail,
        role: papel,
        updated_at: new Date().toISOString(),
      });
    }

    // 4. gera o link de definicao de senha e manda por e-mail
    let inviteLink: string | null = null;
    try {
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "recovery", email: cleanEmail, options: { redirectTo },
      });
      inviteLink = linkData?.properties?.action_link || null;
    } catch (err) {
      console.warn("Nao foi possivel gerar o link de convite:", err);
    }

    const envio = inviteLink
      ? await enviaConvite(cleanEmail, fullName, inviteLink)
      : { enviado: false, motivo: "Não foi possível gerar o link de acesso." };

    return res.json({
      success: true,
      emailEnviado: envio.enviado,
      aviso: envio.enviado ? null : envio.motivo,
      // o link so volta para a tela quando o e-mail nao saiu, para o
      // admin poder repassar a mao. Nunca aparece se o convite foi enviado.
      inviteLink: envio.enviado ? null : inviteLink,
      message: envio.enviado
        ? `Convite enviado para ${cleanEmail}.`
        : `Usuário criado, mas o convite não foi enviado.`,
    });
  } catch (error: any) {
    console.error("Erro ao criar usuário:", error?.message || error);
    return res.status(500).json({ error: "Erro ao criar usuário." });
  }
});

// ---------------------------------------------------------------------
// IA (Gemini)
//
// A chave NUNCA vai para o navegador: ela vive só aqui, no servidor.
// O navegador manda os dados que já tem na tela e recebe o texto pronto.
// Exigimos login — senão qualquer um na internet gasta a cota do Gemini.
// ---------------------------------------------------------------------

const GEMINI_MODEL = "gemini-3-flash-preview";

async function usuarioDaRequisicao(req: express.Request) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !supabasePublic) return null;
  const { data, error } = await supabasePublic.auth.getUser(token);
  if (error) return null;
  return data?.user || null;
}

function clienteGemini() {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

function resumoDoParque(equipment: any[], orders: any[], comCusto: boolean) {
  const eq = (equipment || []).map((e: any) => ({
    nome: e.equipment_name, setor: e.sector,
    criticidade: e.criticality, status: e.status
  }));
  const om = (orders || []).map((o: any) => {
    const base: any = {
      equipamento: o.equipment_id, tipo: o.action_type,
      causa: o.root_cause, descricao: o.problem_description
    };
    if (comCusto) {
      base.custo = o.maintenance_cost;
      base.tempo_parada = o.downtime_hours;
    } else {
      base.data = o.request_date;
    }
    return base;
  });
  return { eq, om };
}

app.post("/api/ai/analyze", async (req, res) => {
  try {
    const user = await usuarioDaRequisicao(req);
    if (!user) return res.status(401).json({ error: "Faça login para usar a análise." });

    const ai = clienteGemini();
    if (!ai) return res.status(503).json({ error: "A análise por IA não está configurada neste servidor." });

    const { equipment, orders } = req.body || {};
    const { eq, om } = resumoDoParque(equipment, orders, true);

    const prompt = `
    Analise os seguintes dados de manutenção industrial e forneça um relatório detalhado em formato JSON.

    Equipamentos: ${JSON.stringify(eq)}
    Ordens de Manutenção: ${JSON.stringify(om)}

    O relatório deve incluir:
    1. Padrões de falha recorrentes detectados.
    2. Intervalos de manutenção preventiva sugeridos para equipamentos críticos.
    3. Previsões de possíveis falhas iminentes.
    4. Um resumo dos equipamentos mais críticos com base na frequência de falhas e custo.

    Retorne APENAS um objeto JSON com a seguinte estrutura:
    {
      "patterns": ["padrão 1", "padrão 2"],
      "suggestions": [{"equipment": "nome", "interval": "15 dias", "reason": "motivo"}],
      "predictions": [{"equipment": "nome", "risk": "alto", "reason": "motivo"}],
      "critical_summary": "texto do resumo"
    }`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const text = response.text;
    if (!text) return res.status(502).json({ error: "A IA não devolveu resposta." });

    const limpo = text.replace(/```json/g, "").replace(/```/g, "").trim();
    try {
      return res.json(JSON.parse(limpo));
    } catch {
      return res.status(502).json({ error: "A IA devolveu uma resposta que não pôde ser lida." });
    }
  } catch (err: any) {
    console.error("Erro na análise por IA:", err?.message || err);
    return res.status(500).json({ error: "Não foi possível concluir a análise." });
  }
});

app.post("/api/ai/ask", async (req, res) => {
  try {
    const user = await usuarioDaRequisicao(req);
    if (!user) return res.status(401).json({ error: "Faça login para conversar com a IA." });

    const ai = clienteGemini();
    if (!ai) return res.status(503).json({ error: "A IA não está configurada neste servidor." });

    const { question, equipment, orders } = req.body || {};
    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "Pergunta vazia." });
    }

    const { eq, om } = resumoDoParque(equipment, orders, false);

    const contexto = `
    Contexto de Manutenção Industrial:
    Equipamentos: ${JSON.stringify(eq)}
    Histórico de Ordens: ${JSON.stringify(om)}`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { role: "user", parts: [{ text: `${contexto}

Pergunta do usuário: ${question}` }] }
      ],
      config: {
        systemInstruction: "Você é um especialista em manutenção industrial. Responda de forma concisa e técnica em português, baseando-se apenas nos dados fornecidos."
      }
    });

    return res.json({ answer: response.text || "Não foi possível gerar uma resposta." });
  } catch (err: any) {
    console.error("Erro na pergunta à IA:", err?.message || err);
    return res.status(500).json({ error: "Não foi possível responder agora." });
  }
});

// JSON error middleware for API routes
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.path && req.path.startsWith('/api')) {
    console.error("API Route Error:", err);
    return res.status(err.status || 500).json({
      error: err.message || "Erro interno no servidor."
    });
  }
  next(err);
});

// A Vercel usa este export como funcao serverless. Nada aqui pode
// depender de arquivo fora da pasta api/: o construtor compila este
// arquivo e NAO leva junto o que estiver na raiz - foi exatamente
// assim que "Cannot find module '/var/task/server'" derrubava a API.
export default app;
