import {
  CampaignRecord,
  ClientComparisonDelta,
  ClientComparisonMetrics,
  ClientRecord,
  ComparisonMediaBuyingMetrics,
  ComparisonSeoMetrics,
  ComparisonSocialMetrics,
  ServiceType,
  SocialInsightRecord,
  TaskRecord,
} from '../types/database';
import { getCampaignStartDate, getCampaignEndDate } from '../components/CampaignManagementModule';

// ----------------------------------------------------------------------------
// Period boundaries
// ----------------------------------------------------------------------------

export type ComparisonGranularity = 'monthly' | 'quarterly' | 'yearly';

export interface DateRange {
  start: string; // inclusive, YYYY-MM-DD
  end: string; // inclusive, YYYY-MM-DD
}

export interface ComparisonPeriod {
  label: string; // stored verbatim in client_comparisons.period_current/period_previous
  range: DateRange;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => d.toISOString().split('T')[0];
const inRange = (dateStr: string, range: DateRange) => dateStr >= range.start && dateStr <= range.end;

function monthPeriod(year: number, month0: number): ComparisonPeriod {
  const start = new Date(year, month0, 1);
  const end = new Date(year, month0 + 1, 0);
  return { label: `${year}-${pad2(month0 + 1)}`, range: { start: iso(start), end: iso(end) } };
}

function quarterPeriod(year: number, quarter: number): ComparisonPeriod {
  const start = new Date(year, (quarter - 1) * 3, 1);
  const end = new Date(year, quarter * 3, 0);
  return { label: `${year}-Q${quarter}`, range: { start: iso(start), end: iso(end) } };
}

function yearPeriod(year: number): ComparisonPeriod {
  return { label: `${year}`, range: { start: `${year}-01-01`, end: `${year}-12-31` } };
}

// Builds the current-vs-previous period pair for a preset granularity, anchored to whichever
// month/quarter/year the reference date (default: today) falls in.
export function resolveComparisonPeriods(
  granularity: ComparisonGranularity,
  referenceDate: Date = new Date()
): { current: ComparisonPeriod; previous: ComparisonPeriod } {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth(); // 0-indexed

  if (granularity === 'monthly') {
    const prevMonth0 = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    return { current: monthPeriod(year, month), previous: monthPeriod(prevYear, prevMonth0) };
  }

  if (granularity === 'quarterly') {
    const quarter = Math.floor(month / 3) + 1;
    const prevQuarter = quarter === 1 ? 4 : quarter - 1;
    const prevYear = quarter === 1 ? year - 1 : year;
    return { current: quarterPeriod(year, quarter), previous: quarterPeriod(prevYear, prevQuarter) };
  }

  return { current: yearPeriod(year), previous: yearPeriod(year - 1) };
}

// A caller-supplied arbitrary date range, for the "custom" comparison mode. The label is the
// range itself since there's no calendar-unit name to give it.
export function customPeriod(range: DateRange): ComparisonPeriod {
  return { label: `${range.start}_${range.end}`, range };
}

// ----------------------------------------------------------------------------
// Media Buying: spend, ROAS, conversions, CPA — from CampaignRecord.
// ----------------------------------------------------------------------------
// Campaign rows carry cumulative results for the campaign's whole run, not a per-day time
// series, so "in period X" means "was running during period X" (start/end overlap the range),
// not "logged on a date within X". This is the best available proxy given the schema.
function campaignOverlapsRange(c: CampaignRecord, range: DateRange): boolean {
  const start = getCampaignStartDate(c);
  if (!start) return false;
  const end = getCampaignEndDate(c);
  if (end) return start <= range.end && end >= range.start;
  return start <= range.end; // still running (or single-date row) — active for any period from its start onward
}

export function aggregateMediaBuyingMetrics(
  campaigns: CampaignRecord[],
  clientId: string,
  range: DateRange
): ComparisonMediaBuyingMetrics {
  const scoped = campaigns.filter((c) => c.client_id === clientId && campaignOverlapsRange(c, range));

  const spend = scoped.reduce((sum, c) => sum + (c.spend || 0), 0);
  const conversions = scoped.reduce((sum, c) => {
    const v = c.results?.conversions;
    return sum + (typeof v === 'number' ? v : 0);
  }, 0);

  const roasValues = scoped
    .map((c) => c.results?.roas)
    .filter((v): v is number => typeof v === 'number');
  const roas = roasValues.length ? roasValues.reduce((a, b) => a + b, 0) / roasValues.length : null;

  const cpaValues = scoped
    .map((c) => c.results?.cpa)
    .filter((v): v is number => typeof v === 'number');
  const cpa = cpaValues.length ? cpaValues.reduce((a, b) => a + b, 0) / cpaValues.length : null;

  return { spend, roas, conversions, cpa };
}

// ----------------------------------------------------------------------------
// SEO: no analytics table exists in this schema — this is an operational delivery proxy
// (completed tasks + on-time rate for the client's SEO-team tasks), not a true performance
// metric. Flagged in the reporting plan as a real data gap.
// ----------------------------------------------------------------------------
export function aggregateSeoMetrics(tasks: TaskRecord[], clientId: string, range: DateRange): ComparisonSeoMetrics {
  const completed = tasks.filter(
    (t) => t.client_id === clientId && t.team === 'SEO' && t.status === 'completed' && t.completed_at && inRange(t.completed_at.split('T')[0], range)
  );
  const completed_tasks = completed.length;
  if (completed_tasks === 0) return { completed_tasks, on_time_rate: null };

  const onTime = completed.filter((t) => t.completed_at!.split('T')[0] <= t.due_date).length;
  return { completed_tasks, on_time_rate: Math.round((onTime / completed_tasks) * 100) };
}

// ----------------------------------------------------------------------------
// Social Media: from SocialInsightRecord.metrics — an untyped JSON blob per platform row, so
// every field is pulled defensively (present or not, per row). reach/engagement_rate are
// averaged across the period's rows (rate-like); follower_growth is summed (accumulates).
// ----------------------------------------------------------------------------
function avgMetric(rows: SocialInsightRecord[], key: string): number | null {
  const values = rows.map((r) => r.metrics?.[key]).filter((v): v is number => typeof v === 'number');
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

function sumMetric(rows: SocialInsightRecord[], key: string): number | null {
  const values = rows.map((r) => r.metrics?.[key]).filter((v): v is number => typeof v === 'number');
  return values.length ? values.reduce((a, b) => a + b, 0) : null;
}

export function aggregateSocialMetrics(
  insights: SocialInsightRecord[],
  clientId: string,
  range: DateRange
): ComparisonSocialMetrics {
  const rows = insights.filter((i) => i.client_id === clientId && inRange(i.date, range));
  return {
    reach: avgMetric(rows, 'reach'),
    engagement_rate: avgMetric(rows, 'engagement_rate'),
    follower_growth: sumMetric(rows, 'follower_growth'),
  };
}

// ----------------------------------------------------------------------------
// Full metrics block for a client's period, scoped to whichever services its package includes.
// ----------------------------------------------------------------------------
export function generateClientComparisonMetrics(
  services: ServiceType[],
  clientId: string,
  range: DateRange,
  campaigns: CampaignRecord[],
  tasks: TaskRecord[],
  socialInsights: SocialInsightRecord[]
): ClientComparisonMetrics {
  const metrics: ClientComparisonMetrics = {};
  if (services.includes('media_buying')) metrics.media_buying = aggregateMediaBuyingMetrics(campaigns, clientId, range);
  if (services.includes('seo')) metrics.seo = aggregateSeoMetrics(tasks, clientId, range);
  if (services.includes('social_media')) metrics.social_media = aggregateSocialMetrics(socialInsights, clientId, range);
  return metrics;
}

// ----------------------------------------------------------------------------
// Delta: % change per indicator, current vs. previous. null when either side is
// null/undefined, or when the previous value is 0 and current isn't (an undefined % change).
// ----------------------------------------------------------------------------
function pctDelta(curr: number | null | undefined, prev: number | null | undefined): number | null {
  if (curr === null || curr === undefined || prev === null || prev === undefined) return null;
  if (prev === 0) return curr === 0 ? 0 : null;
  return Math.round(((curr - prev) / Math.abs(prev)) * 1000) / 10; // one decimal place
}

export function computeComparisonDelta(
  current: ClientComparisonMetrics,
  previous: ClientComparisonMetrics
): ClientComparisonDelta {
  const delta: ClientComparisonDelta = {};

  if (current.media_buying || previous.media_buying) {
    const c = current.media_buying;
    const p = previous.media_buying;
    delta.media_buying = {
      spend: pctDelta(c?.spend, p?.spend),
      roas: pctDelta(c?.roas, p?.roas),
      conversions: pctDelta(c?.conversions, p?.conversions),
      cpa: pctDelta(c?.cpa, p?.cpa),
    };
  }

  if (current.seo || previous.seo) {
    const c = current.seo;
    const p = previous.seo;
    delta.seo = {
      completed_tasks: pctDelta(c?.completed_tasks, p?.completed_tasks),
      on_time_rate: pctDelta(c?.on_time_rate, p?.on_time_rate),
    };
  }

  if (current.social_media || previous.social_media) {
    const c = current.social_media;
    const p = previous.social_media;
    delta.social_media = {
      reach: pctDelta(c?.reach, p?.reach),
      engagement_rate: pctDelta(c?.engagement_rate, p?.engagement_rate),
      follower_growth: pctDelta(c?.follower_growth, p?.follower_growth),
    };
  }

  return delta;
}

// ----------------------------------------------------------------------------
// Threshold rules -> summary + recommendation text. Deterministic, no model call, auditable.
// Runs off the stored metrics_current/metrics_previous/delta, so it's re-derivable at render
// time from a persisted ClientComparisonRecord without needing its own storage column.
// ----------------------------------------------------------------------------
export function generateComparisonNarrative(
  current: ClientComparisonMetrics,
  previous: ClientComparisonMetrics,
  delta: ClientComparisonDelta
): { summary: string; recommendations: string } {
  const summaryParts: string[] = [];
  const recommendationParts: string[] = [];

  if (current.media_buying || previous.media_buying) {
    const d = delta.media_buying || {};
    const spendDelta = d.spend ?? null;
    const conversionsDelta = d.conversions ?? null;
    const roasDelta = d.roas ?? null;
    const cpaDelta = d.cpa ?? null;

    if (spendDelta !== null && conversionsDelta !== null && spendDelta > 10 && conversionsDelta < 0) {
      summaryParts.push(
        `Media Buying: efficiency declined — spend increased ${spendDelta}% while conversions dropped ${Math.abs(conversionsDelta)}%.`
      );
      recommendationParts.push(
        'Recommend reallocating budget away from underperforming campaigns and reviewing audience targeting for the next period.'
      );
    }
    if (roasDelta !== null && roasDelta > 15) {
      summaryParts.push(`Media Buying: strong improvement — ROAS increased ${roasDelta}%, indicating more efficient ad spend.`);
      recommendationParts.push('Recommend maintaining current strategy; consider a modest budget increase to scale results.');
    }
    if (cpaDelta !== null && cpaDelta > 20) {
      summaryParts.push(`Media Buying: cost per acquisition rose ${cpaDelta}% this period.`);
      recommendationParts.push('Recommend a creative refresh or narrower audience targeting to reduce cost per acquisition.');
    }
    if (spendDelta !== null && conversionsDelta !== null && Math.abs(spendDelta) <= 5 && conversionsDelta > 10) {
      summaryParts.push(
        `Media Buying: efficiency gain — conversions grew ${conversionsDelta}% without a proportional spend increase.`
      );
    }
  }

  if (current.social_media || previous.social_media) {
    const d = delta.social_media || {};
    const engagementDelta = d.engagement_rate ?? null;
    const followerDelta = d.follower_growth ?? null;

    if (engagementDelta !== null && engagementDelta < -15) {
      summaryParts.push('Social Media: engagement declined significantly this period.');
      recommendationParts.push('Recommend revisiting content cadence and format; consider A/B testing post types.');
    }
    if (followerDelta !== null && followerDelta > 20) {
      summaryParts.push('Social Media: strong audience growth this period.');
      recommendationParts.push('Recommend doubling down on the current content mix driving growth.');
    }
  }

  if (current.seo || previous.seo) {
    const c = current.seo;
    const p = previous.seo;
    const completedDelta = (c?.completed_tasks ?? 0) - (p?.completed_tasks ?? 0);
    const onTimeDeclined =
      c?.on_time_rate !== null &&
      c?.on_time_rate !== undefined &&
      p?.on_time_rate !== null &&
      p?.on_time_rate !== undefined &&
      c.on_time_rate < p.on_time_rate;

    if (completedDelta < 0 && onTimeDeclined) {
      summaryParts.push('SEO: delivery pace slowed this period.');
      recommendationParts.push('Recommend reviewing SEO team capacity or blockers for next period.');
    } else {
      summaryParts.push('SEO: consistent delivery maintained.');
    }
  }

  return {
    summary: summaryParts.length ? summaryParts.join(' ') : 'No significant changes to report this period.',
    recommendations: recommendationParts.length
      ? recommendationParts.join(' ')
      : 'No specific recommendations — performance is stable.',
  };
}

// ----------------------------------------------------------------------------
// Full generation, tying the above together into what gets stored in client_comparisons.
// ----------------------------------------------------------------------------
export function generateClientComparison(
  client: ClientRecord,
  services: ServiceType[],
  currentPeriod: ComparisonPeriod,
  previousPeriod: ComparisonPeriod,
  campaigns: CampaignRecord[],
  tasks: TaskRecord[],
  socialInsights: SocialInsightRecord[]
): {
  period_current: string;
  period_previous: string;
  metrics_current: ClientComparisonMetrics;
  metrics_previous: ClientComparisonMetrics;
  delta: ClientComparisonDelta;
  ai_recommendations_text: string;
} {
  const metrics_current = generateClientComparisonMetrics(
    services,
    client.id,
    currentPeriod.range,
    campaigns,
    tasks,
    socialInsights
  );
  const metrics_previous = generateClientComparisonMetrics(
    services,
    client.id,
    previousPeriod.range,
    campaigns,
    tasks,
    socialInsights
  );
  const delta = computeComparisonDelta(metrics_current, metrics_previous);
  const { recommendations } = generateComparisonNarrative(metrics_current, metrics_previous, delta);

  return {
    period_current: currentPeriod.label,
    period_previous: previousPeriod.label,
    metrics_current,
    metrics_previous,
    delta,
    ai_recommendations_text: recommendations,
  };
}
