/**
 * TexQtic Catalog Service
 *
 * Provides catalog operations:
 * - Fetch tenant catalog items with pagination
 * - Search catalog
 */

import { tenantDelete, tenantGet, tenantPatch, tenantPost } from './tenantApiClient';

export interface CatalogItem {
  id: string;
  tenantId: string;
  name: string;
  sku: string;
  description?: string;
  price: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  // Optional display properties
  imageUrl?: string;
  /**
   * @deprecated Phantom client-side field. No DB column exists for category on catalog_items.
   * Retained for backward compatibility with WL surfaces that derive grouping from this field.
   * Do not rely on this field in new code — it is always undefined at runtime.
   */
  category?: string;
  moq?: number;
}

export interface CatalogResponse {
  items: CatalogItem[];
  count: number;
  nextCursor: string | null;
}

export interface CatalogQueryParams {
  q?: string;
  limit?: number;
  cursor?: string;
}

/**
 * Fetch catalog items with cursor-based pagination
 *
 * @param params - Query parameters for filtering and pagination
 * @returns Paginated catalog items
 */
export async function getCatalogItems(params: CatalogQueryParams = {}): Promise<CatalogResponse> {
  const queryParams = new URLSearchParams();

  if (params.q) {
    queryParams.append('q', params.q);
  }

  if (params.limit) {
    queryParams.append('limit', params.limit.toString());
  }

  if (params.cursor) {
    queryParams.append('cursor', params.cursor);
  }

  const queryString = queryParams.toString();
  const queryPrefix = queryString ? '?' : '';
  const endpoint = `/api/tenant/catalog/items${queryPrefix}${queryString}`;

  return tenantGet<CatalogResponse>(endpoint);
}

/**
 * Search catalog items
 *
 * @param searchQuery - Search term (searches name and SKU)
 * @param limit - Max results per page
 * @returns Matching catalog items
 */
export async function searchCatalog(
  searchQuery: string,
  limit: number = 20
): Promise<CatalogResponse> {
  return getCatalogItems({ q: searchQuery, limit });
}

// ==================== WRITE OPERATIONS ====================

export interface CreateCatalogItemRequest {
  name: string;
  sku?: string;
  imageUrl?: string;
  description?: string;
  price: number;
  moq?: number;
  // Textile attributes (TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001)
  productCategory?: string;
  fabricType?: string;
  gsm?: number;
  material?: string;
  composition?: string;
  color?: string;
  widthCm?: number;
  construction?: string;
  certifications?: CertificationEntry[];
  // Stage attributes (TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001)
  catalogStage?: CatalogStage;
  stageAttributes?: Record<string, unknown>;
}

export interface CreateCatalogItemResponse {
  item: CatalogItem;
}

export interface UpdateCatalogItemRequest {
  name?: string;
  sku?: string | null;
  imageUrl?: string | null;
  description?: string | null;
  price?: number;
  moq?: number;
  active?: boolean;
  // Textile attributes (TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001)
  productCategory?: string | null;
  fabricType?: string | null;
  gsm?: number | null;
  material?: string | null;
  composition?: string | null;
  color?: string | null;
  widthCm?: number | null;
  construction?: string | null;
  certifications?: CertificationEntry[] | null;
  // Stage attributes (TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001)
  catalogStage?: CatalogStage | null;
  stageAttributes?: Record<string, unknown> | null;
}

export interface UpdateCatalogItemResponse {
  item: CatalogItem;
}

export interface DeleteCatalogItemResponse {
  id: string;
  deleted: boolean;
}

export interface CreateRfqRequest {
  catalogItemId: string;
  quantity?: number;
  buyerMessage?: string;
  requirementTitle?: string;
  quantityUnit?: string;
  urgency?: 'STANDARD' | 'URGENT' | 'FLEXIBLE';
  sampleRequired?: boolean;
  targetDeliveryDate?: string;
  deliveryLocation?: string;
  deliveryCountry?: string;
  stageRequirementAttributes?: Record<string, unknown>;
  requirementConfirmedAt?: string;
  fieldSourceMeta?: Record<string, unknown>;
}

export interface CreateRfqResponse {
  rfq: BuyerRfqDetail;
}

export type BuyerRfqStatus = 'INITIATED' | 'OPEN' | 'RESPONDED' | 'CLOSED';

