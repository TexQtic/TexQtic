import React, { useEffect, useMemo, useState } from 'react';
import type { TenantConfig } from '../../types';
import { APIError } from '../../services/apiClient';
import {
  getTenantProfile,
  updateBranding,
  updateTenantProfile,
  uploadTenantLogo,
  type TenantProfileResponse,
  type UpdateTenantProfileRequest,
} from '../../services/tenantService';
import { CertificationDocumentsWidget } from './CertificationDocumentsWidget';

interface B2BProfileSettingsProps {
  tenant: TenantConfig;
  onDisplayNameUpdated?: (displayName: string) => void;
}

type CompanySizeBand = Exclude<UpdateTenantProfileRequest['companySizeBand'], null | undefined>;
type CapacityBand = Exclude<UpdateTenantProfileRequest['capacityBand'], null | undefined>;

interface EditableProfileFormState {
  displayName: string;
  tagline: string;
  description: string;
  websiteUrl: string;
  businessEmail: string;
  phone: string;
  phonePublic: boolean;
  city: string;
  state: string;
  companySizeBand: CompanySizeBand | '';
  capacityBand: CapacityBand | '';
  cinNumber: string;
  udyamNumber: string;
  iecNumber: string;
}

const COMPANY_SIZE_BAND_OPTIONS: Array<{ value: CompanySizeBand; label: string }> = [
  { value: 'MICRO', label: 'Micro (small team)' },
  { value: 'SMALL', label: 'Small' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LARGE', label: 'Large' },
  { value: 'ENTERPRISE', label: 'Enterprise' },
  { value: 'NOT_DISCLOSED', label: 'Not disclosed' },
];

const CAPACITY_BAND_OPTIONS: Array<{ value: CapacityBand; label: string }> = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'VERY_HIGH', label: 'Very high' },
  { value: 'NOT_DISCLOSED', label: 'Not disclosed' },
];

const COMPANY_SIZE_BAND_VALUES = new Set(COMPANY_SIZE_BAND_OPTIONS.map(option => option.value));
const CAPACITY_BAND_VALUES = new Set(CAPACITY_BAND_OPTIONS.map(option => option.value));

const toOptionalText = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isUrlLike = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const isEmailLike = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const getLabelForCompanySizeBand = (value: string | null): string => {
  if (!value) {
    return 'Not set';
  }

  return COMPANY_SIZE_BAND_OPTIONS.find(option => option.value === value)?.label ?? value;
};

const getLabelForCapacityBand = (value: string | null): string => {
  if (!value) {
    return 'Not set';
  }

  return CAPACITY_BAND_OPTIONS.find(option => option.value === value)?.label ?? value;
};

const maskGstin = (value: string | null): string => {
  if (!value) {
    return 'Not available';
  }

  const trimmed = value.trim();
  if (trimmed.length <= 8) {
    return trimmed;
  }

  const visiblePrefix = trimmed.slice(0, 4);
  const visibleSuffix = trimmed.slice(-4);
  return `${visiblePrefix}${'*'.repeat(Math.max(trimmed.length - 8, 2))}${visibleSuffix}`;
};

const createFormStateFromProfile = (profile: TenantProfileResponse['profile']): EditableProfileFormState => {
  return {
    displayName: profile.displayName,
    tagline: profile.tagline ?? '',
    description: profile.description ?? '',
    websiteUrl: profile.websiteUrl ?? '',
    businessEmail: profile.businessEmail ?? '',
    phone: profile.phone ?? '',
    phonePublic: profile.phonePublic,
    city: profile.city ?? '',
    state: profile.state ?? '',
    companySizeBand: (profile.companySizeBand as CompanySizeBand | null) ?? '',
    capacityBand: (profile.capacityBand as CapacityBand | null) ?? '',
    cinNumber: profile.cinNumber ?? '',
    udyamNumber: profile.udyamNumber ?? '',
    iecNumber: profile.iecNumber ?? '',
  };
};

const createPayloadFromForm = (form: EditableProfileFormState): UpdateTenantProfileRequest => {
  return {
    displayName: form.displayName.trim(),
    tagline: toOptionalText(form.tagline),
    description: toOptionalText(form.description),
    websiteUrl: toOptionalText(form.websiteUrl),
    businessEmail: toOptionalText(form.businessEmail),
    phone: toOptionalText(form.phone),
    phonePublic: form.phonePublic,
    city: toOptionalText(form.city),
    state: toOptionalText(form.state),
    companySizeBand: form.companySizeBand || null,
    capacityBand: form.capacityBand || null,
    cinNumber: toOptionalText(form.cinNumber),
    udyamNumber: toOptionalText(form.udyamNumber),
    iecNumber: toOptionalText(form.iecNumber),
  };
};

