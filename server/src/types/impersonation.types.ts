/**
 * G-011: Impersonation Types (Doctrine v1.4 compliant)
 *
 * Impersonation sessions allow a control-plane admin to mint a time-bounded
 * tenant-realm token for a specific org member. The session is auditable,
 * revocable (endedAt), and carries no admin bypass semantics in the tenant realm.
 *
 * Schema constraint note: ImpersonationSession has no userId column.
 * The impersonated userId is validated at start time and embedded in the JWT
 * but is NOT persisted to the DB session row.
 */

export interface StartImpersonationRequest {
  /** Target tenant org UUID (canonical Doctrine v1.4 org_id) */
  orgId: string;
  /** UUID of the user to impersonate (must be a member of orgId) */
  userId: string;
  /** Reason for impersonation (required, min 10 chars) */
  reason: string;
}

export interface StartImpersonationResult {
  /** Created ImpersonationSession.id */
  impersonationId: string;
  /** Impersonated user's id (not in DB session — carried in JWT) */
  userId: string;
  /** Target org UUID */
  orgId: string;
  /** User's membership role in the org (included in token claims) */
  membershipRole: string;
  /** Session expiry */
  expiresAt: Date;
}

export interface StopImpersonationRequest {
  /** ImpersonationSession.id to revoke */
  impersonationId: string;
  /** Reason for stopping (written to audit log, not to session row — schema constraint) */
  reason: string;
}

export interface ImpersonationSessionStatus {
  impersonationId: string;
  adminId: string;
  orgId: string;
  startedAt: Date;
  expiresAt: Date;
  endedAt: Date | null;
  /** true if not ended and not expired */
  active: boolean;
}
