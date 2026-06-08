import { post } from './apiClient';

export type PublicRegisterRoleIntent = 'supplier' | 'buyer' | 'service_provider';

export interface PublicRegisterAttribution {
  sourceChannel?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  campaignId?: string;
  referralCode?: string;
  acquisitionContext?: string;
  landingPage?: string;
  referrerUrl?: string;
  firstTouchTimestamp?: string;
}

export interface PublicRegisterPayload {
  roleIntent: PublicRegisterRoleIntent;
  name: string;
  email: string;
  password: string;
  companyName: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  attribution?: PublicRegisterAttribution;
}

export interface PublicRegisterResponse {
  success: true;
  provisional: true;
  roleIntent: PublicRegisterRoleIntent;
  tenantId: string;
  tenantSlug: string;
  organizationStatus: 'PENDING_VERIFICATION';
  membershipRole: 'OWNER';
  nextStep: 'SIGN_IN_TO_CONTINUE_ONBOARDING';
}

export async function submitPublicRegister(
  payload: PublicRegisterPayload,
): Promise<PublicRegisterResponse> {
  return post<PublicRegisterResponse>('/api/public/register', payload);
}