const createPayloadFromProfile = (profile: TenantProfileResponse['profile']): UpdateTenantProfileRequest => {
  return {
    displayName: profile.displayName.trim(),
    tagline: profile.tagline,
    description: profile.description,
    websiteUrl: profile.websiteUrl,
    businessEmail: profile.businessEmail,
    phone: profile.phone,
    phonePublic: profile.phonePublic,
    city: profile.city,
    state: profile.state,
    companySizeBand: (profile.companySizeBand as CompanySizeBand | null) ?? null,
    capacityBand: (profile.capacityBand as CapacityBand | null) ?? null,
    cinNumber: profile.cinNumber,
    udyamNumber: profile.udyamNumber,
    iecNumber: profile.iecNumber,
  };
};

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
  const [form, setForm] = useState<EditableProfileFormState>({
    displayName: tenant.name,
    tagline: '',
    description: '',
    websiteUrl: '',
    businessEmail: '',
    phone: '',
    phonePublic: false,
    city: '',
    state: '',
    companySizeBand: '',
    capacityBand: '',
    cinNumber: '',
    udyamNumber: '',
    iecNumber: '',
  });

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await getTenantProfile();
        if (!mounted) return;

        setProfile(response.profile);
        setForm(createFormStateFromProfile(response.profile));
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
  const draftPayload = useMemo(() => createPayloadFromForm(form), [form]);
  const hasUnsavedChanges = useMemo(() => {
    if (!profile) {
      return false;
    }

    return JSON.stringify(draftPayload) !== JSON.stringify(createPayloadFromProfile(profile));
  }, [draftPayload, profile]);

  const profileCompleteness = useMemo(() => {
    const checks = [
      Boolean(resolvedDisplayName.trim()),
      Boolean(resolvedLogoUrl),
      Boolean((profile?.tagline ?? '').trim()),
      Boolean((profile?.description ?? '').trim()),
      Boolean((profile?.websiteUrl ?? '').trim()),
      Boolean((profile?.city ?? '').trim() && (profile?.state ?? '').trim()),
      Boolean(profile?.companySizeBand),
      Boolean(profile?.capacityBand),
      Boolean((profile?.businessEmail ?? '').trim() || (profile?.phone ?? '').trim()),
      true,
    ];

    const completeChecks = checks.filter(Boolean).length;
    return {
      completeChecks,
      totalChecks: checks.length,
      label: completeChecks === checks.length ? 'Rich profile launch-ready baseline complete' : 'Rich profile launch baseline in progress',
    };
  }, [
    resolvedDisplayName,
    resolvedLogoUrl,
    profile?.tagline,
    profile?.description,
    profile?.websiteUrl,
    profile?.city,
    profile?.state,
    profile?.companySizeBand,
    profile?.capacityBand,
    profile?.businessEmail,
    profile?.phone,
  ]);

  const descriptionLength = form.description.trim().length;

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

  const handleManageCertifications = () => {
    const shellButtons = Array.from(document.querySelectorAll('button'));
    const certificationsButton = shellButtons.find(button => {
      const label = button.textContent?.trim().toLowerCase() ?? '';
      return label.includes('certifications') && !label.includes('manage all');
    });

    if (certificationsButton) {
      certificationsButton.click();
      return;
    }

    setError('Use the workspace navigation Certifications entry for full lifecycle management.');
  };

  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // Override success state to show inline badge for longer
  const handleSaveInternal = async () => {
    if (!canEdit) {
      return;
    }

    const nextDisplayName = form.displayName.trim();
    if (!nextDisplayName) {
      setError('Company name cannot be empty.');
      return;
    }

    if (descriptionLength > 2000) {
      setError('Description must be 2000 characters or fewer.');
      return;
    }

    const websiteUrl = toOptionalText(form.websiteUrl);
    if (websiteUrl && !isUrlLike(websiteUrl)) {
      setError('Website URL must start with http:// or https:// and be a valid URL.');
      return;
    }

    const businessEmail = toOptionalText(form.businessEmail);
    if (businessEmail && !isEmailLike(businessEmail)) {
      setError('Business email must be a valid email address.');
      return;
    }

    if (form.companySizeBand && !COMPANY_SIZE_BAND_VALUES.has(form.companySizeBand)) {
      setError('Company size selection is invalid.');
      return;
    }

    if (form.capacityBand && !CAPACITY_BAND_VALUES.has(form.capacityBand)) {
      setError('Capacity selection is invalid.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    setShowSaveSuccess(false);

    try {
      const response = await updateTenantProfile(draftPayload);

      setProfile(response.profile);
      setForm(createFormStateFromProfile(response.profile));
      onDisplayNameUpdated?.(response.profile.displayName);
      setSuccess('Company profile updated.');
      setShowSaveSuccess(true);

      globalThis.setTimeout(() => setSuccess(null), 3000);
      globalThis.setTimeout(() => setShowSaveSuccess(false), 5000);
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-4">
        <div className="space-y-3">
          <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-600">
            Company Profile
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Company Profile</h1>
          <p className="text-base leading-7 text-slate-600 max-w-3xl">
            Manage the supplier identity used inside TexQtic. Public profile projection remains controlled separately and launched in a future phase.
          </p>
        </div>
      </section>

      {/* Profile Preview Section */}
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-4">Profile Preview</div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <span>Loading company profile...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Logo and Identity */}
            <div className="flex flex-col items-center gap-6">
              <div className="h-32 w-32 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                {resolvedLogoUrl ? (
                  <img
                    src={resolvedLogoUrl}
                    alt="Company logo"
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <div className="text-slate-400 text-sm text-center px-4">Logo not set</div>
                )}
              </div>

              <div className="text-center space-y-2 max-w-2xl">
                <h2 className="text-2xl font-bold text-slate-900">{resolvedDisplayName}</h2>
                {(profile?.tagline ?? '').trim() ? (
                  <p className="text-base italic text-slate-700">{profile?.tagline}</p>
                ) : (
                  <p className="text-base text-slate-400 italic">Tagline not set</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="text-center space-y-2">
              <div className="text-sm leading-6 text-slate-700 max-w-2xl mx-auto">
                {(profile?.description ?? '').trim() ? (
                  <p>{(profile?.description ?? '').substring(0, 250)}{((profile?.description ?? '').length > 250 ? '...' : '')}</p>
                ) : (
                  <p className="text-slate-400">No business description provided yet</p>
                )}
              </div>
            </div>

            {/* Location and Web */}
            <div className="flex flex-col items-center gap-4">
              {(profile?.city ?? '').trim() || (profile?.state ?? '').trim() ? (
                <div className="text-sm text-slate-600">
                  📍 {[profile?.city?.trim(), profile?.state?.trim()].filter(Boolean).join(', ')}
                </div>
              ) : (
                <div className="text-sm text-slate-400">Location not set</div>
              )}

              {(profile?.websiteUrl ?? '').trim() ? (
                <div className="text-sm">
                  <a
                    href={profile?.websiteUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    🔗 {profile?.websiteUrl}
                  </a>
                </div>
              ) : (
                <div className="text-sm text-slate-400">Website not set</div>
              )}
            </div>

            {/* Badges and Summary */}
            <div className="flex flex-wrap gap-3 justify-center pt-4 border-t border-slate-200">
              {profile?.companySizeBand && (
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  Size: {getLabelForCompanySizeBand(profile.companySizeBand)}
                </div>
              )}
              {profile?.capacityBand && (
                <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                  Capacity: {getLabelForCapacityBand(profile.capacityBand)}
                </div>
              )}
              {profile?.gstVerified && (
                <div className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  ✓ GST Verified
                </div>
              )}
              {profile?.publicationPosture === 'B2B_PUBLIC' && (
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Public Ready
                </div>
              )}
            </div>

            {/* Certification Summary */}
            {profile && (
              <div className="text-xs text-center text-slate-600 pt-2 border-t border-slate-200">
                Profile contains private business details and compliance identifiers. Public rich profile projection is managed separately.
              </div>
            )}
          </div>
        )}
      </section>

      {/* Manage Details Section - Only for canEdit users */}
      {canEdit && (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Manage Details</div>
              <p className="text-sm text-slate-600">Edit company profile information. Changes are saved directly to the workspace profile.</p>
            </div>

            {/* Profile Status */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Profile Status</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{profileCompleteness.label}</div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {profileCompleteness.completeChecks}/{profileCompleteness.totalChecks} rich launch-profile checks complete.
              </p>
            </div>
          </div>

          {/* Error and Success Messages */}
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center justify-between">
              <span>{success}</span>
              {showSaveSuccess && <span className="text-xs font-semibold">✓ All changes saved</span>}
            </div>
          )}

          {/* Form Sections */}
          <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Company Name</div>
            <input
              type="text"
              value={form.displayName}
              onChange={event => setForm(current => ({ ...current, displayName: event.target.value }))}
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

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3 md:col-span-2">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Business Introduction</div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600">Tagline</label>
                <input
                  type="text"
                  value={form.tagline}
                  onChange={event => setForm(current => ({ ...current, tagline: event.target.value }))}
                  disabled={loading || !canEdit || saving}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                  placeholder="One-line company positioning"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600">Description</label>
                <textarea
                  value={form.description}
                  onChange={event => setForm(current => ({ ...current, description: event.target.value }))}
                  disabled={loading || !canEdit || saving}
                  rows={5}
                  maxLength={2200}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                  placeholder="Describe capabilities, specialization, and buyer-fit signals (max 2000 characters)."
                />
                <p className="text-xs text-slate-500">
                  {Math.min(descriptionLength, 2000)}/2000 characters used.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Location &amp; Web Presence</div>
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600">Website URL</label>
                <input
                  type="url"
                  value={form.websiteUrl}
                  onChange={event => setForm(current => ({ ...current, websiteUrl: event.target.value }))}
                  disabled={loading || !canEdit || saving}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                  placeholder="https://example.com"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-600">City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={event => setForm(current => ({ ...current, city: event.target.value }))}
                    disabled={loading || !canEdit || saving}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-600">State</label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={event => setForm(current => ({ ...current, state: event.target.value }))}
                    disabled={loading || !canEdit || saving}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                    placeholder="State"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Website may appear on public surfaces later after publication approvals. It is not publicly projected in this phase.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Buyer Contact Preferences</div>
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600">Business Email</label>
                <input
                  type="email"
                  value={form.businessEmail}
                  onChange={event => setForm(current => ({ ...current, businessEmail: event.target.value }))}
                  disabled={loading || !canEdit || saving}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                  placeholder="hello@company.com"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={event => setForm(current => ({ ...current, phone: event.target.value }))}
                  disabled={loading || !canEdit || saving}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                  placeholder="Primary inquiry phone"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.phonePublic}
                  onChange={event => setForm(current => ({ ...current, phonePublic: event.target.checked }))}
                  disabled={loading || !canEdit || saving}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Capture phone as future public-display preference
              </label>
            </div>
            <p className="text-xs text-slate-500">
              Email and phone are used for tenant-auth and inquiry workflows only in this phase. They are not public yet.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Scale &amp; Capability Signals</div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600">Company Size Band</label>
                <select
                  value={form.companySizeBand}
                  onChange={event => setForm(current => ({ ...current, companySizeBand: event.target.value as CompanySizeBand | '' }))}
                  disabled={loading || !canEdit || saving}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="">Select size band</option>
                  {COMPANY_SIZE_BAND_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600">Capacity Band</label>
                <select
                  value={form.capacityBand}
                  onChange={event => setForm(current => ({ ...current, capacityBand: event.target.value as CapacityBand | '' }))}
                  disabled={loading || !canEdit || saving}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="">Select capacity band</option>
                  {CAPACITY_BAND_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Compliance Identifiers</div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600">CIN Number (optional)</label>
                <input
                  type="text"
                  value={form.cinNumber}
                  onChange={event => setForm(current => ({ ...current, cinNumber: event.target.value }))}
                  disabled={loading || !canEdit || saving}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600">Udyam Number (optional)</label>
                <input
                  type="text"
                  value={form.udyamNumber}
                  onChange={event => setForm(current => ({ ...current, udyamNumber: event.target.value }))}
                  disabled={loading || !canEdit || saving}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600">IEC Number (optional)</label>
                <input
                  type="text"
                  value={form.iecNumber}
                  onChange={event => setForm(current => ({ ...current, iecNumber: event.target.value }))}
                  disabled={loading || !canEdit || saving}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 space-y-1">
              <div><span className="font-semibold">GSTIN:</span> {maskGstin(profile?.gstin ?? null)}</div>
              <div><span className="font-semibold">GST Verified:</span> {profile?.gstVerified ? 'Yes' : 'No'}</div>
              <div><span className="font-semibold">GST Verification Status:</span> {profile?.gstVerificationStatus ?? 'Not set'}</div>
            </div>
            <p className="text-xs text-slate-500">
              GST and publication postures are system-controlled and read-only in Company Profile.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 md:col-span-2">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Public Readiness Status</div>
            <div className="mt-3 grid gap-3 md:grid-cols-2 text-sm text-slate-700">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs text-slate-500 uppercase tracking-[0.14em]">Publication Posture</div>
                <div className="mt-1 font-semibold">{profile?.publicationPosture ?? 'Not set'}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs text-slate-500 uppercase tracking-[0.14em]">Public Eligibility</div>
                <div className="mt-1 font-semibold">{profile?.publicEligibilityPosture ?? 'Not set'}</div>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Certificate documents remain private and are never publicly exposed. Phone public preference is captured now for future policy-controlled display.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveInternal}
            disabled={loading || saving || uploadingLogo || !canEdit || !hasUnsavedChanges}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            title={!hasUnsavedChanges ? "No changes to save" : ""}
          >
            {saving ? 'Saving...' : 'Save Company Profile'}
          </button>
          {!hasUnsavedChanges && !saving && (
            <span className="text-xs text-slate-500">No changes to save</span>
          )}
        </div>
      </section>
      )}

      {/* Certification Widget */}
      <CertificationDocumentsWidget
        canEdit={canEdit}
        onManageCertifications={handleManageCertifications}
      />
    </div>
  );
};
