import React, { useState } from 'react';
import { Save, History, CheckCircle2, Layers, Table, Edit3, Globe, Share2, Target, AlertCircle } from 'lucide-react';
import { BriefRecord, ServiceType } from '../types/database';

interface DynamicBriefFormProps {
  clientId: string;
  clientName: string;
  serviceType: ServiceType;
  existingBrief?: BriefRecord;
  currentUserId: string;
  onSaveBrief: (briefData: {
    client_id: string;
    service_type: ServiceType;
    fields: Record<string, any>;
    version: number;
    submitted_by: string;
  }) => Promise<void>;
}

export const DynamicBriefForm: React.FC<DynamicBriefFormProps> = ({
  clientId,
  clientName,
  serviceType,
  existingBrief,
  currentUserId,
  onSaveBrief,
}) => {
  const [activeView, setActiveView] = useState<'edit' | 'spreadsheet'>('edit');
  const [formData, setFormData] = useState<Record<string, any>>(existingBrief?.fields || {});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const currentVersion = existingBrief?.version || 1;

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg('');
    setSaveSuccess(false);

    try {
      await onSaveBrief({
        client_id: clientId,
        service_type: serviceType,
        fields: formData,
        version: existingBrief ? currentVersion + 1 : 1,
        submitted_by: currentUserId,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'An error occurred while saving the brief');
    } finally {
      setIsSaving(false);
    }
  };

  const renderServiceIcon = () => {
    switch (serviceType) {
      case 'seo':
        return <Globe className="w-4 h-4 text-emerald-400" />;
      case 'social_media':
        return <Share2 className="w-4 h-4 text-purple-400" />;
      case 'media_buying':
        return <Target className="w-4 h-4 text-amber-400" />;
      default:
        return <Layers className="w-4 h-4 text-stone-400" />;
    }
  };

  const getServiceLabel = () => {
    switch (serviceType) {
      case 'seo':
        return 'Search Engine Optimization (SEO)';
      case 'social_media':
        return 'Social Media Management';
      case 'media_buying':
        return 'Paid Advertising (Media Buying)';
      default:
        return serviceType;
    }
  };

  return (
    <div
      className="rounded-[18px] p-5 shadow-lg relative overflow-hidden"
      style={{
        background: 'var(--gradient-card)',
        border: '1px solid var(--border-medium)',
      }}
    >
      {/* Header with Switcher between Edit Form and Spreadsheet View */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b" style={{ borderColor: 'var(--border-soft)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(123, 47, 247, 0.2)', border: '1px solid var(--border-soft)' }}
          >
            {renderServiceIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm" style={{ color: 'var(--white)' }}>
                Brief Form: {getServiceLabel()}
              </h4>
              <span
                className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
                style={{
                  background: 'rgba(185, 140, 240, 0.15)',
                  color: 'var(--purple-light)',
                  border: '1px solid var(--border-lilac)',
                }}
              >
                Version v{currentVersion}
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--grey)' }}>
              Client: {clientName} — filled in by the Account Manager (AM Agent)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="flex p-1 rounded-xl"
            style={{ background: 'rgba(10, 10, 13, 0.8)', border: '1px solid var(--border-soft)' }}
          >
            <button
              onClick={() => setActiveView('edit')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                activeView === 'edit'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Form
            </button>
            <button
              onClick={() => setActiveView('spreadsheet')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                activeView === 'spreadsheet'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              Spreadsheet View
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md"
            style={{
              background: 'var(--gradient-badge)',
              color: 'var(--white)',
              border: '1px solid var(--border-strong)',
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving...' : 'Save as New Version'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div
          className="p-3 mb-4 rounded-xl text-xs flex items-center gap-2"
          style={{ background: 'rgba(245, 163, 163, 0.15)', border: '1px solid var(--roas-bad)', color: 'var(--roas-bad)' }}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {saveSuccess && (
        <div
          className="p-3 mb-4 rounded-xl text-xs flex items-center gap-2"
          style={{ background: 'rgba(169, 245, 193, 0.15)', border: '1px solid var(--roas-good)', color: 'var(--roas-good)' }}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Brief saved and documented successfully (Version v{existingBrief ? currentVersion + 1 : 1})
        </div>
      )}

      {/* VIEW 1: Dynamic Form per Service Type */}
      {activeView === 'edit' && (
        <div className="space-y-4">
          {serviceType === 'seo' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--lilac)' }}>
                  Website URL
                </label>
                <input
                  type="text"
                  placeholder="https://example.com"
                  value={formData.website_url || ''}
                  onChange={(e) => handleFieldChange('website_url', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                  style={{
                    background: 'rgba(10, 10, 13, 0.85)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--white)',
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--lilac)' }}>
                  CMS Platform
                </label>
                <input
                  type="text"
                  placeholder="Example: WordPress, Shopify, Next.js, Custom PHP..."
                  value={formData.cms_platform || ''}
                  onChange={(e) => handleFieldChange('cms_platform', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                  style={{
                    background: 'rgba(10, 10, 13, 0.85)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--white)',
                  }}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--lilac)' }}>
                  Target Keywords
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter keywords separated by commas or new lines..."
                  value={formData.target_keywords || ''}
                  onChange={(e) => handleFieldChange('target_keywords', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                  style={{
                    background: 'rgba(10, 10, 13, 0.85)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--white)',
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--lilac)' }}>
                  Geo-Targeting
                </label>
                <input
                  type="text"
                  placeholder="Example: Saudi Arabia (Riyadh, Jeddah), UAE..."
                  value={formData.target_locations || ''}
                  onChange={(e) => handleFieldChange('target_locations', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                  style={{
                    background: 'rgba(10, 10, 13, 0.85)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--white)',
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--lilac)' }}>
                  Current Organic Traffic (Estimated)
                </label>
                <input
                  type="text"
                  placeholder="Example: 5,000 visitors/month"
                  value={formData.current_organic_traffic || ''}
                  onChange={(e) => handleFieldChange('current_organic_traffic', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                  style={{
                    background: 'rgba(10, 10, 13, 0.85)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--white)',
                  }}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--lilac)' }}>
                  Competitor URLs
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter competitor URLs..."
                  value={formData.competitor_urls || ''}
                  onChange={(e) => handleFieldChange('competitor_urls', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                  style={{
                    background: 'rgba(10, 10, 13, 0.85)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--white)',
                  }}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--lilac)' }}>
                  Primary Goals
                </label>
                <textarea
                  rows={2}
                  placeholder="What outcomes were agreed upon with the client?"
                  value={formData.primary_goals || ''}
                  onChange={(e) => handleFieldChange('primary_goals', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                  style={{
                    background: 'rgba(10, 10, 13, 0.85)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--white)',
                  }}
                />
              </div>
            </div>
          )}

          {serviceType === 'social_media' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--lilac)' }}>
                  Social Channels
                </label>
                <input
                  type="text"
                  placeholder="Example: Instagram, TikTok, LinkedIn, X"
                  value={Array.isArray(formData.social_channels) ? formData.social_channels.join(', ') : formData.social_channels || ''}
                  onChange={(e) => handleFieldChange('social_channels', e.target.value.split(',').map((s) => s.trim()))}
                  className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                  style={{
                    background: 'rgba(10, 10, 13, 0.85)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--white)',
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--lilac)' }}>
                  Tone of Voice
                </label>
                <input
                  type="text"
                  placeholder="Example: Premium and elegant, friendly and playful, formal and informative..."
                  value={formData.brand_tone || ''}
                  onChange={(e) => handleFieldChange('brand_tone', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                  style={{
                    background: 'rgba(10, 10, 13, 0.85)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--white)',
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--lilac)' }}>
                  Target Weekly Posting Frequency
                </label>
                <input
                  type="text"
                  placeholder="Example: 5 posts + 1 reel + daily stories"
                  value={formData.posting_frequency || ''}
                  onChange={(e) => handleFieldChange('posting_frequency', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                  style={{
                    background: 'rgba(10, 10, 13, 0.85)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--white)',
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--lilac)' }}>
                  Brand & Content Assets Link (Google Drive / Assets)
                </label>
                <input
                  type="text"
                  placeholder="https://drive.google.com/..."
                  value={formData.assets_drive_link || ''}
                  onChange={(e) => handleFieldChange('assets_drive_link', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                  style={{
                    background: 'rgba(10, 10, 13, 0.85)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--white)',
                  }}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--lilac)' }}>
                  Target Demographics
                </label>
                <textarea
                  rows={2}
                  placeholder="Precise description of the target segment and their interests..."
                  value={formData.target_demographics || ''}
                  onChange={(e) => handleFieldChange('target_demographics', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                  style={{
                    background: 'rgba(10, 10, 13, 0.85)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--white)',
                  }}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--lilac)' }}>
                  Content Pillars
                </label>
                <textarea
                  rows={2}
                  placeholder="Example: Educational (40%), promotional (30%), interactive & contests (30%)"
                  value={formData.content_pillars || ''}
                  onChange={(e) => handleFieldChange('content_pillars', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                  style={{
                    background: 'rgba(10, 10, 13, 0.85)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--white)',
                  }}
                />
              </div>
            </div>
          )}

          {serviceType === 'media_buying' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--lilac)' }}>
                  Ad Platforms
                </label>
                <input
                  type="text"
                  placeholder="Example: Meta Ads, Google Ads, TikTok, Snapchat"
                  value={Array.isArray(formData.ad_platforms) ? formData.ad_platforms.join(', ') : formData.ad_platforms || ''}
                  onChange={(e) => handleFieldChange('ad_platforms', e.target.value.split(',').map((s) => s.trim()))}
                  className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                  style={{
                    background: 'rgba(10, 10, 13, 0.85)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--white)',
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--lilac)' }}>
                  Ad Spend Budget (Monthly)
                </label>
                <input
                  type="text"
                  placeholder="Example: SAR 40,000/month"
                  value={formData.monthly_ad_budget || ''}
                  onChange={(e) => handleFieldChange('monthly_ad_budget', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                  style={{
                    background: 'rgba(10, 10, 13, 0.85)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--white)',
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--lilac)' }}>
                  Target ROAS
                </label>
                <input
                  type="text"
                  placeholder="Example: 3.5x or 4.0x"
                  value={formData.target_roas || ''}
                  onChange={(e) => handleFieldChange('target_roas', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                  style={{
                    background: 'rgba(10, 10, 13, 0.85)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--white)',
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--lilac)' }}>
                  Primary Conversion Goal
                </label>
                <input
                  type="text"
                  placeholder="Example: Store sales, WhatsApp messages, qualified leads..."
                  value={formData.primary_conversion_goal || ''}
                  onChange={(e) => handleFieldChange('primary_conversion_goal', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                  style={{
                    background: 'rgba(10, 10, 13, 0.85)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--white)',
                  }}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--lilac)' }}>
                  Pixel & Ad Accounts Access
                </label>
                <input
                  type="text"
                  placeholder="Example: Business Manager partnership sent, pixel is active on the store"
                  value={formData.ad_accounts_access_status || ''}
                  onChange={(e) => handleFieldChange('ad_accounts_access_status', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                  style={{
                    background: 'rgba(10, 10, 13, 0.85)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--white)',
                  }}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--lilac)' }}>
                  Audience Details & Demographic Targeting
                </label>
                <textarea
                  rows={2}
                  placeholder="Interests, exclusions, Lookalike audiences needed..."
                  value={formData.target_audiences || ''}
                  onChange={(e) => handleFieldChange('target_audiences', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                  style={{
                    background: 'rgba(10, 10, 13, 0.85)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--white)',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: Spreadsheet Tabular Review View */}
      {activeView === 'spreadsheet' && (
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-soft)' }}>
          <table className="w-full text-right text-xs">
            <thead>
              <tr style={{ background: 'rgba(59, 21, 96, 0.4)', borderBottom: '1px solid var(--border-soft)' }}>
                <th className="p-3 font-bold" style={{ color: 'var(--purple-light)', width: '30%' }}>
                  Field
                </th>
                <th className="p-3 font-bold" style={{ color: 'var(--white)' }}>
                  Recorded Value
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'rgba(123, 47, 247, 0.15)' }}>
              {Object.keys(formData).length === 0 ? (
                <tr>
                  <td colSpan={2} className="p-6 text-center text-stone-400">
                    No data entered yet for this brief. Switch to "Edit Form" to fill in the fields.
                  </td>
                </tr>
              ) : (
                Object.entries(formData).map(([key, value]) => (
                  <tr key={key} className="hover:bg-purple-950/20 transition-colors">
                    <td className="p-3 font-medium font-mono text-[11px]" style={{ color: 'var(--lilac)' }}>
                      {key}
                    </td>
                    <td className="p-3" style={{ color: 'var(--white)' }}>
                      {Array.isArray(value) ? (
                        <div className="flex flex-wrap gap-1">
                          {value.map((item, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md text-[10px]"
                              style={{ background: 'rgba(123, 47, 247, 0.25)', color: 'var(--purple-light)' }}
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : typeof value === 'object' ? (
                        <pre className="text-[10px] text-stone-300 font-mono">{JSON.stringify(value, null, 2)}</pre>
                      ) : (
                        <span className="leading-relaxed whitespace-pre-wrap">{String(value || '—')}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
