/**
 * Agency Management System - Database Schema Types
 * Matched strictly to existing Supabase tables (16 tables) and Row Level Security (RLS)
 */

export type UserRole =
  | 'executive'                 // Executive Management (C-level)
  | 'head_of_technical'         // Head of Technical
  | 'sales'                     // Sales Team (Sales)
  | 'am_team_lead'              // AM Team Leader
  | 'am_agent'                  // AM Agent
  | 'media_buying_team_lead'    // Media Buying Team Leader
  | 'media_buying_agent'        // Media Buying Agent
  | 'seo_team_lead'             // SEO Team Leader
  | 'seo_agent'                 // SEO Agent
  | 'social_media_team_lead'    // Social Media Team Leader
  | 'social_media_agent'        // Social Media Agent
  | 'graphic_designer'          // Graphic Designer
  | 'video_editor'              // Video Editor
  | 'ai_engineer';               // AI Engineer

export type ServiceType = 'seo' | 'social_media' | 'media_buying' | 'creative';

export type ClientStatus = 'lead' | 'onboarding' | 'active' | 'renewal' | 'churned';

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'completed' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// 1. users
export interface UserRecord {
  id: string;
  name: string;
  email?: string;
  password?: string;
  role: UserRole;
  team?: string | null;
  manager_id?: string | null;
  capacity_limit?: number | null;
  auth_id: string;
  created_at?: string;
}

// 2. packages
export interface PackageRecord {
  id: string;
  name: string;
  services: ServiceType[];
  created_at?: string;
}

// 3. clients
export interface ClientRecord {
  id: string;
  name: string;
  industry?: string | null;
  package_id?: string | null;
  status: ClientStatus;
  sales_owner_id?: string | null;
  am_agent_id?: string | null;
  am_team_lead_id?: string | null;
  contract_value?: number | null;
  start_date?: string | null;
  renewal_date?: string | null;
  am_team_lead_viewed_at?: string | null;
  churn_reason?: string | null;
  // Set automatically by handleUpdateClientStatus (App.tsx) the moment status transitions to
  // 'churned'. Null for any client that churned before this column existed — not retroactively
  // backfillable, since there's no reliable prior signal for when that happened. Consumers doing
  // period-scoped churn math must treat a null churned_at on a churned client as "unknown date",
  // not as "not churned" or "churned now".
  churned_at?: string | null;
  created_at?: string;
}