export interface BuyerRfqListItem {
  id: string;
  status: BuyerRfqStatus;
  org_id?: string;
  catalog_item_id: string;
  item_name: string;
  item_sku: string | null;
  quantity: number;
  supplier_org_id: string;
  created_at: string;
  updated_at: string;
  requirement_title?: string | null;
  quantity_unit?: string | null;
  urgency?: string | null;
  sample_required?: boolean | null;
  target_delivery_date?: string | null;
  delivery_location?: string | null;
  delivery_country?: string | null;
  stage_requirement_attributes?: Record<string, unknown> | null;
  field_source_meta?: Record<string, unknown> | null;
  requirement_confirmed_at?: string | null;
}

export interface BuyerRfqListResponse {
  rfqs: BuyerRfqListItem[];
  count: number;
}

export interface BuyerRfqSupplierResponse {
  id: string;
  supplier_org_id: string;
  message: string;
  submitted_at: string;
  created_at: string;
}

export interface BuyerRfqTradeContinuity {
  trade_id: string;
  trade_reference: string;
}

export interface BuyerRfqDetail {
  id: string;
  status: BuyerRfqStatus;
  org_id?: string;
  catalog_item_id: string;
  item_name: string;
  item_sku: string;
  quantity: number;
  supplier_org_id: string;
  created_at: string;
  updated_at: string;
  item_unit_price: number;
  buyer_message: string | null;
  created_by_user_id: string;
  supplier_response: BuyerRfqSupplierResponse | null;
  trade_continuity: BuyerRfqTradeContinuity | null;
  requirement_title?: string | null;
  quantity_unit?: string | null;
  urgency?: string | null;
  sample_required?: boolean | null;
  target_delivery_date?: string | null;
  delivery_location?: string | null;
  delivery_country?: string | null;
  stage_requirement_attributes?: Record<string, unknown> | null;
  field_source_meta?: Record<string, unknown> | null;
  requirement_confirmed_at?: string | null;
}

export interface BuyerRfqDetailResponse {
  rfq: BuyerRfqDetail;
}

export interface SupplierRfqListItem {
  id: string;
  status: BuyerRfqStatus;
  catalog_item_id: string;
  item_name: string;
  item_sku: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;
  requirement_title?: string | null;
  quantity_unit?: string | null;
  urgency?: string | null;
  sample_required?: boolean | null;
  delivery_country?: string | null;
  stage_requirement_attributes?: Record<string, unknown> | null;
}

export interface SupplierRfqListResponse {
  rfqs: SupplierRfqListItem[];
  count: number;
}

export interface SupplierRfqDetail {
  id: string;
  status: BuyerRfqStatus;
  catalog_item_id: string;
  item_name: string;
  item_sku: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;
  buyer_message: string | null;
  requirement_title?: string | null;
  quantity_unit?: string | null;
  urgency?: string | null;
  sample_required?: boolean | null;
  delivery_country?: string | null;
  stage_requirement_attributes?: Record<string, unknown> | null;
}

export interface SupplierRfqDetailResponse {
  rfq: SupplierRfqDetail;
}

export interface SupplierRfqResponse {
  id: string;
  rfq_id: string;
  supplier_org_id: string;
  message: string;
  submitted_at: string;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
}

export interface SubmitSupplierRfqResponseRequest {
  message: string;
}

export interface SubmitSupplierRfqResponseResult {
  response: SupplierRfqResponse;
  rfq: {
    id: string;
    status: BuyerRfqStatus;
  };
  non_binding: boolean;
}

/**
 * Create a catalog item (OWNER/ADMIN only)
 *
 * @param payload - Item fields (name, price required; sku, description, moq optional)
 * @returns Created catalog item
 */
export async function createCatalogItem(
  payload: CreateCatalogItemRequest
): Promise<CreateCatalogItemResponse> {
  return tenantPost<CreateCatalogItemResponse>('/api/tenant/catalog/items', payload);
}

export async function updateCatalogItem(
  itemId: string,
  payload: UpdateCatalogItemRequest
): Promise<UpdateCatalogItemResponse> {
  return tenantPatch<UpdateCatalogItemResponse>(`/api/tenant/catalog/items/${itemId}`, payload);
}

export async function deleteCatalogItem(itemId: string): Promise<DeleteCatalogItemResponse> {
  return tenantDelete<DeleteCatalogItemResponse>(`/api/tenant/catalog/items/${itemId}`);
}

/**
 * Submit a non-binding tenant RFQ initiation request for a catalog item.
 * The server derives tenant scope from the authenticated tenant context.
 */
