import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TenantType, TenantConfig, ImpersonationState, normalizeCommercialPlan } from './types';
import { AggregatorShell, B2BShell, B2CShell, WhiteLabelShell, WhiteLabelAdminShell } from './layouts/Shells';
import {
  SuperAdminShell,
  AdminView,
  type ControlPlaneIdentity,
  formatControlPlaneActorLabel,
} from './layouts/SuperAdminShell';
import { AuthForm } from './components/Auth/AuthFlows';
import { ForgotPassword } from './components/Auth/ForgotPassword';
import { VerifyEmail } from './components/Auth/VerifyEmail';
import { TokenHandler } from './components/Auth/TokenHandler';
import { OnboardingFlow } from './components/Onboarding/OnboardingFlow';
import { TeamManagement } from './components/Tenant/TeamManagement';
import { InviteMemberForm } from './components/Tenant/InviteMemberForm';
import { WhiteLabelSettings } from './components/Tenant/WhiteLabelSettings';
import { PlanAndUsagePanel } from './components/Tenant/PlanAndUsagePanel';
import { WLOrdersPanel } from './components/WhiteLabelAdmin/WLOrdersPanel';
import { WLCollectionsPanel } from './components/WhiteLabelAdmin/WLCollectionsPanel';
import { WLDomainsPanel } from './components/WhiteLabelAdmin/WLDomainsPanel';
import { WLDppLabelPanel } from './components/WhiteLabelAdmin/WLDppLabelPanel';
import { EXPOrdersPanel } from './components/Tenant/EXPOrdersPanel';
import { DPPPassport } from './components/Tenant/DPPPassport';
import { EscrowPanel } from './components/Tenant/EscrowPanel';
// TECS-FBW-006-A: G-022 read-only escalation surfaces (tenant + control-plane)
import { EscalationsPanel } from './components/Tenant/EscalationsPanel';
import { EscalationOversight } from './components/ControlPlane/EscalationOversight';
// TECS-FBW-004: G-019 tenant settlement preview-confirm flow
import { SettlementPreview } from './components/Tenant/SettlementPreview';
// TECS-FBW-005: G-019 certification lifecycle panel (tenant) + admin view (control-plane)
import { CertificationsPanel } from './components/Tenant/CertificationsPanel';
import { CertificationsAdmin } from './components/ControlPlane/CertificationsAdmin';
// TECS-FBW-015: G-016 traceability CRUD panel (tenant) + admin read-only view (control-plane)
import { TraceabilityPanel } from './components/Tenant/TraceabilityPanel';
// TECS-FBW-016: tenant audit log read-only panel (EXPERIENCE-only surface)
import { TenantAuditLogs } from './components/Tenant/TenantAuditLogs';
// TECS-FBW-002-B: G-017 tenant trade read-only panel
import { TradesPanel } from './components/Tenant/TradesPanel';
import { TraceabilityAdmin } from './components/ControlPlane/TraceabilityAdmin';
// TTP UI surfaces: tenant GST verification, invoices, invoice approval
import { GstVerificationCard } from './components/Tenant/GstVerificationCard';
import InvoicesPanel from './components/Tenant/InvoicesPanel';
import InvoiceApprovalView from './components/Tenant/InvoiceApprovalView';
// TTP UI surfaces: control-plane GST queue, TTP eligibility, invoice oversight
import { GstVerificationQueue } from './components/ControlPlane/GstVerificationQueue';
import { TtpEligibilityConsole } from './components/ControlPlane/TtpEligibilityConsole';
import InvoiceOversight from './components/ControlPlane/InvoiceOversight';
import VpcConsole from './components/ControlPlane/VpcConsole';
import TtpEnrollmentAdmin from './components/ControlPlane/TtpEnrollmentAdmin';
// TECS-FBW-007: marketplace_cart_summaries projection admin panel (read-only)
import { CartSummariesPanel } from './components/ControlPlane/CartSummariesPanel';
// PW5-W2: G-018 cross-tenant escrow admin read panel (D-020-B: no balance)
import { EscrowAdminPanel } from './components/ControlPlane/EscrowAdminPanel';
// PW5-W3-FE: Settlement admin read panel (backend route: 14aea49)
import { SettlementAdminPanel } from './components/ControlPlane/SettlementAdminPanel';
import { ZohoBooksOps } from './components/ControlPlane/ZohoBooksOps';
// PW5-W4: G-021 maker-checker approval queue console (read-only)
import { MakerCheckerConsole } from './components/ControlPlane/MakerCheckerConsole';
// PW5-WL1-WIRE: white-label storefront product grid
import { WLStorefront } from './components/WL/WLStorefront';
import { TenantRegistry } from './components/ControlPlane/TenantRegistry';
import { TenantDetails } from './components/ControlPlane/TenantDetails';
import { AuditLogs } from './components/ControlPlane/AuditLogs';
import { FinanceOps, type FinanceEscrowBridgeTarget } from './components/ControlPlane/FinanceOps';
import { AiGovernance } from './components/ControlPlane/AiGovernance';
import { SystemHealth } from './components/ControlPlane/SystemHealth';
import { FeatureFlags } from './components/ControlPlane/FeatureFlags';
import { ComplianceQueue } from './components/ControlPlane/ComplianceQueue';
import { DisputeCases, type DisputeEscalationBridgeTarget } from './components/ControlPlane/DisputeCases';
import { TradeOversight } from './components/ControlPlane/TradeOversight';
import { NetworkCommercePlaceholderSurface } from './components/Tenant/NetworkCommerce/NetworkCommercePlaceholderSurface';
import { AdminRBAC } from './components/ControlPlane/AdminRBAC';
import { PoolListSurface } from './components/Tenant/NetworkCommerce/PoolListSurface';
import { PoolDetailSurface } from './components/Tenant/NetworkCommerce/PoolDetailSurface';
import { DemandLineSurface } from './components/Tenant/NetworkCommerce/DemandLineSurface';
import { PoolRfqSurface } from './components/Tenant/NetworkCommerce/PoolRfqSurface';
import { SupplierInviteInbox } from './components/Tenant/NetworkCommerce/SupplierInviteInbox';
import { EventStream } from './components/ControlPlane/EventStream';
import { B2BDiscoveryPage } from './components/Public/B2BDiscovery';
import { B2CBrowsePage } from './components/Public/B2CBrowse';
import { PublicProductDetail, type PublicProductDetailMetaSignal } from './components/Public/PublicProductDetail';
import { PublicCollectionsStub } from './components/Public/PublicCollectionsStub';
import { PublicCollectionUnavailable } from './components/Public/PublicCollectionUnavailable';
import { PublicCollectionDetail } from './components/Public/PublicCollectionDetail';
import {
  PUBLIC_COLLECTION_PROJECTIONS,
  getCollectionBySlug,
} from './config/publicCollectionsProjection';
import {
  applyPublicPageMeta,
  clearPublicPageMeta,
  PUBLIC_META_OG_FALLBACK_IMAGE,
} from './utils/publicPageMeta';
import { PublicPassport } from './components/Public/PublicPassport';
import { PublicSupplierProfile } from './components/Public/PublicSupplierProfile';
import { PublicReferralLanding } from './components/Public/PublicReferralLanding';
import { PublicTrustLandingStub } from './components/Public/PublicTrustLandingStub';
import { PublicAggregatorPreview } from './components/Public/PublicAggregatorPreview';
import { PublicIndustryClusterLanding } from './components/Public/PublicIndustryClusterLanding';
import { PublicB2CCategoryPage } from './components/Public/PublicB2CCategoryPage';
import { PublicInquiryPage } from './components/Public/PublicInquiryPage';
import { PublicPricingPage } from './components/Public/PublicPricingPage';
import { PublicRequestAccess } from './components/Public/PublicRequestAccess';
import { PublicRegister, type PublicRegisterRoleIntent } from './components/Public/PublicRegister';
import {
  LIVE_PROFILES_AND_PRODUCTS_REPLACE_COPY,
  REFERENCE_PRODUCT_PREVIEW_LABEL,
  REFERENCE_SUPPLIER_PROFILE_LABEL,
  ReferencePreviewNotice,
} from './components/Public/ReferencePreviewNotice';
import { getCategoryPageBySlug as getB2CCategoryPageBySlug } from './config/publicB2CCategoryPages';
import { getPlatformInsights } from './services/aiService';
import { getGstVerification, type GstVerificationRecord } from './services/gstVerificationService';
import {
  getAggregatorDiscoveryEntries,
  type AggregatorDiscoveryEntry,
} from './services/aggregatorDiscoveryService';
import {
  type CreateTradeFromRfqInput,
  type CreateTradeFromRfqResponse,
} from './services/tradeService';
import {
  getCatalogItems,
  CatalogItem,
  BuyerRfqDetailResponse,
  BuyerRfqListResponse,
  CreateRfqRequest,
  CreateRfqResponse,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  createRfq,
  getBuyerRfqs,
  getBuyerRfqDetail,
  getSupplierRfqInbox,
  getSupplierRfqDetail,
  submitSupplierRfqResponse,
  BuyerRfqDetail,
  BuyerRfqListItem,
  SupplierRfqDetail,
  SupplierRfqDetailResponse,
  SupplierRfqListItem,
  SupplierRfqListResponse,
  SupplierRfqResponse,
  SubmitSupplierRfqResponseRequest,
  SubmitSupplierRfqResponseResult,
  getBuyerCatalogItems,
  type BuyerCatalogItem,
  getEligibleSuppliers,
  type SupplierPickerEntry,
  CATALOG_STAGE_VALUES,
  SERVICE_TYPE_VALUES,
  type CatalogStage,
  requestRfqAssist,
  type RfqAssistSuggestions,
  // TECS-B2B-BUYER-CATALOG-PDP-001 P-2: PDP service call
  getBuyerCatalogPdpItem,
  type BuyerCatalogPdpView,
} from './services/catalogService';
import { SupplierProfileCompletenessCard } from './components/Tenant/SupplierProfileCompletenessCard';
import { CartProvider, useCart } from './contexts/CartContext';
import { Cart } from './components/Cart/Cart';
import { AggregatorDiscoveryWorkspace } from './components/Tenant/AggregatorDiscoveryWorkspace';
import { BuyerRfqDetailSurface, SupplierRfqDetailSurface } from './components/Tenant/BuyerRfqDetailSurface';
import { BuyerRfqListSurface, SupplierRfqInboxSurface } from './components/Tenant/BuyerRfqListSurface';
// TECS-B2B-BUYER-CATALOG-PDP-001 P-2: Buyer PDP surface shell
import { CatalogPdpSurface } from './components/Tenant/CatalogPdpSurface';
import { getTenants, getTenantById, startImpersonationSession, stopImpersonationSession, Tenant } from './services/controlPlaneService';
import {
  activateTenant,
  acceptAuthenticatedInvite,
  buildLegalPendingScaffoldConsent,
} from './services/tenantService';
import {
  getCurrentUser,
  resolvePublicEntryDescriptor,
  type PublicEntryResolutionDescriptor,
} from './services/authService';
import { clearAuth, getCurrentAuthRealm, setImpersonationToken, setStoredAuthRealm, setToken, APIError } from './services/apiClient';
import {
  createControlPlaneSessionRuntimeDescriptor,
  createTenantSessionRuntimeDescriptor,
  getRuntimeLocalRouteRegistration,
  resolveRuntimeAppStateFromDescriptor,
  resolveRuntimeFamilyEntryHandoff,
  resolveRuntimeLocalRouteSelection,
  type RouteManifestKey,
  type RuntimeAppState,
  type RuntimeLocalRouteKey,
} from './runtime/sessionRuntimeDescriptor';

const CONTROL_PLANE_IDENTITY_KEY = 'texqtic_control_plane_identity';
const IMPERSONATION_SESSION_KEY = 'texqtic_impersonation_session';
const REHYDRATION_TRACE_KEY = 'texqtic_rehydration_trace';
const EMPTY_IMPERSONATION_STATE: ImpersonationState = {
  isAdmin: false,
  targetTenantId: null,
  startTime: null,
  impersonationId: null,
  token: null,
  expiresAt: null,
};

type BuyerRfqDialogState = {
  open: boolean;
  product: CatalogItem | null;
  quantity: string;
  buyerMessage: string;
  loading: boolean;
  error: string | null;
  success: {
    rfqId: string;
    quantity: number;
  } | null;
  // Structured RFQ fields (TECS-B2B-RFQ-STRUCTURED-REQUIREMENT-001)
  requirementTitle: string;
  quantityUnit: string;
  urgency: '' | 'STANDARD' | 'URGENT' | 'FLEXIBLE';
  sampleRequired: boolean | null;
  targetDeliveryDate: string;
  deliveryLocation: string;
  deliveryCountry: string;
  stageRequirementAttributes: Record<string, string>;
  catalogStage: string | null;
  confirmationStep: boolean;
  // AI Assist state (TECS-AI-RFQ-ASSISTANT-MVP-001)
  aiAssistLoading: boolean;
  aiAssistError: string | null;
  aiAssistSuggestions: RfqAssistSuggestions | null;
  aiAssistParseError: boolean;
  aiSuggestionDecisions: Record<string, 'accepted' | 'rejected'>;
  aiFieldSourceMeta: Record<string, 'AI_SUGGESTED'>;
};

type BuyerRfqDetailViewState = {
  open: boolean;
  source: 'dialog' | 'list' | null;
  rfqId: string | null;
  loading: boolean;
  error: string | null;
  data: BuyerRfqDetail | null;
};

type BuyerRfqDetailSource = Exclude<BuyerRfqDetailViewState['source'], null>;

type BuyerRfqListViewState = {
  loading: boolean;
  error: string | null;
  rfqs: BuyerRfqListItem[];
};

type SupplierRfqListViewState = {
  loading: boolean;
  error: string | null;
  rfqs: SupplierRfqListItem[];
};

type SupplierRfqDetailViewState = {
  open: boolean;
  rfqId: string | null;
  loading: boolean;
  error: string | null;
  submitLoading: boolean;
  submitError: string | null;
  data: SupplierRfqDetail | null;
  response: SupplierRfqResponse | null;
};

type BuyerRfqTradeBridgeState = {
  loading: boolean;
  error: string | null;
  initialTradeId: string | null;
};

const createInitialBuyerRfqDialogState = (): BuyerRfqDialogState => ({
  open: false,
  product: null,
  quantity: '1',
  buyerMessage: '',
  loading: false,
  error: null,
  success: null,
  requirementTitle: '',
  quantityUnit: '',
  urgency: '',
  sampleRequired: null,
  targetDeliveryDate: '',
  deliveryLocation: '',
  deliveryCountry: '',
  stageRequirementAttributes: {},
  catalogStage: null,
  confirmationStep: false,
  // AI Assist state (TECS-AI-RFQ-ASSISTANT-MVP-001)
  aiAssistLoading: false,
  aiAssistError: null,
  aiAssistSuggestions: null,
  aiAssistParseError: false,
  aiSuggestionDecisions: {},
  aiFieldSourceMeta: {},
});

const createInitialBuyerRfqDetailViewState = (): BuyerRfqDetailViewState => ({
  open: false,
  source: null,
  rfqId: null,
  loading: false,
  error: null,
  data: null,
});

const createInitialBuyerRfqListViewState = (): BuyerRfqListViewState => {
  const initialSupplierListView = createInitialSupplierRfqListViewState();

  return {
    loading: initialSupplierListView.loading,
    error: initialSupplierListView.error,
    rfqs: [],
  };
};

const createInitialSupplierRfqListViewState = (): SupplierRfqListViewState => ({
  loading: false,
  error: null,
  rfqs: [],
});

const createInitialSupplierRfqDetailViewState = (): SupplierRfqDetailViewState => ({
  open: false,
  rfqId: null,
  loading: false,
  error: null,
  submitLoading: false,
  submitError: null,
  data: null,
  response: null,
});

const createInitialBuyerRfqTradeBridgeState = (): BuyerRfqTradeBridgeState => ({
  loading: false,
  error: null,
  initialTradeId: null,
});

const resolveBuyerRfqOpenAction = ({
  product,
  isVerificationBlockedTenantWorkspace,
  verificationBlockedActionMessage,
}: {
  product: CatalogItem;
  isVerificationBlockedTenantWorkspace: boolean;
  verificationBlockedActionMessage: string;
}) => {
  if (isVerificationBlockedTenantWorkspace) {
    return {
      blocked: true as const,
      catalogError: verificationBlockedActionMessage,
      dialog: null,
    };
  }

  return {
    blocked: false as const,
    catalogError: null,
    dialog: {
      ...createInitialBuyerRfqDialogState(),
      open: true,
      product,
      quantity: product.moq ? String(product.moq) : '1',
    },
  };
};

const resolveBuyerRfqCloseState = () => ({
  dialog: createInitialBuyerRfqDialogState(),
  detailView: createInitialBuyerRfqDetailViewState(),
});

const resolveBuyerRfqSubmitPayload = (dialog: BuyerRfqDialogState) => {
  if (!dialog.product) {
    return {
      error: 'A catalog item is required to submit an RFQ.',
      payload: null,
    };
  }

  const quantityInput = dialog.quantity.trim();
  const quantity = Number(quantityInput);
  if (
    quantityInput.length === 0 ||
    Number.isNaN(quantity) ||
    !Number.isInteger(quantity) ||
    quantity < 1
  ) {
    return {
      error: 'Quantity must be an integer of at least 1.',
      payload: null,
    };
  }

  const buyerMessage = dialog.buyerMessage.trim();
  const requirementTitle = dialog.requirementTitle.trim();
  const quantityUnit = dialog.quantityUnit.trim();
  const urgency = dialog.urgency || undefined;
  const sampleRequired = dialog.sampleRequired !== null ? dialog.sampleRequired : undefined;
  const targetDeliveryDate = dialog.targetDeliveryDate.trim() || undefined;
  const deliveryLocation = dialog.deliveryLocation.trim() || undefined;
  const deliveryCountry = dialog.deliveryCountry.trim() || undefined;
  const stageAttrEntries = Object.entries(dialog.stageRequirementAttributes).filter(
    ([, v]) => v.trim() !== '',
  );
  const stageRequirementAttributes =
    stageAttrEntries.length > 0 ? Object.fromEntries(stageAttrEntries) : undefined;

  return {
    error: null,
    payload: {
      catalogItemId: dialog.product.id,
      quantity,
      ...(buyerMessage ? { buyerMessage } : {}),
      ...(requirementTitle ? { requirementTitle } : {}),
      ...(quantityUnit ? { quantityUnit } : {}),
      ...(urgency ? { urgency } : {}),
      ...(sampleRequired !== undefined ? { sampleRequired } : {}),
      ...(targetDeliveryDate ? { targetDeliveryDate } : {}),
      ...(deliveryLocation ? { deliveryLocation } : {}),
      ...(deliveryCountry ? { deliveryCountry } : {}),
      ...(stageRequirementAttributes ? { stageRequirementAttributes } : {}),
    } satisfies CreateRfqRequest,
  };
};

const resolveBuyerRfqSubmitSuccess = (response: CreateRfqResponse) => ({
  dialogPatch: {
    loading: false,
    error: null,
    success: {
      rfqId: response.rfq.id,
      quantity: response.rfq.quantity,
    },
  } satisfies Pick<BuyerRfqDialogState, 'loading' | 'error' | 'success'>,
  detailView: {
    ...createInitialBuyerRfqDetailViewState(),
    rfqId: response.rfq.id,
  },
});

const resolveBuyerRfqSubmitError = (error: unknown) => {
  return error instanceof APIError
    ? error.message
    : 'Failed to submit your request for quote. Please try again.';
};

// TECS-B2B-RFQ-STRUCTURED-REQUIREMENT-001: Stage field descriptors for the progressive RFQ dialog.
export interface RfqStageFieldDef {
  key: string;
  label: string;
  placeholder?: string;
}

const STAGE_FIELD_DESCRIPTORS: Record<string, RfqStageFieldDef[]> = {
  YARN: [
    { key: 'yarnCount', label: 'Yarn Count', placeholder: 'e.g. 40/1' },
    { key: 'countSystem', label: 'Count System', placeholder: 'e.g. NE, NM' },
    { key: 'fiberComposition', label: 'Fiber Composition', placeholder: 'e.g. 100% Cotton' },
    { key: 'ply', label: 'Ply', placeholder: 'e.g. 1, 2' },
    { key: 'spinningType', label: 'Spinning Type', placeholder: 'e.g. Ring Spun, OE' },
    { key: 'endUse', label: 'End Use', placeholder: 'e.g. Woven, Knit, Socks' },
  ],
  FIBER: [
    { key: 'fiberType', label: 'Fiber Type', placeholder: 'e.g. Staple, Filament' },
    { key: 'composition', label: 'Composition', placeholder: 'e.g. 100% Cotton' },
    { key: 'micronaire', label: 'Micronaire', placeholder: 'e.g. 4.0–5.0' },
  ],
  FABRIC_WOVEN: [
    { key: 'weaveType', label: 'Weave Type', placeholder: 'e.g. Plain, Twill, Satin' },
    { key: 'gsmMin', label: 'GSM Min', placeholder: 'e.g. 100' },
    { key: 'gsmMax', label: 'GSM Max', placeholder: 'e.g. 200' },
    { key: 'widthCmRequired', label: 'Width (cm)', placeholder: 'e.g. 150' },
    { key: 'composition', label: 'Composition', placeholder: 'e.g. 60% Cotton, 40% Polyester' },
    { key: 'requiredCertifications', label: 'Required Certifications', placeholder: 'e.g. GOTS, OEKO-TEX' },
  ],
  FABRIC_KNIT: [
    { key: 'knitType', label: 'Knit Type', placeholder: 'e.g. Single Jersey, Interlock' },
    { key: 'gsmMin', label: 'GSM Min', placeholder: 'e.g. 150' },
    { key: 'gsmMax', label: 'GSM Max', placeholder: 'e.g. 250' },
    { key: 'stretch', label: 'Stretch %', placeholder: 'e.g. 50' },
    { key: 'composition', label: 'Composition', placeholder: 'e.g. 95% Cotton, 5% Elastane' },
  ],
  FABRIC_PROCESSED: [
    { key: 'processType', label: 'Process Type', placeholder: 'e.g. Dyeing, Printing, Finishing' },
    { key: 'baseComposition', label: 'Base Composition', placeholder: 'e.g. 100% Cotton' },
  ],
  GARMENT: [
    { key: 'garmentType', label: 'Garment Type', placeholder: 'e.g. T-Shirt, Shirt, Dress' },
    { key: 'sizeRange', label: 'Size Range', placeholder: 'e.g. S-XL, 28-36' },
    { key: 'fit', label: 'Fit', placeholder: 'e.g. Regular, Slim, Oversized' },
    { key: 'gender', label: 'Gender', placeholder: 'e.g. Unisex, Men, Women' },
    { key: 'fabricComposition', label: 'Fabric Composition', placeholder: 'e.g. 100% Cotton' },
    { key: 'monthlyRequiredCapacity', label: 'Monthly Capacity', placeholder: 'e.g. 5000 pcs/month' },
  ],
  ACCESSORY_TRIM: [
    { key: 'accessoryType', label: 'Accessory Type', placeholder: 'e.g. Button, Zipper, Label' },
    { key: 'materialPreference', label: 'Material Preference', placeholder: 'e.g. Metal, Plastic, Fabric' },
    { key: 'sizeSpec', label: 'Size / Spec', placeholder: 'e.g. 12mm, YKK #5' },
    { key: 'colorSpec', label: 'Color Spec', placeholder: 'e.g. Pantone 19-1664 TCX' },
  ],
  CHEMICAL_AUXILIARY: [
    { key: 'chemicalType', label: 'Chemical Type', placeholder: 'e.g. Dye, Finishing Agent' },
    { key: 'application', label: 'Application', placeholder: 'e.g. Dyeing, Finishing, Printing' },
    { key: 'requiredCertifications', label: 'Required Certifications', placeholder: 'e.g. GOTS, REACH' },
    { key: 'packagingUnit', label: 'Packaging Unit', placeholder: 'e.g. 25kg drums' },
  ],
  MACHINE: [
    { key: 'machineType', label: 'Machine Type', placeholder: 'e.g. Circular Knitting, Weaving' },
    { key: 'brandPreference', label: 'Brand Preference', placeholder: 'e.g. Toyota, Stäubli' },
    { key: 'conditionAccepted', label: 'Condition Accepted', placeholder: 'e.g. New, Used' },
    { key: 'warrantyRequired', label: 'Warranty Required', placeholder: 'e.g. 1 year' },
  ],
  MACHINE_SPARE: [
    { key: 'compatibleMachine', label: 'Compatible Machine', placeholder: 'e.g. Toyota RX-3' },
    { key: 'partNumber', label: 'Part Number', placeholder: 'e.g. TYT-12345' },
    { key: 'preferredBrand', label: 'Preferred Brand', placeholder: 'e.g. OEM, Generic' },
    { key: 'leadTimeAccepted', label: 'Lead Time Accepted', placeholder: 'e.g. 30 days' },
  ],
  PACKAGING: [
    { key: 'packagingType', label: 'Packaging Type', placeholder: 'e.g. Polybag, Carton, Hanger' },
    { key: 'dimensionsCm', label: 'Dimensions (cm)', placeholder: 'e.g. 60x40x30' },
    { key: 'printingRequired', label: 'Printing Required', placeholder: 'e.g. Yes - Brand logo' },
    { key: 'materialSpec', label: 'Material Spec', placeholder: 'e.g. Recycled PE, Corrugated B-flute' },
  ],
  SERVICE: [
    { key: 'serviceType', label: 'Service Type', placeholder: 'e.g. Testing Lab, Consulting' },
    { key: 'specialization', label: 'Specialization', placeholder: 'e.g. Fabric Testing, Auditing' },
    { key: 'locationCoverageRequired', label: 'Location Coverage', placeholder: 'e.g. Bangladesh, Turkey' },
    { key: 'turnaroundDays', label: 'Turnaround (days)', placeholder: 'e.g. 14' },
    { key: 'portfolioRequired', label: 'Portfolio Required', placeholder: 'e.g. Yes, No' },
  ],
  SOFTWARE_SAAS: [
    { key: 'softwareCategory', label: 'Software Category', placeholder: 'e.g. PLM, ERP, CAD' },
    { key: 'deploymentModelRequired', label: 'Deployment Model', placeholder: 'e.g. Cloud, On-premise' },
    { key: 'integrationRequirements', label: 'Integration Requirements', placeholder: 'e.g. SAP, Shopify' },
    { key: 'trialRequired', label: 'Trial Required', placeholder: 'e.g. Yes, No' },
  ],
  OTHER: [],
};

export const resolveStructuredRfqStageSectionFields = (
  catalogStage: string | null | undefined,
): RfqStageFieldDef[] => {
  if (!catalogStage) return [];
  return STAGE_FIELD_DESCRIPTORS[catalogStage] ?? [];
};

export const resolveRfqConfirmationSummary = (
  dialog: BuyerRfqDialogState,
): Array<{ label: string; value: string }> => {
  const lines: Array<{ label: string; value: string }> = [];

  const q = Number(dialog.quantity);
  const qDisplay = `${Number.isNaN(q) ? dialog.quantity : q}${dialog.quantityUnit.trim() ? ` ${dialog.quantityUnit.trim()}` : ''}`;
  lines.push({ label: 'Quantity', value: qDisplay });

  if (dialog.requirementTitle.trim()) {
    lines.push({ label: 'Requirement Title', value: dialog.requirementTitle.trim() });
  }

  if (dialog.urgency) {
    lines.push({ label: 'Urgency', value: dialog.urgency });
  }

  if (dialog.sampleRequired !== null) {
    lines.push({ label: 'Sample Required', value: dialog.sampleRequired ? 'Yes' : 'No' });
  }

  if (dialog.targetDeliveryDate.trim()) {
    lines.push({ label: 'Target Delivery Date', value: dialog.targetDeliveryDate.trim() });
  }

  if (dialog.deliveryCountry.trim()) {
    lines.push({ label: 'Delivery Country', value: dialog.deliveryCountry.trim() });
  }

  if (dialog.deliveryLocation.trim()) {
    lines.push({ label: 'Delivery Location', value: dialog.deliveryLocation.trim() });
  }

  const stageFields = resolveStructuredRfqStageSectionFields(dialog.catalogStage);
  for (const field of stageFields) {
    const val = (dialog.stageRequirementAttributes[field.key] ?? '').trim();
    if (val) {
      lines.push({ label: field.label, value: val });
    }
  }

  if (dialog.buyerMessage.trim()) {
    lines.push({ label: 'Additional Notes', value: dialog.buyerMessage.trim() });
  }

  return lines;
};

// ==================== AI RFQ ASSIST PURE HELPERS (TECS-AI-RFQ-ASSISTANT-MVP-001) ====================

/**
 * The ordered list of AI suggestion fields displayed to the buyer.
 * Price and supplier-matching fields are intentionally excluded.
 */
export const AI_ASSIST_DISPLAY_FIELDS: ReadonlyArray<{
  field: keyof RfqAssistSuggestions;
  label: string;
}> = [
  { field: 'requirementTitle', label: 'Requirement Title' },
  { field: 'quantityUnit', label: 'Quantity Unit' },
  { field: 'urgency', label: 'Urgency' },
  { field: 'sampleRequired', label: 'Sample Required' },
  { field: 'deliveryCountry', label: 'Delivery Country' },
  { field: 'stageRequirementAttributes', label: 'Stage Requirements' },
] as const;

/**
 * Resolve which AI suggestion fields have a non-null value to display.
 * No price, no supplier-matching fields.
 */
export function resolveAiAssistDisplayItems(
  suggestions: RfqAssistSuggestions | null,
): Array<{ field: string; label: string; value: unknown }> {
  if (!suggestions) return [];
  return AI_ASSIST_DISPLAY_FIELDS
    .filter(({ field }) => suggestions[field] !== null)
    .map(({ field, label }) => ({ field, label, value: suggestions[field] }));
}

/**
 * Accept an AI-suggested field. Marks the field as accepted and records its
 * AI_SUGGESTED provenance in fieldSourceMeta.
 */
export function resolveApplyAiSuggestion(
  dialog: Pick<BuyerRfqDialogState, 'aiSuggestionDecisions' | 'aiFieldSourceMeta'>,
  field: string,
): Pick<BuyerRfqDialogState, 'aiSuggestionDecisions' | 'aiFieldSourceMeta'> {
  return {
    aiSuggestionDecisions: { ...dialog.aiSuggestionDecisions, [field]: 'accepted' as const },
    aiFieldSourceMeta: { ...dialog.aiFieldSourceMeta, [field]: 'AI_SUGGESTED' as const },
  };
}

/**
 * Reject an AI-suggested field. Records the rejection decision; does not alter
 * any form field values or fieldSourceMeta.
 */
export function resolveRejectAiSuggestion(
  dialog: Pick<BuyerRfqDialogState, 'aiSuggestionDecisions'>,
  field: string,
): Pick<BuyerRfqDialogState, 'aiSuggestionDecisions'> {
  return {
    aiSuggestionDecisions: { ...dialog.aiSuggestionDecisions, [field]: 'rejected' as const },
  };
}

/**
 * Returns the AI assist slice of the initial dialog state (used for reset on close / product change).
 */
export function resolveAiAssistStateOnClose(): Pick<
  BuyerRfqDialogState,
  | 'aiAssistLoading'
  | 'aiAssistError'
  | 'aiAssistSuggestions'
  | 'aiAssistParseError'
  | 'aiSuggestionDecisions'
  | 'aiFieldSourceMeta'
> {
  return {
    aiAssistLoading: false,
    aiAssistError: null,
    aiAssistSuggestions: null,
    aiAssistParseError: false,
    aiSuggestionDecisions: {},
    aiFieldSourceMeta: {},
  };
}

const resolveBuyerRfqDetailOpenAction = ({
  rfqId,
  fallbackRfqId,
  source = 'dialog',
  currentDetailView,
}: {
  rfqId?: string;
  fallbackRfqId?: string | null;
  source?: BuyerRfqDetailSource;
  currentDetailView: BuyerRfqDetailViewState;
}) => {
  const nextRfqId = rfqId ?? fallbackRfqId;
  if (!nextRfqId) {
    return {
      kind: 'noop' as const,
      rfqId: null,
      detailView: null,
    };
  }

  if (
    currentDetailView.rfqId === nextRfqId
    && currentDetailView.data
    && currentDetailView.source === source
  ) {
    return {
      kind: 'reuse' as const,
      rfqId: nextRfqId,
      detailView: {
        ...currentDetailView,
        open: true,
        error: null,
      },
    };
  }

  return {
    kind: 'load' as const,
    rfqId: nextRfqId,
    detailView: {
      open: true,
      source,
      rfqId: nextRfqId,
      loading: true,
      error: null,
      data: null,
    } satisfies BuyerRfqDetailViewState,
  };
};

const resolveBuyerRfqDetailSuccess = ({
  rfqId,
  source,
  response,
}: {
  rfqId: string;
  source: BuyerRfqDetailSource;
  response: BuyerRfqDetailResponse;
}) => ({
  open: true,
  source,
  rfqId,
  loading: false,
  error: null,
  data: response.rfq,
} satisfies BuyerRfqDetailViewState);

const resolveBuyerRfqDetailError = ({
  rfqId,
  source,
  error,
}: {
  rfqId: string;
  source: BuyerRfqDetailSource;
  error: unknown;
}) => ({
  open: true,
  source,
  rfqId,
  loading: false,
  error: error instanceof APIError ? error.message : 'Unable to load RFQ detail right now.',
  data: null,
} satisfies BuyerRfqDetailViewState);

const loadBuyerRfqDetailContinuity = async ({
  rfqId,
  source,
  loadBuyerRfqDetail,
}: {
  rfqId: string;
  source: BuyerRfqDetailSource;
  loadBuyerRfqDetail: (rfqId: string) => Promise<BuyerRfqDetailResponse>;
}) => {
  try {
    const response = await loadBuyerRfqDetail(rfqId);
    return resolveBuyerRfqDetailSuccess({ rfqId, source, response });
  } catch (error) {
    return resolveBuyerRfqDetailError({ rfqId, source, error });
  }
};

const resolveBuyerRfqDetailReturnToListState = ({
  currentTradeBridge,
}: {
  currentTradeBridge: BuyerRfqTradeBridgeState;
}) => ({
  tradeBridge: {
    ...currentTradeBridge,
    loading: false,
    error: null,
  } satisfies BuyerRfqTradeBridgeState,
  detailView: createInitialBuyerRfqDetailViewState(),
});

const resolveBuyerRfqDetailCloseState = ({
  currentTradeBridge,
  currentDetailView,
}: {
  currentTradeBridge: BuyerRfqTradeBridgeState;
  currentDetailView: BuyerRfqDetailViewState;
}) => ({
  tradeBridge: {
    ...currentTradeBridge,
    loading: false,
    error: null,
  } satisfies BuyerRfqTradeBridgeState,
  detailView: {
    ...currentDetailView,
    open: false,
  } satisfies BuyerRfqDetailViewState,
});

const resolveBuyerRfqListOpenAction = (currentListView: BuyerRfqListViewState) => ({
  ...currentListView,
  loading: true,
  error: null,
}) satisfies BuyerRfqListViewState;

const loadBuyerRfqListContinuity = async ({
  loadBuyerRfqs,
}: {
  loadBuyerRfqs: () => Promise<BuyerRfqListResponse>;
}) => {
  try {
    const response = await loadBuyerRfqs();
    return {
      loading: false,
      error: null,
      rfqs: response.rfqs,
    } satisfies BuyerRfqListViewState;
  } catch (error) {
    return {
      loading: false,
      error: error instanceof APIError ? error.message : 'Unable to load your RFQs right now.',
      rfqs: [],
    } satisfies BuyerRfqListViewState;
  }
};

const resolveSupplierRfqInboxOpenAction = (currentListView: SupplierRfqListViewState) => ({
  detailView: createInitialSupplierRfqDetailViewState(),
  listView: {
    ...currentListView,
    loading: true,
    error: null,
  } satisfies SupplierRfqListViewState,
});

const resolveSupplierRfqInboxEntryState = (currentListView: SupplierRfqListViewState) => ({
  routeKey: 'supplier_rfq_inbox' as const,
  ...resolveSupplierRfqInboxOpenAction(currentListView),
});

const loadSupplierRfqInboxContinuity = async ({
  loadSupplierRfqInbox,
}: {
  loadSupplierRfqInbox: () => Promise<SupplierRfqListResponse>;
}) => {
  try {
    const response = await loadSupplierRfqInbox();
    return {
      loading: false,
      error: null,
      rfqs: response.rfqs,
    } satisfies SupplierRfqListViewState;
  } catch (error) {
    return {
      loading: false,
      error: error instanceof APIError ? error.message : 'Unable to load the supplier RFQ inbox right now.',
      rfqs: [],
    } satisfies SupplierRfqListViewState;
  }
};

const resolveSupplierRfqDetailOpenAction = ({
  rfqId,
  currentDetailView,
}: {
  rfqId: string;
  currentDetailView: SupplierRfqDetailViewState;
}) => {
  const existingResponse = currentDetailView.rfqId === rfqId ? currentDetailView.response : null;

  if (currentDetailView.rfqId === rfqId && currentDetailView.data) {
    return {
      kind: 'reuse' as const,
      detailView: {
        ...currentDetailView,
        open: true,
        error: null,
        submitError: null,
      },
    };
  }

  return {
    kind: 'load' as const,
    detailView: {
      open: true,
      rfqId,
      loading: true,
      error: null,
      submitLoading: false,
      submitError: null,
      data: null,
      response: existingResponse,
    } satisfies SupplierRfqDetailViewState,
  };
};

const loadSupplierRfqDetailContinuity = async ({
  rfqId,
  existingResponse,
  loadSupplierRfqDetail,
}: {
  rfqId: string;
  existingResponse: SupplierRfqResponse | null;
  loadSupplierRfqDetail: (rfqId: string) => Promise<SupplierRfqDetailResponse>;
}) => {
  try {
    const response = await loadSupplierRfqDetail(rfqId);
    return {
      open: true,
      rfqId,
      loading: false,
      error: null,
      submitLoading: false,
      submitError: null,
      data: response.rfq,
      response: existingResponse,
    } satisfies SupplierRfqDetailViewState;
  } catch (error) {
    return {
      open: true,
      rfqId,
      loading: false,
      error: error instanceof APIError ? error.message : 'Unable to load supplier RFQ detail right now.',
      submitLoading: false,
      submitError: null,
      data: null,
      response: existingResponse,
    } satisfies SupplierRfqDetailViewState;
  }
};

const resolveSupplierRfqDetailReturnToInboxState = () => createInitialSupplierRfqDetailViewState();

const resolveSupplierRfqDetailCloseState = () => ({
  detailView: resolveSupplierRfqDetailReturnToInboxState(),
  navigateToDefaultRoute: true as const,
});

const resolveSupplierRfqInboxCloseState = () => ({
  detailView: resolveSupplierRfqDetailReturnToInboxState(),
  navigateToDefaultRoute: true as const,
});

const resolveSupplierRfqRespondSubmitAction = ({
  message,
  currentDetailView,
}: {
  message: string;
  currentDetailView: SupplierRfqDetailViewState;
}) => {
  if (!message.trim()) {
    return {
      kind: 'validation-error' as const,
      payload: null,
      detailView: {
        ...currentDetailView,
        submitLoading: false,
        submitError: 'Response message is required.',
      } satisfies SupplierRfqDetailViewState,
    };
  }

  return {
    kind: 'submit' as const,
    payload: {
      message,
    } satisfies SubmitSupplierRfqResponseRequest,
    detailView: {
      ...currentDetailView,
      submitLoading: true,
      submitError: null,
    } satisfies SupplierRfqDetailViewState,
  };
};

const resolveSupplierRfqRespondSuccess = ({
  rfqId,
  currentDetailView,
  currentListView,
  result,
}: {
  rfqId: string;
  currentDetailView: SupplierRfqDetailViewState;
  currentListView: SupplierRfqListViewState;
  result: SubmitSupplierRfqResponseResult;
}) => ({
  detailView: {
    ...currentDetailView,
    submitLoading: false,
    submitError: null,
    data: currentDetailView.data
      ? {
          ...currentDetailView.data,
          status: result.rfq.status,
          updated_at: result.response.updated_at,
        }
      : currentDetailView.data,
    response: result.response,
  } satisfies SupplierRfqDetailViewState,
  listView: {
    ...currentListView,
    rfqs: currentListView.rfqs.map(rfq =>
      rfq.id === rfqId
        ? {
            ...rfq,
            status: result.rfq.status,
            updated_at: result.response.updated_at,
          }
        : rfq
    ),
  } satisfies SupplierRfqListViewState,
});

const resolveSupplierRfqRespondError = ({
  currentDetailView,
  currentListView,
  error,
}: {
  currentDetailView: SupplierRfqDetailViewState;
  currentListView: SupplierRfqListViewState;
  error: unknown;
}) => ({
  detailView: {
    ...currentDetailView,
    submitLoading: false,
    submitError: error instanceof APIError ? error.message : 'Unable to submit the supplier response right now.',
  } satisfies SupplierRfqDetailViewState,
  listView: currentListView,
});

const submitSupplierRfqResponseContinuity = async ({
  rfqId,
  payload,
  currentDetailView,
  currentListView,
  submitResponse,
}: {
  rfqId: string;
  payload: SubmitSupplierRfqResponseRequest;
  currentDetailView: SupplierRfqDetailViewState;
  currentListView: SupplierRfqListViewState;
  submitResponse: (
    rfqId: string,
    payload: SubmitSupplierRfqResponseRequest
  ) => Promise<SubmitSupplierRfqResponseResult>;
}) => {
  try {
    const result = await submitResponse(rfqId, payload);
    return resolveSupplierRfqRespondSuccess({
      rfqId,
      currentDetailView,
      currentListView,
      result,
    });
  } catch (error) {
    return resolveSupplierRfqRespondError({
      currentDetailView,
      currentListView,
      error,
    });
  }
};

const VERIFICATION_BLOCKED_VIEWS = new Set([
  'TRADES',
  'RFQS',
  'SUPPLIER_RFQ_INBOX',
  'ESCROW',
  'SETTLEMENT',
  'INVOICES',
  'INVOICE_APPROVAL',
]);
const ENTERPRISE_HOME_CATALOG_FIRST_PAINT_LIMIT = 8;
const ENTERPRISE_HOME_CATALOG_TAIL_LIMIT = 12;
const ENTERPRISE_HOME_CATALOG_TAIL_DELAY_MS = 250;
const DEFAULT_DOCUMENT_TITLE = 'TexQtic';
const DOCUMENT_TITLE_HOME_ROUTES = new Set(['Catalog', 'Storefront Home', 'Workspace Home']);

function joinDocumentTitle(...segments: Array<string | null | undefined>) {
  return segments.filter((segment): segment is string => Boolean(segment)).join(' | ');
}

function normalizeDocumentRouteTitle(title: string | null | undefined) {
  if (!title || DOCUMENT_TITLE_HOME_ROUTES.has(title)) {
    return null;
  }

  return title;
}

const resolveBuyerRfqTradeFromRfqCreateAction = (rfq: BuyerRfqDetail | null) => {
  if (rfq?.status !== 'RESPONDED') {
    return {
      kind: 'noop' as const,
      tradeBridge: null,
      payload: null,
    };
  }

  // Supplier-quoted commercial amount is not available on the buyer RFQ detail surface.
  // Trade creation from RFQ requires a supplier quote pricing workflow (not yet supported).
  // Do not use catalog item price or any buyer-facing price field.
  return {
    kind: 'noop' as const,
    tradeBridge: null,
    payload: null,
  };
};

const resolveBuyerRfqTradeFromRfqSuccess = ({
  currentDetailView,
  result,
}: {
  currentDetailView: BuyerRfqDetailViewState;
  result: CreateTradeFromRfqResponse;
}) => ({
  detailView: {
    ...currentDetailView,
    open: false,
    data: currentDetailView.data
      ? {
          ...currentDetailView.data,
          trade_continuity: {
            trade_id: result.tradeId,
            trade_reference: result.tradeReference,
          },
        }
      : currentDetailView.data,
  } satisfies BuyerRfqDetailViewState,
  tradeBridge: {
    ...createInitialBuyerRfqTradeBridgeState(),
    initialTradeId: result.tradeId,
  } satisfies BuyerRfqTradeBridgeState,
});

const resolveBuyerRfqTradeFromRfqError = (error: unknown) => ({
  ...createInitialBuyerRfqTradeBridgeState(),
  error: error instanceof APIError ? error.message : 'Unable to continue this responded RFQ into the existing trade flow right now.',
}) satisfies BuyerRfqTradeBridgeState;

const continueBuyerRfqTradeFromRfqCreatePath = async ({
  payload,
  currentDetailView,
  createTrade,
}: {
  payload: CreateTradeFromRfqInput;
  currentDetailView: BuyerRfqDetailViewState;
  createTrade: (input: CreateTradeFromRfqInput) => Promise<CreateTradeFromRfqResponse>;
}) => {
  try {
    const result = await createTrade(payload);
    return {
      kind: 'created' as const,
      ...resolveBuyerRfqTradeFromRfqSuccess({
        currentDetailView,
        result,
      }),
    };
  } catch (error) {
    return {
      kind: 'error' as const,
      error,
    };
  }
};

const WL_ADMIN_VIEWS = ['BRANDING', 'STAFF', 'PRODUCTS', 'COLLECTIONS', 'ORDERS', 'DOMAINS', 'DPP_LABEL'] as const;
type WLAdminView = (typeof WL_ADMIN_VIEWS)[number];

const EXPERIENCE_VIEWS = [
  'HOME',
  'BUYER_CATALOG',
  'ORDERS',
  'DPP',
  'ESCROW',
  'ESCALATIONS',
  'SETTLEMENT',
  'CERTIFICATIONS',
  'TRACEABILITY',
  'AUDIT_LOGS',
  'TRADES',
  'RFQS',
  'SUPPLIER_RFQ_INBOX',
  'GST_VERIFICATION',
  'INVOICES',
  'INVOICE_APPROVAL',
  'NC_POOLS',
  'NC_POOL_DETAIL',
  'NC_POOL_DEMAND_LINES',
  'NC_POOL_RFQ',
  'NC_POOL_INVITE_INBOX',
] as const;
type ExperienceView = (typeof EXPERIENCE_VIEWS)[number];

const normalizeWlAdminView = (view: string): WLAdminView => {
  if ((WL_ADMIN_VIEWS as readonly string[]).includes(view)) {
    return view as WLAdminView;
  }

  return 'BRANDING';
};

const normalizeExperienceView = (view: string): ExperienceView => {
  if ((EXPERIENCE_VIEWS as readonly string[]).includes(view)) {
    return view as ExperienceView;
  }

  return 'HOME';
};

const ONBOARDING_STATUS_CONTINUITY = {
  PENDING_VERIFICATION: {
    title: 'Business Verification In Review',
    detail:
      'Trade, RFQ, escrow, and settlement capabilities stay disabled until your business verification is approved.',
    bannerClassName: 'bg-blue-50 border-b border-blue-200 text-blue-900',
    panelClassName: 'bg-white border border-amber-200',
    badgeClassName: 'text-amber-800 bg-amber-50 border border-amber-200',
    bannerText:
      'Complete business verification to unlock trade and fund operations.',
  },
  VERIFICATION_REJECTED: {
    title: 'Business Verification Not Approved',
    detail:
      'Trade, RFQ, escrow, and settlement capabilities remain disabled because your submitted business verification was rejected.',
    bannerClassName: 'bg-rose-50 border-b border-rose-200 text-rose-900',
    panelClassName: 'bg-white border border-rose-200',
    badgeClassName: 'text-rose-800 bg-rose-50 border border-rose-200',
    bannerText:
      'Your business verification was not approved. Trade and fund operations remain disabled until a new approval outcome is recorded.',
  },
  VERIFICATION_NEEDS_MORE_INFO: {
    title: 'More Verification Information Required',
    detail:
      'Trade, RFQ, escrow, and settlement capabilities remain disabled until additional business verification information is provided and reviewed.',
    bannerClassName: 'bg-amber-50 border-b border-amber-300 text-amber-900',
    panelClassName: 'bg-white border border-amber-300',
    badgeClassName: 'text-amber-900 bg-amber-50 border border-amber-300',
    bannerText:
      'Your business verification requires more information. Trade and fund operations remain disabled until the verification review is completed.',
  },
} as const;

const getOnboardingStatusContinuity = (status: string | null | undefined) => {
  if (!status) {
    return null;
  }

  return ONBOARDING_STATUS_CONTINUITY[status as keyof typeof ONBOARDING_STATUS_CONTINUITY] ?? null;
};

type StoredImpersonationSession = {
  adminId: string;
  state: ImpersonationState;
};

type RehydrationTracePayload = Record<string, unknown>;

type TenantIdentityCarrierRecord = {
  id?: string | null;
  slug?: string | null;
  name?: string | null;
  type?: string | null;
  tenant_category?: string | null;
  is_white_label?: boolean | null;
  isWhiteLabel?: boolean | null;
  base_family?: string | null;
  aggregator_capability?: boolean | null;
  white_label_capability?: boolean | null;
  commercial_plan?: string | null;
  status?: string | null;
  plan?: string | null;
  primary_segment_key?: string | null;
  secondary_segment_keys?: string[] | null;
  role_position_keys?: string[] | null;
};

type RuntimeTenantRecord = Tenant & {
  primary_segment_key?: string | null;
  secondary_segment_keys?: string[];
  role_position_keys?: string[];
};

const normalizeBaseFamily = (value: string | null | undefined) => {
  const normalized = value?.trim().toUpperCase();

  switch (normalized) {
    case TenantType.B2B:
    case TenantType.B2C:
    case TenantType.INTERNAL:
      return normalized;
    default:
      return null;
  }
};

const normalizeCompatTenantCategory = (value: string | null | undefined) => {
  const normalized = value?.trim().toUpperCase();

  switch (normalized) {
    case TenantType.AGGREGATOR:
    case TenantType.B2B:
    case TenantType.B2C:
    case TenantType.INTERNAL:
      return normalized;
    default:
      return null;
  }
};

const resolveTenantIdentityCarrier = (tenant?: TenantIdentityCarrierRecord | null) => {
  const compatCategory = normalizeCompatTenantCategory(tenant?.tenant_category ?? tenant?.type);
  const baseFamily = normalizeBaseFamily(tenant?.base_family)
    ?? (compatCategory === TenantType.B2B || compatCategory === TenantType.B2C || compatCategory === TenantType.INTERNAL
      ? compatCategory
      : null);
  const aggregatorCapability = typeof tenant?.aggregator_capability === 'boolean'
    ? tenant.aggregator_capability
    : compatCategory === TenantType.AGGREGATOR;
  let whiteLabelCapability = false;
  if (typeof tenant?.white_label_capability === 'boolean') {
    whiteLabelCapability = tenant.white_label_capability;
  } else if (typeof tenant?.is_white_label === 'boolean') {
    whiteLabelCapability = tenant.is_white_label;
  } else if (typeof tenant?.isWhiteLabel === 'boolean') {
    whiteLabelCapability = tenant.isWhiteLabel;
  }

  let commercialPlanSource: string | null = null;
  if (typeof tenant?.commercial_plan === 'string' && tenant.commercial_plan.trim().length > 0) {
    commercialPlanSource = tenant.commercial_plan;
  } else if (typeof tenant?.plan === 'string' && tenant.plan.trim().length > 0) {
    commercialPlanSource = tenant.plan;
  }

  return {
    baseFamily,
    aggregatorCapability,
    whiteLabelCapability,
    commercialPlan: commercialPlanSource ? normalizeCommercialPlan(commercialPlanSource) : null,
    tenantCategory: aggregatorCapability ? TenantType.AGGREGATOR : baseFamily ?? compatCategory,
  };
};

const summarizeTenantIdentity = (tenant?: TenantIdentityCarrierRecord | null) => {
  if (!tenant) {
    return null;
  }

  return {
    id: tenant.id ?? null,
    slug: tenant.slug ?? null,
    name: tenant.name ?? null,
    type: tenant.type ?? null,
    tenant_category: tenant.tenant_category ?? null,
    is_white_label: tenant.is_white_label ?? null,
    base_family: tenant.base_family ?? null,
    aggregator_capability: tenant.aggregator_capability ?? null,
    white_label_capability: tenant.white_label_capability ?? null,
    commercial_plan: tenant.commercial_plan ?? null,
    primary_segment_key: tenant.primary_segment_key ?? null,
    secondary_segment_keys: tenant.secondary_segment_keys ?? null,
    role_position_keys: tenant.role_position_keys ?? null,
    status: tenant.status ?? null,
    plan: tenant.plan ?? null,
  };
};

const normalizeTenantTaxonomyList = (values: string[] | null | undefined) => {
  return Array.isArray(values)
    ? values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];
};

const resolveTenantTaxonomyCarrier = (tenant?: Pick<
  TenantIdentityCarrierRecord,
  'primary_segment_key' | 'secondary_segment_keys' | 'role_position_keys'
> | null) => {
  return {
    primarySegmentKey:
      typeof tenant?.primary_segment_key === 'string' && tenant.primary_segment_key.trim().length > 0
        ? tenant.primary_segment_key
        : null,
    secondarySegmentKeys: normalizeTenantTaxonomyList(tenant?.secondary_segment_keys),
    rolePositionKeys: normalizeTenantTaxonomyList(tenant?.role_position_keys),
  };
};

const canRenderCanonicalB2BTaxonomy = (tenant?: TenantConfig | null) => {
  if (!tenant) {
    return false;
  }

  const identity = resolveTenantIdentityCarrier(tenant);
  if (identity.aggregatorCapability || identity.whiteLabelCapability) {
    return false;
  }

  return identity.baseFamily === TenantType.B2B || identity.tenantCategory === TenantType.B2B;
};

export const B2BTenantTaxonomyPanel: React.FC<{ tenant: TenantConfig }> = ({ tenant }) => {
  const { primarySegmentKey, secondarySegmentKeys, rolePositionKeys } = resolveTenantTaxonomyCarrier(tenant);

  if (!canRenderCanonicalB2BTaxonomy(tenant)) {
    return null;
  }

  if (!primarySegmentKey && secondarySegmentKeys.length === 0 && rolePositionKeys.length === 0) {
    return null;
  }

  return (
    <section
      data-tenant-taxonomy="b2b-canonical"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Canonical Taxonomy</div>
        <h2 className="text-lg font-semibold text-slate-900">B2B Organization Taxonomy</h2>
        <p className="text-sm text-slate-500">Canonical organization taxonomy carried on the active tenant session.</p>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Primary Segment</div>
          <div className="text-sm font-medium text-slate-900">{primarySegmentKey ?? 'Not assigned'}</div>
        </div>
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Secondary Segments</div>
          <ul className="flex flex-wrap gap-2 text-sm text-slate-900">
            {secondarySegmentKeys.map(segmentKey => (
              <li key={segmentKey} className="rounded-full border border-slate-200 bg-white px-3 py-1">
                {segmentKey}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Role Positions</div>
          <ul className="flex flex-wrap gap-2 text-sm text-slate-900">
            {rolePositionKeys.map(rolePositionKey => (
              <li key={rolePositionKey} className="rounded-full border border-slate-200 bg-white px-3 py-1">
                {rolePositionKey}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

const appendRehydrationTrace = (event: string, payload: RehydrationTracePayload = {}) => {
  if (typeof globalThis.window === 'undefined') {
    return;
  }

  const entry = {
    ts: new Date().toISOString(),
    event,
    payload,
  };

  try {
    const existing = window.sessionStorage.getItem(REHYDRATION_TRACE_KEY);
    const parsed = existing ? JSON.parse(existing) : [];
    const next = Array.isArray(parsed) ? [...parsed, entry].slice(-100) : [entry];
    window.sessionStorage.setItem(REHYDRATION_TRACE_KEY, JSON.stringify(next));
    console.info('[rehydration-trace]', entry);
  } catch {
    console.info('[rehydration-trace]', entry);
  }
};

const readStoredTenantJwtClaims = (): { userId: string | null; tenantId: string | null; role: string | null } | null => {
  if (typeof globalThis.window === 'undefined') {
    return null;
  }

  const token = localStorage.getItem('texqtic_tenant_token');
  if (!token) {
    return null;
  }

  const [, payload] = token.split('.');
  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replaceAll('-', '+').replaceAll('_', '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = JSON.parse(globalThis.atob(padded)) as {
      userId?: unknown;
      tenantId?: unknown;
      role?: unknown;
    };

    return {
      userId: typeof decoded.userId === 'string' ? decoded.userId : null,
      tenantId: typeof decoded.tenantId === 'string' ? decoded.tenantId : null,
      role: typeof decoded.role === 'string' ? decoded.role : null,
    };
  } catch {
    return null;
  }
};

const resolveTenantRole = (role: string | null | undefined, tenantId?: string | null) => {
  if (role) {
    return role;
  }

  const claims = readStoredTenantJwtClaims();
  if (!claims) {
    return null;
  }

  if (tenantId && claims.tenantId && claims.tenantId !== tenantId) {
    return null;
  }

  return claims.role;
};

const buildControlPlaneIdentity = (user?: { id?: string; email?: string }, role?: string | null) => {
  if (!user?.id && !user?.email && !role) {
    return null;
  }

  return {
    id: user?.id ?? null,
    email: user?.email ?? null,
    role: role ?? null,
  };
};

const resolveTenantAdminEntryState = (
  nextState: RuntimeAppState | null,
): 'EXPERIENCE' | null => {
  if (nextState === 'EXPERIENCE' || nextState === 'WL_ADMIN') {
    return 'EXPERIENCE';
  }

  return null;
};

const persistControlPlaneIdentity = (identity: ControlPlaneIdentity | null) => {
  if (!identity) {
    localStorage.removeItem(CONTROL_PLANE_IDENTITY_KEY);
    return;
  }

  localStorage.setItem(CONTROL_PLANE_IDENTITY_KEY, JSON.stringify(identity));
};

const readStoredControlPlaneIdentity = (): ControlPlaneIdentity | null => {
  const raw = localStorage.getItem(CONTROL_PLANE_IDENTITY_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ControlPlaneIdentity;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return {
      id: typeof parsed.id === 'string' ? parsed.id : null,
      email: typeof parsed.email === 'string' ? parsed.email : null,
      role: typeof parsed.role === 'string' ? parsed.role : null,
    };
  } catch {
    return null;
  }
};

const readStoredAdminJwtClaims = (): { adminId: string; role: string | null; exp: number | null } | null => {
  const token = localStorage.getItem('texqtic_admin_token');
  if (!token) {
    return null;
  }

  const [, payload] = token.split('.');
  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replaceAll('-', '+').replaceAll('_', '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = JSON.parse(globalThis.atob(padded)) as {
      adminId?: unknown;
      role?: unknown;
      exp?: unknown;
    };

    if (typeof decoded.adminId !== 'string') {
      return null;
    }

    return {
      adminId: decoded.adminId,
      role: typeof decoded.role === 'string' ? decoded.role : null,
      exp: typeof decoded.exp === 'number' ? decoded.exp : null,
    };
  } catch {
    return null;
  }
};

const buildTenantSnapshot = (tenant?: TenantIdentityCarrierRecord | null): RuntimeTenantRecord | null => {
  appendRehydrationTrace('buildTenantSnapshot:input', {
    tenant: summarizeTenantIdentity(tenant),
  });

  const identity = resolveTenantIdentityCarrier(tenant);

  if (!tenant?.id || !tenant.slug || !tenant.name || !tenant.status || !identity.commercialPlan) {
    appendRehydrationTrace('buildTenantSnapshot:output', {
      tenant: null,
      reason: 'missing_required_fields',
    });
    return null;
  }

  if (!identity.tenantCategory) {
    appendRehydrationTrace('buildTenantSnapshot:output', {
      tenant: null,
      reason: 'incomplete_identity_carrier',
    });
    return null;
  }

  const taxonomyCarrier = resolveTenantTaxonomyCarrier(tenant);

  const normalizedSnapshot: RuntimeTenantRecord = {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    type: identity.tenantCategory as TenantType,
    tenant_category: identity.tenantCategory,
    is_white_label: identity.whiteLabelCapability,
    base_family: identity.baseFamily,
    aggregator_capability: identity.aggregatorCapability,
    white_label_capability: identity.whiteLabelCapability,
    commercial_plan: identity.commercialPlan,
    primary_segment_key: taxonomyCarrier.primarySegmentKey,
    secondary_segment_keys: taxonomyCarrier.secondarySegmentKeys,
    role_position_keys: taxonomyCarrier.rolePositionKeys,
    status: tenant.status as any,
    plan: identity.commercialPlan,
    createdAt: '',
    updatedAt: '',
  };

  appendRehydrationTrace('buildTenantSnapshot:output', {
    tenant: summarizeTenantIdentity(normalizedSnapshot),
  });

  return normalizedSnapshot;
};

const persistImpersonationSession = (session: StoredImpersonationSession | null) => {
  if (!session) {
    localStorage.removeItem(IMPERSONATION_SESSION_KEY);
    return;
  }

  localStorage.setItem(IMPERSONATION_SESSION_KEY, JSON.stringify(session));
};

const readStoredImpersonationState = (state: Partial<ImpersonationState> | undefined, tenantId: string | undefined) => {
  if (
    state?.isAdmin !== true ||
    typeof state?.targetTenantId !== 'string' ||
    typeof state?.startTime !== 'string' ||
    typeof state?.impersonationId !== 'string' ||
    typeof state?.token !== 'string' ||
    typeof state?.expiresAt !== 'string'
  ) {
    return null;
  }

  const expiry = Date.parse(state.expiresAt);
  if (!Number.isFinite(expiry) || expiry <= Date.now() || state.targetTenantId !== tenantId) {
    return null;
  }

  return {
    isAdmin: true,
    targetTenantId: state.targetTenantId,
    startTime: state.startTime,
    impersonationId: state.impersonationId,
    token: state.token,
    expiresAt: state.expiresAt,
  } satisfies ImpersonationState;
};

const readStoredImpersonationSession = (): StoredImpersonationSession | null => {
  const raw = localStorage.getItem(IMPERSONATION_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      adminId?: unknown;
      state?: Partial<ImpersonationState>;
    };

    if (typeof parsed.adminId !== 'string') {
      return null;
    }

    const targetTenantId =
      typeof parsed.state?.targetTenantId === 'string' ? parsed.state.targetTenantId : undefined;
    const state = readStoredImpersonationState(parsed.state, targetTenantId);
    if (!state) {
      return null;
    }

    return {
      adminId: parsed.adminId,
      state,
    };
  } catch {
    return null;
  }
};

const resolveCanonicalImpersonationTenant = (
  tenant: TenantIdentityCarrierRecord | null | undefined,
  targetTenantId: string | null | undefined
) => {
  const snapshot = buildTenantSnapshot(tenant);
  if (!snapshot || !targetTenantId || snapshot.id !== targetTenantId) {
    return null;
  }

  return snapshot;
};

const resolveRuntimeTenantSeedFromRecord = (
  tenant: TenantIdentityCarrierRecord | null | undefined,
) => {
  const identity = resolveTenantIdentityCarrier(tenant);

  return {
    baseFamily: identity.baseFamily,
    aggregatorCapability: identity.aggregatorCapability,
    tenantCategory: identity.tenantCategory,
    whiteLabelCapability: identity.whiteLabelCapability,
    commercialPlan: identity.commercialPlan,
  };
};

const resolveTenantBootstrapAuthView = ({
  authRealm,
  tenantRestorePending,
  tenantBootstrapBlockedMessage,
  tenantProvisionError,
}: {
  authRealm: 'TENANT' | 'CONTROL_PLANE';
  tenantRestorePending: boolean;
  tenantBootstrapBlockedMessage: string | null;
  tenantProvisionError: string | null;
}) => {
  if (authRealm === 'TENANT' && tenantRestorePending) {
    return 'TENANT_RESOLVING' as const;
  }

  if (authRealm === 'TENANT' && (tenantBootstrapBlockedMessage || tenantProvisionError)) {
    return 'TENANT_BLOCKED' as const;
  }

  return 'AUTH_FORM' as const;
};

export const __PHASE1_FOUNDATION_CORRECTION_TESTING__ = {
  readStoredTenantJwtClaims,
  buildTenantSnapshot,
  readStoredImpersonationSession,
  resolveCanonicalImpersonationTenant,
  resolveRuntimeTenantSeedFromRecord,
  resolveTenantBootstrapAuthView,
};

export const __B2B_RFQ_INITIATION_TESTING__ = {
  createInitialBuyerRfqDialogState,
  createInitialBuyerRfqDetailViewState,
  resolveBuyerRfqOpenAction,
  resolveBuyerRfqCloseState,
  resolveBuyerRfqSubmitPayload,
  resolveBuyerRfqSubmitSuccess,
  resolveBuyerRfqSubmitError,
};

export const __B2B_RFQ_STRUCTURED_DIALOG_TESTING__ = {
  resolveStructuredRfqStageSectionFields,
  resolveRfqConfirmationSummary,
};

export const __B2B_AI_RFQ_ASSIST_TESTING__ = {
  resolveAiAssistDisplayItems,
  resolveApplyAiSuggestion,
  resolveRejectAiSuggestion,
  resolveAiAssistStateOnClose,
  AI_ASSIST_DISPLAY_FIELDS,
};

export const __B2B_RFQ_DETAIL_TESTING__ = {
  resolveBuyerRfqDetailOpenAction,
  loadBuyerRfqDetailContinuity,
};

export const __B2B_BUYER_RFQ_DETAIL_RETURN_TESTING__ = {
  resolveBuyerRfqDetailReturnToListState,
};

export const __B2B_BUYER_RFQ_DETAIL_CLOSE_TESTING__ = {
  resolveBuyerRfqDetailCloseState,
};

export const __B2B_BUYER_RFQ_LIST_TESTING__ = {
  createInitialBuyerRfqListViewState,
  resolveBuyerRfqListOpenAction,
  loadBuyerRfqListContinuity,
};

export const __B2B_SUPPLIER_INBOX_TESTING__ = {
  resolveSupplierRfqInboxCloseState,
  resolveSupplierRfqInboxEntryState,
  resolveSupplierRfqInboxOpenAction,
  loadSupplierRfqInboxContinuity,
};

export const __B2B_SUPPLIER_DETAIL_TESTING__ = {
  createInitialSupplierRfqDetailViewState,
  resolveSupplierRfqDetailOpenAction,
  resolveSupplierRfqDetailReturnToInboxState,
  resolveSupplierRfqDetailCloseState,
  loadSupplierRfqDetailContinuity,
};

export const __B2B_SUPPLIER_RESPOND_TESTING__ = {
  resolveSupplierRfqRespondSubmitAction,
  submitSupplierRfqResponseContinuity,
};

export const __B2B_TRADE_FROM_RFQ_TESTING__ = {
  createInitialBuyerRfqTradeBridgeState,
  resolveBuyerRfqTradeFromRfqCreateAction,
  continueBuyerRfqTradeFromRfqCreatePath,
  resolveBuyerRfqTradeFromRfqError,
};

// TECS-B2B-BUYER-SUPPLIER-SELECTION-UX-REFINE-001: Pure helper — resolves display name from
// the in-memory supplierPickerItems list. Falls back to 'Supplier Catalog' when not found.
export function resolveSupplierDisplayName(
  items: Array<{ id: string; legalName: string }>,
  supplierOrgId: string,
): string {
  return items.find(s => s.id === supplierOrgId)?.legalName ?? 'Supplier Catalog';
}

// Pure helper — resolves which phase of the buyer catalog surface should render.
export function resolveSupplierCatalogPhase(supplierOrgId: string): 'PHASE_A' | 'PHASE_B' {
  return supplierOrgId ? 'PHASE_B' : 'PHASE_A';
}

export const __B2B_BUYER_CATALOG_TESTING__ = {
  resolveSupplierDisplayName,
  resolveSupplierCatalogPhase,
};

// TECS-B2B-BUYER-CATALOG-LISTING-001: Pure descriptors for focused listing tests.
export function formatMoqLabel(moq: number): string {
  return `Min. Order: ${moq}`;
}

export function resolveImageFallbackAriaLabel(itemName: string): string {
  return `${itemName} \u2014 image not available`;
}

export const PHASE_B_EMPTY_STATE_LINES: [string, string] = [
  'This supplier has no active catalog items at this time.',
  'Contact the supplier directly if you expect items to be available.',
];

// TECS-B2B-BUYER-CATALOG-SEARCH-FILTER-001: Search-empty state descriptor.
// Distinct copy from empty-catalog state (no results for given query).
export const PHASE_B_SEARCH_EMPTY_STATE_LINE =
  'No items match your search. Try a different name or SKU.';

// Pure predicate: true when search is active and returned zero items (search-empty).
export function resolveSearchEmptyState(
  search: string,
  itemCount: number,
  loading: boolean,
): boolean {
  return !loading && search.trim().length > 0 && itemCount === 0;
}

// Pure predicate: true when no search is active and supplier has zero items (catalog-empty).
export function resolveEmptyCatalogState(
  search: string,
  itemCount: number,
  loading: boolean,
): boolean {
  return !loading && search.trim().length === 0 && itemCount === 0;
}

// Pure guard: true only when a load-more is safe to start.
export function canStartLoadMore(loadingMore: boolean, nextCursor: string | null): boolean {
  return !loadingMore && nextCursor !== null;
}

export const __B2B_BUYER_CATALOG_LISTING_TESTING__ = {
  formatMoqLabel,
  resolveImageFallbackAriaLabel,
  PHASE_B_EMPTY_STATE_LINES,
  canStartLoadMore,
};

export const __B2B_BUYER_CATALOG_SEARCH_TESTING__ = {
  PHASE_B_SEARCH_EMPTY_STATE_LINE,
  resolveSearchEmptyState,
  resolveEmptyCatalogState,
};

// TECS-B2B-BUYER-CATALOG-PDP-001 P-2: Pure PDP constants exported for tests.
export const PDP_COMPLIANCE_NOTICE =
  'AI-generated extraction \u00b7 Human review required before acting on any extracted data';
export const PDP_PRICE_PLACEHOLDER_LABEL = 'Price available on request' as const;
export const PDP_RFQ_TRIGGER_LABEL = 'Request Quote' as const;
export const PDP_LOADING_COPY = 'Loading item details\u2026' as const;
export const PDP_ERROR_COPY = 'Unable to load item details.' as const;
export const PDP_NOT_FOUND_COPY =
  'This item is unavailable in buyer view. Supplier-private or relationship-restricted catalogue items cannot be opened from this context.' as const;

export const PDP_NOT_FOUND_SELF_SUPPLIER_COPY =
  'This item is restricted in buyer view. Suppliers cannot request or buy their own approval-gated catalogue items from the buyer PDP.' as const;

/**
 * Resolve which buyer_catalog phase is active.
 * PHASE_A: no supplier selected yet.
 * PHASE_B: supplier selected, no item selected.
 * PHASE_C: item selected (PDP view).
 */
export function resolveBuyerCatalogPhase(
  supplierOrgId: string,
  selectedItemId: string,
): 'PHASE_A' | 'PHASE_B' | 'PHASE_C' {
  if (selectedItemId.trim().length > 0) return 'PHASE_C';
  if (supplierOrgId.trim().length > 0) return 'PHASE_B';
  return 'PHASE_A';
}

export const __B2B_BUYER_CATALOG_PDP_TESTING__ = {
  PDP_COMPLIANCE_NOTICE,
  PDP_PRICE_PLACEHOLDER_LABEL,
  PDP_RFQ_TRIGGER_LABEL,
  PDP_LOADING_COPY,
  PDP_ERROR_COPY,
  PDP_NOT_FOUND_COPY,
  PDP_NOT_FOUND_SELF_SUPPLIER_COPY,
  resolveBuyerCatalogPhase,
};

// Pure resolver: maps a GstVerificationRecord (or null) to the provisional shell status.
// Extracted for test coverage — this is the exact same logic as the useEffect setProvisionalGstStatus calls.
export function resolveProvisionalGstStatus(
  record: GstVerificationRecord | null,
): 'not_submitted' | 'pending' | 'rejected' | 'needs_more_info' | 'approved' {
  if (!record) return 'not_submitted';
  if (record.review_outcome === 'REJECTED') return 'rejected';
  if (record.review_outcome === 'NEEDS_MORE_INFO') return 'needs_more_info';
  if (record.review_outcome === 'APPROVED') return 'approved';
  return 'pending';
}

export const __PROVISIONAL_GST_SHELL_TESTING__ = {
  resolveProvisionalGstStatus,
  getOnboardingStatusContinuity,
};

type AppState =
  | 'PUBLIC_ENTRY'
  | 'PUBLIC_B2B_DISCOVERY'
  | 'PUBLIC_B2C_BROWSE'
  | 'PUBLIC_B2C_CATEGORY_STORY'
  | 'PUBLIC_AGGREGATOR'
  | 'PUBLIC_COLLECTIONS'
  | 'PUBLIC_COLLECTION_DETAIL'
  | 'PUBLIC_COLLECTION_DETAIL_UNAVAILABLE'
  | 'PUBLIC_PRODUCT_DETAIL'
  | 'PUBLIC_PASSPORT'
  | 'PUBLIC_TRUST_LANDING'
  | 'PUBLIC_INDUSTRY_CLUSTER_LANDING'
  | 'PUBLIC_SUPPLIER_PROFILE'
  | 'PUBLIC_REFERRAL_LANDING'
  | 'PUBLIC_INQUIRY'
  | 'PUBLIC_PRICING'
  | 'PUBLIC_REQUEST_ACCESS'
  | 'PUBLIC_REGISTER'
  | 'PUBLIC_NOT_FOUND'
  | 'AUTH'
  | 'FORGOT_PASSWORD'
  | 'VERIFY_EMAIL'
  | 'TOKEN_HANDLER'
  | 'ONBOARDING_CONTINUATION'
  | 'ONBOARDING'
  | 'EXPERIENCE'
  | 'TEAM_MGMT'
  | 'INVITE_MEMBER'
  | 'SETTINGS'
  | 'CONTROL_PLANE'
  | 'WL_ADMIN'
  | 'ORDER_CONFIRMED';

type NeutralEntryPathSelection = 'B2B' | 'B2C' | 'SUPPLIER' | null;

const SUPPLIER_REQUEST_ACCESS_URL = '/register';

const hasStoredAuthenticatedSession = () => {
  if (globalThis.window === undefined) {
    return false;
  }

  return Boolean(
    globalThis.localStorage.getItem('texqtic_tenant_token')
    || globalThis.localStorage.getItem('texqtic_admin_token')
  );
};

const resolveInitialAppState = (): AppState => {
  if (globalThis.window !== undefined) {
    // TECS-DPP-PASSPORT-NETWORK-007: Public passport path — /passport/:id
    // Checked first so QR-code / direct-link visitors bypass auth state entirely.
    const passportPathMatch = globalThis.window.location.pathname.match(
      /^\/passport\/([^/]+)$/,
    );
    if (passportPathMatch) {
      return 'PUBLIC_PASSPORT';
    }

    // TEXQTIC-PUBLIC-DPP-TRUST-ORIGIN-PASSPORT-LANDING-STUB-IMPLEMENTATION-001
    // Static public trust landing page — /trust
    if (globalThis.window.location.pathname === '/trust') {
      return 'PUBLIC_TRUST_LANDING';
    }

    if (globalThis.window.location.pathname === '/industries') {
      return 'PUBLIC_INDUSTRY_CLUSTER_LANDING';
    }

    // TEXQTIC-AGGREGATOR-PUBLIC-PREVIEW-STATIC-IMPLEMENTATION-001
    // Static public Aggregator preview page — /aggregator
    if (globalThis.window.location.pathname === '/aggregator') {
      return 'PUBLIC_AGGREGATOR';
    }

    // ROUTE-001: Public supplier profile — /supplier/:slug
    const supplierPathMatch = globalThis.window.location.pathname.match(
      /^\/supplier\/([a-z0-9-]+)$/,
    );
    if (supplierPathMatch) {
      return 'PUBLIC_SUPPLIER_PROFILE';
    }

    if (
      globalThis.window.location.pathname === '/b2b' ||
      globalThis.window.location.pathname === '/b2b/'
    ) {
      return 'PUBLIC_B2B_DISCOVERY';
    }

    const productPathMatch = globalThis.window.location.pathname.match(
      /^\/product\/([a-z0-9-]+)$/,
    );
    if (productPathMatch) {
      return 'PUBLIC_PRODUCT_DETAIL';
    }

    // B2C-PUBLIC-CATEGORY-STORY-PAGES-IMPLEMENTATION-001:
    // /products base path → B2C browse (avoids unmatched-state 404 for /products)
    if (
      globalThis.window.location.pathname === '/products' ||
      globalThis.window.location.pathname === '/products/'
    ) {
      return 'PUBLIC_B2C_BROWSE';
    }

    // B2C-PUBLIC-CATEGORY-STORY-PAGES-IMPLEMENTATION-001:
    // /products/category/:slug → category story page
    const categoryPathMatch = globalThis.window.location.pathname.match(
      /^\/products\/category\/([a-z0-9-]+)$/,
    );
    if (categoryPathMatch) {
      return 'PUBLIC_B2C_CATEGORY_STORY';
    }

    const collectionPathMatch = globalThis.window.location.pathname.match(
      /^\/collections(?:\/([a-z0-9-]+))?$/,
    );
    if (collectionPathMatch) {
      const slug = collectionPathMatch[1];
      if (!slug) return 'PUBLIC_COLLECTIONS';
      const isApproved = getCollectionBySlug(slug, PUBLIC_COLLECTION_PROJECTIONS) !== undefined;
      return isApproved ? 'PUBLIC_COLLECTION_DETAIL' : 'PUBLIC_COLLECTION_DETAIL_UNAVAILABLE';
    }

    // REFERRAL-005: Referral join landing — /join/:referral_code
    const referralPathMatch = globalThis.window.location.pathname.match(
      /^\/join\/([a-zA-Z0-9_-]{1,80})$/,
    );
    if (referralPathMatch) {
      return 'PUBLIC_REFERRAL_LANDING';
    }

    // IMPL-MAINAPP-DIRECT-REGISTRATION-ENTRY-ROUTES-AND-ROLE-CHOOSER-01
    // Direct registration entry: /register plus optional role alias preselectors.
    const registerPathMatch = /^\/register(?:\/(supplier|buyer|service-provider))?\/?$/.exec(
      globalThis.window.location.pathname,
    );
    if (registerPathMatch) {
      return 'PUBLIC_REGISTER';
    }

    // PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-IMPLEMENTATION-001: /inquiry route
    if (
      globalThis.window.location.pathname === '/inquiry' ||
      globalThis.window.location.pathname === '/inquiry/'
    ) {
      return 'PUBLIC_INQUIRY';
    }

    // IMPLEMENT-MAINAPP-TIER0-REQUEST-ACCESS-UI-01: Tier 0 request-access route
    if (
      globalThis.window.location.pathname === '/request-access' ||
      globalThis.window.location.pathname === '/request-access/'
    ) {
      return 'PUBLIC_REQUEST_ACCESS';
    }

    // FAM-11D: Public pricing / plan comparison page — /pricing
    if (
      globalThis.window.location.pathname === '/pricing' ||
      globalThis.window.location.pathname === '/pricing/'
    ) {
      return 'PUBLIC_PRICING';
    }

    const params = new URLSearchParams(globalThis.window.location.search);
    const token = params.get('token');
    const action = params.get('action');

    if (token && action === 'invite') {
      return 'ONBOARDING';
    }

    if (token) {
      return 'TOKEN_HANDLER';
    }

    // C-FG-016: Any unrecognized path (not root) → explicit not-found surface with noindex
    const unknownPathname = globalThis.window.location.pathname;
    if (unknownPathname !== '/' && unknownPathname !== '') {
      return 'PUBLIC_NOT_FOUND';
    }
  }

  return hasStoredAuthenticatedSession() ? 'AUTH' : 'PUBLIC_ENTRY';
};

const resolveInitialAuthRealm = (): 'TENANT' | 'CONTROL_PLANE' => {
  return hasStoredAuthenticatedSession()
    ? getCurrentAuthRealm('TENANT') ?? 'TENANT'
    : 'TENANT';
};

const isNeutralPublicEntryDescriptor = (
  descriptor: PublicEntryResolutionDescriptor | null,
): descriptor is PublicEntryResolutionDescriptor => {
  return descriptor?.resolutionDisposition === 'NEUTRAL_NO_TENANT'
    && descriptor.resolvedRealmClass === 'NEUTRAL_PUBLIC_ENTRY'
    && descriptor.allowedTargetSurfaceClass === 'NEUTRAL_PUBLIC_ENTRY_SURFACE';
};

const clearPersistedImpersonationSession = () => {
  setImpersonationToken(null);
  persistImpersonationSession(null);
};

const App: React.FC = () => {

  useEffect(() => {
    const navigationEntry = window.performance.getEntriesByType('navigation')[0] as
      | { type?: string }
      | undefined;
    const navigationType = navigationEntry?.type ?? 'unknown';

    if (navigationType === 'reload') {
      window.sessionStorage.removeItem(REHYDRATION_TRACE_KEY);
    }

    appendRehydrationTrace('app:mount', {
      navigationType,
      hasTenantToken: !!localStorage.getItem('texqtic_tenant_token'),
      hasAdminToken: !!localStorage.getItem('texqtic_admin_token'),
      storedRealm: getCurrentAuthRealm('TENANT'),
    });
  }, []);

  // Production-grade State Machine
  const [appState, setAppState] = useState<AppState>(() => resolveInitialAppState());
  const [authRealm, setAuthRealm] = useState<'TENANT' | 'CONTROL_PLANE'>(() => resolveInitialAuthRealm());
  const effectiveRealm = useMemo(
    () => ((appState === 'AUTH' || appState === 'PUBLIC_ENTRY') ? authRealm : getCurrentAuthRealm() ?? 'TENANT'),
    [appState, authRealm]
  );
  const [publicEntryDescriptor, setPublicEntryDescriptor] = useState<PublicEntryResolutionDescriptor | null>(null);
  const [publicEntryBootstrapPending, setPublicEntryBootstrapPending] = useState(appState === 'PUBLIC_ENTRY');
  const [neutralEntryPathSelection, setNeutralEntryPathSelection] = useState<NeutralEntryPathSelection>(null);
  // TECS-DPP-PASSPORT-NETWORK-007: passport ID captured from /passport/:id pathname on load
  const [publicPassportIdFromPath] = useState<string>(() => {
    if (globalThis.window !== undefined) {
      const m = globalThis.window.location.pathname.match(/^\/passport\/([^/]+)$/);
      return m?.[1] ?? '';
    }
    return '';
  });
  // ROUTE-001: supplier slug captured from /supplier/:slug pathname on load
  const [publicSupplierSlugFromPath] = useState<string>(() => {
    if (globalThis.window !== undefined) {
      const m = globalThis.window.location.pathname.match(/^\/supplier\/([a-z0-9-]+)$/);
      return m?.[1] ?? '';
    }
    return '';
  });
  // QR-SOURCE-002: optional ?source= query param captured on load for supplier profile attribution
  const [publicSupplierSourceFromQuery] = useState<string>(() => {
    if (globalThis.window !== undefined) {
      return new URLSearchParams(globalThis.window.location.search).get('source') ?? '';
    }
    return '';
  });
  const [publicProductSlugFromPath] = useState<string>(() => {
    if (globalThis.window !== undefined) {
      const m = globalThis.window.location.pathname.match(/^\/product\/([a-z0-9-]+)$/);
      return m?.[1] ?? '';
    }
    return '';
  });
  // B2C-PRODUCT-DETAIL-RICH-SEO-001: product detail meta signal from PublicProductDetail callback
  const [publicProductDetailMeta, setPublicProductDetailMeta] =
    useState<PublicProductDetailMetaSignal | null>(null);
  const [publicCollectionSlugFromPath] = useState<string>(() => {
    if (globalThis.window !== undefined) {
      const m = globalThis.window.location.pathname.match(/^\/collections(?:\/([a-z0-9-]+))?$/);
      return m?.[1] ?? '';
    }
    return '';
  });
  // REFERRAL-005: referral code captured from /join/:referral_code pathname on load
  const [publicReferralCodeFromPath] = useState<string>(() => {
    if (globalThis.window !== undefined) {
      const m = globalThis.window.location.pathname.match(/^\/join\/([a-zA-Z0-9_-]{1,80})$/);
      return m?.[1] ?? '';
    }
    return '';
  });
  // PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-IMPLEMENTATION-001:
  // supplier slug captured from ?supplierSlug= query param on /inquiry load
  const [publicInquirySupplierSlugFromQuery] = useState<string>(() => {
    if (globalThis.window !== undefined) {
      const raw =
        new URLSearchParams(globalThis.window.location.search).get('supplierSlug') ?? '';
      return /^[a-z0-9-]+$/.test(raw) ? raw : '';
    }
    return '';
  });
  // PUBLIC-INQUIRY-CONTEXT-HANDOFF-IMPLEMENTATION-001:
  // context slugs and source surface captured from query params on /inquiry load
  const [publicInquiryProductSlugFromQuery] = useState<string>(() => {
    if (globalThis.window !== undefined) {
      const raw =
        new URLSearchParams(globalThis.window.location.search).get('productSlug') ?? '';
      return /^[a-z0-9-]+$/.test(raw) ? raw : '';
    }
    return '';
  });
  const [publicInquiryCategorySlugFromQuery] = useState<string>(() => {
    if (globalThis.window !== undefined) {
      const raw =
        new URLSearchParams(globalThis.window.location.search).get('categorySlug') ?? '';
      return /^[a-z0-9-]+$/.test(raw) ? raw : '';
    }
    return '';
  });
  const [publicInquiryCollectionSlugFromQuery] = useState<string>(() => {
    if (globalThis.window !== undefined) {
      const raw =
        new URLSearchParams(globalThis.window.location.search).get('collectionSlug') ?? '';
      return /^[a-z0-9-]+$/.test(raw) ? raw : '';
    }
    return '';
  });
  const [publicInquirySourceSurfaceFromQuery] = useState<string>(() => {
    if (globalThis.window !== undefined) {
      return (
        new URLSearchParams(globalThis.window.location.search).get('sourceSurface') ?? ''
      );
    }
    return '';
  });
  // IMPLEMENT-MAINAPP-TIER0-REQUEST-ACCESS-UI-01: referral code for /request-access
  // Captured from ?ref= or ?referralCode= query param. Validated to safe alphanum pattern.
  const [publicRequestAccessReferralCodeFromQuery] = useState<string>(() => {
    if (globalThis.window !== undefined) {
      const raw =
        new URLSearchParams(globalThis.window.location.search).get('ref')
        ?? new URLSearchParams(globalThis.window.location.search).get('referralCode')
        ?? '';
      return /^[a-zA-Z0-9_-]{1,80}$/.test(raw) ? raw : '';
    }
    return '';
  });
  // IMPL-MAINAPP-DIRECT-REGISTRATION-ENTRY-ROUTES-AND-ROLE-CHOOSER-01:
  // Role preselector captured from /register/:role alias path.
  const [publicRegisterRoleFromPath] = useState<PublicRegisterRoleIntent | null>(() => {
    if (globalThis.window !== undefined) {
      const m = /^\/register(?:\/(supplier|buyer|service-provider))?\/?$/.exec(
        globalThis.window.location.pathname,
      );
      const alias = m?.[1];
      if (alias === 'supplier') return 'supplier';
      if (alias === 'buyer') return 'buyer';
      if (alias === 'service-provider') return 'service_provider';
    }

    return null;
  });
  // B2C-PUBLIC-CATEGORY-STORY-PAGES-IMPLEMENTATION-001:
  // category slug captured from /products/category/:slug pathname on load
  const [publicCategorySlugFromPath] = useState<string>(() => {
    if (globalThis.window !== undefined) {
      const m = globalThis.window.location.pathname.match(
        /^\/products\/category\/([a-z0-9-]+)$/,
      );
      return m?.[1] ?? '';
    }
    return '';
  });
  const canAccessControlPlane = getCurrentAuthRealm() === 'CONTROL_PLANE';
  // Wave 4 P1: active panel in the WL Store Admin console
  const [wlAdminView, setWlAdminView] = useState<WLAdminView>('BRANDING');
  // TECS-FBW-020: WL-admin-local invite substate — keeps invite inside WhiteLabelAdminShell;
  // prevents INVITE_MEMBER appState from falling into the EXPERIENCE case group.
  const [wlAdminInviting, setWlAdminInviting] = useState(false);
  // RCP-1 TECS 3: sub-view for EXPERIENCE Orders panel (OPS-EXPERIENCE-ORDERS-UX-001)
  // G-025 TECS 4D: 'DPP' added for DPP Passport view (G-025-DPP-SNAPSHOT-UI-EXPORT-001)
  // TECS-FBW-003-A: 'ESCROW' added for tenant escrow read panel (G-018)
  // TECS-FBW-006-A: 'ESCALATIONS' added for tenant escalation read panel (G-022)
  // TECS-FBW-004: 'SETTLEMENT' added for G-019 tenant settlement preview-confirm flow
  // TECS-FBW-005: 'CERTIFICATIONS' added for G-019 tenant certification lifecycle panel
  // TECS-FBW-015: 'TRACEABILITY' added for G-016 traceability CRUD panel
  // TECS-FBW-016: 'AUDIT_LOGS' added for tenant audit log read-only panel
  // TECS-FBW-002-B: 'TRADES' added for G-017 tenant trade read-only panel
  const [expView, setExpView] = useState<ExperienceView>('HOME');

  // Tenant management state
  const [tenants, setTenants] = useState<RuntimeTenantRecord[]>([]);
  const [_tenantsLoading, setTenantsLoading] = useState(false);
  const [_tenantsError, setTenantsError] = useState<string | null>(null);
  const [tenantProvisionError, setTenantProvisionError] = useState<string | null>(null);
  const [tenantBootstrapBlockedMessage, setTenantBootstrapBlockedMessage] = useState<string | null>(null);
  const [tenantRestorePending, setTenantRestorePending] = useState(() => {
    const storedRealm = getCurrentAuthRealm('TENANT') ?? 'TENANT';
    return storedRealm === 'TENANT' && !!localStorage.getItem('texqtic_tenant_token');
  });
  const [currentTenantId, setCurrentTenantId] = useState<string>('');
  const [selectedTenant, setSelectedTenant] = useState<TenantConfig | null>(null);
  const [controlPlaneIdentity, setControlPlaneIdentity] = useState<ControlPlaneIdentity | null>(null);
  const [tenantAuthenticatedRole, setTenantAuthenticatedRole] = useState<string | null>(null);
  const [impersonation, setImpersonation] = useState<ImpersonationState>(EMPTY_IMPERSONATION_STATE);

  /** G-W3-ROUTING-001: Reason-input dialog before API-backed impersonation start */
  const [impersonationDialog, setImpersonationDialog] = useState<{
    open: boolean;
    tenant: TenantConfig | null;
    reason: string;
    loading: boolean;
    error: string | null;
  }>({ open: false, tenant: null, reason: '', loading: false, error: null });

  const [rfqDialog, setRfqDialog] = useState<BuyerRfqDialogState>(createInitialBuyerRfqDialogState);
  const [provisionalGstStatus, setProvisionalGstStatus] = useState<
    'loading' | 'not_submitted' | 'pending' | 'rejected' | 'needs_more_info' | 'approved' | null
  >(null);

  const enterWlAdmin = (view: WLAdminView = 'BRANDING') => {
    const nextSelection = resolveRuntimeLocalRouteSelection(tenantWlAdminRuntimeHandoff?.manifestEntry ?? null, {
      wlAdminView: normalizeWlAdminView(view),
      wlAdminInviting: false,
    });

    if (!nextSelection) {
      return;
    }

    navigateWlAdminManifestRoute(nextSelection.routeKey);
  };
  const [rfqDetailView, setRfqDetailView] = useState<BuyerRfqDetailViewState>(createInitialBuyerRfqDetailViewState);
  const [buyerRfqListView, setBuyerRfqListView] = useState<BuyerRfqListViewState>(createInitialBuyerRfqListViewState);
  const [supplierRfqListView, setSupplierRfqListView] = useState<SupplierRfqListViewState>(createInitialSupplierRfqListViewState);
  const [supplierRfqDetailView, setSupplierRfqDetailView] = useState<SupplierRfqDetailViewState>(createInitialSupplierRfqDetailViewState);
  const [buyerRfqTradeBridge, setBuyerRfqTradeBridge] = useState<BuyerRfqTradeBridgeState>(createInitialBuyerRfqTradeBridgeState);
  const lastTenantViewScopeKeyRef = useRef<string | null>(null);
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);

  const resetTenantScopedRouteState = () => {
    setExpView('HOME');
    setShowCart(false);
    setConfirmedOrderId(null);
    setRfqDialog(createInitialBuyerRfqDialogState());
    setRfqDetailView(createInitialBuyerRfqDetailViewState());
    setBuyerRfqListView({
      loading: false,
      error: null,
      rfqs: [],
    });
    setSupplierRfqListView({
      loading: false,
      error: null,
      rfqs: [],
    });
    setSupplierRfqDetailView({
      open: false,
      rfqId: null,
      loading: false,
      error: null,
      submitLoading: false,
      submitError: null,
      data: null,
      response: null,
    });
    setBuyerRfqTradeBridge(createInitialBuyerRfqTradeBridgeState());
  };

  const [aiInsight, setAiInsight] = useState<string>('Loading AI insights...');

  useEffect(() => {
    if (appState === 'AUTH' && authRealm !== effectiveRealm) {
      setAuthRealm(effectiveRealm);
    }
  }, [appState, authRealm, effectiveRealm]);

  const [adminView, setAdminView] = useState<AdminView>('TENANTS');
  const [disputeEscalationBridge, setDisputeEscalationBridge] = useState<DisputeEscalationBridgeTarget | null>(null);
  const [financeEscrowBridge, setFinanceEscrowBridge] = useState<FinanceEscrowBridgeTarget | null>(null);
  const [invoiceApprovalTradeId, _setInvoiceApprovalTradeId] = useState<string | null>(null);
  const [ttpEligibilityBridgeOrgId, setTtpEligibilityBridgeOrgId] = useState<string | null>(null);
  const controlPlaneActorLabel = useMemo(() => {
    return formatControlPlaneActorLabel(controlPlaneIdentity);
  }, [controlPlaneIdentity]);

  const enterControlPlane = () => {
    if (getCurrentAuthRealm() !== 'CONTROL_PLANE') {
      setStoredAuthRealm('TENANT');
      setAuthRealm('TENANT');
      setSelectedTenant(null);
      setDisputeEscalationBridge(null);
      setFinanceEscrowBridge(null);
      setTtpEligibilityBridgeOrgId(null);
      setAdminView('TENANTS');
      setAppState('EXPERIENCE');
      return;
    }

    setStoredAuthRealm('CONTROL_PLANE');
    setAuthRealm('CONTROL_PLANE');
    setSelectedTenant(null);
    setDisputeEscalationBridge(null);
    setFinanceEscrowBridge(null);
    setTtpEligibilityBridgeOrgId(null);
    setAdminView('TENANTS');
    setAppState('CONTROL_PLANE');
  };

  const clearControlPlaneIdentityState = () => {
    persistControlPlaneIdentity(null);
    setControlPlaneIdentity(null);
    setSelectedTenant(null);
    setDisputeEscalationBridge(null);
    setFinanceEscrowBridge(null);
    setAdminView('TENANTS');
  };

  const applyTenantBootstrapState = (tenant: Tenant, role: string | null | undefined) => {
    const resolvedRole = resolveTenantRole(role ?? null, tenant.id);
    const tenantIdentity = resolveTenantIdentityCarrier(tenant);
    const descriptor = createTenantSessionRuntimeDescriptor({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      baseFamily: tenantIdentity.baseFamily,
      aggregatorCapability: tenantIdentity.aggregatorCapability,
      tenantCategory: tenantIdentity.tenantCategory,
      whiteLabelCapability: tenantIdentity.whiteLabelCapability,
      commercialPlan: tenantIdentity.commercialPlan ?? tenant.plan,
      authenticatedRole: resolvedRole,
    });
    const nextState = resolveRuntimeAppStateFromDescriptor(descriptor);

    setTenants([tenant]);
    setCurrentTenantId(tenant.id);
    setTenantAuthenticatedRole(resolvedRole);

    return {
      resolvedRole,
      descriptor,
      nextState: resolveTenantAdminEntryState(nextState),
    };
  };

  const tenantBootstrapCurrentUserOptions = {
    dedupe: true,
    retry: false,
  } as const;

  const applyControlPlaneShellEntry = (identity: ControlPlaneIdentity) => {
    const descriptor = createControlPlaneSessionRuntimeDescriptor({
      actorId: identity.id,
      actorEmail: identity.email,
      authenticatedRole: identity.role,
    });
    const nextState = resolveRuntimeAppStateFromDescriptor(descriptor);

    if (!nextState) {
      clearControlPlaneIdentityState();
      setStoredAuthRealm('CONTROL_PLANE');
      setAuthRealm('CONTROL_PLANE');
      setAppState('AUTH');
      return;
    }

    persistControlPlaneIdentity(identity);
    setControlPlaneIdentity(identity);
    setTenantAuthenticatedRole(null);
    setStoredAuthRealm('CONTROL_PLANE');
    setAuthRealm('CONTROL_PLANE');
    setSelectedTenant(null);
    setDisputeEscalationBridge(null);
    setFinanceEscrowBridge(null);
    setAdminView('TENANTS');
    setAppState(nextState);
  };

  const resolveControlPlaneIdentity = async (data?: any) => {
    try {
      const me = await getCurrentUser();
      return buildControlPlaneIdentity(
        me.user,
        me.role ?? data?.admin?.role ?? data?.user?.role ?? null
      );
    } catch {
      return buildControlPlaneIdentity(
        data?.admin ?? data?.user,
        data?.admin?.role ?? data?.user?.role ?? null
      );
    }
  };

  // Catalog state
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogNextCursor, setCatalogNextCursor] = useState<string | null>(null);
  // Buyer catalog browse state (TECS-B2B-BUYER-CATALOG-BROWSE-001)
  const [buyerCatalogSupplierOrgId, setBuyerCatalogSupplierOrgId] = useState('');
  const [buyerCatalogItems, setBuyerCatalogItems] = useState<BuyerCatalogItem[]>([]);
  const [buyerCatalogLoading, setBuyerCatalogLoading] = useState(false);
  const [buyerCatalogError, setBuyerCatalogError] = useState<string | null>(null);
  const [buyerCatalogNextCursor, setBuyerCatalogNextCursor] = useState<string | null>(null);
  const [buyerCatalogLoadingMore, setBuyerCatalogLoadingMore] = useState(false);
  const [buyerCatalogLoadMoreError, setBuyerCatalogLoadMoreError] = useState<string | null>(null);
  // TECS-B2B-BUYER-CATALOG-SEARCH-FILTER-001: Keyword search state.
  const [buyerCatalogSearch, setBuyerCatalogSearch] = useState('');
  const buyerCatalogSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001: Textile filter state.
  const [filterProductCategory, setFilterProductCategory] = useState('');
  const [filterFabricType, setFilterFabricType] = useState('');
  const [filterMaterial, setFilterMaterial] = useState<string[]>([]);
  const [filterConstruction, setFilterConstruction] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [filterGsmMin, setFilterGsmMin] = useState('');
  const [filterGsmMax, setFilterGsmMax] = useState('');
  const [filterWidthMin, setFilterWidthMin] = useState('');
  const [filterWidthMax, setFilterWidthMax] = useState('');
  const [filterMoqMax, setFilterMoqMax] = useState('');
  const [filterCertification, setFilterCertification] = useState('');
  // TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001: Catalog stage filter
  const [filterCatalogStage, setFilterCatalogStage] = useState('');
  const [showBuyerFilters, setShowBuyerFilters] = useState(false);
  // Supplier picker state (TECS-B2B-BUYER-CATALOG-SUPPLIER-SELECT-001)
  const [supplierPickerItems, setSupplierPickerItems] = useState<SupplierPickerEntry[]>([]);
  const [supplierPickerLoading, setSupplierPickerLoading] = useState(false);
  const [supplierPickerError, setSupplierPickerError] = useState<string | null>(null);
  // TECS-B2B-BUYER-CATALOG-PDP-001 P-2: PDP item view state
  const [buyerCatalogSelectedItemId, setBuyerCatalogSelectedItemId] = useState('');
  const [buyerCatalogPdpItem, setBuyerCatalogPdpItem] = useState<BuyerCatalogPdpView | null>(null);
  const [buyerCatalogPdpLoading, setBuyerCatalogPdpLoading] = useState(false);
  const [buyerCatalogPdpError, setBuyerCatalogPdpError] = useState<string | null>(null);
  const [aggregatorDiscoveryEntries, setAggregatorDiscoveryEntries] = useState<AggregatorDiscoveryEntry[]>([]);
  const [aggregatorDiscoveryLoading, setAggregatorDiscoveryLoading] = useState(false);
  const [aggregatorDiscoveryError, setAggregatorDiscoveryError] = useState<string | null>(null);
  const [aggregatorDiscoveryRefreshKey, setAggregatorDiscoveryRefreshKey] = useState(0);
  const [b2cSearchQuery, setB2cSearchQuery] = useState('');
  const [b2cVisibleCount, setB2cVisibleCount] = useState(8);
  const [b2cLoadingMore, setB2cLoadingMore] = useState(false);
  const [showCart, setShowCart] = useState(false);
  // TECS-FBW-014: stores orderId from successful checkout for ORDER_CONFIRMED display
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);

  // RU-001: pending invite token (set when ?action=invite is detected in URL)
  const [pendingInviteToken, setPendingInviteToken] = useState<string | null>(null);

  // RU-003: inline add-item form toggle (B2B/B2C catalog)
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [addItemFormData, setAddItemFormData] = useState({
    name: '', price: '', sku: '', imageUrl: '', description: '', moq: '',
    // Textile attributes (TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001)
    productCategory: '', fabricType: '', gsm: '', material: '',
    composition: '', color: '', widthCm: '', construction: '', certifications: '',
    // Stage attributes (TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001)
    catalogStage: '',
    stageAttributes: {} as Record<string, string>,
  });
  const [addItemLoading, setAddItemLoading] = useState(false);
  const [addItemError, setAddItemError] = useState<string | null>(null);
  const [editingCatalogItemId, setEditingCatalogItemId] = useState<string | null>(null);
  const [editItemFormData, setEditItemFormData] = useState({
    name: '', price: '', sku: '', imageUrl: '', description: '', moq: '',
    // Textile attributes (TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001)
    productCategory: '', fabricType: '', gsm: '', material: '',
    composition: '', color: '', widthCm: '', construction: '', certifications: '',
    // Stage attributes (TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001)
    catalogStage: '',
    stageAttributes: {} as Record<string, string>,
  });
  const [editItemLoading, setEditItemLoading] = useState(false);
  const [editItemError, setEditItemError] = useState<string | null>(null);
  const [deleteItemLoadingId, setDeleteItemLoadingId] = useState<string | null>(null);
  const editingCatalogItem = editingCatalogItemId
    ? products.find(product => product.id === editingCatalogItemId) ?? null
    : null;

  // Fetch tenants from backend (for tenant picker in bottom-right)
  // GUARD: Only load control-plane tenants when in Staff Control Plane view
  useEffect(() => {
    // Skip if not in control plane view or wrong realm
    if (appState !== 'CONTROL_PLANE' || !canAccessControlPlane) {
      return;
    }

    const fetchTenants = async () => {
      setTenantsLoading(true);
      setTenantsError(null);
      try {
        const response = await getTenants();
        setTenants(response.tenants);
        if (response.tenants.length > 0) {
          setCurrentTenantId(prev => prev ?? response.tenants[0].id);
        }
      } catch (error) {
        console.error('Failed to load tenants:', error);
        setTenantsError('Failed to load tenants');
        setTenants([]);
      } finally {
        setTenantsLoading(false);
      }
    };
    fetchTenants();
  }, [appState, canAccessControlPlane]);

  const activeTenantRecord = useMemo(() => {
    return tenants.find(tenant => tenant.id === currentTenantId) ?? null;
  }, [tenants, currentTenantId]);
  const activeTenantRuntimeSeed = useMemo(() => {
    return resolveRuntimeTenantSeedFromRecord(activeTenantRecord);
  }, [activeTenantRecord]);

  // Convert backend Tenant to TenantConfig for UI compatibility
  const currentTenant: TenantConfig | null = useMemo(() => {
    const tenant = activeTenantRecord;
    if (!tenant) {
      appendRehydrationTrace('currentTenant:resolved', {
        currentTenantId,
        tenant: null,
        availableTenantIds: tenants.map(t => t.id),
      });
      return null;
    }

    const tenantIdentity = resolveTenantIdentityCarrier(tenant);
    const taxonomyCarrier = resolveTenantTaxonomyCarrier(tenant);
    const resolvedPlan = tenantIdentity.commercialPlan ?? normalizeCommercialPlan(tenant.plan);

    const resolvedTenant: TenantConfig = {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      type: (tenantIdentity.tenantCategory ?? tenant.type) as TenantType,
      tenant_category: tenantIdentity.tenantCategory ?? tenant.type,
      is_white_label: tenantIdentity.whiteLabelCapability,
      base_family: tenantIdentity.baseFamily,
      aggregator_capability: tenantIdentity.aggregatorCapability,
      white_label_capability: tenantIdentity.whiteLabelCapability,
      commercial_plan: resolvedPlan,
      primary_segment_key: taxonomyCarrier.primarySegmentKey,
      secondary_segment_keys: taxonomyCarrier.secondarySegmentKeys,
      role_position_keys: taxonomyCarrier.rolePositionKeys,
      status: tenant.status as any,
      plan: resolvedPlan,
      theme: {
        primaryColor: tenant.branding?.primaryColor || '#4F46E5',
        secondaryColor: '#10B981',
        logo: tenant.branding?.logoUrl || '🏢',
      },
      features: [],
      aiBudget: tenant.aiBudget?.monthlyLimit || 0,
      aiUsage: 0, // No longer tracked in mock format
      billingStatus: 'CURRENT',
      riskScore: 0,
    };

    appendRehydrationTrace('currentTenant:resolved', {
      currentTenantId,
      tenant: summarizeTenantIdentity(resolvedTenant),
    });

    return resolvedTenant;
  }, [activeTenantRecord, activeTenantRuntimeSeed, currentTenantId, tenants]);
  const tenantRuntimeDescriptor = useMemo(() => {
    if (!activeTenantRecord) {
      return null;
    }

    return createTenantSessionRuntimeDescriptor({
      tenantId: activeTenantRecord.id,
      tenantSlug: activeTenantRecord.slug,
      tenantName: activeTenantRecord.name,
      baseFamily: activeTenantRuntimeSeed.baseFamily,
      aggregatorCapability: activeTenantRuntimeSeed.aggregatorCapability,
      tenantCategory: activeTenantRuntimeSeed.tenantCategory,
      whiteLabelCapability: activeTenantRuntimeSeed.whiteLabelCapability,
      commercialPlan: activeTenantRuntimeSeed.commercialPlan ?? activeTenantRecord.plan,
      authenticatedRole: tenantAuthenticatedRole,
    });
  }, [activeTenantRecord, activeTenantRuntimeSeed, tenantAuthenticatedRole]);
  const controlPlaneRuntimeDescriptor = useMemo(() => {
    if (!controlPlaneIdentity) {
      return null;
    }

    return createControlPlaneSessionRuntimeDescriptor({
      actorId: controlPlaneIdentity.id,
      actorEmail: controlPlaneIdentity.email,
      authenticatedRole: controlPlaneIdentity.role,
    });
  }, [controlPlaneIdentity]);
  const tenantRuntimeIdentity = tenantRuntimeDescriptor?.identity ?? null;
  const tenantHasWlAdminOverlay = tenantRuntimeDescriptor?.runtimeOverlays.includes('WL_ADMIN') ?? false;
  const tenantWorkspaceRuntimeHandoff = useMemo(() => {
    return resolveRuntimeFamilyEntryHandoff(tenantRuntimeDescriptor, 'EXPERIENCE', {
      expView,
      showCart,
    });
  }, [tenantRuntimeDescriptor, expView, showCart]);
  const tenantWlAdminRuntimeHandoff = useMemo(() => {
    return resolveRuntimeFamilyEntryHandoff(tenantRuntimeDescriptor, 'WL_ADMIN', {
      wlAdminView,
      wlAdminInviting,
    });
  }, [tenantRuntimeDescriptor, wlAdminView, wlAdminInviting]);
  const controlPlaneRuntimeHandoff = useMemo(() => {
    return resolveRuntimeFamilyEntryHandoff(controlPlaneRuntimeDescriptor, 'CONTROL_PLANE', {
      adminView,
      selectedTenantId: selectedTenant?.id ?? null,
    });
  }, [controlPlaneRuntimeDescriptor, adminView, selectedTenant]);
  const tenantRuntimeHandoff = useMemo(() => {
    switch (appState) {
      case 'EXPERIENCE':
      case 'TEAM_MGMT':
      case 'INVITE_MEMBER':
      case 'SETTINGS':
        return tenantWorkspaceRuntimeHandoff;
      case 'WL_ADMIN':
        return tenantWlAdminRuntimeHandoff;
      default:
        return null;
    }
  }, [tenantWorkspaceRuntimeHandoff, tenantWlAdminRuntimeHandoff, appState]);
  const activeControlPlaneRuntimeHandoff = useMemo(() => {
    return appState === 'CONTROL_PLANE'
      ? controlPlaneRuntimeHandoff
      : null;
  }, [controlPlaneRuntimeHandoff, appState]);
  const tenantRuntimeManifestEntry = tenantRuntimeHandoff?.manifestEntry ?? null;
  const controlPlaneRuntimeManifestEntry = activeControlPlaneRuntimeHandoff?.manifestEntry ?? null;
  const tenantContentFamily = tenantRuntimeHandoff?.contentFamily ?? null;
  const controlPlaneContentFamily = activeControlPlaneRuntimeHandoff?.contentFamily ?? null;
  const tenantLocalRouteSelection = tenantWorkspaceRuntimeHandoff?.localRouteSelection ?? null;
  const wlAdminLocalRouteSelection = tenantWlAdminRuntimeHandoff?.localRouteSelection ?? null;
  const controlPlaneLocalRouteSelection = controlPlaneRuntimeHandoff?.localRouteSelection ?? null;
  const tenantBaseCategory = tenantRuntimeIdentity?.baseCategory ?? null;
  const tenantHasAggregatorCapability = tenantRuntimeIdentity?.aggregatorCapability ?? false;
  const tenantHasWhiteLabelCapability = tenantRuntimeIdentity?.whiteLabelCapability ?? false;
  const tenantIsInSharedAdminCore = appState === 'TEAM_MGMT'
    || appState === 'INVITE_MEMBER'
    || appState === 'SETTINGS';
  const tenantCanAccessWorkspaceProfileSettings = tenantIsInSharedAdminCore
    && !tenantHasWhiteLabelCapability;
  const tenantCanAccessWhiteLabelSettingsOverlay = tenantHasWhiteLabelCapability
    && tenantIsInSharedAdminCore;
  const tenantCanAccessSharedSettingsSurface = tenantCanAccessWhiteLabelSettingsOverlay
    || tenantCanAccessWorkspaceProfileSettings;
  const currentOnboardingStatusContinuity = useMemo(() => {
    return getOnboardingStatusContinuity(currentTenant?.status);
  }, [currentTenant?.status]);
  const isVerificationBlockedTenantWorkspace = tenantContentFamily === 'b2b_workspace'
    && currentOnboardingStatusContinuity !== null;

  useEffect(() => {
    if (!isVerificationBlockedTenantWorkspace || !currentTenantId) {
      setProvisionalGstStatus(null);
      return;
    }
    setProvisionalGstStatus('loading');
    void getGstVerification()
      .then(res => {
        setProvisionalGstStatus(resolveProvisionalGstStatus(res.gst_verification));
      })
      .catch(() => {
        setProvisionalGstStatus('not_submitted');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVerificationBlockedTenantWorkspace, currentTenantId]);
  const verificationBlockedActionMessage = currentOnboardingStatusContinuity?.detail
    ?? 'Business verification approval is required before this action is available.';
  const tenantDefaultLocalRouteKey = tenantWorkspaceRuntimeHandoff?.defaultLocalRouteKey ?? null;
  const navigateTenantManifestRoute = (
    routeKey: RuntimeLocalRouteKey,
    options: { resetTradeBridge?: boolean } = {},
  ) => {
    const registration = getRuntimeLocalRouteRegistration(
      tenantWorkspaceRuntimeHandoff?.manifestEntry ?? null,
      routeKey,
    );

    if (!registration) {
      return;
    }

    if (options.resetTradeBridge) {
      setBuyerRfqTradeBridge(view => ({ ...view, initialTradeId: null }));
    }

    setAppState('EXPERIENCE');
    setShowCart(registration.route.stateBinding.showCart === true);

    if (registration.route.stateBinding.expView) {
      setExpView(normalizeExperienceView(registration.route.stateBinding.expView));
    }
  };
  const navigateTenantDefaultManifestRoute = (options: { resetTradeBridge?: boolean } = {}) => {
    if (!tenantDefaultLocalRouteKey) {
      return;
    }

    navigateTenantManifestRoute(tenantDefaultLocalRouteKey, options);
  };
  const navigateWlAdminManifestRoute = (routeKey: RuntimeLocalRouteKey) => {
    const registration = getRuntimeLocalRouteRegistration(
      tenantWlAdminRuntimeHandoff?.manifestEntry ?? null,
      routeKey,
    );

    if (!registration) {
      return;
    }

    setWlAdminView(normalizeWlAdminView(registration.route.stateBinding.wlAdminView ?? 'BRANDING'));
    setWlAdminInviting(registration.route.stateBinding.wlAdminInviting === true);
    setAppState('WL_ADMIN');
  };
  const navigateControlPlaneManifestRoute = (routeKey: RuntimeLocalRouteKey) => {
    const registration = getRuntimeLocalRouteRegistration(
      controlPlaneRuntimeHandoff?.manifestEntry ?? null,
      routeKey,
    );

    if (!registration) {
      return;
    }

    setSelectedTenant(null);

    if (registration.route.stateBinding.adminView) {
      setAdminView(registration.route.stateBinding.adminView as AdminView);
    }

    setAppState('CONTROL_PLANE');
  };
  const controlPlaneShellNavigation = controlPlaneRuntimeHandoff?.navigationSurface ?? null;
  const wlAdminShellNavigation = tenantWlAdminRuntimeHandoff?.navigationSurface ?? null;
  const tenantShellNavigation = tenantWorkspaceRuntimeHandoff?.navigationSurface ?? null;
  const b2cCatalogSectionRef = useRef<globalThis.HTMLElement | null>(null);
  const isNonWhiteLabelB2CTenant = tenantBaseCategory === 'B2C' && !tenantHasWhiteLabelCapability;
  const isB2CBrowseEntrySurface = appState === 'EXPERIENCE'
    && tenantLocalRouteSelection?.routeKey === 'home'
    && isNonWhiteLabelB2CTenant;
  const showB2CHomeAuthenticatedAffordances = !isB2CBrowseEntrySurface;
  const isAggregatorDiscoveryEntrySurface = appState === 'EXPERIENCE'
    && tenantLocalRouteSelection?.routeKey === 'home'
    && tenantHasAggregatorCapability;
  const isB2BCatalogEntrySurface = appState === 'EXPERIENCE'
    && tenantLocalRouteSelection?.routeKey === 'catalog'
    && tenantBaseCategory === 'B2B'
    && !tenantHasWhiteLabelCapability;
  const isBuyerCatalogEntrySurface = appState === 'EXPERIENCE'
    && tenantLocalRouteSelection?.routeKey === 'buyer_catalog'
    && tenantBaseCategory === 'B2B';
  const isWlAdminProductsSurface = appState === 'WL_ADMIN'
    && wlAdminLocalRouteSelection?.routeKey === 'products'
    && tenantContentFamily === 'wl_admin';
  const shouldLoadAppCatalog = isB2BCatalogEntrySurface
    || isB2CBrowseEntrySurface
    || isWlAdminProductsSurface;
  const tenantShellContract = useMemo(() => {
    return {
      surface: tenantShellNavigation,
      onNavigateRoute: navigateTenantManifestRoute,
      onNavigateTeam: () => {
        setAppState('TEAM_MGMT');
      },
      showAuthenticatedAffordances: showB2CHomeAuthenticatedAffordances,
      b2cSearchValue: isB2CBrowseEntrySurface ? b2cSearchQuery : '',
      onB2CSearchChange: isB2CBrowseEntrySurface ? setB2cSearchQuery : undefined,
    };
  }, [
    tenantShellNavigation,
    navigateTenantManifestRoute,
    showB2CHomeAuthenticatedAffordances,
    isB2CBrowseEntrySurface,
    b2cSearchQuery,
  ]);
  const shouldShowTenantUtilityAffordances = (
    showB2CHomeAuthenticatedAffordances || !isNonWhiteLabelB2CTenant
  ) && !isVerificationBlockedTenantWorkspace;
  const publicEntryHostLabel = useMemo(() => {
    return publicEntryDescriptor?.normalizedHost
      ?? globalThis.window?.location.host
      ?? 'app.texqtic.com';
  }, [publicEntryDescriptor]);
  const primaryEntrySurfaceState: AppState = isNeutralPublicEntryDescriptor(publicEntryDescriptor)
    ? 'PUBLIC_ENTRY'
    : 'AUTH';
  const scrollToPublicEntrySection = (sectionId: string) => {
    globalThis.document?.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };
  const selectNeutralPublicEntryPath = (
    nextSelection: Exclude<NeutralEntryPathSelection, null>,
    sectionId?: string,
  ) => {
    setNeutralEntryPathSelection(nextSelection);

    if (sectionId) {
      scrollToPublicEntrySection(sectionId);
    }
  };
  const openSecondaryAuthenticatedEntry = (realm: 'TENANT' | 'CONTROL_PLANE') => {
    setTenantBootstrapBlockedMessage(null);
    setTenantProvisionError(null);
    setAuthRealm(realm);
    setAppState('AUTH');
  };
  const openSupplierRequestAccess = () => {
    globalThis.window?.history.pushState(null, '', SUPPLIER_REQUEST_ACCESS_URL);
    setAppState('PUBLIC_REGISTER');
  };
  const openIssuedAccessContinuation = () => {
    setAppState('ONBOARDING_CONTINUATION');
  };
  const publicEntryRoleCards = [
    {
      audience: 'Buyers',
      title: 'Find trusted textile partners',
      body: 'Discover suppliers, manufacturers, service providers, and verified textile capabilities across the ecosystem.',
      cta: 'Explore B2B Network',
      action: 'B2B',
    },
    {
      audience: 'Suppliers & Manufacturers',
      title: 'Showcase your capability',
      body: 'Build a trusted public presence, reach serious buyers, and prepare your business for B2B, B2C, and D2C opportunities.',
      cta: 'List Your Business',
      action: 'SUPPLIER_REQUEST',
    },
    {
      audience: 'Designers & Brands',
      title: 'Create with the textile ecosystem',
      body: 'Connect with verified suppliers, manufacturers, and service providers to build products and shape public-safe collection stories.',
      cta: 'Start Building',
      action: 'SUPPLIER_REQUEST',
    },
    {
      audience: 'Consumers',
      title: 'Discover verified textile products',
      body: 'Browse textile products backed by real origin, capability, and trust signals from the supply chain behind them.',
      cta: 'Browse Products',
      action: 'B2C',
    },
    {
      audience: 'Service Providers',
      title: 'Join the textile support network',
      body: 'Offer design, compliance, certification, logistics, consulting, and other services to textile ecosystem participants.',
      cta: 'Join as Service Provider',
      action: 'SUPPLIER_REQUEST',
    },
    {
      audience: 'D2C Collections',
      title: 'Prepare verified textile collections',
      body: 'Shape public-safe curated story and showcase previews from real textile capability, with authenticated continuation where available.',
      cta: 'Prepare Verified Textile Collections',
      action: 'SUPPLIER_REQUEST',
    },
  ] as const;
  const publicEntryTextileChainCards = [
    {
      title: 'Manufacturing',
      body: 'Yarn, fabric, processing, garmenting, design, compliance, logistics, and service capability.',
    },
    {
      title: 'Wholesale',
      body: 'B2B discovery, supplier qualification, bulk sourcing, and business trade relationships.',
    },
    {
      title: 'Semi-wholesale',
      body: 'Regional, category, and capability-based discovery for distributors, traders, and growing buyers.',
    },
    {
      title: 'Retail',
      body: 'Public-safe consumer browse and authenticated commerce continuity for textile products.',
    },
    {
      title: 'D2C',
      body: 'Verified Textile Collections that help ecosystem stakeholders connect supply-chain capability with public-safe consumer storytelling.',
    },
  ] as const;
  const publicEntryTrustCards = [
    {
      title: 'Origin',
      body: 'Understand where textile capability begins.',
    },
    {
      title: 'Verification',
      body: 'See public-approved trust and capability signals.',
    },
    {
      title: 'Passport',
      body: 'Explore product and material stories where public passport data is available.',
    },
    {
      title: 'Handoff',
      body: 'Move from public discovery into authenticated action when ready.',
    },
  ] as const;

  const documentTitle = useMemo(() => {
    if (appState === 'PUBLIC_ENTRY') {
      return 'TexQtic Platform Entry';
    }

    if (appState === 'PUBLIC_TRUST_LANDING') {
      return 'TexQtic — Trust & Origin Passport';
    }

    if (appState === 'PUBLIC_INDUSTRY_CLUSTER_LANDING') {
      return 'TexQtic — Textile Industry & Cluster Pages';
    }

    if (appState === 'PUBLIC_AGGREGATOR') {
      return 'TexQtic — Aggregator Preview';
    }

    if (appState === 'PUBLIC_B2B_DISCOVERY') {
      return 'TexQtic — B2B Supplier Discovery';
    }

    if (appState === 'PUBLIC_SUPPLIER_PROFILE') {
      return 'TexQtic — Supplier Profile';
    }

    if (appState === 'PUBLIC_PRODUCT_DETAIL') {
      return 'TexQtic — Public Product Preview';
    }

    if (appState === 'PUBLIC_COLLECTIONS') {
      return 'TexQtic — Verified Textile Collections';
    }

    if (appState === 'PUBLIC_COLLECTION_DETAIL') {
      return 'TexQtic — Verified Textile Collection';
    }

    if (appState === 'PUBLIC_COLLECTION_DETAIL_UNAVAILABLE') {
      return 'TexQtic — Verified Collection Preview';
    }

    if (appState === 'PUBLIC_INQUIRY') {
      return 'Express Interest — TexQtic';
    }

    if (appState === 'PUBLIC_REQUEST_ACCESS') {
      return 'Request Access — TexQtic';
    }

    if (appState === 'PUBLIC_REGISTER') {
      return 'Join TexQtic — Direct Registration';
    }

    if (appState === 'PUBLIC_PRICING') {
      return 'Plans & Pricing — TexQtic';
    }

    if (appState === 'AUTH') {
      return authRealm === 'CONTROL_PLANE' ? 'TexQtic Admin Sign In' : 'TexQtic Sign In';
    }

    if (appState === 'TOKEN_HANDLER') {
      return 'TexQtic Account Action';
    }

    if (appState === 'PUBLIC_NOT_FOUND') {
      return 'Page Not Found — TexQtic';
    }

    if (appState === 'ONBOARDING') {
      return currentTenant ? joinDocumentTitle(currentTenant.name, 'TexQtic Onboarding') : 'TexQtic Onboarding';
    }

    if (appState === 'CONTROL_PLANE') {
      return joinDocumentTitle(controlPlaneLocalRouteSelection?.route.title, 'TexQtic Control Plane');
    }

    if (!currentTenant) {
      return DEFAULT_DOCUMENT_TITLE;
    }

    if (tenantContentFamily === 'wl_admin') {
      return joinDocumentTitle(
        normalizeDocumentRouteTitle(wlAdminLocalRouteSelection?.route.title),
        `${currentTenant.name} Admin`,
      );
    }

    if (tenantHasWhiteLabelCapability && tenantContentFamily === 'wl_storefront') {
      return joinDocumentTitle(
        normalizeDocumentRouteTitle(tenantLocalRouteSelection?.route.title),
        currentTenant.name,
      );
    }

    if (tenantBaseCategory === 'B2B' && !tenantHasAggregatorCapability && !tenantHasWhiteLabelCapability) {
      if (currentOnboardingStatusContinuity) {
        return joinDocumentTitle(
          currentTenant.name,
          currentOnboardingStatusContinuity.title,
          DEFAULT_DOCUMENT_TITLE,
        );
      }

      return joinDocumentTitle(
        normalizeDocumentRouteTitle(tenantLocalRouteSelection?.route.title),
        currentTenant.name,
        'TexQtic B2B Workspace',
      );
    }

    if (tenantBaseCategory === 'B2C' && !tenantHasWhiteLabelCapability) {
      return joinDocumentTitle(
        normalizeDocumentRouteTitle(tenantLocalRouteSelection?.route.title),
        currentTenant.name,
        'TexQtic Storefront',
      );
    }

    if (tenantHasAggregatorCapability && tenantContentFamily === 'aggregator_workspace') {
      return joinDocumentTitle(
        normalizeDocumentRouteTitle(tenantLocalRouteSelection?.route.title),
        currentTenant.name,
        'TexQtic Discovery Workspace',
      );
    }

    return joinDocumentTitle(currentTenant.name, DEFAULT_DOCUMENT_TITLE);
  }, [
    appState,
    authRealm,
    currentTenant,
    tenantContentFamily,
    tenantBaseCategory,
    tenantHasAggregatorCapability,
    tenantHasWhiteLabelCapability,
    currentOnboardingStatusContinuity,
    tenantLocalRouteSelection,
    wlAdminLocalRouteSelection,
    controlPlaneLocalRouteSelection,
  ]);

  useEffect(() => {
    document.title = documentTitle;
  }, [documentTitle]);

  // B2C-PRODUCT-DETAIL-RICH-SEO-001: reset product meta signal when leaving product detail
  useEffect(() => {
    if (appState !== 'PUBLIC_PRODUCT_DETAIL') {
      setPublicProductDetailMeta(null);
    }
  }, [appState, publicProductSlugFromPath]);

  // PUBLIC-COLLECTION-SEO-METADATA-IMPLEMENTATION-001
  // Manages SEO <head> metadata for D2C public collection surfaces.
  // Authority: PUBLIC-SEO-INFRASTRUCTURE-DECISION-001, D2C-COLLECTION-SEO-GOVERNANCE-001
  useEffect(() => {
    const origin = globalThis.window?.location.origin ?? '';

    if (appState === 'PUBLIC_COLLECTIONS') {
      const hasEligible = PUBLIC_COLLECTION_PROJECTIONS.some(
        (c) => c.listState.availability === 'AVAILABLE',
      );
      const listTitle = 'Verified Textile Collections — TexQtic';
      const listDescription =
        'Curated textile story and showcase collections on TexQtic. Natural fabrics, garments, home textiles, technical textiles, and ecosystem context.';
      applyPublicPageMeta({
        title: listTitle,
        description: listDescription,
        canonical: `${origin}/collections`,
        robots: hasEligible ? 'index, follow' : 'noindex, nofollow',
        ogTitle: listTitle,
        ogDescription: listDescription,
        ogImage: PUBLIC_META_OG_FALLBACK_IMAGE,
        ogUrl: `${origin}/collections`,
        ogType: 'website',
        twitterCard: 'summary_large_image',
        twitterTitle: listTitle,
        twitterDescription: listDescription,
        twitterImage: PUBLIC_META_OG_FALLBACK_IMAGE,
        jsonLd: hasEligible
          ? [
              {
                '@context': 'https://schema.org',
                '@type': 'CollectionPage',
                name: listTitle,
                description: listDescription,
                url: `${origin}/collections`,
                isPartOf: { '@type': 'WebSite', name: 'TexQtic', url: origin },
              },
            ]
          : undefined,
      });
      return;
    }

    if (appState === 'PUBLIC_COLLECTION_DETAIL') {
      const collection = getCollectionBySlug(
        publicCollectionSlugFromPath,
        PUBLIC_COLLECTION_PROJECTIONS,
      );
      if (collection) {
        const detailTitle = `${collection.title} — TexQtic Verified Textile Collections`;
        const descPrefix = `${collection.title}: `;
        const descSuffix = '. Eligible products may include public trust context where available.';
        const maxSummaryLen = 155 - descPrefix.length - descSuffix.length;
        const summarySnippet =
          collection.summary.length > maxSummaryLen
            ? `${collection.summary.slice(0, maxSummaryLen).trimEnd()}...`
            : collection.summary;
        const detailDescription = `${descPrefix}${summarySnippet}${descSuffix}`;
        const canonical = `${origin}/collections/${collection.publicSlug}`;
        applyPublicPageMeta({
          title: detailTitle,
          description: detailDescription,
          canonical,
          robots: 'index, follow',
          ogTitle: detailTitle,
          ogDescription: detailDescription,
          ogImage: PUBLIC_META_OG_FALLBACK_IMAGE,
          ogUrl: canonical,
          ogType: 'website',
          twitterCard: 'summary_large_image',
          twitterTitle: detailTitle,
          twitterDescription: detailDescription,
          twitterImage: PUBLIC_META_OG_FALLBACK_IMAGE,
          jsonLd: [
            {
              '@context': 'https://schema.org',
              '@type': 'WebPage',
              name: detailTitle,
              description: detailDescription,
              url: canonical,
              isPartOf: { '@type': 'WebSite', name: 'TexQtic', url: origin },
            },
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Collections', item: `${origin}/collections` },
                { '@type': 'ListItem', position: 2, name: collection.title, item: canonical },
              ],
            },
          ],
        });
        return;
      }
      // Fail-closed: collection not found at effect time — treat as unavailable
      applyPublicPageMeta({
        title: 'Collection Preview Unavailable — TexQtic',
        description:
          'This collection preview is not currently available. Explore other curated textile collections on TexQtic.',
        canonical: `${origin}/collections`,
        robots: 'noindex, nofollow',
        ogTitle: 'TexQtic Textile Collections',
        ogDescription:
          'Explore curated textile story and showcase collections on TexQtic.',
        ogImage: PUBLIC_META_OG_FALLBACK_IMAGE,
        ogUrl: `${origin}/collections`,
        ogType: 'website',
        twitterCard: 'summary',
        twitterTitle: 'TexQtic Textile Collections',
        twitterDescription:
          'Explore curated textile story and showcase collections on TexQtic.',
        twitterImage: PUBLIC_META_OG_FALLBACK_IMAGE,
      });
      return;
    }

    if (appState === 'PUBLIC_COLLECTION_DETAIL_UNAVAILABLE') {
      const slug = publicCollectionSlugFromPath;
      const canonical = slug
        ? `${origin}/collections/${slug}`
        : `${origin}/collections`;
      applyPublicPageMeta({
        title: 'Collection Preview Unavailable — TexQtic',
        description:
          'This collection preview is not currently available. Explore other curated textile collections on TexQtic.',
        canonical,
        robots: 'noindex, nofollow',
        ogTitle: 'TexQtic Textile Collections',
        ogDescription:
          'Explore curated textile story and showcase collections on TexQtic.',
        ogImage: PUBLIC_META_OG_FALLBACK_IMAGE,
        ogUrl: `${origin}/collections`,
        ogType: 'website',
        twitterCard: 'summary',
        twitterTitle: 'TexQtic Textile Collections',
        twitterDescription:
          'Explore curated textile story and showcase collections on TexQtic.',
        twitterImage: PUBLIC_META_OG_FALLBACK_IMAGE,
      });
      return;
    }

    // B2C-PUBLIC-CATEGORY-STORY-PAGES-IMPLEMENTATION-001: category story page SEO
    if (appState === 'PUBLIC_B2C_CATEGORY_STORY') {
      const categoryConfig = getB2CCategoryPageBySlug(publicCategorySlugFromPath);
      if (categoryConfig) {
        const canonical = `${origin}${categoryConfig.canonicalPath}`;
        applyPublicPageMeta({
          title: categoryConfig.seoTitle,
          description: categoryConfig.seoDescription,
          canonical,
          robots: 'index, follow',
          ogTitle: categoryConfig.seoTitle,
          ogDescription: categoryConfig.seoDescription,
          ogImage: PUBLIC_META_OG_FALLBACK_IMAGE,
          ogUrl: canonical,
          ogType: 'website',
          twitterCard: 'summary_large_image',
          twitterTitle: categoryConfig.seoTitle,
          twitterDescription: categoryConfig.seoDescription,
          twitterImage: PUBLIC_META_OG_FALLBACK_IMAGE,
          jsonLd: [
            {
              '@context': 'https://schema.org',
              '@type': 'WebPage',
              name: categoryConfig.seoTitle,
              description: categoryConfig.seoDescription,
              url: canonical,
              isPartOf: { '@type': 'WebSite', name: 'TexQtic', url: origin },
            },
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Products', item: `${origin}/products` },
                { '@type': 'ListItem', position: 2, name: categoryConfig.heroHeading, item: canonical },
              ],
            },
          ],
        });
        return;
      }
      // Unknown slug — fail-closed to noindex
      applyPublicPageMeta({
        title: 'Category Unavailable — TexQtic',
        description: 'This textile product category is not currently available for public discovery.',
        canonical: `${origin}/products`,
        robots: 'noindex, nofollow',
        ogTitle: 'TexQtic Textile Products',
        ogDescription: 'Explore public-safe textile product previews on TexQtic.',
        ogImage: PUBLIC_META_OG_FALLBACK_IMAGE,
        ogUrl: `${origin}/products`,
        ogType: 'website',
        twitterCard: 'summary',
        twitterTitle: 'TexQtic Textile Products',
        twitterDescription: 'Explore public-safe textile product previews on TexQtic.',
        twitterImage: PUBLIC_META_OG_FALLBACK_IMAGE,
      });
      return;
    }

    // B2C-PRODUCT-DETAIL-RICH-SEO-001: Stage 2b — rich product metadata with found/notFound signal
    if (appState === 'PUBLIC_PRODUCT_DETAIL') {
      if (!publicProductSlugFromPath) {
        clearPublicPageMeta();
        return;
      }
      const productCanonical = `${origin}/product/${publicProductSlugFromPath}`;
      if (publicProductDetailMeta === null) {
        // Loading state: generic Stage 2a metadata while fetch resolves
        const productTitle = 'Textile Product Preview — TexQtic';
        const productDescription =
          'View this public-safe textile product preview on TexQtic. Discover materials, categories, and supply chain context from verified suppliers.';
        applyPublicPageMeta({
          title: productTitle,
          description: productDescription,
          canonical: productCanonical,
          robots: 'index, follow',
          ogTitle: productTitle,
          ogDescription: productDescription,
          ogImage: PUBLIC_META_OG_FALLBACK_IMAGE,
          ogUrl: productCanonical,
          ogType: 'website',
          twitterCard: 'summary_large_image',
          twitterTitle: productTitle,
          twitterDescription: productDescription,
          twitterImage: PUBLIC_META_OG_FALLBACK_IMAGE,
        });
        return;
      }
      if (publicProductDetailMeta.type === 'notFound') {
        const notFoundTitle = 'Product Not Found — TexQtic';
        const notFoundDescription =
          'This product is no longer available on TexQtic. Browse all available textile products.';
        applyPublicPageMeta({
          title: notFoundTitle,
          description: notFoundDescription,
          canonical: `${origin}/products`,
          robots: 'noindex, nofollow',
          ogTitle: notFoundTitle,
          ogDescription: notFoundDescription,
          ogImage: PUBLIC_META_OG_FALLBACK_IMAGE,
          ogUrl: `${origin}/products`,
          ogType: 'website',
          twitterCard: 'summary_large_image',
          twitterTitle: notFoundTitle,
          twitterDescription: notFoundDescription,
          twitterImage: PUBLIC_META_OG_FALLBACK_IMAGE,
        });
        return;
      }
      // publicProductDetailMeta.type === 'found'
      const { name, summary, description: productDesc } = publicProductDetailMeta;
      const MAX_DESC_LEN = 155;
      const truncateDesc = (s: string) =>
        s.length <= MAX_DESC_LEN ? s : `${s.slice(0, MAX_DESC_LEN).trimEnd()}...`;
      const resolvedTitle = name
        ? `${name} — TexQtic Textile Products`
        : 'Textile Product Preview — TexQtic';
      const resolvedDescription = summary
        ? truncateDesc(summary)
        : productDesc
          ? truncateDesc(productDesc)
          : 'Public-safe textile product preview on TexQtic. Browse category, material, and supplier context for public discovery.';
      const productDetailRobots = publicProductDetailMeta.isReferencePreview === true
        ? 'noindex, nofollow'
        : 'index, follow';
      applyPublicPageMeta({
        title: resolvedTitle,
        description: resolvedDescription,
        canonical: productCanonical,
        robots: productDetailRobots,
        ogTitle: resolvedTitle,
        ogDescription: resolvedDescription,
        ogImage: PUBLIC_META_OG_FALLBACK_IMAGE,
        ogUrl: productCanonical,
        ogType: 'website',
        twitterCard: 'summary_large_image',
        twitterTitle: resolvedTitle,
        twitterDescription: resolvedDescription,
        twitterImage: PUBLIC_META_OG_FALLBACK_IMAGE,
      });
      return;
    }

    if (appState === 'PUBLIC_B2C_BROWSE') {
      const browseTitle = 'Explore Textile Products — TexQtic';
      const browseDescription =
        'Browse public-safe textile product previews across garments, home textiles, technical textiles, and fabrics on TexQtic.';
      applyPublicPageMeta({
        title: browseTitle,
        description: browseDescription,
        canonical: `${origin}/products`,
        robots: 'index, follow',
        ogTitle: browseTitle,
        ogDescription: browseDescription,
        ogImage: PUBLIC_META_OG_FALLBACK_IMAGE,
        ogUrl: `${origin}/products`,
        ogType: 'website',
        twitterCard: 'summary_large_image',
        twitterTitle: browseTitle,
        twitterDescription: browseDescription,
        twitterImage: PUBLIC_META_OG_FALLBACK_IMAGE,
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: browseTitle,
            description: browseDescription,
            url: `${origin}/products`,
            isPartOf: { '@type': 'WebSite', name: 'TexQtic', url: origin },
          },
        ],
      });
      return;
    }

    // PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-IMPLEMENTATION-001: inquiry page SEO
    if (appState === 'PUBLIC_INQUIRY') {
      const inquiryTitle = 'Express Interest — TexQtic';
      const inquiryDescription =
        "Tell us what you're looking for. Share sourcing interest with TexQtic-listed suppliers — no account required.";
      applyPublicPageMeta({
        title: inquiryTitle,
        description: inquiryDescription,
        canonical: `${origin}/inquiry`,
        robots: 'index, follow',
        ogTitle: inquiryTitle,
        ogDescription: inquiryDescription,
        ogImage: PUBLIC_META_OG_FALLBACK_IMAGE,
        ogUrl: `${origin}/inquiry`,
        ogType: 'website',
        twitterCard: 'summary',
        twitterTitle: inquiryTitle,
        twitterDescription: inquiryDescription,
        twitterImage: PUBLIC_META_OG_FALLBACK_IMAGE,
      });
      return;
    }

    // IMPLEMENT-MAINAPP-TIER0-REQUEST-ACCESS-UI-01: /request-access SEO
    if (appState === 'PUBLIC_REQUEST_ACCESS') {
      const raTitle = 'Request Access — TexQtic';
      const raDescription =
        'Apply for early access to TexQtic — the B2B textile commerce platform for suppliers, buyers, and service providers.';
      applyPublicPageMeta({
        title: raTitle,
        description: raDescription,
        canonical: `${origin}/request-access`,
        robots: 'index, follow',
        ogTitle: raTitle,
        ogDescription: raDescription,
        ogImage: PUBLIC_META_OG_FALLBACK_IMAGE,
        ogUrl: `${origin}/request-access`,
        ogType: 'website',
        twitterCard: 'summary',
        twitterTitle: raTitle,
        twitterDescription: raDescription,
        twitterImage: PUBLIC_META_OG_FALLBACK_IMAGE,
      });
      return;
    }

    // IMPL-MAINAPP-DIRECT-REGISTRATION-ENTRY-ROUTES-AND-ROLE-CHOOSER-01: /register SEO
    if (appState === 'PUBLIC_REGISTER') {
      const registerTitle = 'Join TexQtic — Direct Registration';
      const registerDescription =
        'Start direct registration on TexQtic. Choose your role as Supplier, Buyer, or Service Provider and continue to the next onboarding step.';
      applyPublicPageMeta({
        title: registerTitle,
        description: registerDescription,
        canonical: `${origin}/register`,
        robots: 'index, follow',
        ogTitle: registerTitle,
        ogDescription: registerDescription,
        ogImage: PUBLIC_META_OG_FALLBACK_IMAGE,
        ogUrl: `${origin}/register`,
        ogType: 'website',
        twitterCard: 'summary',
        twitterTitle: registerTitle,
        twitterDescription: registerDescription,
        twitterImage: PUBLIC_META_OG_FALLBACK_IMAGE,
      });
      return;
    }

    // FAM-11D: /pricing — public plan comparison page
    if (appState === 'PUBLIC_PRICING') {
      const pricingTitle = 'Plans & Pricing — TexQtic';
      const pricingDescription =
        'Explore TexQtic commercial tiers. Start free during early access — STARTER, PROFESSIONAL, and ENTERPRISE tiers coming soon.';
      applyPublicPageMeta({
        title: pricingTitle,
        description: pricingDescription,
        canonical: `${origin}/pricing`,
        robots: 'index, follow',
        ogTitle: pricingTitle,
        ogDescription: pricingDescription,
        ogImage: PUBLIC_META_OG_FALLBACK_IMAGE,
        ogUrl: `${origin}/pricing`,
        ogType: 'website',
        twitterCard: 'summary',
        twitterTitle: pricingTitle,
        twitterDescription: pricingDescription,
        twitterImage: PUBLIC_META_OG_FALLBACK_IMAGE,
      });
      return;
    }

    // PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001: stub state noindex guards
    // These surfaces are not yet ready for public indexing.
    // robots: 'noindex, nofollow' is applied here AND they are excluded from
    // robots.txt (Disallow) and sitemap.xml as a defence-in-depth measure.
    if (appState === 'PUBLIC_TRUST_LANDING') {
      applyPublicPageMeta({
        title: 'TexQtic — Trust & Origin Passport',
        description: 'Trust and origin passport information — TexQtic.',
        canonical: `${origin}/trust`,
        robots: 'noindex, nofollow',
        ogTitle: 'TexQtic — Trust & Origin Passport',
        ogDescription: 'Trust and origin passport information — TexQtic.',
        ogImage: PUBLIC_META_OG_FALLBACK_IMAGE,
        ogUrl: `${origin}/trust`,
        ogType: 'website',
        twitterCard: 'summary',
        twitterTitle: 'TexQtic — Trust & Origin Passport',
        twitterDescription: 'Trust and origin passport information — TexQtic.',
        twitterImage: PUBLIC_META_OG_FALLBACK_IMAGE,
      });
      return;
    }

    if (appState === 'PUBLIC_INDUSTRY_CLUSTER_LANDING') {
      applyPublicPageMeta({
        title: 'TexQtic — Textile Industry & Cluster Pages',
        description: 'Textile industry and cluster pages — TexQtic.',
        canonical: `${origin}/industries`,
        robots: 'noindex, nofollow',
        ogTitle: 'TexQtic — Textile Industry & Cluster Pages',
        ogDescription: 'Textile industry and cluster pages — TexQtic.',
        ogImage: PUBLIC_META_OG_FALLBACK_IMAGE,
        ogUrl: `${origin}/industries`,
        ogType: 'website',
        twitterCard: 'summary',
        twitterTitle: 'TexQtic — Textile Industry & Cluster Pages',
        twitterDescription: 'Textile industry and cluster pages — TexQtic.',
        twitterImage: PUBLIC_META_OG_FALLBACK_IMAGE,
      });
      return;
    }

    if (appState === 'PUBLIC_AGGREGATOR') {
      applyPublicPageMeta({
        title: 'TexQtic — Aggregator Preview',
        description: 'Aggregator preview — TexQtic.',
        canonical: `${origin}/aggregator`,
        robots: 'noindex, nofollow',
        ogTitle: 'TexQtic — Aggregator Preview',
        ogDescription: 'Aggregator preview — TexQtic.',
        ogImage: PUBLIC_META_OG_FALLBACK_IMAGE,
        ogUrl: `${origin}/aggregator`,
        ogType: 'website',
        twitterCard: 'summary',
        twitterTitle: 'TexQtic — Aggregator Preview',
        twitterDescription: 'Aggregator preview — TexQtic.',
        twitterImage: PUBLIC_META_OG_FALLBACK_IMAGE,
      });
      return;
    }

    // C-FG-013: Public passport — private DPP access surface, noindex
    if (appState === 'PUBLIC_PASSPORT') {
      applyPublicPageMeta({
        title: 'Product Passport — TexQtic',
        description: 'Digital product passport information — TexQtic.',
        canonical: `${origin}/`,
        robots: 'noindex, nofollow',
        ogTitle: 'Product Passport — TexQtic',
        ogDescription: 'Digital product passport information — TexQtic.',
        ogImage: PUBLIC_META_OG_FALLBACK_IMAGE,
        ogUrl: `${origin}/`,
        ogType: 'website',
        twitterCard: 'summary',
        twitterTitle: 'Product Passport — TexQtic',
        twitterDescription: 'Digital product passport information — TexQtic.',
        twitterImage: PUBLIC_META_OG_FALLBACK_IMAGE,
      });
      return;
    }

    // C-FG-015: Referral join landing — private access surface, noindex
    if (appState === 'PUBLIC_REFERRAL_LANDING') {
      applyPublicPageMeta({
        title: 'Join TexQtic — Referral Invitation',
        description: 'You have been invited to join TexQtic. Complete your account setup to get started.',
        canonical: `${origin}/`,
        robots: 'noindex, nofollow',
        ogTitle: 'Join TexQtic — Referral Invitation',
        ogDescription: 'You have been invited to join TexQtic. Complete your account setup to get started.',
        ogImage: PUBLIC_META_OG_FALLBACK_IMAGE,
        ogUrl: `${origin}/`,
        ogType: 'website',
        twitterCard: 'summary',
        twitterTitle: 'Join TexQtic — Referral Invitation',
        twitterDescription: 'You have been invited to join TexQtic.',
        twitterImage: PUBLIC_META_OG_FALLBACK_IMAGE,
      });
      return;
    }

    // C-FG-016: Unknown route not-found surface — noindex
    if (appState === 'PUBLIC_NOT_FOUND') {
      applyPublicPageMeta({
        title: 'Page Not Found — TexQtic',
        description: 'The page you are looking for could not be found. Explore TexQtic textile products, collections, and sourcing tools.',
        canonical: `${origin}/`,
        robots: 'noindex, nofollow',
        ogTitle: 'Page Not Found — TexQtic',
        ogDescription: 'The page you are looking for could not be found. Explore TexQtic textile products, collections, and sourcing tools.',
        ogImage: PUBLIC_META_OG_FALLBACK_IMAGE,
        ogUrl: `${origin}/`,
        ogType: 'website',
        twitterCard: 'summary',
        twitterTitle: 'Page Not Found — TexQtic',
        twitterDescription: 'The page you are looking for could not be found.',
        twitterImage: PUBLIC_META_OG_FALLBACK_IMAGE,
      });
      return;
    }

    // MAINAPP-PUBLIC-READINESS-001E-D4-P1 (DEC-004):
    // Root app shell remains functional but must not be indexed during soft launch.
    if (appState === 'PUBLIC_ENTRY') {
      applyPublicPageMeta({
        title: 'TexQtic Platform Entry',
        description: 'TexQtic — verified textile platform for B2B discovery, public collection previews, and supply chain continuity.',
        canonical: `${origin}/`,
        robots: 'noindex, nofollow',
        ogTitle: 'TexQtic Platform Entry',
        ogDescription: 'TexQtic — verified textile platform.',
        ogImage: PUBLIC_META_OG_FALLBACK_IMAGE,
        ogUrl: `${origin}/`,
        ogType: 'website',
        twitterCard: 'summary',
        twitterTitle: 'TexQtic Platform Entry',
        twitterDescription: 'TexQtic — verified textile platform.',
        twitterImage: PUBLIC_META_OG_FALLBACK_IMAGE,
      });
      return;
    }

    // All other app states: remove managed metadata tags
    clearPublicPageMeta();
  }, [appState, publicCollectionSlugFromPath, publicCategorySlugFromPath, publicProductSlugFromPath, publicProductDetailMeta]);
  useEffect(() => {
    if (appState !== 'PUBLIC_ENTRY') {
      setPublicEntryBootstrapPending(false);
      return;
    }

    const params = new URLSearchParams(globalThis.window.location.search);
    if (params.get('token')) {
      setPublicEntryBootstrapPending(false);
      return;
    }

    if (isNeutralPublicEntryDescriptor(publicEntryDescriptor)) {
      setPublicEntryBootstrapPending(false);
      return;
    }

    let cancelled = false;

    const bootstrapPublicEntrySurface = async () => {
      setPublicEntryBootstrapPending(true);

      try {
        const descriptor = await resolvePublicEntryDescriptor({});

        if (cancelled) {
          return;
        }

        setPublicEntryDescriptor(descriptor);
        setPublicEntryBootstrapPending(false);

        const isNeutralDescriptor = descriptor.resolutionDisposition === 'NEUTRAL_NO_TENANT'
          && descriptor.resolvedRealmClass === 'NEUTRAL_PUBLIC_ENTRY'
          && descriptor.allowedTargetSurfaceClass === 'NEUTRAL_PUBLIC_ENTRY_SURFACE';

        if (isNeutralDescriptor) {
          setStoredAuthRealm('TENANT');
          setAuthRealm('TENANT');
          return;
        }

        if (descriptor.authenticationRequired) {
          setAppState('AUTH');
          return;
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error('Failed to resolve public entry descriptor:', error);
        setPublicEntryDescriptor(null);
        setPublicEntryBootstrapPending(false);
      }
    };

    void bootstrapPublicEntrySurface();

    return () => {
      cancelled = true;
    };
  }, [appState, publicEntryDescriptor]);

  const tenantViewScopeKey = useMemo(() => {
    if (appState === 'AUTH' || effectiveRealm !== 'TENANT' || !currentTenantId) {
      return null;
    }

    return currentTenantId;
  }, [appState, effectiveRealm, currentTenantId]);

  useEffect(() => {
    const previousTenantViewScopeKey = lastTenantViewScopeKeyRef.current;

    if (tenantViewScopeKey === null) {
      lastTenantViewScopeKeyRef.current = null;
      return;
    }

    if (previousTenantViewScopeKey === tenantViewScopeKey) {
      return;
    }

    resetTenantScopedRouteState();
    lastTenantViewScopeKeyRef.current = tenantViewScopeKey;
  }, [tenantViewScopeKey]);

  useEffect(() => {
    appendRehydrationTrace('app:state', {
      appState,
      authRealm,
      effectiveRealm,
      currentTenantId,
      tenantCount: tenants.length,
      hasTenantToken: !!localStorage.getItem('texqtic_tenant_token'),
      hasAdminToken: !!localStorage.getItem('texqtic_admin_token'),
      currentTenant: summarizeTenantIdentity(currentTenant),
    });
  }, [appState, authRealm, effectiveRealm, currentTenantId, tenants.length, currentTenant]);

  // Check URL for token-based actions on mount (password reset, email verification, invite)
  useEffect(() => {
    const params = new URLSearchParams(globalThis.window.location.search);
    const token = params.get('token');
    const action = params.get('action');
    if (token && action === 'invite') {
      // Invite activation: preserve token and go directly to onboarding
      setPendingInviteToken(token);
      setAppState('ONBOARDING');
    } else if (token) {
      setAppState('TOKEN_HANDLER');
    }
  }, []);

  useEffect(() => {
    if (!currentTenant || !isAggregatorDiscoveryEntrySurface) {
      return;
    }

    let cancelled = false;

    const fetchInsight = async () => {
      setAiInsight('Thinking...');
      const insight = await getPlatformInsights(
        `Provide a brief market trend analysis for a ${currentTenant.type} platform named ${currentTenant.name}.`
      );

      if (!cancelled) {
        setAiInsight(insight || 'No insights available.');
      }
    };

    void fetchInsight();

    return () => {
      cancelled = true;
    };
  }, [currentTenant, isAggregatorDiscoveryEntrySurface]);

  useEffect(() => {
    if (!currentTenant || !isAggregatorDiscoveryEntrySurface) {
      return;
    }

    let cancelled = false;

    const fetchAggregatorDiscovery = async () => {
      setAggregatorDiscoveryLoading(true);
      setAggregatorDiscoveryError(null);

      try {
        const response = await getAggregatorDiscoveryEntries({ limit: 6 });

        if (cancelled) {
          return;
        }

        setAggregatorDiscoveryEntries(response.items);
      } catch (error) {
        console.error('Failed to load aggregator discovery entries:', error);

        if (cancelled) {
          return;
        }

        setAggregatorDiscoveryEntries([]);
        setAggregatorDiscoveryError('Failed to load curated discovery records. Please try again.');
      } finally {
        if (!cancelled) {
          setAggregatorDiscoveryLoading(false);
        }
      }
    };

    void fetchAggregatorDiscovery();

    return () => {
      cancelled = true;
    };
  }, [currentTenant, isAggregatorDiscoveryEntrySurface, aggregatorDiscoveryRefreshKey]);

  // Fetch App-owned catalog items only for views that actually render App-owned product state.
  useEffect(() => {
    if (!shouldLoadAppCatalog) {
      return;
    }

    let cancelled = false;
    let tailHydrationTimer: ReturnType<typeof globalThis.setTimeout> | null = null;

    const hydrateEnterpriseHomeCatalogTail = async (cursor: string) => {
      try {
        const tailResponse = await getCatalogItems({
          limit: ENTERPRISE_HOME_CATALOG_TAIL_LIMIT,
          cursor,
        });

        if (cancelled) {
          return;
        }

        setProducts(prev => [...prev, ...tailResponse.items]);
        setCatalogNextCursor(tailResponse.nextCursor);
      } catch (error) {
        console.warn('Deferred enterprise home catalog hydration failed:', error);
      }
    };

    const fetchCatalog = async () => {
      setCatalogLoading(true);
      setCatalogError(null);

      try {
        const query = isB2CBrowseEntrySurface ? b2cSearchQuery.trim() : '';
        const initialLimit = isB2BCatalogEntrySurface
          ? ENTERPRISE_HOME_CATALOG_FIRST_PAINT_LIMIT
          : 20;
        const response = await getCatalogItems({
          limit: initialLimit,
          ...(query ? { q: query } : {}),
        });

        if (cancelled) {
          return;
        }

        setProducts(response.items);
        setCatalogNextCursor(response.nextCursor);
        setB2cVisibleCount(query ? response.items.length : Math.min(8, response.items.length || 8));

        if (isB2BCatalogEntrySurface && response.nextCursor) {
          tailHydrationTimer = globalThis.setTimeout(() => {
            void hydrateEnterpriseHomeCatalogTail(response.nextCursor as string);
          }, ENTERPRISE_HOME_CATALOG_TAIL_DELAY_MS);
        }
      } catch (error) {
        console.error('Failed to load catalog:', error);

        if (cancelled) {
          return;
        }

        setCatalogError('Failed to load catalog. Please try again.');
        setProducts([]);
        setCatalogNextCursor(null);
      } finally {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      }
    };

    if (isB2CBrowseEntrySurface) {
      const debounceId = globalThis.setTimeout(fetchCatalog, 200);
      return () => {
        cancelled = true;
        if (tailHydrationTimer !== null) {
          globalThis.clearTimeout(tailHydrationTimer);
        }
        globalThis.clearTimeout(debounceId);
      };
    }

    void fetchCatalog();

    return () => {
      cancelled = true;
      if (tailHydrationTimer !== null) {
        globalThis.clearTimeout(tailHydrationTimer);
      }
    };
  }, [shouldLoadAppCatalog, isB2CBrowseEntrySurface, isB2BCatalogEntrySurface, b2cSearchQuery, currentTenant?.id]);

  // BV-005 (TECS-B2B-BUYER-NAV-BOUNDARY-FIX-001): Trigger supplier picker load on shell-nav entry to buyer_catalog.
  // Guard: no-op if items already loaded, fetch in-flight, or fetch errored (user must Retry explicitly).
  useEffect(() => {
    if (!isBuyerCatalogEntrySurface) {
      return;
    }
    if (supplierPickerItems.length > 0 || supplierPickerLoading || supplierPickerError) {
      return;
    }
    void handleLoadSupplierPicker();
  }, [isBuyerCatalogEntrySurface, supplierPickerItems.length, supplierPickerLoading, supplierPickerError]);

  const handleB2CShopNow = () => {
    b2cCatalogSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleB2CLoadMore = async () => {
    const hasHiddenLoadedProducts = products.length > b2cVisibleCount;
    if (hasHiddenLoadedProducts) {
      setB2cVisibleCount(products.length);
      return;
    }

    if (!catalogNextCursor || b2cLoadingMore) {
      return;
    }

    setB2cLoadingMore(true);
    setCatalogError(null);
    try {
      const query = b2cSearchQuery.trim();
      const response = await getCatalogItems({
        limit: 20,
        cursor: catalogNextCursor,
        ...(query ? { q: query } : {}),
      });
      setProducts(prev => [...prev, ...response.items]);
      setCatalogNextCursor(response.nextCursor);
      setB2cVisibleCount(prev => prev + response.items.length);
    } catch (error) {
      console.error('Failed to load more catalog items:', error);
      setCatalogError('Failed to load more products. Please try again.');
    } finally {
      setB2cLoadingMore(false);
    }
  };

  // TECS-B2B-BUYER-CATALOG-BROWSE-001: Fetch supplier catalog items for authenticated buyer.
  const handleFetchBuyerCatalog = async (supplierOrgId: string, q?: string) => {
    const trimmedId = supplierOrgId.trim();
    if (!trimmedId) {
      return;
    }

    setBuyerCatalogItems([]);
    setBuyerCatalogNextCursor(null);
    setBuyerCatalogError(null);
    setBuyerCatalogLoadMoreError(null);
    setBuyerCatalogLoading(true);

    try {
      const response = await getBuyerCatalogItems(trimmedId, {
        ...(q && q.trim().length > 0 ? { q: q.trim() } : {}),
        // Textile filters (TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001)
        ...(filterProductCategory ? { productCategory: filterProductCategory } : {}),
        ...(filterFabricType ? { fabricType: filterFabricType } : {}),
        ...(filterMaterial.length > 0 ? { material: filterMaterial } : {}),
        ...(filterConstruction ? { construction: filterConstruction } : {}),
        ...(filterColor.trim() ? { color: filterColor.trim() } : {}),
        ...(filterGsmMin.trim() ? { gsmMin: parseFloat(filterGsmMin) } : {}),
        ...(filterGsmMax.trim() ? { gsmMax: parseFloat(filterGsmMax) } : {}),
        ...(filterWidthMin.trim() ? { widthMin: parseFloat(filterWidthMin) } : {}),
        ...(filterWidthMax.trim() ? { widthMax: parseFloat(filterWidthMax) } : {}),
        ...(filterMoqMax.trim() ? { moqMax: parseInt(filterMoqMax, 10) } : {}),
        ...(filterCertification ? { certification: filterCertification } : {}),
        // Stage filter (TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001)
        ...(filterCatalogStage ? { catalogStage: filterCatalogStage as CatalogStage } : {}),
      });
      setBuyerCatalogItems(response.items);
      setBuyerCatalogNextCursor(response.nextCursor);
    } catch (error) {
      console.error('[buyer_catalog] fetch failed:', error);
      setBuyerCatalogError('Supplier catalog not found or not available.');
    } finally {
      setBuyerCatalogLoading(false);
    }
  };

  // TECS-B2B-BUYER-CATALOG-LISTING-001: Named load-more handler with isolated state.
  const handleLoadMoreBuyerCatalog = async () => {
    if (!buyerCatalogNextCursor || buyerCatalogLoadingMore) return;
    setBuyerCatalogLoadingMore(true);
    setBuyerCatalogLoadMoreError(null);
    try {
      const more = await getBuyerCatalogItems(buyerCatalogSupplierOrgId, {
        cursor: buyerCatalogNextCursor,
        ...(buyerCatalogSearch.trim().length > 0 ? { q: buyerCatalogSearch.trim() } : {}),
        // Textile filters (TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001)
        ...(filterProductCategory ? { productCategory: filterProductCategory } : {}),
        ...(filterFabricType ? { fabricType: filterFabricType } : {}),
        ...(filterMaterial.length > 0 ? { material: filterMaterial } : {}),
        ...(filterConstruction ? { construction: filterConstruction } : {}),
        ...(filterColor.trim() ? { color: filterColor.trim() } : {}),
        ...(filterGsmMin.trim() ? { gsmMin: parseFloat(filterGsmMin) } : {}),
        ...(filterGsmMax.trim() ? { gsmMax: parseFloat(filterGsmMax) } : {}),
        ...(filterWidthMin.trim() ? { widthMin: parseFloat(filterWidthMin) } : {}),
        ...(filterWidthMax.trim() ? { widthMax: parseFloat(filterWidthMax) } : {}),
        ...(filterMoqMax.trim() ? { moqMax: parseInt(filterMoqMax, 10) } : {}),
        ...(filterCertification ? { certification: filterCertification } : {}),
        // Stage filter (TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001)
        ...(filterCatalogStage ? { catalogStage: filterCatalogStage as CatalogStage } : {}),
      });
      setBuyerCatalogItems(prev => [...prev, ...more.items]);
      setBuyerCatalogNextCursor(more.nextCursor);
    } catch {
      setBuyerCatalogLoadMoreError('Failed to load more items. Please try again.');
    } finally {
      setBuyerCatalogLoadingMore(false);
    }
  };

  // TECS-B2B-BUYER-CATALOG-PDP-001 P-2: Open PDP for a catalog item.
  const handleOpenCatalogPdp = async (itemId: string) => {
    setBuyerCatalogSelectedItemId(itemId);
    setBuyerCatalogPdpItem(null);
    setBuyerCatalogPdpError(null);
    setBuyerCatalogPdpLoading(true);
    try {
      const view = await getBuyerCatalogPdpItem(itemId);
      setBuyerCatalogPdpItem(view);
    } catch (err) {
      const isNotFound = err instanceof APIError && err.status === 404;
      setBuyerCatalogPdpError(isNotFound ? 'NOT_FOUND' : 'FETCH_ERROR');
    } finally {
      setBuyerCatalogPdpLoading(false);
    }
  };

  // TECS-B2B-BUYER-CATALOG-PDP-001 P-2: Close PDP — return to Phase B listing.
  const handleCloseCatalogPdp = () => {
    setBuyerCatalogSelectedItemId('');
    setBuyerCatalogPdpItem(null);
    setBuyerCatalogPdpError(null);
    setBuyerCatalogPdpLoading(false);
  };

  // TECS-B2B-BUYER-CATALOG-SUPPLIER-SELECT-001: Load eligible supplier list for picker.
  const handleLoadSupplierPicker = async () => {
    setBuyerCatalogSupplierOrgId('');
    setBuyerCatalogItems([]);
    setBuyerCatalogNextCursor(null);
    setBuyerCatalogError(null);
    setBuyerCatalogLoadingMore(false);
    setBuyerCatalogLoadMoreError(null);
    setBuyerCatalogSearch('');
    // Reset textile filters (TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001)
    setFilterProductCategory('');
    setFilterFabricType('');
    setFilterMaterial([]);
    setFilterConstruction('');
    setFilterColor('');
    setFilterGsmMin('');
    setFilterGsmMax('');
    setFilterWidthMin('');
    setFilterWidthMax('');
    setFilterMoqMax('');
    setFilterCertification('');
    setFilterCatalogStage('');
    setShowBuyerFilters(false);
    setSupplierPickerItems([]);
    setSupplierPickerError(null);
    setSupplierPickerLoading(true);
    try {
      const res = await getEligibleSuppliers();
      setSupplierPickerItems(res.items);
    } catch (error) {
      console.error('[supplier_picker] fetch failed:', error);
      setSupplierPickerError('Unable to load supplier list. Please try again.');
    } finally {
      setSupplierPickerLoading(false);
    }
  };

  // REALM-BOUNDARY-SHELL-AFFORDANCE-001:
  // Tenant sessions must never remain in control-plane state.
  // Normalize immediately back to a tenant-safe landing before any control-plane shell can persist.
  useEffect(() => {
    if (appState !== 'CONTROL_PLANE' || canAccessControlPlane) {
      return;
    }

    setStoredAuthRealm('TENANT');
    setAuthRealm('TENANT');
    setSelectedTenant(null);
    setAdminView('TENANTS');
    setAppState('EXPERIENCE');
  }, [appState, canAccessControlPlane]);

  useEffect(() => {
    if (appState !== 'AUTH' || getCurrentAuthRealm() !== 'CONTROL_PLANE') {
      return;
    }

    const claims = readStoredAdminJwtClaims();
    const storedIdentity = readStoredControlPlaneIdentity();

    const identity = (() => {
      if (!claims?.adminId || !storedIdentity?.id) {
        return null;
      }

      if (claims.exp && claims.exp * 1000 <= Date.now()) {
        return null;
      }

      if (claims.adminId !== storedIdentity.id) {
        return null;
      }

      return {
        ...storedIdentity,
        role: claims.role ?? storedIdentity.role ?? null,
      };
    })();

    if (!identity) {
      const hadStoredAdminToken = Boolean(localStorage.getItem('texqtic_admin_token'));
      clearAuth();
      clearPersistedImpersonationSession();
      setImpersonation(EMPTY_IMPERSONATION_STATE);
      persistControlPlaneIdentity(null);
      setControlPlaneIdentity(null);
      setTenantAuthenticatedRole(null);
      setSelectedTenant(null);
      setAdminView('TENANTS');
      setAuthRealm('CONTROL_PLANE');
      if (hadStoredAdminToken) {
        setAppState('PUBLIC_ENTRY');
      }
      return;
    }

    applyControlPlaneShellEntry(identity);
  }, [appState]);

  useEffect(() => {
    if (appState !== 'AUTH' || getCurrentAuthRealm() === 'CONTROL_PLANE') {
      return;
    }

    const claims = readStoredAdminJwtClaims();
    const storedIdentity = readStoredControlPlaneIdentity();
    const storedImpersonation = readStoredImpersonationSession();

    if (!claims?.adminId || !storedIdentity?.id || !storedImpersonation) {
      clearPersistedImpersonationSession();
      return;
    }

    if (
      (claims.exp && claims.exp * 1000 <= Date.now()) ||
      claims.adminId !== storedIdentity.id ||
      claims.adminId !== storedImpersonation.adminId
    ) {
      clearPersistedImpersonationSession();
      setImpersonation(EMPTY_IMPERSONATION_STATE);
      return;
    }

    const actorIdentity = {
      ...storedIdentity,
      role: claims.role ?? storedIdentity.role ?? null,
    };

    let cancelled = false;

    const restoreImpersonationSession = async () => {
      setTenantRestorePending(true);
      setTenantBootstrapBlockedMessage(null);
      setTenantProvisionError(null);
      setImpersonationToken(storedImpersonation.state.token);
      setStoredAuthRealm('TENANT');
      setAuthRealm('TENANT');

      try {
        const me = await getCurrentUser();
        const tenant = resolveCanonicalImpersonationTenant(me.tenant, storedImpersonation.state.targetTenantId);

        if (!tenant || cancelled) {
          throw new Error('Stored impersonation tenant is invalid.');
        }

        const bootstrapState = applyTenantBootstrapState(tenant, me.role ?? null);

        if (!bootstrapState.nextState) {
          throw new Error('Stored impersonation descriptor is invalid.');
        }

        persistControlPlaneIdentity(actorIdentity);
        setControlPlaneIdentity(actorIdentity);
        setTenantRestorePending(false);
        setTenantProvisionError(null);
        setImpersonation(storedImpersonation.state);
        setAppState(bootstrapState.nextState);
      } catch {
        if (cancelled) {
          return;
        }

        clearPersistedImpersonationSession();
        setImpersonation(EMPTY_IMPERSONATION_STATE);
        setTenantRestorePending(false);
        applyControlPlaneShellEntry(actorIdentity);
      }
    };

    void restoreImpersonationSession();

    return () => {
      cancelled = true;
    };
  }, [appState]);

  useEffect(() => {
    appendRehydrationTrace('tenantRestore:effect_enter', {
      appState,
      authRealm,
      effectiveRealm,
      storedRealm: getCurrentAuthRealm('TENANT'),
      hasTenantToken: !!localStorage.getItem('texqtic_tenant_token'),
    });

    if (appState !== 'AUTH' || authRealm !== 'TENANT') {
      setTenantRestorePending(false);
      appendRehydrationTrace('tenantRestore:effect_skip', {
        reason: 'not_auth_tenant',
        appState,
        authRealm,
      });
      return;
    }

    const storedTenantToken = localStorage.getItem('texqtic_tenant_token');
    if (!storedTenantToken) {
      setTenantRestorePending(false);
      appendRehydrationTrace('tenantRestore:effect_skip', {
        reason: 'missing_tenant_token',
        appState,
        authRealm,
      });
      return;
    }

    let cancelled = false;

    const restoreTenantSession = async () => {
      setTenantRestorePending(true);
      setTenantProvisionError(null);
      setTenantBootstrapBlockedMessage(null);

      let nextState: 'EXPERIENCE' = 'EXPERIENCE';

      const failClosedTenantBootstrap = (
        reason: string,
        details: RehydrationTracePayload = {},
        options?: { blockedMessage?: string | null; targetState?: AppState }
      ) => {
        appendRehydrationTrace('tenantRestore:fail_closed', {
          reason,
          ...details,
        });
        setTenantRestorePending(false);
        clearAuth();
        setTenants([]);
        setCurrentTenantId('');
        setStoredAuthRealm('TENANT');
        setAuthRealm('TENANT');
        setTenantBootstrapBlockedMessage(options?.blockedMessage ?? null);
        setAppState(options?.targetState ?? 'AUTH');
      };

      try {
        appendRehydrationTrace('tenantRestore:getCurrentUser:start');
        const me = await getCurrentUser(tenantBootstrapCurrentUserOptions);
        const tenant = buildTenantSnapshot(me.tenant);
        const resolvedRole = resolveTenantRole(me.role ?? null, tenant?.id ?? null);
        appendRehydrationTrace('tenantRestore:getCurrentUser:success', {
          role: resolvedRole,
          tenant: summarizeTenantIdentity(me.tenant),
        });

        if (!tenant || cancelled) {
          appendRehydrationTrace('tenantRestore:snapshot_invalid', {
            cancelled,
            tenant: summarizeTenantIdentity(tenant),
          });
          throw new Error('Tenant session could not be rehydrated.');
        }

        const bootstrapState = applyTenantBootstrapState(tenant, me.role ?? null);
        if (!bootstrapState.nextState) {
          throw new Error('Tenant session descriptor is invalid.');
        }

        nextState = bootstrapState.nextState;
        appendRehydrationTrace('tenantRestore:tenant_applied', {
          tenant: summarizeTenantIdentity(tenant),
        });

        appendRehydrationTrace('tenantRestore:next_state', {
          nextState,
          role: bootstrapState.resolvedRole,
          tenant: summarizeTenantIdentity(tenant),
        });
        setTenantRestorePending(false);
        setAppState(nextState);
      } catch (err) {
        if (cancelled) {
          appendRehydrationTrace('tenantRestore:cancelled');
          return;
        }

        appendRehydrationTrace('tenantRestore:getCurrentUser:error', {
          message: err instanceof Error ? err.message : 'unknown_error',
          status: err instanceof APIError ? err.status : null,
        });

        if (err instanceof APIError && err.status === 404 && err.message.includes('Organisation not yet provisioned')) {
          const blockedMessage = 'Tenant not provisioned yet. Your workspace is being set up — please try again in a few minutes.';
          setTenantProvisionError(blockedMessage);
          failClosedTenantBootstrap('provisioning_pending', {
            message: err.message,
            status: err.status,
          }, {
            blockedMessage,
          });
          return;
        }

        failClosedTenantBootstrap('restore_failed', {
          message: err instanceof Error ? err.message : 'unknown_error',
          status: err instanceof APIError ? err.status : null,
        }, {
          blockedMessage:
            err instanceof APIError && err.status === 401
              ? null
              : 'Tenant workspace identity could not be confirmed. Please sign in again.',
          targetState: 'PUBLIC_ENTRY',
        });
      }
    };

    void restoreTenantSession();

    return () => {
      cancelled = true;
    };
  }, [appState, authRealm, effectiveRealm]);

  const handleAuthSuccess = async (data: any) => {
    const nextRealm = getCurrentAuthRealm(authRealm) ?? 'TENANT';

    if (nextRealm === 'CONTROL_PLANE') {
      clearPersistedImpersonationSession();
      setImpersonation(EMPTY_IMPERSONATION_STATE);
      const identity = await resolveControlPlaneIdentity(data);

      if (!identity) {
        clearAuth();
        clearPersistedImpersonationSession();
        clearControlPlaneIdentityState();
        setAuthRealm('CONTROL_PLANE');
        setAppState('AUTH');
        return;
      }

      applyControlPlaneShellEntry(identity);
      return;
    }

    clearPersistedImpersonationSession();
    setImpersonation(EMPTY_IMPERSONATION_STATE);
    clearControlPlaneIdentityState();
    setStoredAuthRealm('TENANT');
    setAuthRealm('TENANT');
    setTenantRestorePending(true);
    setTenantBootstrapBlockedMessage(null);
    setTenantProvisionError(null);

    let nextState: 'EXPERIENCE' = 'EXPERIENCE';

    const failClosedTenantBootstrap = (blockedMessage?: string | null) => {
      setTenantRestorePending(false);
      clearAuth();
      setTenants([]);
      setCurrentTenantId('');
      setTenantAuthenticatedRole(null);
      setStoredAuthRealm('TENANT');
      setAuthRealm('TENANT');
      setTenantBootstrapBlockedMessage(blockedMessage ?? null);
      setAppState('AUTH');
    };

    try {
      const me = await getCurrentUser(tenantBootstrapCurrentUserOptions);
      const canonicalTenant = buildTenantSnapshot(me.tenant);
      if (!canonicalTenant) {
        failClosedTenantBootstrap('Tenant workspace identity could not be confirmed. Please sign in again.');
        return;
      }

      const bootstrapState = applyTenantBootstrapState(canonicalTenant, me.role ?? null);
      if (!bootstrapState.nextState) {
        failClosedTenantBootstrap('Tenant workspace identity could not be confirmed. Please sign in again.');
        return;
      }

      nextState = bootstrapState.nextState;
    } catch (err) {
      if (err instanceof APIError && err.status === 404 && err.message.includes('Organisation not yet provisioned')) {
        const blockedMessage = 'Tenant not provisioned yet. Your workspace is being set up — please try again in a few minutes.';
        setTenantProvisionError(blockedMessage);
        failClosedTenantBootstrap(blockedMessage);
        return;
      }

      failClosedTenantBootstrap(
        err instanceof APIError && err.status === 401
          ? null
          : 'Tenant workspace identity could not be confirmed. Please sign in again.'
      );
      return;
    }

    setTenantRestorePending(false);

    // FAM-07D3: If a pending invite token is preserved, accept it now that the user is authenticated
    if (pendingInviteToken) {
      try {
        const inviteResult = await acceptAuthenticatedInvite({
          inviteToken: pendingInviteToken,
          consent: buildLegalPendingScaffoldConsent('ACTIVATE_AUTHENTICATED_INVITE'),
        });
        setPendingInviteToken(null);
        setToken(inviteResult.token, 'TENANT');
        // Re-bootstrap with the invite tenant's JWT
        try {
          const invitedMe = await getCurrentUser(tenantBootstrapCurrentUserOptions);
          const invitedTenant = buildTenantSnapshot(invitedMe.tenant);
          if (invitedTenant) {
            const inviteBootstrap = applyTenantBootstrapState(invitedTenant, invitedMe.role ?? null);
            if (inviteBootstrap.nextState) {
              setAppState(inviteBootstrap.nextState);
              return;
            }
          }
        } catch {
          // Re-bootstrap after invite acceptance failed — fall through to existing nextState
        }
        setAppState(nextState);
        return;
      } catch (inviteErr) {
        // Always clear the pending token to prevent looping
        setPendingInviteToken(null);
        const inviteErrCode = inviteErr instanceof APIError ? inviteErr.code : undefined;
        if (inviteErrCode === 'ALREADY_MEMBER') {
          // Already a member — proceed to existing workspace
          setAppState(nextState);
          return;
        }
        let blockedMessage = 'Invite acceptance failed. Please try signing in again or contact support.';
        if (inviteErrCode === 'EMAIL_MISMATCH') {
          blockedMessage = 'Invite email does not match your account. Please contact your administrator.';
        } else if (inviteErrCode === 'INVALID_INVITE') {
          blockedMessage = 'Your invite link has expired or is no longer valid. Please request a new invite.';
        }
        failClosedTenantBootstrap(blockedMessage);
        return;
      }
    }

    setAppState(nextState);
  };

  /** G-W3-ROUTING-001: Open reason dialog — API call deferred to handleImpersonateConfirm */
  const handleImpersonate = (tenant: TenantConfig) => {
    setImpersonationDialog({ open: true, tenant, reason: '', loading: false, error: null });
  };

  /** G-W3-ROUTING-001: Confirm impersonation — fetch member userId, call server, store token */
  const handleImpersonateConfirm = async () => {
    const tenant = impersonationDialog.tenant;
    if (!tenant) return;
    const reason = impersonationDialog.reason.trim();
    let startedImpersonationId: string | null = null;
    if (reason.length < 10) {
      setImpersonationDialog(d => ({ ...d, error: 'Reason must be at least 10 characters.' }));
      return;
    }
    setImpersonationDialog(d => ({ ...d, loading: true, error: null }));
    try {
      const actorAdminId = controlPlaneIdentity?.id ?? readStoredAdminJwtClaims()?.adminId;
      if (!actorAdminId) {
        throw new Error('Control-plane actor identity unavailable.');
      }

      // Fetch tenant details to find an eligible member userId
      const detail = await getTenantById(tenant.id);
      const members = detail.tenant.memberships ?? [];
      const target =
        members.find(m => m.role === 'OWNER' && m.status === 'ACTIVE') ||
        members.find(m => m.role === 'ADMIN' && m.status === 'ACTIVE') ||
        members.find(m => m.status === 'ACTIVE') ||
        members[0];
      if (!target) {
        setImpersonationDialog(d => ({ ...d, loading: false, error: 'No eligible member found for this tenant.' }));
        return;
      }
      const result = await startImpersonationSession({
        orgId: tenant.id,
        userId: target.user.id,
        reason,
      });
      startedImpersonationId = result.impersonationId;
      const nextImpersonationState: ImpersonationState = {
        isAdmin: true,
        targetTenantId: tenant.id,
        startTime: new Date().toISOString(),
        impersonationId: result.impersonationId,
        token: result.token,
        expiresAt: result.expiresAt,
      };

      // Apply impersonation JWT — admin token in localStorage is untouched
      setImpersonationToken(result.token);
      setStoredAuthRealm('TENANT');
      setAuthRealm('TENANT');

      const me = await getCurrentUser();
      const bootstrappedTenant = resolveCanonicalImpersonationTenant(me.tenant, tenant.id);

      if (!bootstrappedTenant) {
        throw new Error('Tenant context bootstrap returned the wrong tenant.');
      }

      const bootstrapState = applyTenantBootstrapState(bootstrappedTenant, me.role ?? target.role ?? null);

      if (!bootstrapState.nextState) {
        throw new Error('Tenant runtime descriptor could not be established.');
      }

      setTenantProvisionError(null);
      setImpersonation(nextImpersonationState);
      persistImpersonationSession({
        adminId: actorAdminId,
        state: nextImpersonationState,
      });
      setImpersonationDialog({ open: false, tenant: null, reason: '', loading: false, error: null });
      setAppState(bootstrapState.nextState);
    } catch (err: any) {
      if (startedImpersonationId) {
        clearPersistedImpersonationSession();
        setStoredAuthRealm('CONTROL_PLANE');
        setAuthRealm('CONTROL_PLANE');
        try {
          await stopImpersonationSession({
            impersonationId: startedImpersonationId,
            reason: 'Tenant bootstrap failed after impersonation start.',
          });
        } catch (stopError) {
          console.error('[Impersonation] bootstrap cleanup failed:', stopError);
        }
      }
      clearPersistedImpersonationSession();
      setImpersonation(EMPTY_IMPERSONATION_STATE);
      setTenantAuthenticatedRole(null);
      const msg = err?.message || 'Failed to start impersonation session.';
      setImpersonationDialog(d => ({ ...d, loading: false, error: msg }));
    }
  };

  /** G-W3-ROUTING-001: Stop impersonation via server API, then restore admin session */
  const handleExitImpersonation = async () => {
    setStoredAuthRealm('CONTROL_PLANE');
    setAuthRealm('CONTROL_PLANE');

    if (impersonation.impersonationId) {
      try {
        await stopImpersonationSession({
          impersonationId: impersonation.impersonationId,
          reason: 'Admin exited impersonation session via UI.',
        });
      } catch (err) {
        // Log but don't block exit — state must be cleared regardless
        console.error('[Impersonation] stop error (ignored, clearing state):', err);
      }
    }
    // Clear impersonation token override — admin JWT in localStorage is restored automatically
    clearPersistedImpersonationSession();
    setImpersonation(EMPTY_IMPERSONATION_STATE);
    const actorIdentity = controlPlaneIdentity ?? readStoredControlPlaneIdentity();

    if (actorIdentity) {
      applyControlPlaneShellEntry(actorIdentity);
      return;
    }

    clearControlPlaneIdentityState();
    setAppState('AUTH');
  };

  /** RU-003: Handle inline catalog item creation */
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isVerificationBlockedTenantWorkspace) {
      setAddItemError(verificationBlockedActionMessage);
      return;
    }

    setAddItemLoading(true);
    setAddItemError(null);
    try {
      const priceVal = parseFloat(addItemFormData.price);
      if (isNaN(priceVal) || priceVal <= 0) throw new Error('Price must be a positive number.');
      if (!addItemFormData.name.trim()) throw new Error('Name is required.');
      const imageUrl = addItemFormData.imageUrl.trim();
      if (imageUrl) {
        try {
          new window.URL(imageUrl);
        } catch {
          throw new Error('Image URL must be a valid URL.');
        }
      }
      const moqCreateVal = addItemFormData.moq.trim() ? parseInt(addItemFormData.moq.trim(), 10) : undefined;
      const result = await createCatalogItem({
        name: addItemFormData.name.trim(),
        sku: addItemFormData.sku.trim() || undefined,
        imageUrl: imageUrl || undefined,
        description: addItemFormData.description.trim() || undefined,
        moq: moqCreateVal,
        price: priceVal,
        // Textile attributes (TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001)
        productCategory: addItemFormData.productCategory.trim() || undefined,
        fabricType: addItemFormData.fabricType.trim() || undefined,
        gsm: addItemFormData.gsm.trim() ? parseFloat(addItemFormData.gsm.trim()) : undefined,
        material: addItemFormData.material.trim() || undefined,
        composition: addItemFormData.composition.trim() || undefined,
        color: addItemFormData.color.trim() || undefined,
        widthCm: addItemFormData.widthCm.trim() ? parseFloat(addItemFormData.widthCm.trim()) : undefined,
        construction: addItemFormData.construction.trim() || undefined,
        // Stage attributes (TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001)
        ...(addItemFormData.catalogStage ? { catalogStage: addItemFormData.catalogStage as CatalogStage } : {}),
        ...(Object.keys(addItemFormData.stageAttributes).length > 0 ? { stageAttributes: addItemFormData.stageAttributes as Record<string, unknown> } : {}),
      });
      setProducts(prev => [result.item, ...prev]);
      setAddItemFormData({ name: '', price: '', sku: '', imageUrl: '', description: '', moq: '', productCategory: '', fabricType: '', gsm: '', material: '', composition: '', color: '', widthCm: '', construction: '', certifications: '', catalogStage: '', stageAttributes: {} });
      setShowAddItemForm(false);
    } catch (err: any) {
      setAddItemError(err?.message || 'Failed to create item.');
    } finally {
      setAddItemLoading(false);
    }
  };

  const resetEditItemState = () => {
    setEditingCatalogItemId(null);
    setEditItemFormData({
      name: '', price: '', sku: '', imageUrl: '', description: '', moq: '',
      productCategory: '', fabricType: '', gsm: '', material: '',
      composition: '', color: '', widthCm: '', construction: '', certifications: '',
      catalogStage: '', stageAttributes: {},
    });
    setEditItemError(null);
  };

  const handleOpenEditItem = (product: CatalogItem) => {
    if (isVerificationBlockedTenantWorkspace) {
      setCatalogError(verificationBlockedActionMessage);
      return;
    }

    setShowAddItemForm(false);
    setAddItemError(null);
    setCatalogError(null);
    setEditingCatalogItemId(product.id);
    setEditItemFormData({
      name: product.name,
      price: product.price.toString(),
      sku: product.sku || '',
      imageUrl: product.imageUrl || '',
      description: product.description || '',
      moq: product.moq?.toString() ?? '',
      // Textile attributes (TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001)
      productCategory: ((product as unknown) as Record<string, unknown>).productCategory as string || '',
      fabricType: ((product as unknown) as Record<string, unknown>).fabricType as string || '',
      gsm: ((product as unknown) as Record<string, unknown>).gsm != null ? String(((product as unknown) as Record<string, unknown>).gsm) : '',
      material: ((product as unknown) as Record<string, unknown>).material as string || '',
      composition: ((product as unknown) as Record<string, unknown>).composition as string || '',
      color: ((product as unknown) as Record<string, unknown>).color as string || '',
      widthCm: ((product as unknown) as Record<string, unknown>).widthCm != null ? String(((product as unknown) as Record<string, unknown>).widthCm) : '',
      construction: ((product as unknown) as Record<string, unknown>).construction as string || '',
      certifications: ((product as unknown) as Record<string, unknown>).certifications ? JSON.stringify(((product as unknown) as Record<string, unknown>).certifications) : '',
      // Stage attributes (TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001)
      catalogStage: ((product as unknown) as Record<string, unknown>).catalogStage as string || '',
      stageAttributes: (((product as unknown) as Record<string, unknown>).stageAttributes as Record<string, string>) ?? {},
    });
    setEditItemError(null);
  };

  const handleCloseEditItem = () => {
    if (editItemLoading) {
      return;
    }

    resetEditItemState();
  };

  const handleUpdateItem = async () => {

    if (isVerificationBlockedTenantWorkspace) {
      setEditItemError(verificationBlockedActionMessage);
      return;
    }

    if (!editingCatalogItemId) {
      return;
    }

    setEditItemLoading(true);
    setEditItemError(null);

    try {
      const priceVal = Number.parseFloat(editItemFormData.price);
      const trimmedImageUrl = editItemFormData.imageUrl.trim();
      if (Number.isNaN(priceVal) || priceVal <= 0) throw new Error('Price must be a positive number.');
      if (!editItemFormData.name.trim()) throw new Error('Name is required.');
      if (trimmedImageUrl) {
        try {
          new window.URL(trimmedImageUrl);
        } catch {
          throw new Error('Image URL must be a valid URL.');
        }
      }

      const moqEditVal = editItemFormData.moq.trim() ? parseInt(editItemFormData.moq.trim(), 10) : undefined;
      const result = await updateCatalogItem(editingCatalogItemId, {
        name: editItemFormData.name.trim(),
        price: priceVal,
        ...(editItemFormData.sku.trim() ? { sku: editItemFormData.sku.trim() } : {}),
        imageUrl: trimmedImageUrl || null,
        description: editItemFormData.description.trim() || null,
        ...(moqEditVal !== undefined ? { moq: moqEditVal } : {}),
        // Textile attributes (TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001)
        productCategory: editItemFormData.productCategory.trim() || null,
        fabricType: editItemFormData.fabricType.trim() || null,
        gsm: editItemFormData.gsm.trim() ? parseFloat(editItemFormData.gsm.trim()) : null,
        material: editItemFormData.material.trim() || null,
        composition: editItemFormData.composition.trim() || null,
        color: editItemFormData.color.trim() || null,
        widthCm: editItemFormData.widthCm.trim() ? parseFloat(editItemFormData.widthCm.trim()) : null,
        construction: editItemFormData.construction.trim() || null,
        // Stage attributes (TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001)
        catalogStage: editItemFormData.catalogStage as CatalogStage || null,
        stageAttributes: Object.keys(editItemFormData.stageAttributes).length > 0 ? editItemFormData.stageAttributes as Record<string, unknown> : null,
      });

      setProducts(prev => prev.map(product => (
        product.id === editingCatalogItemId ? result.item : product
      )));
      resetEditItemState();
    } catch (err: any) {
      setEditItemError(err?.message || 'Failed to update item.');
    } finally {
      setEditItemLoading(false);
    }
  };

  const handleDeleteItem = async (product: CatalogItem) => {
    if (isVerificationBlockedTenantWorkspace) {
      setCatalogError(verificationBlockedActionMessage);
      return;
    }

    const confirmed = globalThis.confirm(`Delete ${product.name}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setDeleteItemLoadingId(product.id);
    setCatalogError(null);

    try {
      await deleteCatalogItem(product.id);
      setProducts(prev => prev.filter(item => item.id !== product.id));

      if (editingCatalogItemId === product.id) {
        resetEditItemState();
      }
    } catch (error) {
      setCatalogError(error instanceof APIError ? error.message : 'Failed to delete item.');
    } finally {
      setDeleteItemLoadingId(null);
    }
  };

  const renderCatalogItemMutationActions = (product: CatalogItem) => {
    const isDeleting = deleteItemLoadingId === product.id;

    return (
      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={() => handleOpenEditItem(product)}
          disabled={editItemLoading || isDeleting}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => {
            void handleDeleteItem(product);
          }}
          disabled={isDeleting}
          className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition disabled:opacity-50"
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    );
  };

  const renderB2BCatalogCardFooter = (product: CatalogItem) => {
    return (
      <div className="mt-4 border-t border-slate-100 pt-3 space-y-3">
        {renderCatalogItemMutationActions(product)}
        <B2BAddToCartButton product={product} />
      </div>
    );
  };

  const handleOpenRfqDialog = (product: CatalogItem, catalogStage?: string | null) => {
    const openOutcome = resolveBuyerRfqOpenAction({
      product,
      isVerificationBlockedTenantWorkspace,
      verificationBlockedActionMessage,
    });

    if (openOutcome.blocked) {
      setCatalogError(openOutcome.catalogError);
      return;
    }

    setRfqDialog({ ...openOutcome.dialog, catalogStage: catalogStage ?? null });
  };

  const handleCloseRfqDialog = () => {
    const closeState = resolveBuyerRfqCloseState();
    setRfqDialog(closeState.dialog);
    setRfqDetailView(closeState.detailView);
  };

  const handleSubmitRfq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rfqDialog.product) return;

    // Step 1: Validate and advance to confirmation step if not already there.
    if (!rfqDialog.confirmationStep) {
      const submitResolution = resolveBuyerRfqSubmitPayload(rfqDialog);
      if (!submitResolution.payload) {
        setRfqDialog(dialog => ({ ...dialog, error: submitResolution.error }));
        return;
      }
      setRfqDialog(dialog => ({ ...dialog, confirmationStep: true, error: null }));
      return;
    }

    // Step 2: Confirmation step — resolve payload again and call the API.
    const submitResolution = resolveBuyerRfqSubmitPayload(rfqDialog);
    if (!submitResolution.payload) {
      setRfqDialog(dialog => ({ ...dialog, error: submitResolution.error }));
      return;
    }

    setRfqDialog(dialog => ({ ...dialog, loading: true, error: null }));

    try {
      const response = await createRfq(submitResolution.payload);
      const successState = resolveBuyerRfqSubmitSuccess(response);

      setRfqDialog(dialog => ({
        ...dialog,
        ...successState.dialogPatch,
      }));
      setRfqDetailView(successState.detailView);
    } catch (error) {
      console.error('Failed to submit RFQ:', error);
      setRfqDialog(dialog => ({
        ...dialog,
        loading: false,
        error: resolveBuyerRfqSubmitError(error),
      }));
    }
  };

  const handleRequestAiAssist = async (rfqId: string) => {
    setRfqDialog(d => ({
      ...d,
      aiAssistLoading: true,
      aiAssistError: null,
      aiAssistSuggestions: null,
      aiAssistParseError: false,
      aiSuggestionDecisions: {},
      aiFieldSourceMeta: {},
    }));
    try {
      const result = await requestRfqAssist(rfqId);
      if (result.suggestionsParseError) {
        setRfqDialog(d => ({ ...d, aiAssistLoading: false, aiAssistParseError: true }));
      } else {
        setRfqDialog(d => ({ ...d, aiAssistLoading: false, aiAssistSuggestions: result.suggestions }));
      }
    } catch {
      setRfqDialog(d => ({
        ...d,
        aiAssistLoading: false,
        aiAssistError: 'AI suggestions are unavailable right now. You can still submit the RFQ manually.',
      }));
    }
  };

  const handleOpenBuyerRfqs = async () => {
    navigateTenantManifestRoute('buyer_rfqs');
    setBuyerRfqTradeBridge(view => ({ ...view, error: null, initialTradeId: null }));
    setRfqDetailView(view =>
      view.source === 'list'
        ? {
            open: false,
            source: null,
            rfqId: null,
            loading: false,
            error: null,
            data: null,
          }
        : view
    );
    setBuyerRfqListView(view => resolveBuyerRfqListOpenAction(view));

    const listView = await loadBuyerRfqListContinuity({
      loadBuyerRfqs: getBuyerRfqs,
    });
    setBuyerRfqListView(listView);
  };

  const handleOpenRfqDetail = async (rfqId?: string, source: 'dialog' | 'list' = 'dialog') => {
    const openAction = resolveBuyerRfqDetailOpenAction({
      rfqId,
      fallbackRfqId: rfqDialog.success?.rfqId,
      source,
      currentDetailView: rfqDetailView,
    });

    if (openAction.kind === 'noop') return;

    setBuyerRfqTradeBridge(view => ({ ...view, error: null }));

    if (source === 'list') {
      navigateTenantManifestRoute('buyer_rfqs');
    }

    if (openAction.kind === 'reuse') {
      setRfqDetailView(openAction.detailView);
      return;
    }

    setRfqDetailView(openAction.detailView);

    const detailView = await loadBuyerRfqDetailContinuity({
      rfqId: openAction.rfqId,
      source,
      loadBuyerRfqDetail: getBuyerRfqDetail,
    });
    setRfqDetailView(detailView);
  };

  const handleReturnToBuyerRfqList = () => {
    const returnState = resolveBuyerRfqDetailReturnToListState({
      currentTradeBridge: buyerRfqTradeBridge,
    });
    setBuyerRfqTradeBridge(returnState.tradeBridge);
    setRfqDetailView(returnState.detailView);
  };

  const handleCloseBuyerRfqs = () => {
    handleReturnToBuyerRfqList();
    navigateTenantDefaultManifestRoute();
  };

  const handleCloseRfqDetail = () => {
    const closeState = resolveBuyerRfqDetailCloseState({
      currentTradeBridge: buyerRfqTradeBridge,
      currentDetailView: rfqDetailView,
    });
    setBuyerRfqTradeBridge(closeState.tradeBridge);
    setRfqDetailView(closeState.detailView);
  };

  const handleOpenTradeContinuityFromRfq = async () => {
    const rfq = rfqDetailView.data;

    if (rfq?.status !== 'RESPONDED') {
      return;
    }

    if (rfq.trade_continuity) {
      setBuyerRfqTradeBridge({
        loading: false,
        error: null,
        initialTradeId: rfq.trade_continuity.trade_id,
      });
      setRfqDetailView(view => ({ ...view, open: false }));
      navigateTenantManifestRoute('trades');
      return;
    }

    const createAction = resolveBuyerRfqTradeFromRfqCreateAction(rfq);
    // Trade creation from responded RFQ is not available — supplier-quoted pricing workflow required.
    if (createAction.tradeBridge) {
      setBuyerRfqTradeBridge(createAction.tradeBridge);
    }
  };

  const handleOpenSupplierRfqInbox = async () => {
    const entryState = resolveSupplierRfqInboxEntryState(supplierRfqListView);
    navigateTenantManifestRoute(entryState.routeKey);
    setSupplierRfqDetailView(entryState.detailView);
    setSupplierRfqListView(entryState.listView);

    const listView = await loadSupplierRfqInboxContinuity({
      loadSupplierRfqInbox: getSupplierRfqInbox,
    });
    setSupplierRfqListView(listView);
  };

  const handleOpenSupplierRfqDetail = async (rfqId: string) => {
    const openAction = resolveSupplierRfqDetailOpenAction({
      rfqId,
      currentDetailView: supplierRfqDetailView,
    });

    if (openAction.kind === 'reuse') {
      setSupplierRfqDetailView(openAction.detailView);
      return;
    }

    setSupplierRfqDetailView(openAction.detailView);

    const detailView = await loadSupplierRfqDetailContinuity({
      rfqId,
      existingResponse: openAction.detailView.response,
      loadSupplierRfqDetail: getSupplierRfqDetail,
    });
    setSupplierRfqDetailView(detailView);
  };

  const handleReturnToSupplierRfqList = () => {
    setSupplierRfqDetailView(resolveSupplierRfqDetailReturnToInboxState());
  };

  const handleCloseSupplierRfqInbox = () => {
    const closeState = resolveSupplierRfqInboxCloseState();
    setSupplierRfqDetailView(closeState.detailView);

    if (closeState.navigateToDefaultRoute) {
      navigateTenantDefaultManifestRoute();
    }
  };

  const handleSubmitSupplierRfqResponse = async (message: string) => {
    const rfqId = supplierRfqDetailView.rfqId;
    const currentRfq = supplierRfqDetailView.data;

    if (!rfqId || !currentRfq) {
      return;
    }

    const submitAction = resolveSupplierRfqRespondSubmitAction({
      message,
      currentDetailView: supplierRfqDetailView,
    });

    setSupplierRfqDetailView(submitAction.detailView);

    if (submitAction.kind !== 'submit') {
      return;
    }

    const result = await submitSupplierRfqResponseContinuity({
      rfqId,
      payload: submitAction.payload,
      currentDetailView: submitAction.detailView,
      currentListView: supplierRfqListView,
      submitResponse: submitSupplierRfqResponse,
    });

    setSupplierRfqDetailView(result.detailView);
    setSupplierRfqListView(result.listView);
  };

  /** Wave 4 P1: WL Store Admin — content renderer for back-office panels. */
  const renderWLAdminContent = () => {
    if (!currentTenant || !wlAdminLocalRouteSelection) return null;

    switch (wlAdminLocalRouteSelection.routeKey) {
      case 'staff_invite':
        return <InviteMemberForm onBack={() => navigateWlAdminManifestRoute('staff')} />;
      case 'staff':
        return <TeamManagement onInvite={() => navigateWlAdminManifestRoute('staff_invite')} />;
      case 'domains':
        return <WLDomainsPanel tenantSlug={currentTenant.slug} />;
      case 'dpp_label':
        // TECS-DPP-PASSPORT-NETWORK-020B: dedicated DPP Passport Label configuration tab
        return <WLDppLabelPanel />;
      case 'branding':
        return (
          <WhiteLabelSettings
            tenant={currentTenant}
            onNavigateDomains={() => navigateWlAdminManifestRoute('domains')}
            onNavigateDppLabel={() => navigateWlAdminManifestRoute('dpp_label')}
          />
        );
      case 'collections':
        return <WLCollectionsPanel />;
      case 'products':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Product Catalog</h2>
                <p className="text-slate-500 text-sm mt-0.5">Manage your store inventory.</p>
              </div>
              <button
                onClick={() => setShowAddItemForm(v => !v)}
                className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-slate-700 transition"
              >
                + Add Item
              </button>
            </div>

            {showAddItemForm && (
              <form onSubmit={handleCreateItem} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
                <h3 className="font-bold text-slate-800">New Catalog Item</h3>
                {addItemError && (
                  <div className="text-red-600 text-sm bg-red-50 border border-red-200 px-4 py-2 rounded-lg">{addItemError}</div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="wl-add-name" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Name *</label>
                    <input
                      id="wl-add-name"
                      required
                      value={addItemFormData.name}
                      onChange={e => setAddItemFormData(d => ({ ...d, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-500"
                      placeholder="Product name"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="wl-add-price" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Price *</label>
                    <input
                      id="wl-add-price"
                      required
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={addItemFormData.price}
                      onChange={e => setAddItemFormData(d => ({ ...d, price: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="wl-add-sku" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">SKU</label>
                    <input
                      id="wl-add-sku"
                      value={addItemFormData.sku}
                      onChange={e => setAddItemFormData(d => ({ ...d, sku: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-500"
                      placeholder="Optional SKU"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={addItemLoading}
                    className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-700 transition disabled:opacity-50"
                  >
                    {addItemLoading ? 'Saving...' : 'Save Item'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddItemForm(false); setAddItemError(null); }}
                    className="px-6 py-2 text-slate-500 font-bold text-sm hover:text-slate-800 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {catalogLoading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-800 mx-auto"></div>
                <p className="mt-4 text-slate-500 text-sm">Loading catalog...</p>
              </div>
            )}

            {catalogError && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 text-sm">{catalogError}</div>
            )}

            {!catalogLoading && !catalogError && products.length === 0 && (
              <div className="text-center py-16 text-slate-400 text-sm">No products yet. Add your first item above.</div>
            )}

            {!catalogLoading && !catalogError && products.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {products.map(p => (
                  <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-1">
                    <div className="font-semibold text-slate-800">{p.name}</div>
                    {p.sku && <div className="text-xs text-slate-400">SKU: {p.sku}</div>}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-emerald-700 font-bold text-sm">${p.price}</span>
                      <span className="text-xs text-slate-400">MOQ: {p.moq || 1}</span>
                    </div>
                    {renderCatalogItemMutationActions(p)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'orders':
        return <WLOrdersPanel />;
      default:
        return null;
    }
  };

  const renderDescriptorAlignedTenantContentFamily = (
    contentFamily: RouteManifestKey | null,
  ) => {
    if (!currentTenant) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-slate-500">Loading tenant data...</p>
          </div>
        </div>
      );
    }

    switch (contentFamily) {
      case 'aggregator_workspace':
        return (
          <AggregatorDiscoveryWorkspace
            tenantName={currentTenant.name}
            entries={aggregatorDiscoveryEntries}
            loading={aggregatorDiscoveryLoading}
            error={aggregatorDiscoveryError}
            aiInsight={currentTenant.is_white_label ? null : aiInsight}
            onRetry={() => setAggregatorDiscoveryRefreshKey(value => value + 1)}
          />
        );
      case 'b2b_workspace':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-2xl font-bold">Wholesale Catalog</h1>
                <p className="text-slate-500">Manage your wholesale product catalog.</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleOpenSupplierRfqInbox();
                  }}
                  className="bg-white text-slate-700 px-4 py-2 rounded-lg font-medium border border-slate-200 shadow-sm hover:bg-slate-50 transition text-sm"
                >
                  Supplier RFQ Inbox
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleOpenBuyerRfqs();
                  }}
                  className="bg-white text-slate-700 px-4 py-2 rounded-lg font-medium border border-slate-200 shadow-sm hover:bg-slate-50 transition text-sm"
                >
                  View My RFQs
                </button>
                <button
                  type="button"
                  onClick={() => { navigateTenantManifestRoute('buyer_catalog'); void handleLoadSupplierPicker(); }}
                  className="bg-white text-slate-700 px-4 py-2 rounded-lg font-medium border border-slate-200 shadow-sm hover:bg-slate-50 transition text-sm"
                >
                  Browse Suppliers
                </button>
                <button
                  onClick={() => setShowAddItemForm(v => !v)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-indigo-700 transition text-sm"
                >
                  + Add Item
                </button>
              </div>
            </div>

            <B2BTenantTaxonomyPanel tenant={currentTenant} />

            {/* TECS-AI-SUPPLIER-PROFILE-COMPLETENESS-001: Supplier-internal only */}
            <SupplierProfileCompletenessCard />

            {showAddItemForm && (
              <form onSubmit={handleCreateItem} className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
                <h3 className="font-bold text-slate-800">New Catalog Item</h3>
                {addItemError && (
                  <div className="text-red-600 text-sm bg-red-50 border border-red-200 px-4 py-2 rounded-lg">{addItemError}</div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="b2b-add-name" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Name *</label>
                    <input
                      id="b2b-add-name"
                      required
                      value={addItemFormData.name}
                      onChange={e => setAddItemFormData(d => ({ ...d, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Product name"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="b2b-add-price" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Price *</label>
                    <input
                      id="b2b-add-price"
                      required
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={addItemFormData.price}
                      onChange={e => setAddItemFormData(d => ({ ...d, price: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="b2b-add-sku" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">SKU</label>
                    <input
                      id="b2b-add-sku"
                      value={addItemFormData.sku}
                      onChange={e => setAddItemFormData(d => ({ ...d, sku: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Optional SKU"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label htmlFor="b2b-add-image-url" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Image URL</label>
                  <input
                    id="b2b-add-image-url"
                    type="url"
                    value={addItemFormData.imageUrl}
                    onChange={e => setAddItemFormData(d => ({ ...d, imageUrl: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://example.com/product-image.jpg"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1 md:col-span-2">
                    <label htmlFor="b2b-add-description" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Description</label>
                    <textarea
                      id="b2b-add-description"
                      value={addItemFormData.description}
                      onChange={e => setAddItemFormData(d => ({ ...d, description: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      placeholder="Optional product description"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="b2b-add-moq" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Min Order Qty</label>
                    <input
                      id="b2b-add-moq"
                      type="number"
                      min="1"
                      step="1"
                      value={addItemFormData.moq}
                      onChange={e => setAddItemFormData(d => ({ ...d, moq: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="1"
                    />
                  </div>
                </div>
                {/* Textile attributes (TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="b2b-add-product-category" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Category</label>
                    <select id="b2b-add-product-category" value={addItemFormData.productCategory} onChange={e => setAddItemFormData(d => ({ ...d, productCategory: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                      <option value="">—</option>
                      {['APPAREL_FABRIC','HOME_TEXTILE','TECHNICAL_FABRIC','INDUSTRIAL_FABRIC','LINING','INTERLINING','TRIMMING','ACCESSORY','OTHER'].map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="b2b-add-fabric-type" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Fabric Type</label>
                    <select id="b2b-add-fabric-type" value={addItemFormData.fabricType} onChange={e => setAddItemFormData(d => ({ ...d, fabricType: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                      <option value="">—</option>
                      {['WOVEN','KNIT','NON_WOVEN','LACE','EMBROIDERED','TECHNICAL_COMPOSITE','FLEECE','OTHER'].map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="b2b-add-material" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Material</label>
                    <select id="b2b-add-material" value={addItemFormData.material} onChange={e => setAddItemFormData(d => ({ ...d, material: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                      <option value="">—</option>
                      {['COTTON','POLYESTER','SILK','WOOL','LINEN','VISCOSE','MODAL','TENCEL_LYOCELL','NYLON','ACRYLIC','HEMP','BAMBOO','RECYCLED_POLYESTER','RECYCLED_COTTON','BLENDED','OTHER'].map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="b2b-add-construction" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Construction</label>
                    <select id="b2b-add-construction" value={addItemFormData.construction} onChange={e => setAddItemFormData(d => ({ ...d, construction: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                      <option value="">—</option>
                      {['PLAIN_WEAVE','TWILL','SATIN','DOBBY','JACQUARD','TERRY','VELVET','JERSEY','RIB','INTERLOCK','FLEECE_KNIT','MESH','OTHER'].map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="b2b-add-color" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Color</label>
                    <input id="b2b-add-color" type="text" value={addItemFormData.color} onChange={e => setAddItemFormData(d => ({ ...d, color: e.target.value }))} placeholder="e.g. Navy Blue" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="b2b-add-gsm" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">GSM</label>
                    <input id="b2b-add-gsm" type="number" min={10} max={2000} step={0.1} value={addItemFormData.gsm} onChange={e => setAddItemFormData(d => ({ ...d, gsm: e.target.value }))} placeholder="e.g. 180" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="b2b-add-width-cm" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Width (cm)</label>
                    <input id="b2b-add-width-cm" type="number" min={1} max={999.99} step={0.01} value={addItemFormData.widthCm} onChange={e => setAddItemFormData(d => ({ ...d, widthCm: e.target.value }))} placeholder="e.g. 150" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="b2b-add-composition" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Composition</label>
                    <input id="b2b-add-composition" type="text" value={addItemFormData.composition} onChange={e => setAddItemFormData(d => ({ ...d, composition: e.target.value }))} placeholder="e.g. 60% Cotton 40% Polyester" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                </div>
                {/* Stage selector (TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001) */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="b2b-add-catalog-stage" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Product Stage</label>
                    <select id="b2b-add-catalog-stage" value={addItemFormData.catalogStage} onChange={e => setAddItemFormData(d => ({ ...d, catalogStage: e.target.value, stageAttributes: {} }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                      <option value="">— Select Stage —</option>
                      {CATALOG_STAGE_VALUES.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                </div>
                {/* Dynamic stage fields */}
                {addItemFormData.catalogStage === 'YARN' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Yarn Type</span><input type="text" value={addItemFormData.stageAttributes['yarnType'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, yarnType: e.target.value } }))} placeholder="e.g. Spun" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Yarn Count</span><input type="text" value={addItemFormData.stageAttributes['yarnCount'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, yarnCount: e.target.value } }))} placeholder="e.g. 40s" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Count System</span><input type="text" value={addItemFormData.stageAttributes['countSystem'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, countSystem: e.target.value } }))} placeholder="Ne / Nm / Tex" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Fiber</span><input type="text" value={addItemFormData.stageAttributes['fiber'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, fiber: e.target.value } }))} placeholder="e.g. Cotton" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Ply</span><input type="text" value={addItemFormData.stageAttributes['ply'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, ply: e.target.value } }))} placeholder="e.g. 2" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Spinning Type</span><input type="text" value={addItemFormData.stageAttributes['spinningType'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, spinningType: e.target.value } }))} placeholder="e.g. Ring" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Denier</span><input type="text" value={addItemFormData.stageAttributes['denier'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, denier: e.target.value } }))} placeholder="e.g. 75" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">End Use</span><input type="text" value={addItemFormData.stageAttributes['endUse'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, endUse: e.target.value } }))} placeholder="e.g. Weaving" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                  </div>
                )}
                {addItemFormData.catalogStage === 'FABRIC_KNIT' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Knit Type</span><input type="text" value={addItemFormData.stageAttributes['knitType'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, knitType: e.target.value } }))} placeholder="e.g. Jersey" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Gauge</span><input type="text" value={addItemFormData.stageAttributes['gauge'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, gauge: e.target.value } }))} placeholder="e.g. 28" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Stretch %</span><input type="text" value={addItemFormData.stageAttributes['stretch'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, stretch: e.target.value } }))} placeholder="e.g. 40" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Finish</span><input type="text" value={addItemFormData.stageAttributes['finish'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, finish: e.target.value } }))} placeholder="e.g. Brushed" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">End Use</span><input type="text" value={addItemFormData.stageAttributes['endUse'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, endUse: e.target.value } }))} placeholder="e.g. Sportswear" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                  </div>
                )}
                {addItemFormData.catalogStage === 'GARMENT' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Garment Type</span><input type="text" value={addItemFormData.stageAttributes['garmentType'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, garmentType: e.target.value } }))} placeholder="e.g. T-Shirt" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Size Range</span><input type="text" value={addItemFormData.stageAttributes['sizeRange'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, sizeRange: e.target.value } }))} placeholder="e.g. XS-3XL" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Fit</span><input type="text" value={addItemFormData.stageAttributes['fit'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, fit: e.target.value } }))} placeholder="e.g. Regular" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Gender</span><input type="text" value={addItemFormData.stageAttributes['gender'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, gender: e.target.value } }))} placeholder="e.g. Unisex" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Fabric Composition</span><input type="text" value={addItemFormData.stageAttributes['fabricComposition'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, fabricComposition: e.target.value } }))} placeholder="e.g. 100% Cotton" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Monthly Capacity</span><input type="text" value={addItemFormData.stageAttributes['monthlyCapacity'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, monthlyCapacity: e.target.value } }))} placeholder="e.g. 50000" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                  </div>
                )}
                {addItemFormData.catalogStage === 'MACHINE' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Machine Type</span><input type="text" value={addItemFormData.stageAttributes['machineType'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, machineType: e.target.value } }))} placeholder="e.g. Rapier Loom" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Brand</span><input type="text" value={addItemFormData.stageAttributes['brand'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, brand: e.target.value } }))} placeholder="e.g. Picanol" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Model</span><input type="text" value={addItemFormData.stageAttributes['model'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, model: e.target.value } }))} placeholder="e.g. GTX-L" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Year</span><input type="text" value={addItemFormData.stageAttributes['year'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, year: e.target.value } }))} placeholder="e.g. 2019" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Condition</span><input type="text" value={addItemFormData.stageAttributes['condition'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, condition: e.target.value } }))} placeholder="New / Refurbished" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Service Support</span><input type="text" value={addItemFormData.stageAttributes['serviceSupport'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, serviceSupport: e.target.value } }))} placeholder="e.g. On-site" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                  </div>
                )}
                {addItemFormData.catalogStage === 'SERVICE' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Service Type</span><select value={addItemFormData.stageAttributes['serviceType'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, serviceType: e.target.value } }))} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white"><option value="">—</option>{SERVICE_TYPE_VALUES.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}</select></label>
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Specialization</span><input type="text" value={addItemFormData.stageAttributes['specialization'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, specialization: e.target.value } }))} placeholder="e.g. Denim testing" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Location Coverage</span><input type="text" value={addItemFormData.stageAttributes['locationCoverage'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, locationCoverage: e.target.value } }))} placeholder="e.g. Pan-India" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Turnaround (days)</span><input type="text" value={addItemFormData.stageAttributes['turnaroundTimeDays'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, turnaroundTimeDays: e.target.value } }))} placeholder="e.g. 7" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Portfolio Available</span><input type="text" value={addItemFormData.stageAttributes['portfolioAvailable'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, portfolioAvailable: e.target.value } }))} placeholder="Yes / No" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                  </div>
                )}
                {addItemFormData.catalogStage === 'SOFTWARE_SAAS' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Software Category</span><input type="text" value={addItemFormData.stageAttributes['softwareCategory'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, softwareCategory: e.target.value } }))} placeholder="e.g. ERP" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Deployment Model</span><input type="text" value={addItemFormData.stageAttributes['deploymentModel'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, deploymentModel: e.target.value } }))} placeholder="Cloud / On-Prem" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Modules</span><input type="text" value={addItemFormData.stageAttributes['modules'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, modules: e.target.value } }))} placeholder="e.g. Costing, Planning" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Support Level</span><input type="text" value={addItemFormData.stageAttributes['supportLevel'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, supportLevel: e.target.value } }))} placeholder="e.g. 24/7" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                    <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Trial Available</span><input type="text" value={addItemFormData.stageAttributes['trialAvailable'] ?? ''} onChange={e => setAddItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, trialAvailable: e.target.value } }))} placeholder="Yes / No" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" /></label>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={addItemLoading}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    {addItemLoading ? 'Saving...' : 'Save Item'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddItemForm(false); setAddItemError(null); }}
                    className="px-6 py-2 text-slate-500 font-bold text-sm hover:text-slate-800 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {catalogLoading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
                <p className="mt-4 text-slate-500">Loading catalog...</p>
              </div>
            )}

            {catalogError && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
                {catalogError}
              </div>
            )}

            {!catalogLoading && !catalogError && products.length === 0 && (
              <div className="text-center py-12 text-slate-500">No products available.</div>
            )}

            {!catalogLoading && !catalogError && products.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {products.map(p => (
                  <div
                    key={p.id}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden group shadow-sm"
                  >
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500"
                        alt={p.name}
                      />
                    ) : (
                      <div
                        className="w-full h-40 bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-400"
                        aria-label={`${p.name} image unavailable`}
                        role="img"
                      >
                        Image unavailable
                      </div>
                    )}
                    <div className="p-4 space-y-2">
                      <h3 className="font-bold">{p.name}</h3>
                      {p.description && <p className="text-xs text-slate-500 line-clamp-2">{p.description}</p>}
                      <div className="flex justify-between items-center mt-4">
                        <div className="text-emerald-600 font-bold">${p.price}/unit</div>
                        <div className="text-xs text-slate-400">MOQ: {p.moq || 1}</div>
                      </div>
                      {renderB2BCatalogCardFooter(p)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'b2c_storefront': {
        const visibleB2CProducts = products.slice(0, b2cVisibleCount);
        const hasHiddenLoadedProducts = products.length > b2cVisibleCount;
        const canLoadMoreB2CProducts = catalogNextCursor !== null;
        let b2cBrowseActionLabel = 'All Visible';
        if (hasHiddenLoadedProducts) {
          b2cBrowseActionLabel = 'See All';
        } else if (canLoadMoreB2CProducts) {
          b2cBrowseActionLabel = b2cLoadingMore ? 'Loading...' : 'Load More';
        }

        return (
          <div className="space-y-12 animate-in fade-in duration-500">
            <section className="relative h-[400px] rounded-3xl overflow-hidden flex items-center px-12">
              <img
                src="https://picsum.photos/seed/retail/1200/600"
                className="absolute inset-0 w-full h-full object-cover brightness-50"
                alt="Spring 2024 retail collections hero banner"
              />
              <div className="relative z-10 text-white max-w-lg space-y-4">
                <h1 className="text-5xl font-black leading-tight">Spring 2024 Collections.</h1>
                <p className="text-lg opacity-90">
                  Sustainably sourced, ethically manufactured. Delivered to your door.
                </p>
                <button
                  type="button"
                  onClick={handleB2CShopNow}
                  className="bg-white text-indigo-600 px-8 py-3 rounded-full font-bold shadow-xl hover:bg-indigo-50 transition"
                >
                  Shop Now
                </button>
              </div>
            </section>

            <section ref={b2cCatalogSectionRef}>
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-bold">New Arrivals</h2>
                  {b2cSearchQuery.trim() && !catalogLoading && !catalogError && (
                    <p className="mt-1 text-sm text-slate-500">
                      Showing results for "{b2cSearchQuery.trim()}".
                    </p>
                  )}
                </div>
                <div className="flex gap-3 items-center">
                  <button
                    type="button"
                    onClick={() => { void handleB2CLoadMore(); }}
                    disabled={b2cLoadingMore || (!hasHiddenLoadedProducts && !canLoadMoreB2CProducts)}
                    className="text-indigo-600 font-semibold underline underline-offset-4"
                  >
                    {b2cBrowseActionLabel}
                  </button>
                </div>
              </div>

              {catalogLoading && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-4 text-slate-500">Loading products...</p>
                </div>
              )}

              {catalogError && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
                  {catalogError}
                </div>
              )}

              {!catalogLoading && !catalogError && products.length === 0 && (
                <div className="text-center py-12 text-slate-500">No products available.</div>
              )}

              {!catalogLoading && !catalogError && products.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  {visibleB2CProducts.map(p => (
                    <div key={p.id} className="space-y-3">
                      <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            className="w-full h-full object-cover hover:scale-110 transition duration-700"
                            alt={p.name}
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-sm font-medium text-slate-400"
                            aria-label={`${p.name} image unavailable`}
                            role="img"
                          >
                            Image unavailable
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-800">{p.name}</h4>
                        <div className="text-slate-500 font-bold">${p.price}.00</div>
                      </div>
                      <B2CAddToCartButton product={p} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        );
      }
      case 'wl_storefront':
        return (
          <WLStorefront
            onRequestQuote={handleOpenRfqDialog}
            onViewBuyerRfqs={handleOpenBuyerRfqs}
          />
        );
      default:
        return <div>Invalid Tenant Configuration</div>;
    }
  };

  const renderExperienceContent = () => {
    if (!currentTenant) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-slate-500">Loading tenant data...</p>
          </div>
        </div>
      );
    }

    const onboardingStatusContinuity = currentOnboardingStatusContinuity;
    const workspaceIdentityLabel = tenantBaseCategory ?? currentTenant.base_family ?? currentTenant.type ?? null;
    const workspaceStatusLabel = currentTenant.status.replaceAll('_', ' ');
    const workspaceContinuityLabel = onboardingStatusContinuity?.title ?? 'Workspace continuity';
    const workspaceContinuityDetail = onboardingStatusContinuity?.detail
      ?? 'This settings surface is limited to read-only workspace profile continuity and status visibility.';

    if (tenantContentFamily === 'b2b_workspace' && onboardingStatusContinuity) {
      return (
        <div className="space-y-6 animate-in fade-in duration-500">
          <section className={`rounded-3xl border p-8 shadow-sm space-y-6 ${onboardingStatusContinuity.panelClassName}`}>
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-4 max-w-3xl">
                <div className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] ${onboardingStatusContinuity.badgeClassName}`}>
                  Pending verification posture
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl font-bold text-slate-900">{onboardingStatusContinuity.title}</h1>
                  <p className="text-base leading-7 text-slate-600">{onboardingStatusContinuity.detail}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 xl:max-w-sm">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Current status</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">
                  {currentTenant.status.replaceAll('_', ' ')}
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  TexQtic will unlock the full workspace after business verification review is completed.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Workspace posture</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">Read-only review state</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This tenant stays blocked from active trading workflows until approval is recorded.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">What remains paused</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">Catalog, RFQ, and trade actions</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Add, edit, delete, quote, escrow, and settlement affordances stay unavailable during review.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Next step</div>
                {(provisionalGstStatus === null || provisionalGstStatus === 'loading') && (
                  <>
                    <div className="mt-2 text-lg font-semibold text-slate-900">Wait for TexQtic review</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Once verification is approved, the full B2B workspace and activation-dependent routes can open normally.
                    </p>
                  </>
                )}
                {provisionalGstStatus === 'not_submitted' && (
                  <>
                    <div className="mt-2 text-lg font-semibold text-slate-900">Submit business verification</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Submit your GST details to begin business verification and unlock trade operations.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigateTenantManifestRoute('gst_verification')}
                      className="mt-3 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                    >
                      Submit GST Verification
                    </button>
                  </>
                )}
                {provisionalGstStatus === 'pending' && (
                  <>
                    <div className="mt-2 text-lg font-semibold text-slate-900">Verification under review</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      GST verification submitted — awaiting TexQtic review.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigateTenantManifestRoute('gst_verification')}
                      className="mt-3 text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      View GST Submission →
                    </button>
                  </>
                )}
                {provisionalGstStatus === 'rejected' && (
                  <>
                    <div className="mt-2 text-lg font-semibold text-slate-900">Resubmit verification</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Your GST submission was not approved. Review the notes and resubmit.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigateTenantManifestRoute('gst_verification')}
                      className="mt-3 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition"
                    >
                      Resubmit GST Verification
                    </button>
                  </>
                )}
                {provisionalGstStatus === 'needs_more_info' && (
                  <>
                    <div className="mt-2 text-lg font-semibold text-slate-900">Update your submission</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Additional information is required for your GST submission.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigateTenantManifestRoute('gst_verification')}
                      className="mt-3 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition"
                    >
                      Update GST Submission
                    </button>
                  </>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Activation-dependent surfaces</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Normal workspace actions stay suppressed</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                'Catalog management and product edits',
                'Buyer RFQs and supplier RFQ inbox',
                'Trade, escrow, and settlement workflows',
                'Other active B2B management affordances',
              ].map(item => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </section>
        </div>
      );
    }

    if (onboardingStatusContinuity && VERIFICATION_BLOCKED_VIEWS.has(expView)) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-6">
          <div className={`max-w-xl rounded-3xl shadow-xl p-10 text-center space-y-4 ${onboardingStatusContinuity.panelClassName}`}>
            <div className="text-4xl">⏳</div>
            <h2 className="text-2xl font-bold text-slate-900">{onboardingStatusContinuity.title}</h2>
            <p className="text-slate-600">
              {onboardingStatusContinuity.detail}
            </p>
            <p className={`text-sm rounded-xl px-4 py-3 ${onboardingStatusContinuity.badgeClassName}`}>
              Current status: {currentTenant.status}
            </p>
          </div>
        </div>
      );
    }

    if (appState === 'TEAM_MGMT') return <TeamManagement onInvite={() => setAppState('INVITE_MEMBER')} />;
    if (appState === 'INVITE_MEMBER')
      return <InviteMemberForm onBack={() => setAppState('TEAM_MGMT')} />;
    if (appState === 'SETTINGS' && tenantCanAccessWhiteLabelSettingsOverlay) {
      return (
        <WhiteLabelSettings
          tenant={currentTenant}
          onEnterOverlay={tenantHasWlAdminOverlay ? () => enterWlAdmin('BRANDING') : undefined}
        />
      );
    }
    if (appState === 'SETTINGS') {
      return (
        <div className="space-y-6 animate-in fade-in duration-500">
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-4 max-w-3xl">
                <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-600">
                  Workspace Profile
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl font-bold text-slate-900">{currentTenant.name}</h1>
                  <p className="text-base leading-7 text-slate-600">
                    Read-only workspace identity and status continuity for this tenant.
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 xl:max-w-sm">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Current status</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{workspaceStatusLabel}</div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {workspaceContinuityDetail}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Organization</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{currentTenant.name}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Tenant-owned workspace identity remains visible here without opening other admin domains.
                </p>
              </div>
              {workspaceIdentityLabel && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Base family</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">{workspaceIdentityLabel}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Canonical family continuity is shown without opening overlay-owned controls.
                  </p>
                </div>
              )}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Workspace posture</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{workspaceContinuityLabel}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This settings surface stays read-only and limited to common-core profile continuity.
                </p>
              </div>
            </div>
          </section>
          <PlanAndUsagePanel
            plan={currentTenant.commercial_plan ?? currentTenant.plan}
            aiBudget={currentTenant.aiBudget}
            tenantName={currentTenant.name}
          />
        </div>
      );
    }
    switch (tenantLocalRouteSelection?.routeKey) {
      case 'orders':
        return <EXPOrdersPanel onBack={() => navigateTenantDefaultManifestRoute()} />;
      case 'buyer_rfqs':
        if (rfqDetailView.open && rfqDetailView.source === 'list') {
          return (
            <BuyerRfqDetailSurface
              rfq={rfqDetailView.data}
              loading={rfqDetailView.loading}
              error={rfqDetailView.error}
              onBack={handleReturnToBuyerRfqList}
              onClose={handleCloseBuyerRfqs}
              onOpenTradeContinuity={() => {
                void handleOpenTradeContinuityFromRfq();
              }}
              tradeContinuityLoading={buyerRfqTradeBridge.loading}
              tradeContinuityError={buyerRfqTradeBridge.error}
            />
          );
        }

        return (
          <BuyerRfqListSurface
            rfqs={buyerRfqListView.rfqs}
            loading={buyerRfqListView.loading}
            error={buyerRfqListView.error}
            onViewDetail={rfqId => {
              void handleOpenRfqDetail(rfqId, 'list');
            }}
            onBack={handleCloseBuyerRfqs}
          />
        );
      case 'supplier_rfq_inbox':
        if (supplierRfqDetailView.open) {
          return (
            <SupplierRfqDetailSurface
              rfq={supplierRfqDetailView.data}
              response={supplierRfqDetailView.response}
              loading={supplierRfqDetailView.loading}
              error={supplierRfqDetailView.error}
              submitLoading={supplierRfqDetailView.submitLoading}
              submitError={supplierRfqDetailView.submitError}
              onBack={handleReturnToSupplierRfqList}
              onClose={handleCloseSupplierRfqInbox}
              onSubmitResponse={message => {
                void handleSubmitSupplierRfqResponse(message);
              }}
            />
          );
        }

        return (
          <SupplierRfqInboxSurface
            rfqs={supplierRfqListView.rfqs}
            loading={supplierRfqListView.loading}
            error={supplierRfqListView.error}
            onViewDetail={rfqId => {
              void handleOpenSupplierRfqDetail(rfqId);
            }}
            onBack={handleCloseSupplierRfqInbox}
          />
        );
      case 'dpp':
        return (
          <DPPPassport
            onBack={() => navigateTenantDefaultManifestRoute()}
            onNavigateToTraceability={() => navigateTenantManifestRoute('traceability')}
          />
        );
      case 'escrow':
        return <EscrowPanel onBack={() => navigateTenantDefaultManifestRoute()} />;
      case 'gst_verification':
        return <GstVerificationCard onBack={() => navigateTenantDefaultManifestRoute()} />;
      case 'invoices':
        return <InvoicesPanel />;
      case 'invoice_approval':
        if (!invoiceApprovalTradeId) {
          return (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <div className="text-4xl mb-3">📄</div>
              <p className="text-sm font-medium">No trade selected.</p>
              <p className="text-xs mt-1">Navigate to a trade to view its invoices.</p>
            </div>
          );
        }
        return (
          <InvoiceApprovalView
            tradeId={invoiceApprovalTradeId}
          />
        );
      case 'escalations':
        return <EscalationsPanel onBack={() => navigateTenantDefaultManifestRoute()} />;
      case 'settlement':
        return <SettlementPreview onBack={() => navigateTenantDefaultManifestRoute()} />;
      case 'certifications':
        return <CertificationsPanel onBack={() => navigateTenantDefaultManifestRoute()} />;
      case 'traceability':
        return <TraceabilityPanel onBack={() => navigateTenantDefaultManifestRoute()} />;
      case 'audit_logs':
        return <TenantAuditLogs onBack={() => navigateTenantDefaultManifestRoute()} />;
      case 'trades':
        return (
          <TradesPanel
            onBack={() => {
              navigateTenantDefaultManifestRoute({ resetTradeBridge: true });
            }}
            initialTradeId={buyerRfqTradeBridge.initialTradeId}
            onInitialTradeHandled={() => {
              setBuyerRfqTradeBridge(view => ({ ...view, initialTradeId: null }));
            }}
          />
        );
      case 'nc_pools':
        return (
          <PoolListSurface
            onSelectPool={(poolId) => {
              setSelectedPoolId(poolId);
              navigateTenantManifestRoute('nc_pool_detail');
            }}
            onBack={() => navigateTenantDefaultManifestRoute()}
          />
        );
      case 'nc_pool_detail':
        return selectedPoolId ? (
          <PoolDetailSurface
            poolId={selectedPoolId}
            onBack={() => {
              setSelectedPoolId(null);
              navigateTenantManifestRoute('nc_pools');
            }}
            onNavigateToDemandLines={() => navigateTenantManifestRoute('nc_pool_demand_lines')}
            onNavigateToRfqIssue={() => navigateTenantManifestRoute('nc_pool_rfq')}
          />
        ) : (
          <NetworkCommercePlaceholderSurface
            title="Pool Not Selected"
            description="Please select a pool from the registry."
            status="coming-soon"
            onBack={() => navigateTenantManifestRoute('nc_pools')}
          />
        );
      case 'nc_pool_demand_lines':
        return selectedPoolId ? (
          <DemandLineSurface
            poolId={selectedPoolId}
            onBack={() => navigateTenantManifestRoute('nc_pool_detail')}
          />
        ) : (
          <NetworkCommercePlaceholderSurface
            title="Demand Lines"
            description="Select a pool from the registry to view and manage demand lines."
            status="coming-soon"
            onBack={() => navigateTenantManifestRoute('nc_pools')}
          />
        );
      case 'nc_pool_rfq':
        return selectedPoolId ? (
          <PoolRfqSurface
            poolId={selectedPoolId}
            onBack={() => navigateTenantManifestRoute('nc_pool_detail')}
          />
        ) : (
          <NetworkCommercePlaceholderSurface
            title="RFQ Issue & Management"
            description="Select a pool from NC Pools to issue an RFQ."
            status="coming-soon"
            onBack={() => navigateTenantManifestRoute('nc_pools')}
          />
        );
      case 'nc_pool_invite_inbox':
        return (
          <SupplierInviteInbox
            onBack={() => navigateTenantDefaultManifestRoute()}
          />
        );
      case 'catalog':
      case 'home':
      case 'cart':
        return renderDescriptorAlignedTenantContentFamily(tenantContentFamily);
      case 'buyer_catalog':
        // PHASE_C: PDP item view (item selected)
        if (buyerCatalogSelectedItemId) {
          return (
            <CatalogPdpSurface
              item={buyerCatalogPdpItem}
              loading={buyerCatalogPdpLoading}
              error={buyerCatalogPdpError}
              isSelfSupplierContext={
                buyerCatalogSupplierOrgId.length > 0 &&
                buyerCatalogSupplierOrgId === currentTenantId
              }
              onBack={handleCloseCatalogPdp}
              onRequestQuote={(payload) => {
                // P-4: bridge RfqTriggerPayload → minimal CatalogItem for existing RFQ dialog.
                const asProduct: CatalogItem = {
                  id: payload.itemId,
                  tenantId: payload.supplierId,
                  name: payload.itemTitle,
                  sku: '',
                  price: 0,
                  active: true,
                  createdAt: '',
                  updatedAt: '',
                  moq: buyerCatalogPdpItem?.availabilitySummary.moqValue ?? undefined,
                };
                handleOpenRfqDialog(asProduct, payload.stage ?? undefined);
              }}
            />
          );
        }
        // Phase A: Supplier picker (no supplier selected yet)
        if (!buyerCatalogSupplierOrgId) {
          return (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Browse Suppliers</h1>
                <p className="text-slate-500 text-sm mt-1">
                  Select a supplier to browse their catalog and request quotes.
                </p>
              </div>

              {supplierPickerLoading && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
                  <p className="mt-4 text-slate-500">Loading suppliers...</p>
                </div>
              )}

              {supplierPickerError && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 text-sm">
                  {supplierPickerError}
                  <button
                    type="button"
                    onClick={() => void handleLoadSupplierPicker()}
                    className="ml-3 text-sm text-red-600 underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!supplierPickerLoading && !supplierPickerError && supplierPickerItems.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-sm">
                  <p>No eligible suppliers found at this time.</p>
                  <p className="mt-1">Contact your administrator if you expect to have supplier relationships available.</p>
                </div>
              )}

              {!supplierPickerLoading && supplierPickerItems.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {supplierPickerItems.map(supplier => (
                    <div
                      key={supplier.id}
                      role="button"
                      tabIndex={0}
                      className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition cursor-pointer"
                      onClick={() => {
                        setBuyerCatalogSearch('');
                        setBuyerCatalogSupplierOrgId(supplier.id);
                        void handleFetchBuyerCatalog(supplier.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setBuyerCatalogSearch('');
                          setBuyerCatalogSupplierOrgId(supplier.id);
                          void handleFetchBuyerCatalog(supplier.id);
                        }
                      }}
                    >
                      <div className="space-y-2">
                        <h3 className="font-bold text-slate-900 text-base">{supplier.legalName}</h3>
                        {supplier.primarySegment && (
                          <span className="inline-block rounded-full bg-slate-100 text-slate-500 text-xs px-2 py-0.5">
                            {supplier.primarySegment.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBuyerCatalogSearch('');
                            setBuyerCatalogSupplierOrgId(supplier.id);
                            void handleFetchBuyerCatalog(supplier.id);
                          }}
                          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
                        >
                          Browse Catalog
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigateTenantDefaultManifestRoute()}
                  className="text-slate-400 text-sm hover:text-slate-700 transition"
                >
                  ← Back to workspace
                </button>
              </div>
            </div>
          );
        }

        // Phase B: Item grid (supplier selected)
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {resolveSupplierDisplayName(supplierPickerItems, buyerCatalogSupplierOrgId)}
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  Browse active catalog items and request quotes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBuyerCatalogSearch('');
                  setBuyerCatalogSupplierOrgId('');
                  setBuyerCatalogItems([]);
                  setBuyerCatalogNextCursor(null);
                  setBuyerCatalogError(null);
                  setBuyerCatalogLoadingMore(false);
                  setBuyerCatalogLoadMoreError(null);
                  // Reset textile filters (TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001)
                  setFilterProductCategory('');
                  setFilterFabricType('');
                  setFilterMaterial([]);
                  setFilterConstruction('');
                  setFilterColor('');
                  setFilterGsmMin('');
                  setFilterGsmMax('');
                  setFilterWidthMin('');
                  setFilterWidthMax('');
                  setFilterMoqMax('');
                  setFilterCertification('');
                  setFilterCatalogStage('');
                  setShowBuyerFilters(false);
                }}
                className="flex-shrink-0 px-4 py-2 text-slate-500 font-medium text-sm hover:text-slate-800 border border-slate-200 rounded-lg transition"
              >
                ← All Suppliers
              </button>
            </div>

            {/* TECS-B2B-BUYER-CATALOG-SEARCH-FILTER-001: Keyword search input */}
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"
                aria-hidden="true"
              >
                🔍
              </span>
              <input
                type="text"
                value={buyerCatalogSearch}
                aria-label="Search catalog items"
                placeholder="Search by name or SKU..."
                className="w-full border border-slate-200 rounded-lg px-4 py-2 pl-9 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                onChange={(e) => {
                  const val = e.target.value;
                  setBuyerCatalogSearch(val);
                  if (buyerCatalogSearchDebounceRef.current) {
                    clearTimeout(buyerCatalogSearchDebounceRef.current);
                  }
                  buyerCatalogSearchDebounceRef.current = setTimeout(() => {
                    setBuyerCatalogNextCursor(null);
                    void handleFetchBuyerCatalog(buyerCatalogSupplierOrgId, val.trim() || undefined);
                  }, 350);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (buyerCatalogSearchDebounceRef.current) {
                      clearTimeout(buyerCatalogSearchDebounceRef.current);
                    }
                    setBuyerCatalogNextCursor(null);
                    void handleFetchBuyerCatalog(buyerCatalogSupplierOrgId, buyerCatalogSearch.trim() || undefined);
                  } else if (e.key === 'Escape') {
                    if (buyerCatalogSearchDebounceRef.current) {
                      clearTimeout(buyerCatalogSearchDebounceRef.current);
                    }
                    setBuyerCatalogSearch('');
                    setBuyerCatalogNextCursor(null);
                    void handleFetchBuyerCatalog(buyerCatalogSupplierOrgId, undefined);
                  }
                }}
              />
            </div>

            {/* TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001: Textile filter panel */}
            <div>
              <button
                type="button"
                onClick={() => setShowBuyerFilters(f => !f)}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
              >
                {showBuyerFilters ? '▲ Hide Filters' : '▼ Filters'}
                {(filterProductCategory || filterFabricType || filterMaterial.length > 0 || filterConstruction || filterColor || filterGsmMin || filterGsmMax || filterWidthMin || filterWidthMax || filterMoqMax || filterCertification || filterCatalogStage) && (
                  <span className="ml-1 bg-indigo-100 text-indigo-700 text-xs px-1.5 py-0.5 rounded-full">active</span>
                )}
              </button>
              {showBuyerFilters && (
                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <label htmlFor="filter-category" className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                    <select id="filter-category" value={filterProductCategory} onChange={e => setFilterProductCategory(e.target.value)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-700 bg-white">
                      <option value="">Any</option>
                      {['APPAREL_FABRIC','HOME_TEXTILE','TECHNICAL_FABRIC','INDUSTRIAL_FABRIC','LINING','INTERLINING','TRIMMING','ACCESSORY','OTHER'].map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="filter-fabric-type" className="block text-xs font-medium text-slate-600 mb-1">Fabric Type</label>
                    <select id="filter-fabric-type" value={filterFabricType} onChange={e => setFilterFabricType(e.target.value)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-700 bg-white">
                      <option value="">Any</option>
                      {['WOVEN','KNIT','NON_WOVEN','LACE','EMBROIDERED','TECHNICAL_COMPOSITE','FLEECE','OTHER'].map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="filter-material" className="block text-xs font-medium text-slate-600 mb-1">Material</label>
                    <select
                      id="filter-material"
                      multiple
                      value={filterMaterial}
                      onChange={e => setFilterMaterial(Array.from(e.target.selectedOptions, o => o.value))}
                      className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-700 bg-white h-20"
                    >
                      {['COTTON','POLYESTER','SILK','WOOL','LINEN','VISCOSE','MODAL','TENCEL_LYOCELL','NYLON','ACRYLIC','HEMP','BAMBOO','RECYCLED_POLYESTER','RECYCLED_COTTON','BLENDED','OTHER'].map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="filter-construction" className="block text-xs font-medium text-slate-600 mb-1">Construction</label>
                    <select id="filter-construction" value={filterConstruction} onChange={e => setFilterConstruction(e.target.value)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-700 bg-white">
                      <option value="">Any</option>
                      {['PLAIN_WEAVE','TWILL','SATIN','DOBBY','JACQUARD','TERRY','VELVET','JERSEY','RIB','INTERLOCK','FLEECE_KNIT','MESH','OTHER'].map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="filter-color" className="block text-xs font-medium text-slate-600 mb-1">Color</label>
                    <input id="filter-color" type="text" value={filterColor} onChange={e => setFilterColor(e.target.value)} placeholder="e.g. Navy Blue" className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-700" />
                  </div>
                  <div>
                    <label htmlFor="filter-gsm-min" className="block text-xs font-medium text-slate-600 mb-1">GSM (min–max)</label>
                    <div className="flex gap-1">
                      <input id="filter-gsm-min" type="number" value={filterGsmMin} onChange={e => setFilterGsmMin(e.target.value)} placeholder="10" min={10} max={2000} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-700" />
                      <input type="number" value={filterGsmMax} onChange={e => setFilterGsmMax(e.target.value)} placeholder="2000" min={10} max={2000} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-700" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="filter-width-min" className="block text-xs font-medium text-slate-600 mb-1">Width cm (min–max)</label>
                    <div className="flex gap-1">
                      <input id="filter-width-min" type="number" value={filterWidthMin} onChange={e => setFilterWidthMin(e.target.value)} placeholder="1" min={1} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-700" />
                      <input type="number" value={filterWidthMax} onChange={e => setFilterWidthMax(e.target.value)} placeholder="999" min={1} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-700" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="filter-moq-max" className="block text-xs font-medium text-slate-600 mb-1">Max MOQ</label>
                    <input id="filter-moq-max" type="number" value={filterMoqMax} onChange={e => setFilterMoqMax(e.target.value)} placeholder="Any" min={1} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-700" />
                  </div>
                  <div>
                    <label htmlFor="filter-certification" className="block text-xs font-medium text-slate-600 mb-1">Certification</label>
                    <select id="filter-certification" value={filterCertification} onChange={e => setFilterCertification(e.target.value)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-700 bg-white">
                      <option value="">Any</option>
                      {['OEKO_TEX_STANDARD_100','OEKO_TEX_LEATHER_STANDARD','GOTS','BCI','FAIR_TRADE','BLUESIGN','HIGG_INDEX','RECYCLED_CLAIM_STANDARD','GLOBAL_RECYCLE_STANDARD','ISO_9001','SEDEX_SMETA','OTHER'].map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  {/* Stage filter (TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001) */}
                  <div>
                    <label htmlFor="buyer-catalog-stage-filter" className="block text-xs font-medium text-slate-600 mb-1">Product Stage</label>
                    <select id="buyer-catalog-stage-filter" value={filterCatalogStage} onChange={e => setFilterCatalogStage(e.target.value)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-700 bg-white">
                      <option value="">Any</option>
                      {CATALOG_STAGE_VALUES.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div className="col-span-full flex gap-2 justify-end mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setFilterProductCategory(''); setFilterFabricType(''); setFilterMaterial([]);
                        setFilterConstruction(''); setFilterColor(''); setFilterGsmMin(''); setFilterGsmMax('');
                        setFilterWidthMin(''); setFilterWidthMax(''); setFilterMoqMax(''); setFilterCertification('');
                        setFilterCatalogStage('');
                        setBuyerCatalogNextCursor(null);
                        void handleFetchBuyerCatalog(buyerCatalogSupplierOrgId, buyerCatalogSearch.trim() || undefined);
                      }}
                      className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100"
                    >
                      Clear Filters
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBuyerCatalogNextCursor(null);
                        void handleFetchBuyerCatalog(buyerCatalogSupplierOrgId, buyerCatalogSearch.trim() || undefined);
                      }}
                      className="px-3 py-1.5 text-xs text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              )}
            </div>

            {buyerCatalogError && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 text-sm">
                {buyerCatalogError}
                <button
                  type="button"
                  onClick={() => void handleFetchBuyerCatalog(buyerCatalogSupplierOrgId, buyerCatalogSearch.trim() || undefined)}
                  className="ml-3 text-sm text-red-600 underline"
                >
                  Retry
                </button>
              </div>
            )}

            {buyerCatalogLoading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
                <p className="mt-4 text-slate-500">Loading catalog...</p>
              </div>
            )}

            {/* Search-empty state: active search query returned zero items */}
            {!buyerCatalogLoading && !buyerCatalogError && buyerCatalogSupplierOrgId && buyerCatalogItems.length === 0 && buyerCatalogSearch.trim().length > 0 && (
              <div className="text-center py-12 text-slate-500 text-sm">
                <p>{PHASE_B_SEARCH_EMPTY_STATE_LINE}</p>
              </div>
            )}

            {/* Catalog-empty state: no search active and supplier has no items */}
            {!buyerCatalogLoading && !buyerCatalogError && buyerCatalogItems.length === 0 && buyerCatalogSupplierOrgId && buyerCatalogSearch.trim().length === 0 && (
              <div className="text-center py-12 text-slate-500 text-sm">
                <p>{PHASE_B_EMPTY_STATE_LINES[0]}</p>
                <p className="mt-1">{PHASE_B_EMPTY_STATE_LINES[1]}</p>
              </div>
            )}

            {!buyerCatalogLoading && buyerCatalogItems.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  {buyerCatalogItems.map(item => (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          className="w-full h-40 object-cover"
                          alt={item.name}
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className="w-full h-40 bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-400"
                          aria-label={`${item.name} \u2014 image not available`}
                          role="img"
                        >
                          No image
                        </div>
                      )}
                      <div className="p-4 space-y-1.5">
                        <h3 className="font-semibold text-slate-900">{item.name}</h3>
                        {item.sku && (
                          <p className="text-xs text-slate-400 font-mono">SKU: {item.sku}</p>
                        )}
                        {item.description && (
                          <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                        )}
                        <div className="text-xs text-slate-500">Min. Order: {item.moq}</div>
                        {/* Textile attrs (TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001) */}
                        {(item.fabricType || item.material || item.gsm || item.widthCm || item.construction || item.color || (item.certifications && item.certifications.length > 0)) && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {item.fabricType && <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{item.fabricType.replace(/_/g, ' ')}</span>}
                            {item.material && <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{item.material.replace(/_/g, ' ')}</span>}
                            {item.construction && <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{item.construction.replace(/_/g, ' ')}</span>}
                            {item.color && <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{item.color}</span>}
                            {item.gsm != null && <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{item.gsm} GSM</span>}
                            {item.widthCm != null && <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{item.widthCm} cm</span>}
                            {item.certifications && item.certifications.map(c => (
                              <span key={c.standard} className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">{c.standard.replace(/_/g, ' ')}</span>
                            ))}
                            {/* Catalog stage chip (TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001) */}
                            {item.catalogStage && (
                              <span className="text-xs bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded font-medium">{item.catalogStage.replace(/_/g, ' ')}</span>
                            )}
                          </div>
                        )}
                        <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
                          <button
                            type="button"
                            onClick={() => void handleOpenCatalogPdp(item.id)}
                            className="w-full px-4 py-2 bg-white border border-indigo-300 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-50 transition"
                          >
                            View Details
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const asProduct: CatalogItem = {
                                id: item.id,
                                tenantId: buyerCatalogSupplierOrgId,
                                name: item.name,
                                sku: item.sku ?? '',
                                description: item.description ?? undefined,
                                price: 0,
                                active: true,
                                createdAt: '',
                                updatedAt: '',
                                imageUrl: item.imageUrl ?? undefined,
                                moq: item.moq,
                              };
                              handleOpenRfqDialog(asProduct, item.catalogStage);
                            }}
                            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
                          >
                            Request Quote
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {buyerCatalogNextCursor && (
                  <div className="flex flex-col items-center gap-2 pt-2">
                    {buyerCatalogLoadMoreError && (
                      <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                        {buyerCatalogLoadMoreError}
                        <button
                          type="button"
                          onClick={() => void handleLoadMoreBuyerCatalog()}
                          className="ml-3 text-sm text-red-600 underline"
                        >
                          Retry
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={buyerCatalogLoadingMore}
                      onClick={() => void handleLoadMoreBuyerCatalog()}
                      className="px-6 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                    >
                      {buyerCatalogLoadingMore ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      default:
        return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="bg-white border border-amber-300 rounded-2xl p-8 max-w-md text-center space-y-4">
              <div className="text-3xl">⚠️</div>
              <h2 className="font-bold text-slate-900">Workspace Navigation Unavailable</h2>
              <p className="text-slate-600 text-sm">
                TexQtic could not align this workspace view to a manifest-backed route group.
              </p>
            </div>
          </div>
        );
    }
  };

  const renderAdminView = () => {
    if (!controlPlaneLocalRouteSelection) {
      return null;
    }

    if (
      controlPlaneLocalRouteSelection.routeKey === 'tenant_detail' ||
      controlPlaneLocalRouteSelection.routeKey === 'tenant_detail_invited' ||
      controlPlaneLocalRouteSelection.routeKey === 'tenant_detail_closed'
    ) {
      if (!selectedTenant) {
        return null;
      }

      let backRouteKey: 'tenant_registry' | 'tenant_registry_invited' | 'tenant_registry_closed' =
        'tenant_registry';

      if (controlPlaneLocalRouteSelection.routeKey === 'tenant_detail_invited') {
        backRouteKey = 'tenant_registry_invited';
      } else if (controlPlaneLocalRouteSelection.routeKey === 'tenant_detail_closed') {
        backRouteKey = 'tenant_registry_closed';
      }

      return (
        <TenantDetails
          tenant={selectedTenant}
          onBack={() => navigateControlPlaneManifestRoute(backRouteKey)}
          onImpersonate={handleImpersonate}
          onRunTtpEligibility={(orgId) => {
            setTtpEligibilityBridgeOrgId(orgId);
            navigateControlPlaneManifestRoute('ttp_eligibility');
          }}
        />
      );
    }

    if (
      controlPlaneLocalRouteSelection.routeKey === 'tenant_registry' ||
      controlPlaneLocalRouteSelection.routeKey === 'tenant_registry_invited' ||
      controlPlaneLocalRouteSelection.routeKey === 'tenant_registry_closed'
    ) {
      let lifecycleView: 'ACTIVE' | 'INVITED' | 'CLOSED' = 'ACTIVE';

      if (controlPlaneLocalRouteSelection.routeKey === 'tenant_registry_invited') {
        lifecycleView = 'INVITED';
      } else if (controlPlaneLocalRouteSelection.routeKey === 'tenant_registry_closed') {
        lifecycleView = 'CLOSED';
      }

      return (
        <TenantRegistry
          lifecycleView={lifecycleView}
          onSelectTenant={setSelectedTenant}
          onImpersonate={handleImpersonate}
        />
      );
    }

    switch (controlPlaneLocalRouteSelection.routeKey) {
      case 'logs':
        return <AuditLogs />;
      case 'finance':
        return (
          <FinanceOps
            onOpenEscrowScope={scope => {
              setFinanceEscrowBridge(scope);
              navigateControlPlaneManifestRoute('escrow_admin');
            }}
          />
        );
      case 'ai':
        return <AiGovernance />;
      case 'health':
        return <SystemHealth />;
      case 'flags':
        return <FeatureFlags />;
      case 'compliance':
        return <ComplianceQueue />;
      case 'cases':
        return (
          <DisputeCases
            onOpenEscalationScope={(scope: DisputeEscalationBridgeTarget) => {
              setDisputeEscalationBridge(scope);
              navigateControlPlaneManifestRoute('escalations');
            }}
          />
        );
      case 'trades':
        return <TradeOversight />;
      // TECS-FBW-006-A: G-022 control-plane escalation oversight (read-only; orgId-gated)
      case 'escalations':
        return (
          <EscalationOversight
            initialScope={disputeEscalationBridge}
            onScopeConsumed={() => setDisputeEscalationBridge(null)}
          />
        );
      // TECS-FBW-005: G-019 cross-tenant certification read surface (D-022-C: read-only)
      case 'certifications':
        return <CertificationsAdmin />;
      // TECS-FBW-015: G-016 cross-tenant traceability inspection (Phase A: read-only)
      case 'traceability':
        return <TraceabilityAdmin />;
      // TECS-FBW-007: marketplace_cart_summaries projection admin panel (read-only)
      case 'cart_summaries':
        return <CartSummariesPanel />;
      // PW5-W2: G-018 cross-tenant escrow admin read panel (D-020-B: no balance)
      case 'escrow_admin':
        return (
          <EscrowAdminPanel
            initialScope={financeEscrowBridge}
            onScopeConsumed={() => setFinanceEscrowBridge(null)}
          />
        );
      // PW5-W3-FE: Settlement admin read panel (backend route: 14aea49)
      case 'settlement_admin':
        return <SettlementAdminPanel />;
      // PW5-W4: G-021 maker-checker approval queue console (read-only)
      case 'maker_checker':
        return <MakerCheckerConsole />;
      case 'rbac':
        return <AdminRBAC />;
      case 'events':
        return <EventStream />;
      // TTP control-plane surfaces
      case 'gst_verification_queue':
        return <GstVerificationQueue />;
      case 'ttp_eligibility':
        if (!ttpEligibilityBridgeOrgId) {
          return (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <div className="text-4xl mb-3">🏢</div>
              <p className="text-sm font-medium">No tenant selected.</p>
              <p className="text-xs mt-1">Navigate from a Tenant Detail view to run a TTP eligibility assessment.</p>
            </div>
          );
        }
        return <TtpEligibilityConsole orgId={ttpEligibilityBridgeOrgId} />;
      case 'invoice_oversight':
        return <InvoiceOversight />;
      case 'vpc_console':
        return <VpcConsole />;
      // TTP Slice 7: enrollment admin console (SuperAdmin only)
      case 'ttp_enrollment_admin':
        return <TtpEnrollmentAdmin />;
      // FE-2: Network Commerce pool oversight (control-plane)
      case 'nc_pool_oversight':
        return (
          <NetworkCommercePlaceholderSurface
            title="NC Pool Oversight"
            description="Control-plane aggregated view of all tenant Network Commerce pools, demand aggregation, and RFQ performance. Admin read-only visibility."
            status="ready"
            onBack={() => navigateTenantDefaultManifestRoute()}
          />
        );
      // IMPL-SUPERADMIN-ZOHO-BOOKS-CONTACT-SYNC-MONITORING-READONLY-01: Phase 1 read-only
      case 'zoho_books_ops':
        return <ZohoBooksOps />;
      default:
        return null;
    }
  };

  // Cart toggle button with item count badge
  const CartToggleButton: React.FC<{ setShowCart: (show: boolean) => void }> = ({
    setShowCart,
  }) => {
    const { itemCount } = useCart();
    return (
      <button
        onClick={() => setShowCart(true)}
        className="bg-white/90 backdrop-blur border border-slate-200 p-2 rounded-lg shadow-sm hover:text-indigo-600 transition relative"
        title="Shopping Cart"
      >
        🛒
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {itemCount}
          </span>
        )}
      </button>
    );
  };

  // Cart-aware Add to Cart button components
  const B2BAddToCartButton: React.FC<{ product: CatalogItem }> = ({ product }) => {
    return (
      <button
        type="button"
        onClick={() => handleOpenRfqDialog(product)}
        className="w-full border border-slate-200 py-2 rounded text-sm font-semibold hover:bg-slate-50 transition"
      >
        Request Quote
      </button>
    );
  };

  const B2CAddToCartButton: React.FC<{ product: CatalogItem }> = ({ product }) => {
    const { addToCart } = useCart();
    const [adding, setAdding] = useState(false);
    // TECS-FBW-MOQ: surface add-to-cart errors (e.g. MOQ_NOT_MET 422) to user
    const [addError, setAddError] = useState<string | null>(null);

    const handleAddToCart = async () => {
      setAdding(true);
      setAddError(null);
      try {
        await addToCart(product.id, 1);
      } catch (error) {
        console.error('Failed to add to cart:', error);
        if (error instanceof APIError) {
          setAddError(error.message);
        } else {
          setAddError('Failed to add item. Please try again.');
        }
      } finally {
        setAdding(false);
      }
    };

    return (
      <div className="w-full">
        <button
          onClick={handleAddToCart}
          disabled={adding}
          className="w-full mt-2 bg-indigo-600 text-white py-2 px-4 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {adding ? 'Adding...' : 'Add to Cart'}
        </button>
        {addError && (
          <p className="mt-1 text-xs text-rose-600 font-medium">{addError}</p>
        )}
      </div>
    );
  };

  const renderCurrentState = () => {
    const navigateToPublicB2BDiscovery = () => {
      globalThis.window?.history.replaceState(null, '', '/b2b');
      setAppState('PUBLIC_B2B_DISCOVERY');
    };

    const navigateToPublicB2CBrowse = () => {
      globalThis.window?.history.replaceState(null, '', '/products');
      setAppState('PUBLIC_B2C_BROWSE');
    };

    // Shared nav callbacks for all public surface render cases
    const publicNavBase = {
      onGoHome: () => { globalThis.window?.history.replaceState(null, '', '/'); setAppState('PUBLIC_ENTRY'); },
      onGoB2B: navigateToPublicB2BDiscovery,
      onGoProducts: navigateToPublicB2CBrowse,
      onGoCollections: () => { globalThis.window?.history.replaceState(null, '', '/collections'); setAppState('PUBLIC_COLLECTIONS'); },
      onGoIndustry: () => { globalThis.window?.history.replaceState(null, '', '/industries'); setAppState('PUBLIC_INDUSTRY_CLUSTER_LANDING'); },
      onGoTrust: () => { globalThis.window?.history.replaceState(null, '', '/trust'); setAppState('PUBLIC_TRUST_LANDING'); },
      onGoAggregator: () => { globalThis.window?.history.replaceState(null, '', '/aggregator'); setAppState('PUBLIC_AGGREGATOR'); },
      onGoInquiry: () => { globalThis.window?.history.replaceState(null, '', '/inquiry'); setAppState('PUBLIC_INQUIRY'); },
      onGoPricing: () => { globalThis.window?.history.replaceState(null, '', '/pricing'); setAppState('PUBLIC_PRICING'); },
      onSignIn: () => openSecondaryAuthenticatedEntry('TENANT'),
      // Legacy/high-touch fallback only — Request Access is no longer a primary public nav CTA.
      // Primary online acquisition is Join TexQtic -> /register.
      onJoinTexQtic: () => {
        globalThis.window?.history.pushState(null, '', '/register');
        setAppState('PUBLIC_REGISTER');
      },
    };

    switch (appState) {
      case 'PUBLIC_ENTRY': {
        return (
          <div className="min-h-screen bg-[#f3f8fb] font-sans text-slate-900">
            <div className="bg-[radial-gradient(circle_at_top_left,_rgba(102,213,224,0.22),_transparent_30%),linear-gradient(180deg,_#eef6f8_0%,_#f3f8fb_100%)]">
              <div className="mx-auto max-w-7xl px-6 py-6 lg:px-10 lg:py-8">
                <nav className="rounded-[32px] border border-[#d9e6ea] bg-white/92 px-5 py-4 shadow-[0_24px_70px_rgba(7,26,47,0.10)] backdrop-blur">
                  <div className="flex items-center justify-between gap-4">
                    <a href="#public-entry-top" className="flex items-center" aria-label="TexQtic platform entry">
                      <img
                        src="/brand/texqtic-logo.png"
                        alt="TexQtic"
                        className="h-12 w-auto md:h-14"
                        loading="eager"
                      />
                    </a>

                    <div className="hidden lg:flex items-center gap-2">
                      <button
                        type="button"
                        onClick={navigateToPublicB2BDiscovery}
                        className="rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-600 transition hover:bg-[#eff6f8] hover:text-[#0b2238]"
                      >
                        Explore B2B Network
                      </button>
                      <button
                        type="button"
                        onClick={navigateToPublicB2CBrowse}
                        className="rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-600 transition hover:bg-[#eff6f8] hover:text-[#0b2238]"
                      >
                        Browse Products
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollToPublicEntrySection('public-entry-d2c-preview')}
                        className="rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-600 transition hover:bg-[#eff6f8] hover:text-[#0b2238]"
                      >
                        Sample Textile Collections
                      </button>
                    </div>

                    <div className="hidden md:flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => openSecondaryAuthenticatedEntry('TENANT')}
                        className="rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-600 transition hover:bg-[#eff6f8] hover:text-[#0b2238]"
                      >
                        Sign in
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          globalThis.window?.history.pushState(null, '', '/register');
                          setAppState('PUBLIC_REGISTER');
                        }}
                        className="inline-flex items-center justify-center rounded-full bg-[#2f8094] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#206b7a]"
                      >
                        Join TexQtic
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 lg:hidden">
                    <button
                      type="button"
                      onClick={() => {
                        globalThis.window?.history.pushState(null, '', '/register');
                        setAppState('PUBLIC_REGISTER');
                      }}
                      className="rounded-full border border-[#2f8094] bg-[#eff6f8] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#2f8094]"
                    >
                      Join TexQtic
                    </button>
                    <button
                      type="button"
                      onClick={navigateToPublicB2BDiscovery}
                      className="rounded-full border border-[#dbe6ea] bg-[#f8fbfc] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600"
                    >
                      Explore B2B
                    </button>
                    <button
                      type="button"
                      onClick={navigateToPublicB2CBrowse}
                      className="rounded-full border border-[#dbe6ea] bg-[#f8fbfc] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600"
                    >
                      Browse Products
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollToPublicEntrySection('public-entry-d2c-preview')}
                      className="rounded-full border border-[#dbe6ea] bg-[#f8fbfc] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600"
                    >
                      Sample Textile Collections
                    </button>
                  </div>
                </nav>

                <div id="public-entry-top" className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_320px]">
                  <section className="rounded-[36px] border border-white/10 bg-[linear-gradient(135deg,_#071a2f_0%,_#0d2743_58%,_#123a57_100%)] p-8 text-white shadow-[0_30px_90px_rgba(7,26,47,0.28)] md:p-10">
                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-[0.24em] text-[#b7dbe3]">
                      <span className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5">
                        Public Attraction Layer
                      </span>
                      <span className="rounded-full border border-[#2c6078] bg-[#0b3550] px-3 py-1.5 text-[#87dae4]">
                        {publicEntryHostLabel} public entry
                      </span>
                      <span className="rounded-full border border-[#315f78] bg-[#0c2d46] px-3 py-1.5 text-[#d7edf1]">
                        Entry, intent, and handoff only
                      </span>
                      {publicEntryBootstrapPending && (
                        <span className="rounded-full border border-[#4cbcc9] bg-[#0d4860] px-3 py-1.5 text-[#8fe0e8]">
                          Confirming neutral entry context
                        </span>
                      )}
                      {neutralEntryPathSelection && (
                        <span className="rounded-full border border-[#3b6c87] bg-[#0c304a] px-3 py-1.5 text-[#b6deea]">
                          Last selected path: {neutralEntryPathSelection}
                        </span>
                      )}
                    </div>

                    <h1 className="public-entry-editorial-heading mt-6 text-4xl leading-tight tracking-[-0.03em] text-white md:text-6xl">
                      From yarn to consumer, TexQtic connects the textile world.
                    </h1>
                    <p className="mt-5 max-w-3xl text-base leading-7 text-slate-200 md:text-lg">
                      TexQtic brings manufacturers, suppliers, buyers, designers, service providers, brands,
                      and consumers into one connected textile commerce ecosystem - from manufacturing and
                      wholesale to retail and verified textile collections.
                    </p>
                    <p className="mt-4 text-sm font-medium leading-6 text-[#c9eaf0] md:text-base">
                      Discover trusted partners. Verify textile capability. Explore curated textile collections.
                      Trade with confidence.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setNeutralEntryPathSelection('B2B');
                          navigateToPublicB2BDiscovery();
                        }}
                        className="inline-flex items-center justify-center rounded-full bg-[#7fd5de] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#08233a] transition hover:bg-[#98e2e9]"
                      >
                        Explore B2B Network
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNeutralEntryPathSelection('B2C');
                          navigateToPublicB2CBrowse();
                        }}
                        className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/8 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-white/14"
                      >
                        Browse Products
                      </button>
                      <button
                        type="button"
                        onClick={openSupplierRequestAccess}
                        className="inline-flex items-center justify-center rounded-full border border-[#7fd5de]/40 bg-transparent px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#a6e9f0] transition hover:border-[#a6e9f0] hover:bg-[#0a334d]"
                      >
                        Prepare Verified Textile Collections
                      </button>
                    </div>
                  </section>

                  <aside className="rounded-[32px] border border-[#d7e4e8] bg-white p-6 shadow-[0_24px_70px_rgba(7,26,47,0.10)] md:p-7">
                    <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#2f8196]">
                      Authenticated entry
                    </div>
                    <h2 className="public-entry-editorial-heading mt-3 text-2xl leading-tight text-[#0a2036]">
                      Continue into your workspace when ready.
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Public pages stay projection-safe and non-transactional. Checkout, account, order,
                      and deeper workflow continuity remain authenticated.
                    </p>

                    <div className="mt-5 space-y-3">
                      <button
                        type="button"
                        onClick={() => openSecondaryAuthenticatedEntry('TENANT')}
                        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
                      >
                        <span>Tenant Access</span>
                        <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Sign in</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openSecondaryAuthenticatedEntry('CONTROL_PLANE')}
                        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-rose-300 hover:text-rose-700"
                      >
                        <span>Staff Control</span>
                        <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Sign in</span>
                      </button>
                      <button
                        type="button"
                        onClick={openIssuedAccessContinuation}
                        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-[#2f8094] hover:text-[#0a2036]"
                      >
                        <span>Use issued access link</span>
                        <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Issued only</span>
                      </button>
                    </div>
                  </aside>
                </div>
              </div>
            </div>

            <main className="mx-auto max-w-7xl space-y-8 px-6 py-12 lg:px-10 lg:py-16">
              <section className="rounded-[32px] border border-[#d9e5ea] bg-white p-8 shadow-[0_18px_50px_rgba(7,26,47,0.08)] md:p-10">
                <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#2f8094]">
                  The operating layer for textile commerce
                </p>
                <p className="mt-4 max-w-4xl text-base leading-7 text-slate-700 md:text-lg">
                  Textile commerce is no longer just about finding a supplier or listing a product. It is
                  about connecting capability, trust, production, discovery, and demand across the full value
                  chain.
                </p>
                <p className="mt-4 max-w-4xl text-base leading-7 text-slate-700 md:text-lg">
                  TexQtic helps the textile ecosystem move as one connected network - from factory capability
                  to verified consumer demand.
                </p>
                <p className="mt-5 text-sm font-bold uppercase tracking-[0.22em] text-[#0a2036]">
                  Manufacturing to marketplace, connected.
                </p>
              </section>

              <section className="rounded-[32px] border border-[#d9e5ea] bg-white p-8 shadow-[0_18px_50px_rgba(7,26,47,0.08)] md:p-10">
                <div className="max-w-3xl">
                  <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#2f8094]">
                    Where do you want to begin?
                  </p>
                  <p className="mt-4 text-base leading-7 text-slate-600">
                    Whether you manufacture, source, design, trade, serve, or shop textile products,
                    TexQtic gives you a clear path into the ecosystem.
                  </p>
                </div>

                <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {publicEntryRoleCards.map((card) => (
                    <article key={card.title} className="rounded-[28px] border border-[#d9e5ea] bg-[#fbfdfe] p-6 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#2f8094]">{card.audience}</p>
                      <h3 className="public-entry-editorial-heading mt-3 text-2xl leading-tight text-[#0a2036]">{card.title}</h3>
                      <p className="mt-4 text-sm leading-6 text-slate-600">{card.body}</p>
                      <button
                        type="button"
                        onClick={() => {
                          if (card.action === 'B2B') {
                            navigateToPublicB2BDiscovery();
                            return;
                          }

                          if (card.action === 'B2C') {
                            navigateToPublicB2CBrowse();
                            return;
                          }

                          selectNeutralPublicEntryPath('SUPPLIER', 'public-entry-d2c-preview');
                          openSupplierRequestAccess();
                        }}
                        className="mt-6 inline-flex items-center justify-center rounded-full bg-[#071a2f] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
                      >
                        {card.cta}
                      </button>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-[32px] border border-[#d9e5ea] bg-white p-8 shadow-[0_18px_50px_rgba(7,26,47,0.08)] md:p-10">
                <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#2f8094]">
                  One platform across the textile value chain
                </p>
                <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600">
                  TexQtic connects the movement of textiles from production capability to commercial
                  opportunity - across manufacturing, wholesale, semi-wholesale, retail, and
                  verified textile collections.
                </p>

                <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
                  {publicEntryTextileChainCards.map((chain) => (
                    <article key={chain.title} className="rounded-[24px] border border-[#e2ecef] bg-[#fbfdfe] p-5">
                      <h3 className="text-lg font-semibold text-[#0a2036]">{chain.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{chain.body}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section id="public-entry-b2b-preview" className="rounded-[32px] border border-[#d9e5ea] bg-white p-8 shadow-[0_18px_50px_rgba(7,26,47,0.08)] md:p-10">
                <h2 className="public-entry-editorial-heading text-3xl leading-tight text-[#0a2036] md:text-4xl">
                  Discover the textile ecosystem
                </h2>
                <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600">
                  TexQtic helps buyers and businesses discover textile participants by category, capability,
                  region, and trust posture - without exposing private business data.
                </p>
                <p className="mt-3 max-w-4xl text-base leading-7 text-slate-600">
                  Public discovery creates confidence. Authenticated journeys enable deeper connection,
                  comparison, and trade.
                </p>

                <div className="mt-6">
                  <ReferencePreviewNotice
                    label={REFERENCE_SUPPLIER_PROFILE_LABEL}
                    replacementCopy={LIVE_PROFILES_AND_PRODUCTS_REPLACE_COPY}
                  />
                </div>

                <div className="mt-8 rounded-[24px] border border-[#dce8eb] bg-[#f6fbfc] p-6">
                  <p className="text-sm font-semibold text-[#0a2036]">Reference supplier profile</p>
                  <p className="mt-2 text-sm text-slate-600">Surat, Gujarat</p>
                  <p className="mt-2 text-sm text-slate-600">Capabilities: Cotton fabric, weaving, dyeing, finishing</p>
                  <p className="mt-2 text-sm text-slate-600">Trust Signals: Reference profile example</p>
                  <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#9a5a00]">
                    Not a live commercial offer
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={navigateToPublicB2BDiscovery}
                      className="inline-flex items-center justify-center rounded-full bg-[#071a2f] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
                    >
                      View Reference Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => openSecondaryAuthenticatedEntry('TENANT')}
                      className="inline-flex items-center justify-center rounded-full border border-[#d1dee3] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-700 transition hover:border-[#2f8094] hover:text-[#0a2036]"
                    >
                      Sign in to Connect
                    </button>
                  </div>
                </div>
              </section>

              <section id="public-entry-b2c-preview" className="rounded-[32px] border border-[#d9e5ea] bg-white p-8 shadow-[0_18px_50px_rgba(7,26,47,0.08)] md:p-10">
                <h2 className="public-entry-editorial-heading text-3xl leading-tight text-[#0a2036] md:text-4xl">
                  Browse textile products with trust behind them
                </h2>
                <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600">
                  TexQtic&apos;s public consumer browse is designed to show reference product previews,
                  storefront context fields, and trust signals where approved - while checkout, orders,
                  pricing continuity, and account continuity
                  remain protected inside authenticated journeys.
                </p>

                <div className="mt-6">
                  <ReferencePreviewNotice
                    label={REFERENCE_PRODUCT_PREVIEW_LABEL}
                    replacementCopy={LIVE_PROFILES_AND_PRODUCTS_REPLACE_COPY}
                  />
                </div>

                <div className="mt-8 rounded-[24px] border border-[#dce8eb] bg-[#f6fbfc] p-6">
                  <p className="text-sm font-semibold text-[#0a2036]">Reference Linen Summer Shirt Preview</p>
                  <p className="mt-2 text-sm text-slate-600">Material: Linen blend</p>
                  <p className="mt-2 text-sm text-slate-600">Storefront: Reference textile seller preview</p>
                  <p className="mt-2 text-sm text-slate-600">Origin: Public-approved supply-chain story</p>
                  <p className="mt-2 text-sm text-slate-600">Price field: Example public price field - shown only where approved</p>
                  <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#9a5a00]">
                    Not a live commercial offer
                  </p>

                  <button
                    type="button"
                    onClick={() => openSecondaryAuthenticatedEntry('TENANT')}
                    className="mt-5 inline-flex items-center justify-center rounded-full bg-[#071a2f] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
                  >
                    Sign in to Continue
                  </button>
                </div>

                <p className="mt-5 text-sm font-medium text-slate-700">
                  Consumers can preview product storytelling here before authentic live catalog participation begins.
                </p>
              </section>

              <section id="public-entry-d2c-preview" className="rounded-[32px] border border-[#d9e5ea] bg-white p-8 shadow-[0_18px_50px_rgba(7,26,47,0.08)] md:p-10">
                <h2 className="public-entry-editorial-heading text-3xl leading-tight text-[#0a2036] md:text-4xl">
                  Turn textile capability into curated textile collection stories
                </h2>
                <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600">
                  Verified Textile Collections help textile stakeholders move beyond traditional supply and trade.
                  A fabric mill, garment manufacturer, designer, brand, or collaboration can frame real
                  capability through a public-safe curated story and showcase preview.
                </p>
                <p className="mt-3 max-w-4xl text-base leading-7 text-slate-600">
                  This is not generic retail. It is verified textile commerce built from the supply chain outward.
                </p>

                <div className="mt-8 rounded-[24px] border border-[#dce8eb] bg-[#f6fbfc] p-6">
                  <p className="text-sm font-semibold text-[#0a2036]">Organic Cotton Monsoon Capsule</p>
                  <p className="mt-2 text-sm text-slate-600">Collection Type: Curated textile collection preview</p>
                  <p className="mt-2 text-sm text-slate-600">Created by: Textile ecosystem collaboration</p>
                  <p className="mt-2 text-sm text-slate-600">Story: From certified cotton to finished garment</p>
                  <p className="mt-2 text-sm text-slate-600">Status: Coming soon</p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => scrollToPublicEntrySection('public-entry-d2c-preview')}
                      className="inline-flex items-center justify-center rounded-full border border-[#d1dee3] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-700 transition hover:border-[#2f8094] hover:text-[#0a2036]"
                    >
                      Learn About Verified Textile Collections
                    </button>
                    <button
                      type="button"
                      onClick={openSupplierRequestAccess}
                      className="inline-flex items-center justify-center rounded-full bg-[#071a2f] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
                    >
                      Prepare Your Collection
                    </button>
                  </div>
                </div>

                <p className="mt-5 text-sm font-medium text-slate-700">
                  The product is not just sold. The textile journey is sold.
                </p>
              </section>

              <section id="public-entry-trust" className="rounded-[32px] bg-[linear-gradient(135deg,_#08233a_0%,_#0e304a_100%)] p-8 text-white shadow-[0_24px_70px_rgba(7,26,47,0.20)] md:p-10">
                <h2 className="public-entry-editorial-heading text-3xl leading-tight text-white md:text-4xl">
                  Trust built into the textile journey
                </h2>
                <p className="mt-4 max-w-4xl text-base leading-7 text-slate-200">
                  TexQtic is designed around public-safe trust, origin, and visibility. Products and profiles
                  can carry approved signals such as material information, region, certification summaries,
                  public passport references, and verified capability indicators.
                </p>
                <p className="mt-3 max-w-4xl text-base leading-7 text-slate-200">
                  Public pages show only approved trust signals. Private documents, internal scores, legal
                  states, and operational records stay protected.
                </p>

                <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  {publicEntryTrustCards.map((card) => (
                    <article key={card.title} className="rounded-[28px] border border-white/10 bg-white/8 p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-white">{card.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-slate-200">{card.body}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-[32px] border border-[#d9e5ea] bg-white p-8 shadow-[0_18px_50px_rgba(7,26,47,0.08)] md:p-10">
                <h2 className="public-entry-editorial-heading text-3xl leading-tight text-[#0a2036] md:text-4xl">
                  Explore the breadth of the textile network
                </h2>
                <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600">
                  TexQtic can preview the scale and categories of the textile ecosystem publicly, while deeper
                  comparison, qualification, routing, and connection intelligence remain authenticated.
                </p>
                <p className="mt-3 max-w-4xl text-base leading-7 text-slate-600">
                  Public pages show the doorway. Authenticated workspaces power the decisions.
                </p>

                <button
                  type="button"
                  onClick={() => openSecondaryAuthenticatedEntry('TENANT')}
                  className="mt-6 inline-flex items-center justify-center rounded-full bg-[#071a2f] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
                >
                  Sign in to Compare Textile Partners
                </button>
              </section>

              <section className="rounded-[32px] border border-[#d9e5ea] bg-[#f7fbfc] p-8 shadow-[0_18px_50px_rgba(7,26,47,0.08)] md:p-10">
                <h2 className="public-entry-editorial-heading text-3xl leading-tight text-[#0a2036] md:text-4xl">
                  Ready to connect your textile journey?
                </h2>
                <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600">
                  Whether you want to source, sell, manufacture, design, serve, browse, or present curated
                  collections, TexQtic gives you a connected path into the textile ecosystem.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={navigateToPublicB2BDiscovery}
                    className="inline-flex items-center justify-center rounded-full bg-[#071a2f] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
                  >
                    Explore B2B Network
                  </button>
                  <button
                    type="button"
                    onClick={navigateToPublicB2CBrowse}
                    className="inline-flex items-center justify-center rounded-full bg-[#071a2f] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
                  >
                    Browse Products
                  </button>
                  <button
                    type="button"
                    onClick={openSupplierRequestAccess}
                    className="inline-flex items-center justify-center rounded-full bg-[#071a2f] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
                  >
                    Prepare Verified Textile Collections
                  </button>
                  <button
                    type="button"
                    onClick={openSupplierRequestAccess}
                    className="inline-flex items-center justify-center rounded-full border border-[#d1dee3] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-700 transition hover:border-[#2f8094] hover:text-[#0a2036]"
                  >
                    Request Access
                  </button>
                </div>
              </section>
            </main>
          </div>
        );
      }
      case 'ONBOARDING_CONTINUATION':
        return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-3xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm md:p-10">
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#2f8196]">
                Issued access continuation
              </div>
              <h1 className="public-entry-editorial-heading mt-4 text-4xl leading-tight text-[#0a2036] md:text-5xl">
                Continue with your issued access path
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                This path is only for users who already received a TexQtic activation link, invite, or issued
                access message. If you have not yet been sent one, this page is not a generic continuation
                step. Active tenant users should use Tenant Access, and staff or control operators should use
                Staff Control.
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
                    Issued continuity only
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Use this lane only if TexQtic already sent you an activation or access path. The homepage
                    does not expose a generic public onboarding resume form or a public status checker.
                  </p>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
                    Pre-issuance cases stay outside this lane
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    If your request is still in CRM review, approval, provisioning, or issuance preparation,
                    continue through the CRM or provisioning communication path rather than this public page.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => openSecondaryAuthenticatedEntry('TENANT')}
                  className="inline-flex items-center justify-center rounded-full bg-[#071a2f] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
                >
                  Tenant Access
                </button>
                <button
                  type="button"
                  onClick={() => openSecondaryAuthenticatedEntry('CONTROL_PLANE')}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-700 transition hover:border-rose-300 hover:text-rose-700"
                >
                  Staff Control
                </button>
                <button
                  type="button"
                  onClick={openSupplierRequestAccess}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-700 transition hover:border-[#2f8094] hover:text-[#0a2036]"
                >
                  Request Access
                </button>
                <button
                  type="button"
                  onClick={() => setAppState(primaryEntrySurfaceState)}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-700 transition hover:border-slate-400 hover:text-[#0a2036]"
                >
                  Return to platform entry
                </button>
              </div>
            </div>
          </div>
        );
      case 'PUBLIC_B2B_DISCOVERY':
        return (
          <B2BDiscoveryPage
            nav={{ ...publicNavBase, activeSection: 'b2b' }}
            onBack={() => setAppState('PUBLIC_ENTRY')}
            onSignIn={() => openSecondaryAuthenticatedEntry('TENANT')}
            onListBusiness={openSupplierRequestAccess}
            onViewProfile={(slug) => {
              globalThis.window?.location.assign(`/supplier/${encodeURIComponent(slug)}`);
            }}
          />
        );
      case 'PUBLIC_B2C_BROWSE':
        return (
          <B2CBrowsePage
            nav={{ ...publicNavBase, activeSection: 'products' }}
            onBack={() => setAppState('PUBLIC_ENTRY')}
            onExploreB2B={navigateToPublicB2BDiscovery}
            onSignIn={() => openSecondaryAuthenticatedEntry('TENANT')}
          />
        );
      case 'PUBLIC_COLLECTIONS':
        return (
          <PublicCollectionsStub
            nav={{ ...publicNavBase, activeSection: 'collections' }}
            onBackToEntry={() => {
              globalThis.window?.history.replaceState(null, '', '/');
              setAppState('PUBLIC_ENTRY');
            }}
            onBrowseProducts={navigateToPublicB2CBrowse}
            onExploreB2BNetwork={navigateToPublicB2BDiscovery}
            onSignIn={() => openSecondaryAuthenticatedEntry('TENANT')}
            onListYourProducts={openSupplierRequestAccess}
          />
        );
      case 'PUBLIC_COLLECTION_DETAIL': {
        const activeCollection = getCollectionBySlug(
          publicCollectionSlugFromPath,
          PUBLIC_COLLECTION_PROJECTIONS,
        );
        if (!activeCollection) {
          // Fail-closed: slug no longer approved at render time — show safe fallback
          return (
            <PublicCollectionUnavailable
              nav={{ ...publicNavBase, activeSection: 'collections' }}
              collectionSlug={publicCollectionSlugFromPath}
              onBackToCollections={() => {
                globalThis.window?.history.replaceState(null, '', '/collections');
                setAppState('PUBLIC_COLLECTIONS');
              }}
              onBrowseProducts={navigateToPublicB2CBrowse}
              onSignIn={() => openSecondaryAuthenticatedEntry('TENANT')}
              onExploreB2BNetwork={navigateToPublicB2BDiscovery}
            />
          );
        }
        return (
          <PublicCollectionDetail
            nav={{ ...publicNavBase, activeSection: 'collections' }}
            collection={activeCollection}
            onBackToCollections={() => {
              globalThis.window?.history.replaceState(null, '', '/collections');
              setAppState('PUBLIC_COLLECTIONS');
            }}
            onBrowseProducts={navigateToPublicB2CBrowse}
            onSignIn={() => openSecondaryAuthenticatedEntry('TENANT')}
            onExploreB2BNetwork={navigateToPublicB2BDiscovery}
            onListYourProducts={openSupplierRequestAccess}
          />
        );
      }
      case 'PUBLIC_COLLECTION_DETAIL_UNAVAILABLE':
        return (
          <PublicCollectionUnavailable
            nav={{ ...publicNavBase, activeSection: 'collections' }}
            collectionSlug={publicCollectionSlugFromPath}
            onBackToCollections={() => {
              globalThis.window?.history.replaceState(null, '', '/collections');
              setAppState('PUBLIC_COLLECTIONS');
            }}
            onBrowseProducts={navigateToPublicB2CBrowse}
            onSignIn={() => openSecondaryAuthenticatedEntry('TENANT')}
            onExploreB2BNetwork={navigateToPublicB2BDiscovery}
          />
        );
      case 'PUBLIC_TRUST_LANDING':
        return (
          <PublicTrustLandingStub
            nav={{ ...publicNavBase, activeSection: 'trust' }}
            onBackToEntry={() => {
              globalThis.window?.history.replaceState(null, '', '/');
              setAppState('PUBLIC_ENTRY');
            }}
            onBrowseProducts={navigateToPublicB2CBrowse}
            onExploreB2B={navigateToPublicB2BDiscovery}
            onSignIn={() => openSecondaryAuthenticatedEntry('TENANT')}
            onRequestAccess={openSupplierRequestAccess}
          />
        );
      case 'PUBLIC_INDUSTRY_CLUSTER_LANDING':
        return (
          <PublicIndustryClusterLanding
            nav={{ ...publicNavBase, activeSection: 'industry' }}
            onBackToEntry={() => {
              globalThis.window?.history.replaceState(null, '', '/');
              setAppState('PUBLIC_ENTRY');
            }}
            onExploreB2B={navigateToPublicB2BDiscovery}
            onBrowseProducts={navigateToPublicB2CBrowse}
            onLearnAboutTrust={() => {
              globalThis.window?.history.replaceState(null, '', '/trust');
              setAppState('PUBLIC_TRUST_LANDING');
            }}
            onPreviewAggregator={() => {
              globalThis.window?.history.replaceState(null, '', '/aggregator');
              setAppState('PUBLIC_AGGREGATOR');
            }}
            onSignIn={() => openSecondaryAuthenticatedEntry('TENANT')}
            onRequestAccess={openSupplierRequestAccess}
          />
        );
      case 'PUBLIC_AGGREGATOR':
        return (
          <PublicAggregatorPreview
            nav={{ ...publicNavBase, activeSection: 'aggregator' }}
            onBackToEntry={() => {
              globalThis.window?.history.replaceState(null, '', '/');
              setAppState('PUBLIC_ENTRY');
            }}
            onSignIn={() => openSecondaryAuthenticatedEntry('TENANT')}
            onExploreB2B={() => {
              navigateToPublicB2BDiscovery();
            }}
            onBrowseProducts={navigateToPublicB2CBrowse}
            onLearnAboutTrust={() => {
              globalThis.window?.history.replaceState(null, '', '/trust');
              setAppState('PUBLIC_TRUST_LANDING');
            }}
            onRequestAccess={openSupplierRequestAccess}
          />
        );
      case 'PUBLIC_PRODUCT_DETAIL':
        return (
          <PublicProductDetail
            nav={{ ...publicNavBase, activeSection: 'products' }}
            slug={publicProductSlugFromPath}
            onProductMetaReady={setPublicProductDetailMeta}
            onBackToBrowse={() => {
              navigateToPublicB2CBrowse();
            }}
            onSignIn={() => openSecondaryAuthenticatedEntry('TENANT')}
            onViewSupplierProfile={(slug) => {
              globalThis.window?.location.assign(`/supplier/${encodeURIComponent(slug)}`);
            }}
          />
        );
      // B2C-PUBLIC-CATEGORY-STORY-PAGES-IMPLEMENTATION-001: category story page
      case 'PUBLIC_B2C_CATEGORY_STORY':
        return (
          <PublicB2CCategoryPage
            nav={{ ...publicNavBase, activeSection: 'products' }}
            slug={publicCategorySlugFromPath}
            onBack={() => {
              navigateToPublicB2CBrowse();
            }}
            onSignIn={() => openSecondaryAuthenticatedEntry('TENANT')}
          />
        );
      // TECS-DPP-PASSPORT-NETWORK-007: Public buyer passport page
      case 'PUBLIC_PASSPORT':
        return (
          <PublicPassport
            nav={{ ...publicNavBase, activeSection: 'trust' }}
            publicPassportId={publicPassportIdFromPath}
            onSignIn={() => openSecondaryAuthenticatedEntry('TENANT')}
            onRequestAccess={openSupplierRequestAccess}
            onLearnAboutTrust={() => {
              globalThis.window?.history.replaceState(null, '', '/trust');
              setAppState('PUBLIC_TRUST_LANDING');
            }}
          />
        );
      // ROUTE-001: Public supplier profile page
      case 'PUBLIC_SUPPLIER_PROFILE':
        return (
          <PublicSupplierProfile
            nav={{ ...publicNavBase, activeSection: 'b2b' }}
            slug={publicSupplierSlugFromPath}
            source={publicSupplierSourceFromQuery || undefined}
            onBack={navigateToPublicB2BDiscovery}
            onSignIn={() => openSecondaryAuthenticatedEntry('TENANT')}
            onRequestAccess={openSupplierRequestAccess}
          />
        );
      // PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-IMPLEMENTATION-001
      case 'PUBLIC_INQUIRY':
        return (
          <PublicInquiryPage
            nav={{ ...publicNavBase, activeSection: 'inquiry' }}
            supplierSlug={publicInquirySupplierSlugFromQuery}
            productSlug={publicInquiryProductSlugFromQuery || undefined}
            categorySlug={publicInquiryCategorySlugFromQuery || undefined}
            collectionSlug={publicInquiryCollectionSlugFromQuery || undefined}
            sourceSurface={publicInquirySourceSurfaceFromQuery || undefined}
            onBack={navigateToPublicB2BDiscovery}
            onSignIn={() => openSecondaryAuthenticatedEntry('TENANT')}
          />
        );
      // FAM-11D: Public pricing / plan comparison — /pricing
      case 'PUBLIC_PRICING':
        return (
          <PublicPricingPage
            nav={{ ...publicNavBase, activeSection: 'pricing' }}
            onBack={() => {
              globalThis.window?.history.replaceState(null, '', '/');
              setAppState('PUBLIC_ENTRY');
            }}
            onSignIn={() => openSecondaryAuthenticatedEntry('TENANT')}
            onRequestAccess={openSupplierRequestAccess}
          />
        );
      // IMPLEMENT-MAINAPP-TIER0-REQUEST-ACCESS-UI-01: Tier 0 request-access page
      case 'PUBLIC_REQUEST_ACCESS':
        return (
          <PublicRequestAccess
            nav={{ ...publicNavBase, activeSection: 'home' }}
            onBack={() => {
              globalThis.window?.history.replaceState(null, '', '/');
              setAppState('PUBLIC_ENTRY');
            }}
            onSignIn={() => openSecondaryAuthenticatedEntry('TENANT')}
            referralCode={publicRequestAccessReferralCodeFromQuery || undefined}
          />
        );
      case 'PUBLIC_REGISTER':
        return (
          <PublicRegister
            nav={{ ...publicNavBase, activeSection: 'home' }}
            onBack={() => {
              globalThis.window?.history.replaceState(null, '', '/');
              setAppState('PUBLIC_ENTRY');
            }}
            onSignIn={() => openSecondaryAuthenticatedEntry('TENANT')}
            onRequestAccess={() => { globalThis.window?.location.assign('/request-access'); }}
            initialRoleIntent={publicRegisterRoleFromPath}
          />
        );
      // REFERRAL-005: Public referral join landing — /join/:referral_code
      case 'PUBLIC_REFERRAL_LANDING':
        return (
          <PublicReferralLanding
            nav={{ ...publicNavBase, activeSection: 'home' }}
            referralCode={publicReferralCodeFromPath}
            onBack={() => setAppState('PUBLIC_ENTRY')}
            onSignIn={() => openSecondaryAuthenticatedEntry('TENANT')}
          />
        );
      case 'AUTH': {
        const tenantBootstrapAuthView = resolveTenantBootstrapAuthView({
          authRealm,
          tenantRestorePending,
          tenantBootstrapBlockedMessage,
          tenantProvisionError,
        });

        if (tenantBootstrapAuthView === 'TENANT_RESOLVING') {
          return (
            <div className="min-h-screen bg-[#f3f8fb] flex flex-col items-center justify-center p-6 font-sans">
              <img src="/brand/texqtic-logo.png" alt="TexQtic" className="mb-8 h-10 w-auto" loading="eager" />
              <div className="w-full max-w-md rounded-3xl border border-[#d9e5ea] bg-white px-8 py-12 text-center shadow-sm">
                <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#2f8094]" />
                <h1 className="text-lg font-semibold text-slate-900">Confirming workspace access</h1>
                <p className="mt-3 text-sm text-slate-500">
                  TexQtic is confirming your tenant session before opening a workspace shell.
                </p>
              </div>
            </div>
          );
        }

        if (tenantBootstrapAuthView === 'TENANT_BLOCKED') {
          const blockedMessage = tenantProvisionError ?? tenantBootstrapBlockedMessage;

          return (
            <div className="min-h-screen bg-[#f3f8fb] flex flex-col items-center justify-center p-6 font-sans">
              <img src="/brand/texqtic-logo.png" alt="TexQtic" className="mb-8 h-10 w-auto" loading="eager" />
              <div className="w-full max-w-md rounded-3xl border border-amber-300 bg-white px-8 py-12 text-center shadow-sm space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-2xl text-amber-700">
                  !
                </div>
                <h1 className="text-lg font-semibold text-slate-900">Workspace access blocked</h1>
                <p className="text-sm text-slate-500">{blockedMessage}</p>
                <button
                  onClick={() => {
                    setTenantBootstrapBlockedMessage(null);
                    setTenantProvisionError(null);
                  }}
                  className="w-full py-3 bg-[#071a2f] text-white rounded-full font-semibold text-sm hover:bg-[#0d2743] transition"
                >
                  Return to Sign In
                </button>
              </div>
            </div>
          );
        }

        return (
          <div className="min-h-screen bg-[#f3f8fb] flex flex-col items-center justify-center p-6 font-sans">
            <div className="absolute top-6 flex gap-4">
              <button
                onClick={() => {
                  setTenantBootstrapBlockedMessage(null);
                  setTenantProvisionError(null);
                  setAuthRealm('TENANT');
                }}
                className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border transition-all ${authRealm === 'TENANT' ? 'bg-[#071a2f] border-[#071a2f] text-white' : 'bg-white border-slate-200 text-slate-500'}`}
              >
                Tenant Access
              </button>
              <button
                onClick={() => {
                  setTenantBootstrapBlockedMessage(null);
                  setTenantProvisionError(null);
                  setAuthRealm('CONTROL_PLANE');
                }}
                className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border transition-all ${authRealm === 'CONTROL_PLANE' ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-200 text-slate-500'}`}
              >
                Staff Control Plane
              </button>
            </div>
            <img src="/brand/texqtic-logo.png" alt="TexQtic" className="mb-8 h-10 w-auto" loading="eager" />
            <AuthForm realm={authRealm} onSuccess={handleAuthSuccess} />
            <button
              onClick={() => setAppState('FORGOT_PASSWORD')}
              className="mt-4 text-[10px] font-bold uppercase text-slate-400 hover:text-[#2f8094] tracking-widest"
            >
              Forgot Password?
            </button>
          </div>
        );
      }
      case 'FORGOT_PASSWORD':
        return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <ForgotPassword onBack={() => setAppState(primaryEntrySurfaceState)} />
          </div>
        );
      case 'VERIFY_EMAIL':
        return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <VerifyEmail onVerified={() => setAppState('ONBOARDING')} />
          </div>
        );
      case 'TOKEN_HANDLER':
        return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <TokenHandler onComplete={() => setAppState(primaryEntrySurfaceState)} />
          </div>
        );
      case 'ONBOARDING':
        return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <OnboardingFlow
              inviteToken={pendingInviteToken ?? undefined}
              onExistingUserSignIn={() => {
                // pendingInviteToken is intentionally preserved — not cleared here
                setAppState('AUTH');
              }}
              onComplete={async (formData: any) => {
                if (pendingInviteToken) {
                  const raw = await activateTenant({
                      inviteToken: pendingInviteToken,
                      userData: {
                        email: formData.email,
                        password: formData.password,
                      },
                      tenantData: {
                        name: formData.orgName || undefined,
                        industry: formData.industry || undefined,
                      },
                      verificationData: {
                        registrationNumber: formData.registrationNumber,
                        jurisdiction: formData.jurisdiction,
                      },
                      consent: formData.consent,
                    }) as any;
                    // FC-03 hardening: invite has been consumed — clear pending token
                    // immediately, before any post-activation step that could throw.
                    // Prevents permanent stale-invite-token state if bootstrap fails.
                    setPendingInviteToken(null);
                    // Store JWT so all subsequent tenant API calls are authenticated
                    setToken(raw.token, 'TENANT');

                    const me = await getCurrentUser();
                    const canonicalTenant = buildTenantSnapshot(me.tenant);

                    if (!canonicalTenant) {
                      throw new Error('Tenant activation completed but canonical tenant state is unavailable.');
                    }

                    const bootstrapState = applyTenantBootstrapState(canonicalTenant, me.role ?? null);
                    if (!bootstrapState.nextState) {
                      throw new Error('Tenant activation descriptor could not be established.');
                    }

                    setAppState(bootstrapState.nextState);
                } else {
                  setAppState('EXPERIENCE');
                }
              }}
            />
          </div>
        );
      case 'CONTROL_PLANE': {
        if (!canAccessControlPlane) {
          return null;
        }

        const ControlPlaneShell = controlPlaneRuntimeManifestEntry?.shellFamily === 'SuperAdminShell'
          ? SuperAdminShell
          : null;

        if (controlPlaneContentFamily !== 'control_plane' || !ControlPlaneShell) {
          return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="bg-white border border-amber-300 rounded-2xl p-8 max-w-md text-center space-y-4">
                <div className="text-3xl">⚠️</div>
                <h2 className="font-bold text-slate-900">Control Plane Unavailable</h2>
                <p className="text-slate-600 text-sm">
                  Control-plane routing truth could not be established for this session.
                </p>
              </div>
            </div>
          );
        }

        return (
          <ControlPlaneShell
            authRealm="CONTROL_PLANE"
            actorIdentity={controlPlaneIdentity}
            navigation={controlPlaneShellNavigation}
            onNavigateRoute={navigateControlPlaneManifestRoute}
          >
            {renderAdminView()}
          </ControlPlaneShell>
        );
      }
      case 'WL_ADMIN': {
        if (!currentTenant) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <div className="text-4xl mb-4">⏳</div>
                <p className="text-slate-500">Loading workspace...</p>
              </div>
            </div>
          );
        }

        const WlAdminShell = tenantRuntimeManifestEntry?.shellFamily === 'WhiteLabelAdminShell'
          ? WhiteLabelAdminShell
          : null;

        if (tenantContentFamily !== 'wl_admin' || !WlAdminShell) {
          return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="bg-white border border-amber-300 rounded-2xl p-8 max-w-md text-center space-y-4">
                <div className="text-3xl">⚠️</div>
                <h2 className="font-bold text-slate-900">White-Label Admin Unavailable</h2>
                <p className="text-slate-600 text-sm">
                  This tenant session is missing the canonical white-label admin overlay.
                </p>
              </div>
            </div>
          );
        }

        return (
          <>
            {tenantProvisionError && (
              <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-50 border-b border-amber-300 px-4 py-3 text-amber-800 text-sm text-center">
                ⚠️ {tenantProvisionError}
                <button
                  className="ml-4 text-amber-600 underline text-xs"
                  onClick={() => setTenantProvisionError(null)}
                >
                  Dismiss
                </button>
              </div>
            )}
            <WlAdminShell
              tenant={currentTenant}
              navigation={wlAdminShellNavigation}
              onNavigateRoute={navigateWlAdminManifestRoute}
              onNavigateStorefront={() => navigateTenantDefaultManifestRoute()}
            >
              {renderWLAdminContent()}
            </WlAdminShell>
          </>
        );
      }
      case 'TEAM_MGMT':
      case 'INVITE_MEMBER':
      case 'SETTINGS':
      case 'EXPERIENCE': {
        if (!currentTenant) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <div className="text-4xl mb-4">⏳</div>
                <p className="text-slate-500">Loading workspace...</p>
              </div>
            </div>
          );
        }

        if (
          !tenantContentFamily
          || tenantContentFamily === 'control_plane'
          || tenantContentFamily === 'wl_admin'
        ) {
          return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="bg-white border border-amber-300 rounded-2xl p-8 max-w-md text-center space-y-4">
                <div className="text-3xl">⚠️</div>
                <h2 className="font-bold text-slate-900">Workspace Content Unavailable</h2>
                <p className="text-slate-600 text-sm">
                  TexQtic could not align this tenant session to a workspace content family.
                </p>
              </div>
            </div>
          );
        }

        const resolvedShellFamily = tenantRuntimeManifestEntry?.shellFamily ?? null;
        let ExperienceShell: typeof AggregatorShell | typeof B2BShell | typeof B2CShell | typeof WhiteLabelShell | null = null;

        switch (resolvedShellFamily) {
          case 'AggregatorShell':
            ExperienceShell = AggregatorShell;
            break;
          case 'B2BShell':
            ExperienceShell = B2BShell;
            break;
          case 'B2CShell':
            ExperienceShell = B2CShell;
            break;
          case 'WhiteLabelShell':
            ExperienceShell = WhiteLabelShell;
            break;
        }

        if (!resolvedShellFamily || !ExperienceShell) {
          return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="bg-white border border-amber-300 rounded-2xl p-8 max-w-md text-center space-y-4">
                <div className="text-3xl">⚠️</div>
                <h2 className="font-bold text-slate-900">Workspace Configuration Error</h2>
                <p className="text-slate-600 text-sm">
                  Unrecognized tenant identity type. Please contact platform support.
                </p>
              </div>
            </div>
          );
        }
        return (
          <CartProvider
            key={`tenant-shell:${currentTenant.id}`}
            deferInitialRefresh={isB2BCatalogEntrySurface}
          >
            {tenantProvisionError && (
              <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-50 border-b border-amber-300 px-4 py-3 text-amber-800 text-sm text-center">
                ⚠️ {tenantProvisionError}
                <button
                  className="ml-4 text-amber-600 underline text-xs"
                  onClick={() => setTenantProvisionError(null)}
                >
                  Dismiss
                </button>
              </div>
            )}
            {getOnboardingStatusContinuity(currentTenant.status) && (
              <div className={`fixed top-0 left-0 right-0 z-[95] px-4 py-3 text-sm text-center ${getOnboardingStatusContinuity(currentTenant.status)?.bannerClassName}`}>
                {getOnboardingStatusContinuity(currentTenant.status)?.bannerText}
              </div>
            )}
            <ExperienceShell
              tenant={currentTenant}
              navigation={tenantShellContract}
              shellMode={isVerificationBlockedTenantWorkspace ? 'verification-blocked' : 'default'}
              shellLabel={isVerificationBlockedTenantWorkspace ? 'Verification Review' : undefined}
              shellHeaderTitle={isVerificationBlockedTenantWorkspace ? 'TexQtic Verification Review' : undefined}
              shellFooterLabel={isVerificationBlockedTenantWorkspace ? 'v2.4.0 • TexQtic Verification Review' : undefined}
              shellStatusLabel={isVerificationBlockedTenantWorkspace ? currentOnboardingStatusContinuity?.title ?? null : null}
            >
              {shouldShowTenantUtilityAffordances && (
                <div className="absolute top-4 right-4 z-[60] flex gap-2">
                  {showB2CHomeAuthenticatedAffordances && (
                    <CartToggleButton setShowCart={setShowCart} />
                  )}
                  {tenantCanAccessSharedSettingsSurface && (
                    <button
                      onClick={() => setAppState('SETTINGS')}
                      className="bg-white/90 backdrop-blur border border-slate-200 p-2 rounded-lg shadow-sm hover:text-indigo-600 transition"
                      title={tenantCanAccessWhiteLabelSettingsOverlay ? 'White Label Settings' : 'Workspace Profile'}
                    >
                      ⚙️
                    </button>
                  )}
                </div>
              )}
              {renderExperienceContent()}
            </ExperienceShell>
            {showCart && (
              <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[70] animate-in fade-in duration-200">
                <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl animate-in slide-in-from-right duration-300">
                  <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-lg font-bold">Your Cart</h2>
                    <button
                      onClick={() => setShowCart(false)}
                      className="text-slate-400 hover:text-slate-600 transition text-2xl"
                    >
                      ×
                    </button>
                  </div>
                  <div className="h-[calc(100%-5rem)] overflow-y-auto">
                    {/* TECS-FBW-014: propagate checkout success to App-level ORDER_CONFIRMED state */}
                    <Cart onCheckoutSuccess={(result) => {
                      setConfirmedOrderId(result.orderId);
                      setShowCart(false);
                      setAppState('ORDER_CONFIRMED');
                    }} />
                  </div>
                </div>
              </div>
            )}
          </CartProvider>
        );
      }
      // TECS-FBW-014: post-checkout confirmation — rendered after successful checkout.
      // appState stays ORDER_CONFIRMED until user navigates away; orderId preserved in confirmedOrderId.
      case 'ORDER_CONFIRMED':
        return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 max-w-md w-full text-center space-y-6">
              <div className="text-5xl">✅</div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-slate-900">Order Placed!</h1>
                {confirmedOrderId && (
                  <p className="text-sm text-slate-500">
                    Order{' '}
                    <span className="font-mono font-bold text-slate-700">
                      {confirmedOrderId.slice(0, 8)}…
                    </span>{' '}
                    has been received.
                  </p>
                )}
                <p className="text-xs text-slate-400">
                  You’ll receive a confirmation once it’s confirmed.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setConfirmedOrderId(null);
                    navigateTenantManifestRoute('orders');
                  }}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition"
                >
                  View My Orders
                </button>
                <button
                  onClick={() => {
                    setConfirmedOrderId(null);
                    navigateTenantDefaultManifestRoute();
                  }}
                  className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        );
      // C-FG-016: Unknown route not-found surface
      case 'PUBLIC_NOT_FOUND':
        return (
          <div className="min-h-screen bg-[#f3f8fb] flex flex-col items-center justify-center p-6 font-sans">
            <img src="/brand/texqtic-logo.png" alt="TexQtic" className="mb-8 h-10 w-auto" loading="eager" />
            <div className="w-full max-w-md rounded-3xl border border-[#d9e5ea] bg-white px-8 py-12 text-center shadow-sm space-y-4">
              <h1 className="text-2xl font-bold text-slate-900">Page Not Found</h1>
              <p className="text-sm text-slate-500">
                The page you are looking for could not be found.
              </p>
              <button
                onClick={() => {
                  globalThis.window?.history.replaceState(null, '', '/');
                  setAppState('PUBLIC_ENTRY');
                }}
                className="w-full py-3 bg-[#071a2f] text-white rounded-full font-semibold text-sm hover:bg-[#0d2743] transition"
              >
                Go to Home
              </button>
            </div>
          </div>
        );
      default:
        return <div>Invalid System State</div>;
    }
  };

  const rfqSuccessContent = rfqDetailView.open ? (
    <BuyerRfqDetailSurface
      rfq={rfqDetailView.data}
      loading={rfqDetailView.loading}
      error={rfqDetailView.error}
      onBack={handleCloseRfqDetail}
      onClose={handleCloseRfqDialog}
      onOpenTradeContinuity={() => {
        void handleOpenTradeContinuityFromRfq();
      }}
      tradeContinuityLoading={buyerRfqTradeBridge.loading}
      tradeContinuityError={buyerRfqTradeBridge.error}
    />
  ) : (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-4 text-sm text-emerald-800">
        Your request for quote was submitted for {rfqDialog.success?.quantity} unit(s). It remains non-binding until a separate quote workflow is provided.
      </div>
      <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
        RFQ ID: {rfqDialog.success?.rfqId}
      </div>

      {/* AI Assist panel — available because rfqId exists and RFQ is OPEN */}
      <div className="border border-indigo-100 rounded-xl bg-indigo-50/50 px-4 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-indigo-900">AI Field Suggestions</p>
            <p className="text-xs text-indigo-600 mt-0.5">
              AI-generated — you must review and confirm each suggestion before applying.
            </p>
          </div>
          <button
            type="button"
            disabled={rfqDialog.aiAssistLoading}
            onClick={() => {
              const rfqId = rfqDialog.success?.rfqId;
              if (rfqId) void handleRequestAiAssist(rfqId);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {rfqDialog.aiAssistLoading ? 'Getting suggestions…' : 'Get AI Suggestions'}
          </button>
        </div>

        {rfqDialog.aiAssistError && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
            {rfqDialog.aiAssistError}
          </div>
        )}

        {rfqDialog.aiAssistParseError && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
            AI suggestions are unavailable right now. You can still submit the RFQ manually.
          </div>
        )}

        {rfqDialog.aiAssistSuggestions && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-indigo-800 uppercase tracking-widest">
              AI-generated suggestions
            </p>
            {resolveAiAssistDisplayItems(rfqDialog.aiAssistSuggestions).map(item => (
              <div
                key={item.field}
                className="flex items-center justify-between gap-3 bg-white border border-indigo-100 rounded-lg px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700">{item.label}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {typeof item.value === 'boolean'
                      ? item.value ? 'Yes' : 'No'
                      : typeof item.value === 'object'
                      ? JSON.stringify(item.value)
                      : String(item.value)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {rfqDialog.aiSuggestionDecisions[item.field] === 'accepted' ? (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
                      Accepted
                    </span>
                  ) : rfqDialog.aiSuggestionDecisions[item.field] === 'rejected' ? (
                    <span className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded px-2 py-1">
                      Rejected
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setRfqDialog(d => ({ ...d, ...resolveApplyAiSuggestion(d, item.field) }))
                        }
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setRfqDialog(d => ({ ...d, ...resolveRejectAiSuggestion(d, item.field) }))
                        }
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {resolveAiAssistDisplayItems(rfqDialog.aiAssistSuggestions).length === 0 && (
              <p className="text-xs text-slate-500 italic">
                No suggestions available for the current RFQ fields.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            void handleOpenRfqDetail();
          }}
          className="px-5 py-3 bg-white text-slate-900 border border-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
        >
          View RFQ Detail
        </button>
        <button
          type="button"
          onClick={handleCloseRfqDialog}
          className="px-5 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
        >
          Close
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative font-sans">
      {editingCatalogItem && !isVerificationBlockedTenantWorkspace && (
        <div className="fixed inset-0 bg-slate-950/45 z-[195] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Edit Catalog Item</h2>
              <p className="text-sm text-slate-500 mt-2">
                Update the existing tenant catalog item without widening into search, storefront, or control-plane work.
              </p>
            </div>

            <form className="space-y-5" onSubmit={event => {
              event.preventDefault();
              void handleUpdateItem();
            }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1 md:col-span-3">
                  <label htmlFor="edit-item-name" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Name
                  </label>
                  <input
                    id="edit-item-name"
                    required
                    value={editItemFormData.name}
                    onChange={e => setEditItemFormData(data => ({ ...data, name: e.target.value }))}
                    className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="edit-item-price" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Price
                  </label>
                  <input
                    id="edit-item-price"
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editItemFormData.price}
                    onChange={e => setEditItemFormData(data => ({ ...data, price: e.target.value }))}
                    className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label htmlFor="edit-item-sku" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    SKU
                  </label>
                  <input
                    id="edit-item-sku"
                    value={editItemFormData.sku}
                    onChange={e => setEditItemFormData(data => ({ ...data, sku: e.target.value }))}
                    className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Optional SKU"
                  />
                </div>
                <div className="space-y-1 md:col-span-3">
                  <label htmlFor="edit-item-image-url" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Image URL
                  </label>
                  <input
                    id="edit-item-image-url"
                    type="url"
                    value={editItemFormData.imageUrl}
                    onChange={e => setEditItemFormData(data => ({ ...data, imageUrl: e.target.value }))}
                    className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="https://example.com/product-image.jpg"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label htmlFor="edit-item-description" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Description
                  </label>
                  <textarea
                    id="edit-item-description"
                    value={editItemFormData.description}
                    onChange={e => setEditItemFormData(data => ({ ...data, description: e.target.value }))}
                    rows={3}
                    className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    placeholder="Optional product description"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="edit-item-moq" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Min Order Qty
                  </label>
                  <input
                    id="edit-item-moq"
                    type="number"
                    min="1"
                    step="1"
                    value={editItemFormData.moq}
                    onChange={e => setEditItemFormData(data => ({ ...data, moq: e.target.value }))}
                    className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Textile attributes (TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label htmlFor="edit-item-product-category" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Category</label>
                  <select id="edit-item-product-category" value={editItemFormData.productCategory} onChange={e => setEditItemFormData(d => ({ ...d, productCategory: e.target.value }))} className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm bg-white">
                    <option value="">—</option>
                    {['APPAREL_FABRIC','HOME_TEXTILE','TECHNICAL_FABRIC','INDUSTRIAL_FABRIC','LINING','INTERLINING','TRIMMING','ACCESSORY','OTHER'].map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="edit-item-fabric-type" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Fabric Type</label>
                  <select id="edit-item-fabric-type" value={editItemFormData.fabricType} onChange={e => setEditItemFormData(d => ({ ...d, fabricType: e.target.value }))} className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm bg-white">
                    <option value="">—</option>
                    {['WOVEN','KNIT','NON_WOVEN','LACE','EMBROIDERED','TECHNICAL_COMPOSITE','FLEECE','OTHER'].map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="edit-item-material" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Material</label>
                  <select id="edit-item-material" value={editItemFormData.material} onChange={e => setEditItemFormData(d => ({ ...d, material: e.target.value }))} className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm bg-white">
                    <option value="">—</option>
                    {['COTTON','POLYESTER','SILK','WOOL','LINEN','VISCOSE','MODAL','TENCEL_LYOCELL','NYLON','ACRYLIC','HEMP','BAMBOO','RECYCLED_POLYESTER','RECYCLED_COTTON','BLENDED','OTHER'].map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="edit-item-construction" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Construction</label>
                  <select id="edit-item-construction" value={editItemFormData.construction} onChange={e => setEditItemFormData(d => ({ ...d, construction: e.target.value }))} className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm bg-white">
                    <option value="">—</option>
                    {['PLAIN_WEAVE','TWILL','SATIN','DOBBY','JACQUARD','TERRY','VELVET','JERSEY','RIB','INTERLOCK','FLEECE_KNIT','MESH','OTHER'].map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="edit-item-color" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Color</label>
                  <input id="edit-item-color" type="text" value={editItemFormData.color} onChange={e => setEditItemFormData(d => ({ ...d, color: e.target.value }))} placeholder="e.g. Navy Blue" className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="edit-item-gsm" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">GSM</label>
                  <input id="edit-item-gsm" type="number" min={10} max={2000} step={0.1} value={editItemFormData.gsm} onChange={e => setEditItemFormData(d => ({ ...d, gsm: e.target.value }))} placeholder="e.g. 180" className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="edit-item-width-cm" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Width (cm)</label>
                  <input id="edit-item-width-cm" type="number" min={1} max={999.99} step={0.01} value={editItemFormData.widthCm} onChange={e => setEditItemFormData(d => ({ ...d, widthCm: e.target.value }))} placeholder="e.g. 150" className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="edit-item-composition" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Composition</label>
                  <input id="edit-item-composition" type="text" value={editItemFormData.composition} onChange={e => setEditItemFormData(d => ({ ...d, composition: e.target.value }))} placeholder="e.g. 60% Cotton 40% Polyester" className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
              </div>

              {/* Stage selector (TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001) */}
              <div>
                <label htmlFor="edit-item-catalog-stage" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Product Stage</label>
                <select id="edit-item-catalog-stage" value={editItemFormData.catalogStage} onChange={e => setEditItemFormData(d => ({ ...d, catalogStage: e.target.value, stageAttributes: {} }))} className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm bg-white">
                  <option value="">— Select Stage —</option>
                  {CATALOG_STAGE_VALUES.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              {/* Dynamic stage fields */}
              {editItemFormData.catalogStage === 'YARN' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Yarn Type</span><input type="text" value={editItemFormData.stageAttributes['yarnType'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, yarnType: e.target.value } }))} placeholder="e.g. Spun" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Yarn Count</span><input type="text" value={editItemFormData.stageAttributes['yarnCount'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, yarnCount: e.target.value } }))} placeholder="e.g. 40s" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Count System</span><input type="text" value={editItemFormData.stageAttributes['countSystem'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, countSystem: e.target.value } }))} placeholder="Ne / Nm / Tex" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Fiber</span><input type="text" value={editItemFormData.stageAttributes['fiber'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, fiber: e.target.value } }))} placeholder="e.g. Cotton" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Ply</span><input type="text" value={editItemFormData.stageAttributes['ply'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, ply: e.target.value } }))} placeholder="e.g. 2" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Spinning Type</span><input type="text" value={editItemFormData.stageAttributes['spinningType'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, spinningType: e.target.value } }))} placeholder="e.g. Ring" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Denier</span><input type="text" value={editItemFormData.stageAttributes['denier'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, denier: e.target.value } }))} placeholder="e.g. 75" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">End Use</span><input type="text" value={editItemFormData.stageAttributes['endUse'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, endUse: e.target.value } }))} placeholder="e.g. Weaving" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                </div>
              )}
              {editItemFormData.catalogStage === 'FABRIC_KNIT' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Knit Type</span><input type="text" value={editItemFormData.stageAttributes['knitType'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, knitType: e.target.value } }))} placeholder="e.g. Jersey" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Gauge</span><input type="text" value={editItemFormData.stageAttributes['gauge'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, gauge: e.target.value } }))} placeholder="e.g. 28" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Stretch %</span><input type="text" value={editItemFormData.stageAttributes['stretch'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, stretch: e.target.value } }))} placeholder="e.g. 40" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Finish</span><input type="text" value={editItemFormData.stageAttributes['finish'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, finish: e.target.value } }))} placeholder="e.g. Brushed" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">End Use</span><input type="text" value={editItemFormData.stageAttributes['endUse'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, endUse: e.target.value } }))} placeholder="e.g. Sportswear" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                </div>
              )}
              {editItemFormData.catalogStage === 'GARMENT' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Garment Type</span><input type="text" value={editItemFormData.stageAttributes['garmentType'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, garmentType: e.target.value } }))} placeholder="e.g. T-Shirt" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Size Range</span><input type="text" value={editItemFormData.stageAttributes['sizeRange'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, sizeRange: e.target.value } }))} placeholder="e.g. XS-3XL" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Fit</span><input type="text" value={editItemFormData.stageAttributes['fit'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, fit: e.target.value } }))} placeholder="e.g. Regular" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Gender</span><input type="text" value={editItemFormData.stageAttributes['gender'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, gender: e.target.value } }))} placeholder="e.g. Unisex" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Fabric Composition</span><input type="text" value={editItemFormData.stageAttributes['fabricComposition'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, fabricComposition: e.target.value } }))} placeholder="e.g. 100% Cotton" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Monthly Capacity</span><input type="text" value={editItemFormData.stageAttributes['monthlyCapacity'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, monthlyCapacity: e.target.value } }))} placeholder="e.g. 50000" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                </div>
              )}
              {editItemFormData.catalogStage === 'MACHINE' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Machine Type</span><input type="text" value={editItemFormData.stageAttributes['machineType'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, machineType: e.target.value } }))} placeholder="e.g. Rapier Loom" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Brand</span><input type="text" value={editItemFormData.stageAttributes['brand'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, brand: e.target.value } }))} placeholder="e.g. Picanol" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Model</span><input type="text" value={editItemFormData.stageAttributes['model'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, model: e.target.value } }))} placeholder="e.g. GTX-L" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Year</span><input type="text" value={editItemFormData.stageAttributes['year'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, year: e.target.value } }))} placeholder="e.g. 2019" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Condition</span><input type="text" value={editItemFormData.stageAttributes['condition'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, condition: e.target.value } }))} placeholder="New / Refurbished" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Service Support</span><input type="text" value={editItemFormData.stageAttributes['serviceSupport'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, serviceSupport: e.target.value } }))} placeholder="e.g. On-site" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                </div>
              )}
              {editItemFormData.catalogStage === 'SERVICE' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Service Type</span><select value={editItemFormData.stageAttributes['serviceType'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, serviceType: e.target.value } }))} className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm bg-white"><option value="">—</option>{SERVICE_TYPE_VALUES.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}</select></label>
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Specialization</span><input type="text" value={editItemFormData.stageAttributes['specialization'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, specialization: e.target.value } }))} placeholder="e.g. Denim testing" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Location Coverage</span><input type="text" value={editItemFormData.stageAttributes['locationCoverage'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, locationCoverage: e.target.value } }))} placeholder="e.g. Pan-India" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Turnaround (days)</span><input type="text" value={editItemFormData.stageAttributes['turnaroundTimeDays'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, turnaroundTimeDays: e.target.value } }))} placeholder="e.g. 7" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Portfolio Available</span><input type="text" value={editItemFormData.stageAttributes['portfolioAvailable'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, portfolioAvailable: e.target.value } }))} placeholder="Yes / No" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                </div>
              )}
              {editItemFormData.catalogStage === 'SOFTWARE_SAAS' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Software Category</span><input type="text" value={editItemFormData.stageAttributes['softwareCategory'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, softwareCategory: e.target.value } }))} placeholder="e.g. ERP" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Deployment Model</span><input type="text" value={editItemFormData.stageAttributes['deploymentModel'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, deploymentModel: e.target.value } }))} placeholder="Cloud / On-Prem" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Modules</span><input type="text" value={editItemFormData.stageAttributes['modules'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, modules: e.target.value } }))} placeholder="e.g. Costing, Planning" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Support Level</span><input type="text" value={editItemFormData.stageAttributes['supportLevel'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, supportLevel: e.target.value } }))} placeholder="e.g. 24/7" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                  <label className="space-y-1 block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Trial Available</span><input type="text" value={editItemFormData.stageAttributes['trialAvailable'] ?? ''} onChange={e => setEditItemFormData(d => ({ ...d, stageAttributes: { ...d.stageAttributes, trialAvailable: e.target.value } }))} placeholder="Yes / No" className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                </div>
              )}

              {editItemError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
                  {editItemError}
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleCloseEditItem}
                  disabled={editItemLoading}
                  className="px-5 py-3 text-sm font-semibold text-slate-500 hover:text-slate-900 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editItemLoading}
                  className="px-5 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editItemLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {rfqDialog.open && rfqDialog.product && !isVerificationBlockedTenantWorkspace && (
        <div className="fixed inset-0 bg-slate-950/45 z-[190] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="p-8 pb-4 flex-shrink-0">
              <h2 className="text-xl font-bold text-slate-900">Request Quote</h2>
              <p className="text-sm text-slate-500 mt-2">
                Submit a non-binding request for quote for <strong>{rfqDialog.product.name}</strong>.
                This starts an RFQ only and does not create an order or checkout commitment.
              </p>
            </div>

            {rfqDialog.success ? (
              <div className="px-8 pb-8">{rfqSuccessContent}</div>
            ) : (
              <form className="overflow-y-auto flex-1 px-8 pb-8 space-y-5" onSubmit={handleSubmitRfq}>
                {rfqDialog.confirmationStep ? (
                  <>
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">Review your RFQ</h3>
                      <ul className="space-y-2">
                        {resolveRfqConfirmationSummary(rfqDialog).map(line => (
                          <li key={line.label} className="flex gap-2 text-sm">
                            <span className="font-medium text-slate-700 min-w-[140px]">{line.label}:</span>
                            <span className="text-slate-600">{line.value}</span>
                          </li>
                        ))}
                      </ul>
                      {resolveRfqConfirmationSummary(rfqDialog).length === 0 && (
                        <p className="text-sm text-slate-500">Only a quantity of {rfqDialog.quantity} will be submitted.</p>
                      )}
                    </div>

                    {rfqDialog.error && (
                      <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
                        {rfqDialog.error}
                      </div>
                    )}

                    <div className="flex gap-3 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setRfqDialog(d => ({ ...d, confirmationStep: false, error: null }))}
                        disabled={rfqDialog.loading}
                        className="px-5 py-3 text-sm font-semibold text-slate-500 hover:text-slate-900 transition disabled:opacity-50"
                      >
                        ← Back
                      </button>
                      <button
                        type="submit"
                        disabled={rfqDialog.loading}
                        className="px-5 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {rfqDialog.loading ? 'Submitting...' : 'Confirm and Submit RFQ'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Section 1: Core */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-[1fr_120px] gap-3">
                        <div>
                          <label htmlFor="rfq-quantity" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                            Quantity <span className="text-rose-500">*</span>
                          </label>
                          <input
                            id="rfq-quantity"
                            type="number"
                            min={1}
                            step={1}
                            inputMode="numeric"
                            value={rfqDialog.quantity}
                            onChange={e => setRfqDialog(dialog => ({ ...dialog, quantity: e.target.value, error: null }))}
                            className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                        <div>
                          <label htmlFor="rfq-quantity-unit" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                            Unit
                          </label>
                          <input
                            id="rfq-quantity-unit"
                            type="text"
                            maxLength={30}
                            value={rfqDialog.quantityUnit}
                            onChange={e => setRfqDialog(dialog => ({ ...dialog, quantityUnit: e.target.value }))}
                            placeholder="e.g. meters"
                            className="mt-1.5 w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="rfq-requirement-title" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                          Requirement Title (optional)
                        </label>
                        <input
                          id="rfq-requirement-title"
                          type="text"
                          maxLength={200}
                          value={rfqDialog.requirementTitle}
                          onChange={e => setRfqDialog(dialog => ({ ...dialog, requirementTitle: e.target.value }))}
                          placeholder="e.g. 40s Ring Spun Cotton Yarn for Summer 2026"
                          className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Section 2: Stage-aware requirement fields */}
                    {resolveStructuredRfqStageSectionFields(rfqDialog.catalogStage).length > 0 && (
                      <div className="space-y-3 pt-1">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                          {rfqDialog.catalogStage?.replace(/_/g, ' ')} Requirements (optional)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {resolveStructuredRfqStageSectionFields(rfqDialog.catalogStage).map(field => (
                            <div key={field.key}>
                              <label htmlFor={`rfq-stage-${field.key}`} className="text-[11px] font-semibold text-slate-500">
                                {field.label}
                              </label>
                              <input
                                id={`rfq-stage-${field.key}`}
                                type="text"
                                maxLength={200}
                                value={rfqDialog.stageRequirementAttributes[field.key] ?? ''}
                                onChange={e =>
                                  setRfqDialog(dialog => ({
                                    ...dialog,
                                    stageRequirementAttributes: {
                                      ...dialog.stageRequirementAttributes,
                                      [field.key]: e.target.value,
                                    },
                                  }))
                                }
                                placeholder={field.placeholder}
                                className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Section 3: Logistics + Notes */}
                    <div className="space-y-3 pt-1">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                        Logistics &amp; Notes (optional)
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="rfq-urgency" className="text-[11px] font-semibold text-slate-500">
                            Urgency
                          </label>
                          <select
                            id="rfq-urgency"
                            value={rfqDialog.urgency}
                            onChange={e =>
                              setRfqDialog(dialog => ({
                                ...dialog,
                                urgency: e.target.value as BuyerRfqDialogState['urgency'],
                              }))
                            }
                            className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          >
                            <option value="">Select (optional)</option>
                            <option value="STANDARD">Standard</option>
                            <option value="URGENT">Urgent</option>
                            <option value="FLEXIBLE">Flexible</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="rfq-target-date" className="text-[11px] font-semibold text-slate-500">
                            Target Delivery Date
                          </label>
                          <input
                            id="rfq-target-date"
                            type="date"
                            value={rfqDialog.targetDeliveryDate}
                            onChange={e => setRfqDialog(dialog => ({ ...dialog, targetDeliveryDate: e.target.value }))}
                            className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                        <div>
                          <label htmlFor="rfq-delivery-country" className="text-[11px] font-semibold text-slate-500">
                            Delivery Country (3-letter)
                          </label>
                          <input
                            id="rfq-delivery-country"
                            type="text"
                            maxLength={3}
                            value={rfqDialog.deliveryCountry}
                            onChange={e =>
                              setRfqDialog(dialog => ({ ...dialog, deliveryCountry: e.target.value.toUpperCase() }))
                            }
                            placeholder="e.g. BGD"
                            className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                        <div>
                          <label htmlFor="rfq-delivery-location" className="text-[11px] font-semibold text-slate-500">
                            Delivery Location
                          </label>
                          <input
                            id="rfq-delivery-location"
                            type="text"
                            maxLength={200}
                            value={rfqDialog.deliveryLocation}
                            onChange={e => setRfqDialog(dialog => ({ ...dialog, deliveryLocation: e.target.value }))}
                            placeholder="e.g. Dhaka, Bangladesh"
                            className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          id="rfq-sample-required"
                          type="checkbox"
                          checked={rfqDialog.sampleRequired === true}
                          onChange={e =>
                            setRfqDialog(dialog => ({
                              ...dialog,
                              sampleRequired: e.target.checked ? true : null,
                            }))
                          }
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="rfq-sample-required" className="text-sm text-slate-600">
                          Sample required before bulk order
                        </label>
                      </div>
                      <div>
                        <label htmlFor="rfq-message" className="text-[11px] font-semibold text-slate-500">
                          Additional notes / special requirements
                        </label>
                        <textarea
                          id="rfq-message"
                          rows={3}
                          maxLength={1000}
                          value={rfqDialog.buyerMessage}
                          onChange={e => setRfqDialog(dialog => ({ ...dialog, buyerMessage: e.target.value, error: null }))}
                          placeholder="Any additional context for this request."
                          className="mt-1 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>

                    {rfqDialog.error && (
                      <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
                        {rfqDialog.error}
                      </div>
                    )}

                    <div className="flex gap-3 justify-end pt-2">
                      <div className="flex-1 flex items-center">
                        <span className="text-xs text-slate-400 italic">
                          AI suggestions available after submitting your RFQ
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCloseRfqDialog}
                        className="px-5 py-3 text-sm font-semibold text-slate-500 hover:text-slate-900 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
                      >
                        Review RFQ →
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      )}
      {/* G-W3-ROUTING-001: Impersonation reason dialog */}
      {impersonationDialog.open && impersonationDialog.tenant && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 space-y-6 shadow-2xl">
            <div>
              <h2 className="text-lg font-bold">Impersonate Tenant</h2>
              <p className="text-sm text-slate-500 mt-1">
                You are about to impersonate{' '}
                <strong>{impersonationDialog.tenant.name}</strong>. A time-bounded session
                will be created with a 30-minute expiry.
              </p>
            </div>
            <div className="space-y-1">
              <label htmlFor="impersonation-reason" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                Reason (required, min 10 chars)
              </label>
              <textarea
                id="impersonation-reason"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-rose-500 outline-none"
                rows={3}
                placeholder="e.g. Investigating tenant support ticket #1234..."
                value={impersonationDialog.reason}
                onChange={e => setImpersonationDialog(d => ({ ...d, reason: e.target.value }))}
              />
              {impersonationDialog.reason.length > 0 && impersonationDialog.reason.length < 10 && (
                <p className="text-[10px] text-amber-600">
                  {10 - impersonationDialog.reason.length} more character(s) required.
                </p>
              )}
            </div>
            {impersonationDialog.error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
                {impersonationDialog.error}
              </div>
            )}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() =>
                  setImpersonationDialog({ open: false, tenant: null, reason: '', loading: false, error: null })
                }
                className="flex-1 py-3 font-bold text-slate-500 text-xs uppercase tracking-widest hover:text-slate-900 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImpersonateConfirm}
                disabled={impersonationDialog.loading || impersonationDialog.reason.trim().length < 10}
                className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-rose-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {impersonationDialog.loading ? 'Starting...' : 'Start Impersonation'}
              </button>
            </div>
          </div>
        </div>
      )}
      {impersonation.isAdmin &&
        currentTenant &&
        (appState === 'EXPERIENCE' || appState === 'TEAM_MGMT' || appState === 'SETTINGS' || appState === 'WL_ADMIN') && (
          <div className="bg-rose-600 text-white px-6 py-2 sticky top-0 z-[100] flex justify-between items-center shadow-lg border-b border-rose-700 animate-in slide-in-from-top duration-300">
            <div className="text-xs font-bold uppercase tracking-widest flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              Staff Active: {controlPlaneActorLabel} impersonating {currentTenant.name} ({currentTenant.id})
              {impersonation.expiresAt && (
                <span className="text-rose-200 font-normal normal-case tracking-normal">
                  — expires {new Date(impersonation.expiresAt).toLocaleTimeString()}
                </span>
              )}
            </div>
            <button
              onClick={handleExitImpersonation}
              className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-[10px] font-black uppercase transition"
            >
              Exit Impersonation
            </button>
          </div>
        )}

      {renderCurrentState()}

      {appState !== 'AUTH' &&
        appState !== 'FORGOT_PASSWORD' &&
        appState !== 'VERIFY_EMAIL' &&
        appState !== 'ONBOARDING' &&
        appState !== 'PUBLIC_ENTRY' &&
        appState !== 'ONBOARDING_CONTINUATION' && (
          <div className="fixed bottom-6 right-6 z-[999] flex flex-col items-end gap-3">
            <div className="glass shadow-2xl rounded-2xl border border-slate-200 p-2 flex gap-2">
              {canAccessControlPlane && !impersonation.isAdmin && (
                <button
                  onClick={() => {
                    if (appState === 'CONTROL_PLANE') {
                      const targetTenant = selectedTenant ?? currentTenant;
                      if (targetTenant) {
                        handleImpersonate(targetTenant);
                      }
                      return;
                    }

                    enterControlPlane();
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition uppercase tracking-tighter ${appState === 'CONTROL_PLANE' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                >
                  {appState === 'CONTROL_PLANE' ? 'App Shells' : 'Control Plane'}
                </button>
              )}
              <button
                onClick={() => {
                  resetTenantScopedRouteState();
                  clearAuth();
                  clearPersistedImpersonationSession();
                  setImpersonation(EMPTY_IMPERSONATION_STATE);
                  setTenantAuthenticatedRole(null);
                  clearControlPlaneIdentityState();
                  setAppState('AUTH');
                }}
                className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-bold uppercase hover:bg-slate-200 transition"
              >
                Logout
              </button>
              {appState !== 'CONTROL_PLANE' && (
                <>
                  <div className="h-8 w-px bg-slate-200 my-auto mx-1"></div>
                  {!impersonation.isAdmin && tenants.length > 0 && (
                    <select
                      title="tenant-picker"
                      value={currentTenantId}
                      onChange={e => {
                        setCurrentTenantId(e.target.value);
                        setAppState('EXPERIENCE');
                      }}
                      className="bg-transparent text-[10px] font-bold border-none focus:ring-0 cursor-pointer px-4 uppercase tracking-wider"
                    >
                      {tenants.map(tenant => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </option>
                      ))}
                    </select>
                  )}
                </>
              )}
            </div>
          </div>
        )}
    </div>
  );
};

export default App;
