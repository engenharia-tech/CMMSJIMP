import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
const PORT = 3000;

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

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// API to check if an email is pre-approved/added by Admin (Public route)
app.post("/api/auth/check-preapproved", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== "string") {
      return res.status(400).json({ preapproved: false, error: "Email inválido" });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email")
        .ilike("email", cleanEmail)
        .maybeSingle();

      if (data) {
        return res.json({ preapproved: true, fullName: data.full_name });
      }

      // Also check auth.users directly via admin client if profiles row not found
      const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
      const foundUser = userData?.users?.find((u: any) => u.email?.toLowerCase() === cleanEmail);
      if (foundUser) {
        return res.json({ preapproved: true, fullName: foundUser.user_metadata?.full_name || "Usuário" });
      }
    }

    return res.json({ preapproved: false });
  } catch (err: any) {
    console.error("Check preapproved error:", err);
    return res.status(500).json({ preapproved: false, error: err.message || "Erro no servidor" });
  }
});

// API to create a new user without admin knowing password (Admin only)
app.post("/api/admin/create-user", async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ 
        error: "Supabase Admin não configurado. Por favor, adicione a variável SUPABASE_SERVICE_ROLE_KEY nas configurações do ambiente." 
      });
    }

    const { email, fullName, role } = req.body || {};

    if (!email || !fullName) {
      return res.status(400).json({ error: "E-mail e Nome Completo são obrigatórios." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const clientOrigin = req.body?.clientOrigin;
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const requestOrigin = req.headers.origin || `${protocol}://${host}`;
    const actualOrigin = (clientOrigin && clientOrigin.startsWith('http')) ? clientOrigin : requestOrigin;
    const redirectTo = `${actualOrigin}/reset-password`;

    let createdUser: any = null;
    let inviteLink: string | null = null;

    // Create user with random password and pre-confirmed email
    const randomPassword = 'Pswd_' + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2) + '!9';
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: randomPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: role || 'operator' }
    });

    if (authError) {
      if (authError.message.includes("already been registered") || authError.message.includes("already exists")) {
        return res.status(409).json({ error: "user_already_registered", message: authError.message });
      }
      throw authError;
    }

    createdUser = authData?.user;

    // Upsert into profiles table
    if (createdUser) {
      const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({
        id: createdUser.id,
        full_name: fullName,
        email: cleanEmail,
        role: role || 'operator',
        updated_at: new Date().toISOString()
      });

      if (profileErr) {
        console.warn("Profile upsert notice:", profileErr.message);
      }

      // Generate password setup / recovery link for direct access
      try {
        const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: cleanEmail,
          options: { redirectTo }
        });
        if (linkData?.properties?.action_link) {
          let rawLink = linkData.properties.action_link;
          rawLink = rawLink.replace(
            /redirect_to=http%3A%2F%2Flocalhost%3A3000[^\&]*/gi,
            `redirect_to=${encodeURIComponent(actualOrigin + '/reset-password')}`
          ).replace(
            /redirect_to=http:\/\/localhost:3000[^\&]*/gi,
            `redirect_to=${encodeURIComponent(actualOrigin + '/reset-password')}`
          );
          inviteLink = rawLink;
        }
      } catch (linkErr) {
        console.warn("Could not generate direct recovery link:", linkErr);
      }
    }

    return res.json({ 
      success: true, 
      user: createdUser,
      inviteLink,
      message: "Usuário cadastrado com sucesso. Ele poderá definir a própria senha no primeiro acesso." 
    });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return res.status(500).json({ error: error?.message || "Erro ao criar usuário" });
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

async function startServer() {
  const isVercel = process.env.VERCEL === "1";
  const isProduction = process.env.NODE_ENV === "production";
  const distPath = path.join(process.cwd(), "dist");
  const hasDist = fs.existsSync(distPath);

  if (isProduction && hasDist) {
    console.log("Mode: Production (Serving static files)");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else if (!isVercel) {
    console.log("Mode: Development (Using Vite middleware)");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  if (!isVercel) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