export async function createRfq(
  payload: CreateRfqRequest
): Promise<CreateRfqResponse> {
  return tenantPost<CreateRfqResponse>('/api/tenant/rfqs', payload);
}

export async function getBuyerRfqs(): Promise<BuyerRfqListResponse> {
  return tenantGet<BuyerRfqListResponse>('/api/tenant/rfqs');
}

export async function getBuyerRfqDetail(rfqId: string): Promise<BuyerRfqDetailResponse> {
  return tenantGet<BuyerRfqDetailResponse>(`/api/tenant/rfqs/${rfqId}`);
}

export async function getSupplierRfqInbox(): Promise<SupplierRfqListResponse> {
  return tenantGet<SupplierRfqListResponse>('/api/tenant/rfqs/inbox');
}

export async function getSupplierRfqDetail(rfqId: string): Promise<SupplierRfqDetailResponse> {
  return tenantGet<SupplierRfqDetailResponse>(`/api/tenant/rfqs/inbox/${rfqId}`);
}

export async function submitSupplierRfqResponse(
  rfqId: string,
  payload: SubmitSupplierRfqResponseRequest
): Promise<SubmitSupplierRfqResponseResult> {
  return tenantPost<SubmitSupplierRfqResponseResult>(`/api/tenant/rfqs/inbox/${rfqId}/respond`, payload);
}

// ==================== AI RFQ ASSIST (TECS-AI-RFQ-ASSISTANT-MVP-001) ====================

/**
 * AI-suggested field values for an existing RFQ.
 * Price and supplier-matching fields are intentionally absent.
 */
export interface RfqAssistSuggestions {
  requirementTitle: string | null;
  quantityUnit: string | null;
  urgency: 'STANDARD' | 'URGENT' | 'FLEXIBLE' | null;
  sampleRequired: boolean | null;
  deliveryCountry: string | null;
  stageRequirementAttributes: Record<string, unknown> | null;
  reasoning: string;
}

/**
 * Response from POST /api/tenant/rfqs/:id/ai-assist.
 * humanConfirmationRequired is always true — the buyer must review every suggestion.
 */
export interface RfqAssistResponse {
  suggestions: RfqAssistSuggestions | null;
  humanConfirmationRequired: true;
  reasoningLogId: string | null;
  auditLogId: string;
  hadInferenceError: boolean;
  fieldSourceMeta: { method: 'ai-rfq-assist'; rfqId: string };
  suggestionsParseError?: boolean;
}

/**
 * Request AI-assisted field suggestions for an existing OPEN or RESPONDED RFQ.
 * The RFQ must already exist in the database — no draft creation is performed.
 * humanConfirmationRequired is always true in the response.
 */
export async function requestRfqAssist(rfqId: string): Promise<RfqAssistResponse> {
  return tenantPost<RfqAssistResponse>(`/api/tenant/rfqs/${rfqId}/ai-assist`, {});
}

// ==================== BUYER CATALOG BROWSE (TECS-B2B-BUYER-CATALOG-BROWSE-001) ====================

// ---- Textile attribute controlled-vocabulary constants ----

export const PRODUCT_CATEGORY_VALUES = [
  'APPAREL_FABRIC', 'HOME_TEXTILE', 'TECHNICAL_FABRIC', 'INDUSTRIAL_FABRIC',
  'LINING', 'INTERLINING', 'TRIMMING', 'ACCESSORY', 'OTHER',
] as const;
export type ProductCategory = typeof PRODUCT_CATEGORY_VALUES[number];

export const FABRIC_TYPE_VALUES = [
  'WOVEN', 'KNIT', 'NON_WOVEN', 'LACE', 'EMBROIDERED',
  'TECHNICAL_COMPOSITE', 'FLEECE', 'OTHER',
] as const;
export type FabricType = typeof FABRIC_TYPE_VALUES[number];

export const MATERIAL_VALUES = [
  'COTTON', 'POLYESTER', 'SILK', 'WOOL', 'LINEN', 'VISCOSE', 'MODAL',
  'TENCEL_LYOCELL', 'NYLON', 'ACRYLIC', 'HEMP', 'BAMBOO',
  'RECYCLED_POLYESTER', 'RECYCLED_COTTON', 'BLENDED', 'OTHER',
] as const;
export type Material = typeof MATERIAL_VALUES[number];

