import { GoogleGenAI } from "@google/genai";
import { Equipment, MaintenanceOrder } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeFailures(orders: MaintenanceOrder[], equipment: Equipment[]) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze the following industrial maintenance data and provide a detailed report in JSON format.
    
    Equipment: ${JSON.stringify(equipment.map(e => ({ name: e.equipment_name, sector: e.sector, criticality: e.criticality })))}
    Maintenance Orders: ${JSON.stringify(orders.map(o => ({ 
      equipment: o.equipment_id, 
      type: o.action_type, 
      cause: o.root_cause, 
      description: o.problem_description,
      cost: o.maintenance_cost,
      downtime: o.downtime_hours
    })))}
    
    The report should include:
    1. Recurring failure patterns detected.
    2. Suggested preventive maintenance intervals for critical equipment.
    3. Predictions of possible imminent failures.
    4. A summary of the most critical equipment based on failure frequency and cost.
    
    Return ONLY a JSON object with the following structure:
    {
      "patterns": ["pattern 1", "pattern 2"],
      "suggestions": [{"equipment": "name", "interval": "15 days", "reason": "why"}],
      "predictions": [{"equipment": "name", "risk": "high", "reason": "why"}],
      "critical_summary": "summary text"
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

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("AI Analysis Error:", error);
    throw new Error("Failed to analyze failures with AI.");
  }
}
