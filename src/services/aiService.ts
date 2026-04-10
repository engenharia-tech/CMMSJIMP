import { GoogleGenAI } from "@google/genai";
import { Equipment, MaintenanceOrder } from "../types";

export async function analyzeFailures(orders: MaintenanceOrder[], equipment: Equipment[]) {
  const model = "gemini-3-flash-preview";
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey || apiKey === 'undefined' || apiKey === '') {
    throw new Error("Chave da API Gemini não encontrada. Por favor, verifique se a variável GEMINI_API_KEY está configurada corretamente.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Analise os seguintes dados de manutenção industrial e forneça um relatório detalhado em formato JSON.
    
    Equipamentos: ${JSON.stringify(equipment.map(e => ({ nome: e.equipment_name, setor: e.sector, criticidade: e.criticality })))}
    Ordens de Manutenção: ${JSON.stringify(orders.map(o => ({ 
      equipamento: o.equipment_id, 
      tipo: o.action_type, 
      causa: o.root_cause, 
      descricao: o.problem_description,
      custo: o.maintenance_cost,
      tempo_parada: o.downtime_hours
    })))}
    
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
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) throw new Error("Nenhuma resposta da IA");
    
    // Clean up potential markdown formatting if Gemini returns it
    const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    
    // Handle the specific error from the image
    if (error.message?.includes('API Key not found') || error.message?.includes('API_KEY_INVALID')) {
      throw new Error("Erro de Autenticação: A chave da API Gemini é inválida ou não foi encontrada. Por favor, verifique as configurações do projeto.");
    }
    
    throw error;
  }
}

export async function askAi(question: string, orders: MaintenanceOrder[], equipment: Equipment[]) {
  const normalizedQuestion = question.toLowerCase().trim();
  if (normalizedQuestion.includes("quem criou você") || normalizedQuestion.includes("por quem você foi criado")) {
    return "Fui criada por Edson Farias, aquele cheiroso, lindo, maravilhoso ❤️";
  }

  const model = "gemini-3-flash-preview";
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey || apiKey === 'undefined' || apiKey === '') {
    throw new Error("Chave da API Gemini não encontrada.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const context = `
    Contexto de Manutenção Industrial:
    Equipamentos: ${JSON.stringify(equipment.map(e => ({ nome: e.equipment_name, setor: e.sector, criticidade: e.criticality, status: e.status })))}
    Histórico de Ordens: ${JSON.stringify(orders.map(o => ({ 
      equipamento: o.equipment_id, 
      tipo: o.action_type, 
      causa: o.root_cause, 
      descricao: o.problem_description,
      data: o.request_date
    })))}
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        { role: "user", parts: [{ text: `${context}\n\nPergunta do usuário: ${question}` }] }
      ],
      config: {
        systemInstruction: "Você é um especialista em manutenção industrial. Responda de forma concisa e técnica em português, baseando-se apenas nos dados fornecidos."
      }
    });

    return response.text || "Não foi possível gerar uma resposta.";
  } catch (error: any) {
    console.error("AI Question Error:", error);
    throw error;
  }
}
