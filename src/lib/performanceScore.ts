import {
  UserRecord,
  ClientRecord,
  TaskRecord,
  ExtraNoteRecord,
  KpiScoreMetrics,
  PerformancePeriodType,
} from '../types/database';
import { getUserCapacityData } from './capacity';

// ----------------------------------------------------------------------------
// Period boundaries
// ----------------------------------------------------------------------------

export interface PeriodRange {
  period: string; // "2026-09" (monthly) or "2026-Q3" (quarterly)
  periodType: PerformancePeriodType;
  start: string; // inclusive, YYYY-MM-DD
  end: string; // inclusive, YYYY-MM-DD
}

// Builds the period string/date range for whichever month or quarter the
// given reference date (default: today) falls in. periodType is chosen by
// whoever is generating the score, not a fixed global default.
export function resolvePeriodRange(periodType: PerformancePeriodType, referenceDate: Date = new Date()): PeriodRange {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth(); // 0-indexed

  if (periodType === 'monthly') {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return {
      period: `${year}-${String(month + 1).padStart(2, '0')}`,
      periodType,
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  }

  const quarter = Math.floor(month / 3) + 1; // 1-4
  const start = new Date(year, (quarter - 1) * 3, 1);
  const end = new Date(year, quarter * 3, 0);
  return {
    period: `${year}-Q${quarter}`,
    periodType,
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

const inRange = (dateStr: string, start: string, end: string) => dateStr >= start && dateStr <= end;

// ----------------------------------------------------------------------------
// Indicator 1: on-time task completion rate
// ----------------------------------------------------------------------------
// Scoped to tasks actually completed within the period — a still-open
// overdue task isn't "completed late," it's just not done yet (overdue
// tracking already exists elsewhere in the app as a separate, live metric).
// Subtasks count the same as top-level tasks: they're real assigned work
// with their own due_date/completed_at, consistent with how capacity/
// workload already treats them everywhere else in this app.
export function computeOnTimeCompletionRate(
  tasks: TaskRecord[],
  userId: string,
  range: PeriodRange
): number | null {
  const completedInPeriod = tasks.filter(
    (t) =>
      t.assigned_to === userId &&
      t.status === 'completed' &&
      t.completed_at &&
      inRange(t.completed_at.split('T')[0], range.start, range.end)
  );

  if (completedInPeriod.length === 0) return null;

  const onTime = completedInPeriod.filter((t) => t.completed_at!.split('T')[0] <= t.due_date).length;
  return Math.round((onTime / completedInPeriod.length) * 100);
}

// ----------------------------------------------------------------------------
// Indicator 2: clients managed vs. capacity
// ----------------------------------------------------------------------------
// Live snapshot (current utilization), not period-averaged — capacity_logs
// isn't consistently populated enough across employees to trust as a period
// aggregate. min(utilization%, 100): reaching capacity is full marks, going
// over isn't penalized (carrying extra load is arguably a strength, not a
// problem, in a promotion/raise context). null for untracked (team leads
// with capacity_limit 0 — no real target to score against).
export function computeCapacityUtilizationScore(
  user: UserRecord,
  clients: ClientRecord[],
  tasks: TaskRecord[]
): number | null {
  const data = getUserCapacityData(user, clients, tasks);
  if (data.isUntracked) return null;
  return Math.min(data.utilizationRate, 100);
}

// ----------------------------------------------------------------------------
// Indicator 3: documented initiative (extra notes)
// ----------------------------------------------------------------------------
// A volume proxy, not a quality judgment — nothing in this app can assess
// the content of free text. 'blocker' notes are excluded: those are an
// incidental side effect of resolving a blocked task, not voluntarily
// documented extra effort. min(count x 25, 100): 4+ genuine notes in the
// period is full marks.
export function computeInitiativeScore(
  extraNotes: ExtraNoteRecord[],
  userId: string,
  range: PeriodRange
): number {
  const count = extraNotes.filter(
    (n) => n.user_id === userId && n.category !== 'blocker' && inRange(n.date, range.start, range.end)
  ).length;
  return Math.min(count * 25, 100);
}

// ----------------------------------------------------------------------------
// Overall score
// ----------------------------------------------------------------------------
// client_satisfaction and task_execution_quality have no data source yet
// (see the audit this phase closed part of) — the weighted average is
// computed only over whichever of the three real indicators aren't null,
// with weights renormalized across just those. Default relative weights
// before renormalization: completion 40%, capacity 35%, initiative 25%.
const BASE_WEIGHTS = {
  on_time_completion_rate: 40,
  capacity_utilization_score: 35,
  initiative_score: 25,
} as const;

export function computeOverallScore(
  onTimeCompletionRate: number | null,
  capacityUtilizationScore: number | null,
  initiativeScore: number | null
): { overallScore: number; weights: Record<keyof typeof BASE_WEIGHTS, number> } {
  const values: Record<keyof typeof BASE_WEIGHTS, number | null> = {
    on_time_completion_rate: onTimeCompletionRate,
    capacity_utilization_score: capacityUtilizationScore,
    initiative_score: initiativeScore,
  };

  const availableKeys = (Object.keys(BASE_WEIGHTS) as (keyof typeof BASE_WEIGHTS)[]).filter(
    (k) => values[k] !== null
  );
  const baseWeightTotal = availableKeys.reduce((sum, k) => sum + BASE_WEIGHTS[k], 0);

  const weights = {} as Record<keyof typeof BASE_WEIGHTS, number>;
  (Object.keys(BASE_WEIGHTS) as (keyof typeof BASE_WEIGHTS)[]).forEach((k) => {
    weights[k] = 0;
  });

  if (availableKeys.length === 0 || baseWeightTotal === 0) {
    return { overallScore: 0, weights };
  }

  let overallScore = 0;
  availableKeys.forEach((k) => {
    const renormalizedWeight = BASE_WEIGHTS[k] / baseWeightTotal;
    weights[k] = Math.round(renormalizedWeight * 100);
    overallScore += (values[k] as number) * renormalizedWeight;
  });

  return { overallScore: Math.round(overallScore), weights };
}

// ----------------------------------------------------------------------------
// Full generation, tying the above together into what gets stored
// ----------------------------------------------------------------------------
export function generateKpiScoreMetrics(
  user: UserRecord,
  range: PeriodRange,
  tasks: TaskRecord[],
  clients: ClientRecord[],
  extraNotes: ExtraNoteRecord[]
): { metrics: KpiScoreMetrics; overallScore: number } {
  const onTimeCompletionRate = computeOnTimeCompletionRate(tasks, user.id, range);
  const capacityUtilizationScore = computeCapacityUtilizationScore(user, clients, tasks);
  const initiativeScore = computeInitiativeScore(extraNotes, user.id, range);

  const { overallScore, weights } = computeOverallScore(
    onTimeCompletionRate,
    capacityUtilizationScore,
    initiativeScore
  );

  const metrics: KpiScoreMetrics = {
    period_type: range.periodType,
    period_start: range.start,
    period_end: range.end,
    on_time_completion_rate: onTimeCompletionRate,
    capacity_utilization_score: capacityUtilizationScore,
    initiative_score: initiativeScore,
    client_satisfaction: null,
    task_execution_quality: null,
    weights,
  };

  return { metrics, overallScore };
}
