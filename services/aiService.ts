/**
 * AI API Client - Server Proxy for Gemini/LLM calls
 *
 * GOVERNANCE COMPLIANT:
 * - NO @google/genai imports
 * - NO client-side API keys
 * - All AI calls routed through /api/ai/* server endpoints
 * - Tenant context handled server-side
 * - JWT authentication enforced
 */

import { get, post, APIError } from './apiClient';

interface InsightsResponse {
  insightText: string;
  updatedAt: string;
  cached?: boolean;
}

interface NegotiationAdviceResponse {
  adviceText: string;
  riskFlags: string[];
  updatedAt: string;
}

interface AIHealthResponse {
  status: string;
  provider: string;
  configured: boolean;
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

    const response = await get<InsightsResponse>(endpoint);

    return response.insightText;
  } catch (error) {
    if (error instanceof APIError) {
      // Handle budget exceeded (429)
      if (error.status === 429) {
        return 'AI budget limit reached for this month. Please contact your administrator to increase your quota.';
      }

      // Handle auth errors
      if (error.status === 401) {
        return 'Authentication required to access AI insights.';
      }

      return `AI insights temporarily unavailable: ${error.message}`;
    }

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
    const response = await post<NegotiationAdviceResponse>('/api/ai/negotiation-advice', {
      productName: product,
      targetPrice,
      quantity: options?.quantity,
      context: options?.context,
    });

    // If risk flags present, prepend warning
    let result = response.adviceText;
    if (response.riskFlags.length > 0) {
      result = `⚠️ Risk Flags: ${response.riskFlags.join(', ')}\n\n${result}`;
    }

    return result;
  } catch (error) {
    if (error instanceof APIError) {
      // Handle budget exceeded (429)
      if (error.status === 429) {
        return 'AI budget limit reached. Cannot generate negotiation advice at this time.';
      }

      // Handle auth errors
      if (error.status === 401) {
        return 'Authentication required for AI negotiation advice.';
      }

      return `Negotiation advice unavailable: ${error.message}`;
    }

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
    const response = await get<AIHealthResponse>('/api/ai/health');
    return response;
  } catch (_error) {
    return {
      status: 'error',
      provider: 'unknown',
      configured: false,
    };
  }
};
