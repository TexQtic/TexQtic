/**
 * AI API Client - Server Proxy for Gemini/LLM calls
 *
 * GOVERNANCE COMPLIANT:
 * - NO @google/genai imports
 * - NO client-side API keys
 * - All AI calls routed through /api/ai/* server endpoints
 * - Tenant context handled server-side
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

interface InsightsResponse {
  ok: boolean;
  data: {
    insightText: string;
    updatedAt: string;
    cached?: boolean;
  };
}

interface NegotiationAdviceResponse {
  ok: boolean;
  data: {
    adviceText: string;
    riskFlags: string[];
    updatedAt: string;
  };
}

/**
 * Fetch helper with error handling
 */
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for JWT auth
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

/**
 * Get platform insights from AI
 *
 * @param prompt - Context description (tenant type, experience, etc.)
 * @returns AI-generated insight text
 */
export const getPlatformInsights = async (prompt: string): Promise<string> => {
  try {
    // Extract hints from prompt for query params
    const params = new URLSearchParams();

    // Simple heuristic: extract tenant type if mentioned
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes('b2b')) params.append('tenantType', 'B2B');
    else if (lowerPrompt.includes('b2c')) params.append('tenantType', 'B2C');
    else if (lowerPrompt.includes('aggregator')) params.append('tenantType', 'AGGREGATOR');
    else if (lowerPrompt.includes('white')) params.append('tenantType', 'WHITE_LABEL');

    // Add experience hint if present
    if (lowerPrompt.includes('market trend')) params.append('experience', 'market_trends');

    const queryString = params.toString();
    const endpoint = `/api/ai/insights${queryString ? `?${queryString}` : ''}`;

    const response = await apiFetch<InsightsResponse>(endpoint, {
      method: 'GET',
    });

    return response.data.insightText;
  } catch (error) {
    console.error('AI Insight Error:', error);
    return 'Intelligence service currently unavailable. Please verify API configuration.';
  }
};

/**
 * Generate negotiation advice from AI
 *
 * @param product - Product name
 * @param targetPrice - Target price in dollars
 * @param options - Additional context (quantity, context string)
 * @returns AI-generated negotiation advice with risk flags
 */
export const generateNegotiationAdvice = async (
  product: string,
  targetPrice: number,
  options?: { quantity?: number; context?: string }
): Promise<string> => {
  try {
    const response = await apiFetch<NegotiationAdviceResponse>('/api/ai/negotiation-advice', {
      method: 'POST',
      body: JSON.stringify({
        productName: product,
        targetPrice,
        quantity: options?.quantity,
        context: options?.context,
      }),
    });

    // If risk flags present, prepend warning
    let result = response.data.adviceText;
    if (response.data.riskFlags.length > 0) {
      result = `⚠️ Risk Flags: ${response.data.riskFlags.join(', ')}\n\n${result}`;
    }

    return result;
  } catch (error) {
    console.error('Negotiation Advice Error:', error);
    return 'Negotiation strategy offline.';
  }
};

/**
 * Check AI service health
 */
export const checkAIHealth = async (): Promise<{
  status: string;
  provider: string;
  configured: boolean;
}> => {
  try {
    const response = await apiFetch<{
      ok: boolean;
      data: { status: string; provider: string; configured: boolean };
    }>('/api/ai/health', { method: 'GET' });

    return response.data;
  } catch (error) {
    return {
      status: 'error',
      provider: 'unknown',
      configured: false,
    };
  }
};
