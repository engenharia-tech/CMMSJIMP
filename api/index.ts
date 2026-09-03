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

// 100kb era o padrao e estourava com o parque inteiro no corpo do pedido.
app.use(express.json({ limit: "1mb" }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok",
    modeloIA: GEMINI_MODEL,
    temChaveIA: !!process.env.GEMINI_API_KEY,
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

/**
 * Busca equipamentos e ordens COM O TOKEN DE QUEM PEDIU, para a RLS valer.
 *
 * Antes o navegador mandava os dois vetores inteiros no corpo do pedido. Com
 * 172 equipamentos e 64 ordens isso estourou o limite e a IA respondia
 * '413 request entity too large'. Nos meus testes passava porque eu enviava
 * duas linhas de exemplo, nao o parque de verdade.
 */
async function dadosDoUsuario(req: express.Request) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  const cliente = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [eq, om] = await Promise.all([
    cliente.from("equipment").select("id,equipment_name,sector,criticality,status"),
    cliente.from("maintenance_orders")
      .select("equipment_id,action_type,root_cause,problem_description,maintenance_cost,downtime_hours,request_date,status")
      .order("request_date", { ascending: false })
      .limit(300),
  ]);

  return { equipment: eq.data || [], orders: om.data || [] };
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

    const { equipment, orders } = await dadosDoUsuario(req);
    if (orders.length === 0) {
      return res.status(400).json({ error: "Nao ha ordens de manutencao para analisar." });
    }
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
    const motivo = String(err?.message || err).slice(0, 300);
    console.error("Erro na analise por IA:", motivo);
    return res.status(500).json({ error: "Não foi possível concluir a análise.", detalhe: motivo });
  }
});

app.post("/api/ai/ask", async (req, res) => {
  try {
    const user = await usuarioDaRequisicao(req);
    if (!user) return res.status(401).json({ error: "Faça login para conversar com a IA." });

    const ai = clienteGemini();
    if (!ai) return res.status(503).json({ error: "A IA não está configurada neste servidor." });

    const { question } = req.body || {};
    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "Pergunta vazia." });
    }

    const { equipment, orders } = await dadosDoUsuario(req);
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
    const motivo = String(err?.message || err).slice(0, 300);
    console.error("Erro na pergunta a IA:", motivo);
    return res.status(500).json({ error: "Não foi possível responder agora.", detalhe: motivo });
  }
});

// ---------------------------------------------------------------------
// REMOVER USUARIO — de verdade, nos tres lugares
//
// Antes, a tela apagava so a linha de `profiles`. A conta continuava no
// Auth e o e-mail continuava autorizado: a pessoa seguia entrando, e sem
// perfil o app a tratava como 'operator'. Remover exige os tres.
// ---------------------------------------------------------------------
app.post("/api/admin/delete-user", async (req, res) => {
  try {
    const porteiro = await exigeAdmin(req);
    if (porteiro.erro) return res.status(porteiro.erro).json({ error: porteiro.msg });

    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: "Usuário não informado." });

    if (userId === porteiro.user!.id) {
      return res.status(400).json({ error: "Você não pode remover a própria conta." });
    }

    const admin = supabaseAdmin!;

    const { data: perfil } = await admin
      .from("profiles").select("email").eq("id", userId).maybeSingle();
    const email = perfil?.email ? String(perfil.email).trim().toLowerCase() : null;

    if (email) {
      await admin.from("usuarios_autorizados").delete().eq("email", email);
    }
    await admin.from("profiles").delete().eq("id", userId);

    const { error: erroAuth } = await admin.auth.admin.deleteUser(userId);
    if (erroAuth) {
      console.error("Falha ao remover do Auth:", erroAuth.message);
      return res.status(500).json({
        error: "O perfil foi removido, mas a conta de acesso permaneceu. Avise o administrador.",
      });
    }

    return res.json({ success: true, message: "Usuário removido do sistema." });
  } catch (error: any) {
    console.error("Erro ao remover usuário:", error?.message || error);
    return res.status(500).json({ error: "Erro ao remover usuário." });
  }
});

