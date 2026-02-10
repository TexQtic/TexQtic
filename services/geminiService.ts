/**
 * ⚠️ DEPRECATED - DO NOT USE ⚠️
 * 
 * This file contained a CRITICAL SECURITY VULNERABILITY:
 * - Exposed VITE_GEMINI_API_KEY in browser
 * - Bypassed backend budget enforcement
 * - Bypassed audit logging
 * - Bypassed RLS tenant isolation
 * 
 * REMEDIATION (Prompt #53 - Wave 1):
 * All AI calls now route through services/aiService.ts → backend /api/ai/*
 * This provides:
 * ✅ Budget enforcement
 * ✅ Audit logging
 * ✅ Cost tracking
 * ✅ RLS tenant isolation
 * 
 * DO NOT RESTORE THIS FILE OR REINTRODUCE CLIENT-SIDE AI CALLS.
 */

// This file is intentionally empty and deprecated.
// All AI functionality has been moved to services/aiService.ts
// which properly routes through the backend governance layer.

export const getPlatformInsights = () => {
  throw new Error('DEPRECATED: Use aiService.ts instead. This function bypasses backend security.');
};

export const generateNegotiationAdvice = () => {
  throw new Error('DEPRECATED: Use aiService.ts instead. This function bypasses backend security.');
};