export const CONSTRUCTION_VALUES = [
  'PLAIN_WEAVE', 'TWILL', 'SATIN', 'DOBBY', 'JACQUARD', 'TERRY', 'VELVET',
  'JERSEY', 'RIB', 'INTERLOCK', 'FLEECE_KNIT', 'MESH', 'OTHER',
] as const;
export type Construction = typeof CONSTRUCTION_VALUES[number];

export const CERT_STANDARD_VALUES = [
  'OEKO_TEX_STANDARD_100', 'OEKO_TEX_LEATHER_STANDARD', 'GOTS', 'BCI', 'FAIR_TRADE',
  'BLUESIGN', 'HIGG_INDEX', 'RECYCLED_CLAIM_STANDARD', 'GLOBAL_RECYCLE_STANDARD',
  'ISO_9001', 'SEDEX_SMETA', 'OTHER',
] as const;
export type CertStandard = typeof CERT_STANDARD_VALUES[number];

// Catalog stage taxonomy (TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001)
export const CATALOG_STAGE_VALUES = [
  'YARN', 'FIBER', 'FABRIC_WOVEN', 'FABRIC_KNIT', 'FABRIC_PROCESSED',
  'GARMENT', 'ACCESSORY_TRIM', 'CHEMICAL_AUXILIARY', 'MACHINE', 'MACHINE_SPARE',
  'PACKAGING', 'SERVICE', 'SOFTWARE_SAAS', 'OTHER',
] as const;
export type CatalogStage = typeof CATALOG_STAGE_VALUES[number];

export const SERVICE_TYPE_VALUES = [
  'FASHION_DESIGN', 'FABRIC_DESIGN_DOBBY', 'FABRIC_DESIGN_JACQUARD', 'FABRIC_DESIGN_PRINT',
  'TECHNICAL_CONSULTING', 'BUSINESS_CONSULTING', 'TESTING_LAB', 'LOGISTICS_PROVIDER',
  'CERTIFICATION_PROVIDER', 'MANUFACTURING_SERVICE', 'TEXTILE_SOFTWARE_SAAS', 'OTHER_SERVICE',
] as const;
export type ServiceType = typeof SERVICE_TYPE_VALUES[number];

/** A certification entry stored in the JSONB certifications column. */
export interface CertificationEntry {
  standard: string;
  certNumber?: string;
  issuedBy?: string;
  validUntil?: string;
}

/**
 * A single catalog item as visible to an authenticated B2B buyer.
 * Phase 1 + textile attrs: id, name, sku, description, moq, imageUrl +
 * 9 textile attributes (all nullable) — NO price, NO publicationPosture.
 */
export interface BuyerCatalogItem {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  moq: number;
  imageUrl: string | null;
  // Textile attributes (TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001)
  productCategory: string | null;
  fabricType: string | null;
  gsm: number | null;
  material: string | null;
  composition: string | null;
  color: string | null;
  widthCm: number | null;
  construction: string | null;
  certifications: CertificationEntry[] | null;
  // Stage attributes (TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001)
  catalogStage: string | null;
  stageAttributes: Record<string, unknown> | null;
}

export interface BuyerCatalogResponse {
  items: BuyerCatalogItem[];
  count: number;
  nextCursor: string | null;
}

export interface BuyerCatalogQueryParams {
  limit?: number;
  cursor?: string;
  q?: string;
  // Textile attribute filters (TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001)
  productCategory?: string;
  fabricType?: string;
  material?: string | string[];
  construction?: string;
  color?: string;
  gsmMin?: number;
  gsmMax?: number;
  widthMin?: number;
  widthMax?: number;
  moqMax?: number;
  certification?: string;
  // Stage filter (TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001)
  catalogStage?: CatalogStage;
}

/**
 * Fetch active catalog items for a given supplier org (authenticated B2B buyer browse).
 * The supplier org must be publication-eligible (Gate 1 enforced server-side).
 * Price is intentionally absent from Phase 1 response.
 * Supports textile attribute filters (TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001).
 */
