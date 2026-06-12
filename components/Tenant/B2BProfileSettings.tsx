import React, { useEffect, useMemo, useState } from 'react';
import type { TenantConfig } from '../../types';
import { APIError } from '../../services/apiClient';
import {
  getTenantProfile,
  updateBranding,
  updateTenantProfile,
  uploadTenantLogo,
  type TenantProfileResponse,
} from '../../services/tenantService';

interface B2BProfileSettingsProps {
  tenant: TenantConfig;
  onDisplayNameUpdated?: (displayName: string) => void;
}

export const B2BProfileSettings: React.FC<B2BProfileSettingsProps> = ({
  tenant,
  onDisplayNameUpdated,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profile, setProfile] = useState<TenantProfileResponse['profile'] | null>(null);
  const [displayNameDraft, setDisplayNameDraft] = useState(tenant.name);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await getTenantProfile();
        if (!mounted) return;

        setProfile(response.profile);
        setDisplayNameDraft(response.profile.displayName);
      } catch (err) {
        if (!mounted) return;

        if (err instanceof APIError) {
          setError(err.message);
        } else {
          setError('Unable to load company profile at the moment.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const resolvedDisplayName = profile?.displayName ?? tenant.name;
  const resolvedLogoUrl = profile?.logoUrl ?? (tenant.theme.logo?.startsWith('http') ? tenant.theme.logo : null);
  const canEdit = profile?.canEdit ?? false;
  const hasUnsavedChanges = displayNameDraft.trim() !== resolvedDisplayName.trim();

  const profileCompleteness = useMemo(() => {
    const checks = [
      Boolean(resolvedDisplayName.trim()),
      Boolean(resolvedLogoUrl),
      (profile?.secondarySegmentKeys.length ?? tenant.secondary_segment_keys?.length ?? 0) > 0,
    ];

    const completeChecks = checks.filter(Boolean).length;
    return {
      completeChecks,
      totalChecks: checks.length,
      label: completeChecks === checks.length ? 'Profile baseline complete' : 'Profile baseline in progress',
    };
  }, [resolvedDisplayName, resolvedLogoUrl, profile?.secondarySegmentKeys.length, tenant.secondary_segment_keys?.length]);

  const handleSave = async () => {
    const nextDisplayName = displayNameDraft.trim();
    if (!nextDisplayName) {
      setError('Company name cannot be empty.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await updateTenantProfile({
        displayName: nextDisplayName,
      });

      setProfile(response.profile);
      setDisplayNameDraft(response.profile.displayName);
      onDisplayNameUpdated?.(response.profile.displayName);
      setSuccess('Company profile updated.');

      globalThis.setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Failed to update company profile. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File | null) => {
    if (!file) {
      return;
    }

    const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowedMimeTypes.has(file.type)) {
      setError('Only JPG, PNG, and WEBP files are allowed.');
      return;
    }

    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError('File exceeds 2 MB upload limit.');
      return;
    }

    setUploadingLogo(true);
    setError(null);
    setSuccess(null);

    try {
      const uploadResult = await uploadTenantLogo(file);
      const brandingResult = await updateBranding({ logoUrl: uploadResult.logoUrl });

      setProfile(current => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          logoUrl: brandingResult.branding.logoUrl ?? uploadResult.logoUrl,
        };
      });

      setSuccess('Company logo uploaded and saved.');
      globalThis.setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Failed to upload logo. Please try again.');
      }
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-600">
              Company Profile
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Company Profile</h1>
            <p className="text-base leading-7 text-slate-600">
              Manage normal B2B company identity details for this workspace. White-label storefront branding remains separate.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 xl:max-w-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Profile status</div>
            <div className="mt-2 text-lg font-semibold text-slate-900">{profileCompleteness.label}</div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {profileCompleteness.completeChecks}/{profileCompleteness.totalChecks} baseline identity checks complete.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Company Name</div>
            <input
              type="text"
              value={displayNameDraft}
              onChange={event => setDisplayNameDraft(event.target.value)}
              disabled={loading || !canEdit || saving}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
              placeholder="Enter company display name"
            />
            <p className="text-xs text-slate-500">
              Used for workspace identity and B2B supplier directory display.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Company Logo</div>
            {resolvedLogoUrl ? (
              <div className="h-16 w-24 rounded-xl border border-slate-200 bg-white p-2">
                <img
                  src={resolvedLogoUrl}
                  alt="Company logo"
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="h-16 w-16 rounded-xl border border-dashed border-slate-300 bg-white grid place-items-center text-slate-400 text-xs">
                No Logo
              </div>
            )}
            {canEdit ? (
              <div className="space-y-2">
                <label htmlFor="company-logo-upload" className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Upload Logo
                </label>
                <input
                  id="company-logo-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={loading || saving || uploadingLogo}
                  onChange={event => {
                    const selectedFile = event.target.files?.[0] ?? null;
                    void handleLogoUpload(selectedFile);
                    event.currentTarget.value = '';
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
                />
                <p className="text-xs text-slate-500">
                  JPG, PNG, or WEBP only. Maximum file size: 2 MB.
                </p>
                {uploadingLogo && <p className="text-xs text-slate-600">Uploading logo...</p>}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                OWNER or ADMIN role is required to upload a company logo.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Tenant Identity</div>
            <div className="mt-3 space-y-1 text-sm text-slate-700">
              <div><span className="font-semibold">Slug:</span> {profile?.slug ?? tenant.slug}</div>
              <div><span className="font-semibold">Type:</span> {profile?.tenantType ?? tenant.type}</div>
              <div><span className="font-semibold">Status:</span> {profile?.status ?? tenant.status}</div>
              <div><span className="font-semibold">Plan:</span> {profile?.plan ?? (tenant.commercial_plan ?? tenant.plan)}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Access Model</div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Profile read is available to authenticated tenant users. Profile update is limited to OWNER and ADMIN roles.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving || uploadingLogo || !canEdit || !hasUnsavedChanges}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? 'Saving...' : 'Save Company Profile'}
          </button>
          {!canEdit && !loading && (
            <span className="text-xs text-slate-500">OWNER or ADMIN role is required to edit company profile.</span>
          )}
        </div>
      </section>
    </div>
  );
};