// Suspender / reativar. A escrita tambem passaria pela RLS no cliente, mas
// aqui garantimos a checagem de admin no servidor e impedimos alguem de
// suspender a propria conta e se trancar para fora.
app.post("/api/admin/set-user-active", async (req, res) => {
  try {
    const porteiro = await exigeAdmin(req);
    if (porteiro.erro) return res.status(porteiro.erro).json({ error: porteiro.msg });

    const { email, ativo } = req.body || {};
    if (!email || typeof ativo !== "boolean") {
      return res.status(400).json({ error: "Dados incompletos." });
    }

    const alvo = String(email).trim().toLowerCase();
    if (alvo === String(porteiro.user!.email || "").toLowerCase()) {
      return res.status(400).json({ error: "Você não pode suspender a própria conta." });
    }

    const { error } = await supabaseAdmin!
      .from("usuarios_autorizados").update({ ativo }).eq("email", alvo);

    if (error) {
      console.error("Falha ao mudar acesso:", error.message);
      return res.status(500).json({ error: "Não foi possível alterar o acesso." });
    }

    return res.json({
      success: true,
      message: ativo ? "Acesso liberado." : "Acesso suspenso. Vale imediatamente.",
    });
  } catch (error: any) {
    console.error("Erro ao mudar acesso:", error?.message || error);
    return res.status(500).json({ error: "Erro ao alterar o acesso." });
  }
});

// ---------------------------------------------------------------------
// AVISO DIARIO DE MANUTENCAO
//
// Roda uma vez por dia (Vercel Cron, ver vercel.json) e manda um e-mail
// com o que venceu e o que vence hoje.
//
// A regra e a MESMA de src/lib/manutencao.ts, repetida aqui porque o
// construtor da Vercel nao leva arquivos de src/ para dentro da funcao -
// foi exatamente isso que deixou a API fora do ar por meses. Ao mudar a
// regra la, mude aqui tambem.
// ---------------------------------------------------------------------
const DIA_MS = 24 * 60 * 60 * 1000;

function situacaoDaMaquina(eq: any, ordens: any[], cfg: any, hoje: Date) {
  const marcada = eq?.preventive_scheduled_date;
  const intervalo = eq?.preventive_interval_days || cfg?.default_preventive_interval || 30;

  const ultima = (ordens || [])
    .filter((o) => o.equipment_id === eq.id && o.action_type === "preventive")
    .sort((a, b) => new Date(b.request_date).getTime() - new Date(a.request_date).getTime())[0];

  // Mesma regra de src/lib/manutencao.ts (ver o aviso la sobre a duplicacao).
  const ancora = ultima
    ? new Date(ultima.request_date)
    : new Date(eq?.acquisition_date || eq?.created_at || hoje);

  const cumprida = !!(marcada && ultima &&
    new Date(ultima.request_date) >= new Date(`${String(marcada).slice(0, 10)}T00:00:00`));
  const usaMarcada = !!marcada && !cumprida;

  const proxima = usaMarcada
    ? new Date(`${String(marcada).slice(0, 10)}T12:00:00`)
    : new Date(ancora.getTime() + intervalo * DIA_MS);

  const d0 = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const d1 = new Date(proxima.getFullYear(), proxima.getMonth(), proxima.getDate());
  return { proxima, marcada: usaMarcada, dias: Math.round((d1.getTime() - d0.getTime()) / DIA_MS) };
}