export async function getBuyerCatalogItems(
  supplierOrgId: string,
  params: BuyerCatalogQueryParams = {}
): Promise<BuyerCatalogResponse> {
  const queryParams = new URLSearchParams();

  if (params.limit) {
    queryParams.append('limit', params.limit.toString());
  }

  if (params.cursor) {
    queryParams.append('cursor', params.cursor);
  }

  if (params.q && params.q.trim().length > 0) {
    queryParams.append('q', params.q.trim());
  }

  // Textile attribute filters
  if (params.productCategory) {
    queryParams.append('productCategory', params.productCategory);
  }
  if (params.fabricType) {
    queryParams.append('fabricType', params.fabricType);
  }
  if (params.material) {
    if (Array.isArray(params.material)) {
      params.material.forEach(m => queryParams.append('material', m));
    } else {
      queryParams.append('material', params.material);
    }
  }
  if (params.construction) {
    queryParams.append('construction', params.construction);
  }
  if (params.color) {
    queryParams.append('color', params.color);
  }
  if (params.gsmMin !== undefined) {
    queryParams.append('gsmMin', params.gsmMin.toString());
  }
  if (params.gsmMax !== undefined) {
    queryParams.append('gsmMax', params.gsmMax.toString());
  }
  if (params.widthMin !== undefined) {
    queryParams.append('widthMin', params.widthMin.toString());
  }
  if (params.widthMax !== undefined) {
    queryParams.append('widthMax', params.widthMax.toString());
  }
  if (params.moqMax !== undefined) {
    queryParams.append('moqMax', params.moqMax.toString());
  }
  if (params.certification) {
    queryParams.append('certification', params.certification);
  }
  if (params.catalogStage) {
    queryParams.append('catalogStage', params.catalogStage);
  }

  const queryString = queryParams.toString();
  const queryPrefix = queryString ? '?' : '';
  const endpoint = `/api/tenant/catalog/supplier/${encodeURIComponent(supplierOrgId)}/items${queryPrefix}${queryString}`;

  return tenantGet<BuyerCatalogResponse>(endpoint);
}

// ==================== BUYER SUPPLIER PICKER (TECS-B2B-BUYER-CATALOG-SUPPLIER-SELECT-001) ====================

/**
 * A single eligible supplier entry as returned to an authenticated B2B buyer.
 * Phase 2: id (UUID), slug, legalName, primarySegment only — NO price, NO item details.
 */
export interface SupplierPickerEntry {
  id: string;
  slug: string;
  legalName: string;
  primarySegment: string | null;
}

export interface EligibleSuppliersResponse {
  items: SupplierPickerEntry[];
  total: number;
}

/**
 * Fetch eligible B2B suppliers for the authenticated buyer supplier picker.
 * Returns only suppliers that pass both eligibility gates server-side.
 */
export async function getEligibleSuppliers(): Promise<EligibleSuppliersResponse> {
  return tenantGet<EligibleSuppliersResponse>('/api/tenant/b2b/eligible-suppliers');
}

// ==================== AI SUPPLIER PROFILE COMPLETENESS (TECS-AI-SUPPLIER-PROFILE-COMPLETENESS-001) ====================

export interface SupplierProfileCompletenessCategoryScores {
  profileIdentity: number;
  businessCapability: number;
  catalogCoverage: number;
  catalogAttributeQuality: number;
  stageTaxonomy: number;
  certificationsDocuments: number;
  rfqResponsiveness: number;
  serviceCapabilityClarity: number;
  aiReadiness: number;
  buyerDiscoverability: number;
}

export interface SupplierProfileCompletenessMissingField {
  category: string;
  field: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  note?: string;
}

export interface SupplierProfileCompletenessImprovementAction {
  action: string;
  category: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface SupplierProfileCompletenessTrustWarning {
  warning: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  affectedCategory?: string;
}

export interface SupplierProfileCompletenessReport {
  overallCompleteness: number;
  categoryScores: SupplierProfileCompletenessCategoryScores;
  missingFields: SupplierProfileCompletenessMissingField[];
  improvementActions: SupplierProfileCompletenessImprovementAction[];
  trustSignalWarnings: SupplierProfileCompletenessTrustWarning[];
  reasoningSummary: string;
  humanReviewRequired: true;
}

export interface SupplierProfileCompletenessResponse {
  report: SupplierProfileCompletenessReport;
  humanReviewRequired: true;
  reasoningLogId: string;
  auditLogId: string;
  hadInferenceError: boolean;
}

/**
 * Request an AI-driven completeness analysis for the authenticated supplier's profile.
 * humanReviewRequired is always true — hardcoded in both the service and UI component.
 * Score is supplier-internal only and must never appear in buyer-facing surfaces.
 */
export async function analyseSupplierProfileCompleteness(): Promise<SupplierProfileCompletenessResponse> {
  return tenantPost<SupplierProfileCompletenessResponse>('/api/tenant/supplier-profile/ai-completeness', {});
}
