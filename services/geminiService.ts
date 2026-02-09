
import { GoogleGenAI } from "@google/genai";

// Use Vite environment variable with VITE_ prefix
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || 'PLACEHOLDER_API_KEY' });

export const getPlatformInsights = async (prompt: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a strategic AI advisor for a multi-tenant global commerce platform. Provide architectural and market insights concisely.",
      },
    });
    // Property access .text as per guidelines
    return response.text;
  } catch (error) {
    console.error("AI Insight Error:", error);
    return "Intelligence service currently unavailable. Please verify API configuration.";
  }
};

export const generateNegotiationAdvice = async (product: string, targetPrice: number) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Product: ${product}. Target Price: ${targetPrice}. Generate 3 strategic negotiation points for a B2B buyer.`,
    });
    // Property access .text as per guidelines
    return response.text;
  } catch (_error) {
    return "Negotiation strategy offline.";
  }
};