app.get("/api/cron/manutencoes", async (req, res) => {
  // Segredo compartilhado: a Vercel manda este cabecalho nas chamadas do
  // agendamento. Sem isto, qualquer um dispara o e-mail.
  const segredo = process.env.CRON_SECRET;
  if (segredo && req.headers.authorization !== `Bearer ${segredo}`) {
    return res.status(401).json({ error: "Não autorizado." });
  }
  if (!supabaseAdmin) return res.status(503).json({ error: "Servidor sem credencial administrativa." });

  try {
    const hoje = new Date();
    const [eqR, omR, cfgR, perfisR] = await Promise.all([
      supabaseAdmin.from("equipment").select("id,registration_number,equipment_name,sector,status,acquisition_date,created_at,preventive_interval_days,preventive_scheduled_date"),
      supabaseAdmin.from("maintenance_orders").select("equipment_id,action_type,request_date"),
      supabaseAdmin.from("settings").select("default_preventive_interval").maybeSingle(),
      supabaseAdmin.from("profiles").select("email,role").eq("role", "admin"),
    ]);

    const equipamentos = (eqR.data || []).filter((e: any) => e.status !== "obsolete");
    const ordens = omR.data || [];

    const vencidas: any[] = [];
    const paraHoje: any[] = [];

    for (const eq of equipamentos) {
      const s = situacaoDaMaquina(eq, ordens, cfgR.data, hoje);
      const linha = { ...eq, ...s };
      if (s.dias < 0) vencidas.push(linha);
      else if (s.dias === 0) paraHoje.push(linha);
    }

    if (vencidas.length === 0 && paraHoje.length === 0) {
      return res.json({ enviado: false, motivo: "Nada vencendo hoje.", vencidas: 0, hoje: 0 });
    }

    const destinos = [
      process.env.EMAIL_TO,
      ...(perfisR.data || []).map((p: any) => p.email),
    ].filter(Boolean).join(",");

    if (!destinos) return res.status(500).json({ error: "Sem destinatário configurado." });

    const linha = (m: any) =>
      `<tr>
         <td style="padding:8px;border-bottom:1px solid #e2e8f0"><strong>${m.equipment_name}</strong><br>
           <span style="color:#64748b;font-size:12px">${m.registration_number || ""} · ${m.sector || ""}</span></td>
         <td style="padding:8px;border-bottom:1px solid #e2e8f0;white-space:nowrap">
           ${m.proxima.toLocaleDateString("pt-BR")}${m.marcada ? " <span style='color:#2563eb;font-size:11px'>(data marcada)</span>" : ""}</td>
         <td style="padding:8px;border-bottom:1px solid #e2e8f0;white-space:nowrap;color:${m.dias < 0 ? "#dc2626" : "#b45309"}">
           ${m.dias < 0 ? `${Math.abs(m.dias)} dia(s) em atraso` : "hoje"}</td>
       </tr>`;

    const bloco = (titulo: string, itens: any[], cor: string) =>
      itens.length === 0 ? "" :
      `<h3 style="color:${cor};margin:24px 0 8px">${titulo} (${itens.length})</h3>
       <table style="width:100%;border-collapse:collapse;font-size:14px">${itens.map(linha).join("")}</table>`;

    const corpo = `
      <div style="font-family:Segoe UI,Arial,sans-serif;max-width:640px;margin:0 auto;color:#0f172a">
        <h2 style="margin-bottom:2px">Manutenção preventiva</h2>
        <p style="color:#475569;margin-top:0">CMMS JIMP · ${hoje.toLocaleDateString("pt-BR")}</p>
        ${bloco("Vencidas", vencidas, "#dc2626")}
        ${bloco("Para hoje", paraHoje, "#b45309")}
        <p style="margin-top:28px">
          <a href="https://cmms.jimpnexus.com/preventive"
             style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:bold">
            Abrir o planejamento
          </a>
        </p>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">
          Aviso automático diário. Programe os prazos em Planejamento de Manutenção.
        </p>
      </div>`;

    const transporte = transporteDeEmail();
    if (!transporte) return res.status(503).json({ error: "E-mail não configurado no servidor." });

    await transporte.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: destinos,
      subject: `Manutenção: ${vencidas.length} vencida(s), ${paraHoje.length} para hoje`,
      html: corpo,
    });

    return res.json({ enviado: true, vencidas: vencidas.length, hoje: paraHoje.length, destinos });
  } catch (err: any) {
    console.error("Erro no aviso diario:", err?.message || err);
    return res.status(500).json({ error: "Falha ao gerar o aviso.", detalhe: String(err?.message || err).slice(0, 200) });
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