// 4. briefs
export interface BriefRecord {
  id: string;
  client_id: string;
  service_type: ServiceType;
  fields: Record<string, any>;
  submitted_by: string;
  version: number;
  // Cleared to null on every save; set when the relevant service Team Lead views this brief.
  // Shared per-role (no per-client "assigned service team lead" concept exists), unlike the
  // per-individual am_team_lead_viewed_at on ClientRecord.
  team_lead_viewed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

// 4b. brief_revisions — append-only audit log; one full field snapshot per brief save
export interface BriefRevisionRecord {
  id: string;
  brief_id: string;
  client_id: string; // denormalized from the parent brief, for RLS scoping without a join
  service_type: ServiceType; // denormalized, same reason
  version: number; // matches briefs.version at the moment of this save
  fields: Record<string, any>;
  edited_by: string;
  edited_at: string;
}

// 5. assignments
export interface AssignmentRecord {
  id: string;
  client_id: string;
  service_type: ServiceType;
  team_lead_id: string;
  agent_id: string;
  assigned_at: string;
  reason_notes?: string | null;
}

// 6. tasks
export interface TaskRecord {
  id: string;
  client_id: string;
  title: string;
  description: string;
  assigned_to?: string | null;
  created_by: string;
  team?: string | null;
  status: TaskStatus;
  due_date: string;
  priority: TaskPriority;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  created_at?: string;
  // Self-reference for subtasks. Nesting is capped at 3 levels
  // (task -> subtask -> sub-subtask) by a DB trigger.
  parent_task_id?: string | null;
  // Set when status becomes 'completed', cleared otherwise (see
  // handleUpdateTaskStatus/handleUpdateTask in App.tsx). Needed to filter
  // "completed today" — status alone carries no timing information.
  completed_at?: string | null;
}

// 6b. task_comments — threaded comments on a task, capped at 3 levels
// (comment -> reply -> reply-to-reply) by a DB trigger, same as tasks
// nesting. Soft-delete via deleted_at (never a real DELETE) so a deleted
// comment's replies stay attached to a real row instead of orphaning.
export interface TaskCommentRecord {
  id: string;
  task_id: string;
  parent_comment_id?: string | null;
  author_id: string;
  body: string;
  created_at: string;
  edited_at?: string | null;
  deleted_at?: string | null;
}

// 6c. task_attachments — files attached to a task. Bytes live in the private
// 'task-attachments' Storage bucket at storage_path; this row is just the
// metadata index. Hard-deleted (unlike comments — nothing references an
// attachment as a parent, so there's no orphaning concern).
export interface TaskAttachmentRecord {
  id: string;
  task_id: string;
  storage_path: string;
  filename: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploaded_at: string;
}

// 7. campaigns
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

export interface CampaignRecord {
  id: string;
  client_id: string;
  name?: string;
  platform: 'meta' | 'google' | 'tiktok' | 'linkedin' | 'snapchat' | 'x' | string;
  objective?: string;
  status?: CampaignStatus;
  campaign_id_external?: string | null;
  spend: number;
  budget?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  owner_id?: string | null;
  team?: string | null;
  results: Record<string, any>;
  date: string;
  created_at?: string;
}

// 8. social_insights
export interface SocialInsightRecord {
  id: string;
  client_id: string;
  platform: 'facebook' | 'instagram' | 'tiktok' | 'x' | 'linkedin' | string;
  metrics: Record<string, any>;
  date: string;
}

// 9. reports
export interface ReportRecord {
  id: string;
  // Null for an aggregate report (all-my-clients or a specific agent's clients) — those have no
  // single client. The report's actual subject (one client, or an agent's pooled clients) always
  // lives on the client_comparisons row it points to via comparison_id, which is the single
  // source of truth for scope; this column is a display convenience for the single-client case.
  client_id?: string | null;
  type: 'internal' | 'client';
  period: string;
  generated_by: string;
  file_url?: string | null;
  // Points at the client_comparisons row backing this report's analytical content — a monthly
  // report is, content-wise, a current-vs-previous-period comparison. Null only for reports
  // created before this link existed.
  comparison_id?: string | null;
  created_at?: string;
}

// 10. capacity_logs
export interface CapacityLogRecord {
  id: string;
  agent_id: string;
  date: string;
  active_clients_count: number;
}

// 11. daily_logs
export interface DailyLogRecord {
  id: string;
  user_id: string;
  date: string;
  summary_text: string;
  linked_task_ids?: string[] | null;
  created_at?: string;
}

// 12. extra_notes
export interface ExtraNoteRecord {
  id: string;
  user_id: string;
  date: string;
  note_text: string;
  category?: string | null;
  created_at?: string;
}

// 13. performance_reviews
export interface PerformanceReviewRecord {
  id: string;
  user_id: string;
  period: string;
  efficiency_score: number;
  strengths?: string | null;
  improvement_areas?: string | null;
  growth_recommendation?: string | null;
  reviewed_by: string;
  created_at?: string;
}

// 14. meetings
export interface MeetingRecord {
  id: string;
  client_id: string;
  am_agent_id: string;
  meeting_date: string;
  recording_url?: string | null;
  transcript_text?: string | null;
  ai_summary_text?: string | null;
  action_items?: Record<string, any> | Array<any> | null;
  created_at?: string;
}

// 15. kpi_scores
export type PerformancePeriodType = 'monthly' | 'quarterly';

// Shape of KpiScoreRecord.metrics (stored as JSONB — untyped at the DB
// layer, typed here for the app side). client_satisfaction and
// task_execution_quality stay null until a real data source exists for
// them (see src/lib/performanceScore.ts) — the overall score is computed
// only from the three indicators that do have real data, with weights
// renormalized across those three.
export interface KpiScoreMetrics {
  period_type: PerformancePeriodType;
  period_start: string;
  period_end: string;
  on_time_completion_rate: number | null; // 0-100, null = no completions in period
  capacity_utilization_score: number | null; // 0-100, null = untracked (capacity_limit 0)
  initiative_score: number | null; // 0-100, from extra_notes count
  client_satisfaction: null; // no data source yet
  task_execution_quality: null; // no data source yet
  weights: Record<'on_time_completion_rate' | 'capacity_utilization_score' | 'initiative_score', number>;
}

export interface KpiScoreRecord {
  id: string;
  user_id: string;
  period: string;
  metrics: KpiScoreMetrics;
  overall_score: number;
  suggested_status?: 'promotion' | 'raise' | 'development_plan' | 'stable' | string | null;
  reviewed_by?: string | null;
  created_at?: string;
}

// 16. client_comparisons
// Per-service-type indicator shapes for ClientComparisonRecord.metrics_current/metrics_previous
// (stored as JSONB — untyped at the DB layer, typed here for the app side). A client only
// carries the block(s) for the services in its package, so every block is optional. See
// src/lib/reportingEngine.ts for how each is aggregated.
export interface ComparisonMediaBuyingMetrics {
  spend: number;
  roas: number | null; // null when no campaigns had spend in the period (nothing to average)
  conversions: number;
  cpa: number | null; // null when conversions is 0 (undefined cost per acquisition)
}

// SEO has no analytics table in this schema (no keyword rankings, no organic traffic) — this is
// an operational delivery proxy from `tasks` where team === 'SEO', not a true performance metric.
export interface ComparisonSeoMetrics {
  completed_tasks: number;
  on_time_rate: number | null; // null when completed_tasks is 0
}

// social_insights.metrics is an untyped JSON blob per platform row with no guaranteed keys —
// every field here is defensively optional/nullable, pulled only when present in the source rows.
export interface ComparisonSocialMetrics {
  reach: number | null;
  engagement_rate: number | null;
  follower_growth: number | null;
}

export interface ClientComparisonMetrics {
  media_buying?: ComparisonMediaBuyingMetrics;
  seo?: ComparisonSeoMetrics;
  social_media?: ComparisonSocialMetrics;
}

// % change per indicator, current vs. previous period. null where either side is null/undefined
// (nothing meaningful to compare, e.g. no spend in either period).
export interface ClientComparisonDelta {
  media_buying?: Partial<Record<keyof ComparisonMediaBuyingMetrics, number | null>>;
  seo?: Partial<Record<keyof ComparisonSeoMetrics, number | null>>;
  social_media?: Partial<Record<keyof ComparisonSocialMetrics, number | null>>;
}

export interface ClientComparisonRecord {
  id: string;
  // Exactly one of client_id / agent_id is set (enforced by a DB check constraint):
  //  - client_id set, agent_id null: a single client's comparison (the original, unchanged shape).
  //  - agent_id set, client_id null: an aggregate pooled across an agent's resolved client set —
  //    either that agent's own "all my clients" report, or a team lead generating one for a
  //    specific direct report. See reportingEngine.ts's resolveClientsForSubject().
  client_id?: string | null;
  agent_id?: string | null;
  // Which clients actually got pooled into this row, recorded at generation time. Only set for
  // agent-scoped rows (client-scoped rows have exactly one client, already in client_id). Purely
  // for audit/drill-down display — RLS cannot re-verify this against current assignments (they
  // may have changed since generation), so it is not part of the access-control model.
  covered_client_ids?: string[] | null;
  // Explicit discriminant for which shape this row is, set directly at generation time (the
  // generator always knows which mode it's running) rather than inferred from period_previous:
  //  - 'comparison': the original shape — period_previous/metrics_previous/delta all populated.
  //  - 'period_summary': a single-period snapshot, no prior period to compare against —
  //    period_previous is null, metrics_previous/delta are {} (already valid: every field on
  //    those two types is optional), and ai_recommendations_text is null (no threshold rules run
  //    with nothing to compare).
  row_kind: 'comparison' | 'period_summary';
  period_current: string;
  // Null only for a 'period_summary' row.
  period_previous: string | null;
  metrics_current: ClientComparisonMetrics;
  metrics_previous: ClientComparisonMetrics;
  delta: ClientComparisonDelta;
  // Rule-generated summary + recommendation text (see reportingEngine.ts's threshold rules) —
  // deterministic, not a model call, despite the DB column's name.
  ai_recommendations_text?: string | null;
  created_at?: string;
}

export interface Database {
  public: {
    Tables: {
      users: { Row: UserRecord; Insert: Partial<UserRecord>; Update: Partial<UserRecord>; Relationships: any[] };
      packages: { Row: PackageRecord; Insert: Partial<PackageRecord>; Update: Partial<PackageRecord>; Relationships: any[] };
      clients: { Row: ClientRecord; Insert: Partial<ClientRecord>; Update: Partial<ClientRecord>; Relationships: any[] };
      briefs: { Row: BriefRecord; Insert: Partial<BriefRecord>; Update: Partial<BriefRecord>; Relationships: any[] };
      brief_revisions: { Row: BriefRevisionRecord; Insert: Partial<BriefRevisionRecord>; Update: Partial<BriefRevisionRecord>; Relationships: any[] };
      assignments: { Row: AssignmentRecord; Insert: Partial<AssignmentRecord>; Update: Partial<AssignmentRecord>; Relationships: any[] };
      tasks: { Row: TaskRecord; Insert: Partial<TaskRecord>; Update: Partial<TaskRecord>; Relationships: any[] };
      task_comments: { Row: TaskCommentRecord; Insert: Partial<TaskCommentRecord>; Update: Partial<TaskCommentRecord>; Relationships: any[] };
      task_attachments: { Row: TaskAttachmentRecord; Insert: Partial<TaskAttachmentRecord>; Update: Partial<TaskAttachmentRecord>; Relationships: any[] };
      campaigns: { Row: CampaignRecord; Insert: Partial<CampaignRecord>; Update: Partial<CampaignRecord>; Relationships: any[] };
      social_insights: { Row: SocialInsightRecord; Insert: Partial<SocialInsightRecord>; Update: Partial<SocialInsightRecord>; Relationships: any[] };
      reports: { Row: ReportRecord; Insert: Partial<ReportRecord>; Update: Partial<ReportRecord>; Relationships: any[] };
      capacity_logs: { Row: CapacityLogRecord; Insert: Partial<CapacityLogRecord>; Update: Partial<CapacityLogRecord>; Relationships: any[] };
      daily_logs: { Row: DailyLogRecord; Insert: Partial<DailyLogRecord>; Update: Partial<DailyLogRecord>; Relationships: any[] };
      extra_notes: { Row: ExtraNoteRecord; Insert: Partial<ExtraNoteRecord>; Update: Partial<ExtraNoteRecord>; Relationships: any[] };
      performance_reviews: { Row: PerformanceReviewRecord; Insert: Partial<PerformanceReviewRecord>; Update: Partial<PerformanceReviewRecord>; Relationships: any[] };
      meetings: { Row: MeetingRecord; Insert: Partial<MeetingRecord>; Update: Partial<MeetingRecord>; Relationships: any[] };
      kpi_scores: { Row: KpiScoreRecord; Insert: Partial<KpiScoreRecord>; Update: Partial<KpiScoreRecord>; Relationships: any[] };
      client_comparisons: { Row: ClientComparisonRecord; Insert: Partial<ClientComparisonRecord>; Update: Partial<ClientComparisonRecord>; Relationships: any[] };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
