import { ServiceType } from '../types/database';

/**
 * Single source of truth for the per-service brief field list. Both the editable form
 * (DynamicBriefForm.tsx) and the read-only view (ServiceBriefsRoutingView.tsx) render off this —
 * a field added/renamed/removed here shows up correctly in both places automatically.
 */
export type BriefFieldType = 'text' | 'textarea' | 'url' | 'tag-list';

export interface BriefFieldDef {
  key: string;
  label: string;
  type: BriefFieldType;
  placeholder?: string;
  /** Grid column width. Defaults to 'half' (2-up) when omitted. */
  span?: 'full' | 'half';
  /** Textarea row count. Defaults to 2 when omitted. */
  rows?: number;
  /** Read-only display text when the field has no value yet. Defaults to 'Not specified'. */
  fallback?: string;
  /** Read-only value styling (text/textarea/url fields). */
  valueClassName?: string;
  /** Read-only chip styling (tag-list fields only). */
  chipClassName?: string;
}

export const BRIEF_FIELD_SCHEMAS: Record<ServiceType, BriefFieldDef[]> = {
  seo: [
    {
      key: 'website_url',
      label: 'Target Website URL',
      type: 'url',
      placeholder: 'https://example.com',
      span: 'half',
      valueClassName: 'text-xs font-bold text-emerald-300',
    },
    {
      key: 'cms_platform',
      label: 'CMS Platform',
      type: 'text',
      placeholder: 'Example: WordPress, Shopify, Next.js, Custom PHP...',
      span: 'half',
      valueClassName: 'text-xs font-bold text-white',
    },
    {
      key: 'target_keywords',
      label: 'Target Keywords',
      type: 'textarea',
      placeholder: 'Enter keywords separated by commas or new lines...',
      span: 'full',
      valueClassName: 'text-xs text-stone-200 font-mono whitespace-pre-line',
    },
    {
      key: 'target_locations',
      label: 'Geographic Target',
      type: 'text',
      placeholder: 'Example: Saudi Arabia (Riyadh, Jeddah), UAE...',
      span: 'half',
      valueClassName: 'text-xs text-white',
    },
    {
      key: 'current_organic_traffic',
      label: 'Current Organic Traffic (Estimated)',
      type: 'text',
      placeholder: 'Example: 5,000 visitors/month',
      span: 'half',
      fallback: 'N/A',
      valueClassName: 'text-xs font-bold text-purple-300',
    },
    {
      key: 'competitor_urls',
      label: 'Competitor URLs',
      type: 'textarea',
      placeholder: 'Enter competitor URLs...',
      span: 'full',
      valueClassName: 'text-xs text-stone-200 whitespace-pre-line',
    },
    {
      key: 'primary_goals',
      label: 'Primary Campaign Goals',
      type: 'textarea',
      placeholder: 'What outcomes were agreed upon with the client?',
      span: 'full',
      valueClassName: 'text-xs text-stone-200',
    },
  ],
  social_media: [
    {
      key: 'social_channels',
      label: 'Social Channels',
      type: 'tag-list',
      placeholder: 'Example: Instagram, TikTok, LinkedIn, X',
      span: 'full',
      chipClassName: 'bg-pink-950/60 text-pink-300 border-pink-800/40',
    },
    {
      key: 'brand_tone',
      label: 'Brand Voice & Tone',
      type: 'text',
      placeholder: 'Example: Premium and elegant, friendly and playful, formal and informative...',
      span: 'half',
      valueClassName: 'text-xs font-bold text-white',
    },
    {
      key: 'posting_frequency',
      label: 'Posting Frequency',
      type: 'text',
      placeholder: 'Example: 5 posts + 1 reel + daily stories',
      span: 'half',
      fallback: 'Weekly',
      valueClassName: 'text-xs font-bold text-purple-300',
    },
    {
      key: 'assets_drive_link',
      label: 'Brand & Content Assets Link',
      type: 'url',
      placeholder: 'https://drive.google.com/...',
      span: 'full',
      valueClassName: 'text-xs font-bold text-purple-300',
    },
    {
      key: 'target_demographics',
      label: 'Target Demographics',
      type: 'textarea',
      placeholder: 'Precise description of the target segment and their interests...',
      span: 'full',
      valueClassName: 'text-xs text-stone-200',
    },
    {
      key: 'content_pillars',
      label: 'Content Pillars',
      type: 'textarea',
      placeholder: 'Example: Educational (40%), promotional (30%), interactive & contests (30%)',
      span: 'full',
      valueClassName: 'text-xs text-stone-200',
    },
  ],
  media_buying: [
    {
      key: 'ad_platforms',
      label: 'Ad Platforms',
      type: 'tag-list',
      placeholder: 'Example: Meta Ads, Google Ads, TikTok, Snapchat',
      span: 'full',
      chipClassName: 'bg-sky-950/60 text-sky-300 border-sky-800/40',
    },
    {
      key: 'monthly_ad_budget',
      label: 'Monthly Ad Spend Budget',
      type: 'text',
      placeholder: 'Example: SAR 40,000/month',
      span: 'half',
      fallback: 'Custom',
      valueClassName: 'text-sm font-bold text-sky-400 font-mono',
    },
    {
      key: 'target_roas',
      label: 'Target ROAS',
      type: 'text',
      placeholder: 'Example: 3.5x or 4.0x',
      span: 'half',
      fallback: 'N/A',
      valueClassName: 'text-sm font-bold text-emerald-400 font-mono',
    },
    {
      key: 'primary_conversion_goal',
      label: 'Primary Conversion Goal',
      type: 'text',
      placeholder: 'Example: Store sales, WhatsApp messages, qualified leads...',
      span: 'full',
      valueClassName: 'text-xs font-bold text-stone-200',
    },
    {
      key: 'ad_accounts_access_status',
      label: 'Pixel & Ad Accounts Access',
      type: 'text',
      placeholder: 'Example: Business Manager partnership sent, pixel is active on the store',
      span: 'full',
      valueClassName: 'text-xs text-stone-200',
    },
    {
      key: 'target_audiences',
      label: 'Audience Details & Demographic Targeting',
      type: 'textarea',
      placeholder: 'Interests, exclusions, Lookalike audiences needed...',
      span: 'full',
      valueClassName: 'text-xs text-stone-200',
    },
  ],
  creative: [
    {
      key: 'deliverable_types',
      label: 'Deliverable Type(s)',
      type: 'text',
      placeholder: 'e.g. Social static posts, Instagram Reels, brand logo, banner ads',
      span: 'half',
      valueClassName: 'text-xs font-bold text-white',
    },
    {
      key: 'formats_dimensions',
      label: 'Formats & Dimensions',
      type: 'text',
      placeholder: 'e.g. 1080x1080 (IG square), 1920x1080 (YouTube thumb), 9:16 vertical',
      span: 'half',
      valueClassName: 'text-xs font-bold text-purple-300',
    },
    {
      key: 'deliverable_volume',
      label: 'Deliverable Volume / Frequency',
      type: 'text',
      placeholder: 'e.g. 8 static posts + 2 reels per month',
      span: 'full',
      valueClassName: 'text-xs font-bold text-stone-200',
    },
    {
      key: 'brand_guidelines_link',
      label: 'Brand Guidelines / Assets Link',
      type: 'url',
      placeholder: 'https://drive.google.com/... (logo kit, fonts, guideline doc)',
      span: 'half',
      valueClassName: 'text-xs font-bold text-purple-300',
    },
    {
      key: 'visual_references_link',
      label: 'Visual References / Inspiration',
      type: 'url',
      placeholder: 'https://pinterest.com/... or moodboard link',
      span: 'half',
      valueClassName: 'text-xs font-bold text-purple-300',
    },
    {
      key: 'key_message_tone',
      label: 'Key Message & Tone',
      type: 'textarea',
      placeholder: 'What should this creative communicate? Target audience, tone, key message...',
      span: 'full',
      valueClassName: 'text-xs text-stone-200',
    },
    {
      key: 'turnaround_deadline',
      label: 'Turnaround / Deadline Expectations',
      type: 'text',
      placeholder: 'e.g. 3 business days per deliverable',
      span: 'full',
      valueClassName: 'text-xs font-bold text-stone-200',
    },
  ],
};
