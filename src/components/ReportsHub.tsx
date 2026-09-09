import React, { useMemo, useState } from 'react';
import { BarChart3, TrendingUp, FileText, Users } from 'lucide-react';
import {
  ClientRecord,
  PackageRecord,
  UserRecord,
  AssignmentRecord,
  ReportRecord,
  ClientComparisonRecord,
} from '../types/database';
import {
  ComparisonGranularity,
  DateRange,
  ReportScope,
  resolveClientsForSubject,
} from '../lib/reportingEngine';
import { PeriodSelector } from './reporting/PeriodSelector';
import { ComparisonCard, FiledReportsList, describeComparisonScope } from './reporting/ComparisonDisplay';

const TEAM_LEAD_TO_AGENT_ROLE: Partial<Record<UserRecord['role'], UserRecord['role']>> = {
  am_team_lead: 'am_agent',
  media_buying_team_lead: 'media_buying_agent',
  seo_team_lead: 'seo_agent',
  social_media_team_lead: 'social_media_agent',
};

type ReportsHubScope = 'client' | 'own' | 'agent';

interface ReportsHubProps {
  currentUser: UserRecord;
  users: UserRecord[];
  clients: ClientRecord[];
  packages: PackageRecord[];
  assignments: AssignmentRecord[];
  reports: ReportRecord[];
  clientComparisons: ClientComparisonRecord[];
  onGenerateComparison: (
    scope: ReportScope,
    granularity: ComparisonGranularity | 'custom',
    custom?: { currentRange: DateRange; previousRange: DateRange }
  ) => Promise<void>;
  onGenerateReport: (comparisonId: string, period: string) => Promise<void>;
}

// Role-agnostic reporting entry point: unlike ClientDashboard's per-client "Reports &
// Comparisons" tab (which requires already being inside one client's dashboard), this covers
// the two cases that don't fit that model — "all of my clients pooled together" and, for team
// leads, "a specific direct report's clients pooled together" — alongside the same single-client
// generation ClientDashboard already offers, so a client-scoped report can be started from
// either surface. Available to every team lead and agent role plus Executive/Head of Technical;
// gated at the nav level via the 'reports' AppModuleId in data/roles.ts.
export const ReportsHub: React.FC<ReportsHubProps> = ({
  currentUser,
  users,
  clients,
  packages,
  assignments,
  reports,
  clientComparisons,
  onGenerateComparison,
  onGenerateReport,
}) => {
  const agentRoleForLead = TEAM_LEAD_TO_AGENT_ROLE[currentUser.role];
  const isTeamLead = !!agentRoleForLead;

  const myClients = useMemo(
    () => resolveClientsForSubject(currentUser, clients, packages, assignments),
    [currentUser, clients, packages, assignments]
  );

  const directReports = useMemo(
    () => (agentRoleForLead ? users.filter((u) => u.role === agentRoleForLead) : []),
    [users, agentRoleForLead]
  );

  const [scope, setScope] = useState<ReportsHubScope>('own');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [granularity, setGranularity] = useState<ComparisonGranularity | 'custom'>('monthly');
  const [customCurrentRange, setCustomCurrentRange] = useState<DateRange>({ start: '', end: '' });
  const [customPreviousRange, setCustomPreviousRange] = useState<DateRange>({ start: '', end: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingReportForComparisonId, setGeneratingReportForComparisonId] = useState<string | null>(null);

  const resolvedScope: ReportScope | null =
    scope === 'client'
      ? selectedClientId
        ? { type: 'client', clientId: selectedClientId }
        : null
      : scope === 'own'
      ? { type: 'agent', agentId: currentUser.id }
      : selectedAgentId
      ? { type: 'agent', agentId: selectedAgentId }
      : null;

  const handleGenerate = async () => {
    if (!resolvedScope) return;
    if (granularity === 'custom' && (!customCurrentRange.start || !customCurrentRange.end || !customPreviousRange.start || !customPreviousRange.end)) {
      return;
    }
    setIsGenerating(true);
    try {
      await onGenerateComparison(
        resolvedScope,
        granularity,
        granularity === 'custom' ? { currentRange: customCurrentRange, previousRange: customPreviousRange } : undefined
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateReport = async (comparison: ClientComparisonRecord) => {
    setGeneratingReportForComparisonId(comparison.id);
    try {
      await onGenerateReport(comparison.id, comparison.period_current);
    } finally {
      setGeneratingReportForComparisonId(null);
    }
  };

  // What's visible in this hub: my own client-scoped comparisons, my own aggregate, and — for
  // team leads — any direct report's aggregate. Purely a display filter; the RLS policies behind
  // onGenerateComparison/the reports and client_comparisons fetches are the actual access
  // control, this just keeps the list relevant instead of showing every row the fetch returned.
  const myClientIds = useMemo(() => new Set(myClients.map((c) => c.id)), [myClients]);
  const directReportIds = useMemo(() => new Set(directReports.map((u) => u.id)), [directReports]);

  const visibleComparisons = useMemo(
    () =>
      clientComparisons
        .filter(
          (c) =>
            (c.client_id && myClientIds.has(c.client_id)) ||
            (c.agent_id && (c.agent_id === currentUser.id || directReportIds.has(c.agent_id)))
        )
        .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')),
    [clientComparisons, myClientIds, directReportIds, currentUser.id]
  );

  const visibleReports = useMemo(
    () =>
      reports
        .filter((r) => r.generated_by === currentUser.id || visibleComparisons.some((c) => c.id === r.comparison_id))
        .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')),
    [reports, visibleComparisons, currentUser.id]
  );

  return (
    <div className="space-y-6">
      <div
        className="p-5 rounded-2xl border relative overflow-hidden backdrop-blur-md"
        style={{ background: 'var(--gradient-card)', borderColor: 'var(--border-medium)' }}
      >
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shrink-0"
            style={{ background: 'var(--gradient-badge)', border: '1px solid var(--border-medium)' }}
          >
            <BarChart3 className="w-6 h-6 text-purple-300" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Reports & Comparisons</h2>
            <p className="text-xs text-stone-400">
              Generate a period-over-period performance report for a specific client, all of your clients pooled
              together{isTeamLead ? ', or a specific agent under you' : ''}.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-purple-900/30 bg-[#161224]/80 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-400" />
          <span>Scope</span>
        </h3>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setScope('own')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              scope === 'own' ? 'bg-purple-600 text-white shadow' : 'bg-stone-900/60 text-stone-400 hover:text-white border border-stone-800'
            }`}
          >
            All My Clients ({myClients.length})
          </button>
          <button
            onClick={() => setScope('client')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              scope === 'client' ? 'bg-purple-600 text-white shadow' : 'bg-stone-900/60 text-stone-400 hover:text-white border border-stone-800'
            }`}
          >
            Specific Client
          </button>
          {isTeamLead && (
            <button
              onClick={() => setScope('agent')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                scope === 'agent' ? 'bg-purple-600 text-white shadow' : 'bg-stone-900/60 text-stone-400 hover:text-white border border-stone-800'
              }`}
            >
              Specific Agent
            </button>
          )}
        </div>

        {scope === 'client' && (
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs bg-[#100c1c] border border-purple-900/50 text-white focus:outline-none focus:border-purple-400"
          >
            <option value="">-- Select a client --</option>
            {myClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        {scope === 'agent' && (
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs bg-[#100c1c] border border-purple-900/50 text-white focus:outline-none focus:border-purple-400"
          >
            <option value="">-- Select an agent --</option>
            {directReports.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        )}
      </div>

      <PeriodSelector
        granularity={granularity}
        onGranularityChange={setGranularity}
        customCurrentRange={customCurrentRange}
        onCustomCurrentRangeChange={setCustomCurrentRange}
        customPreviousRange={customPreviousRange}
        onCustomPreviousRangeChange={setCustomPreviousRange}
        canGenerate={!!resolvedScope}
        isGenerating={isGenerating}
        onGenerate={handleGenerate}
        disabledReason="Select a scope above to generate a comparison."
      />

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>Comparisons ({visibleComparisons.length})</span>
        </h3>

        {visibleComparisons.length === 0 ? (
          <p className="text-xs text-stone-500 py-4 text-center">No comparisons generated yet.</p>
        ) : (
          visibleComparisons.map((cmp) => (
            <ComparisonCard
              key={cmp.id}
              comparison={cmp}
              subtitle={describeComparisonScope(cmp, clients, users)}
              canGenerateReport
              isGeneratingReport={generatingReportForComparisonId === cmp.id}
              onGenerateReport={() => handleGenerateReport(cmp)}
            />
          ))
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-400" />
          <span>Filed Reports ({visibleReports.length})</span>
        </h3>
        <FiledReportsList reports={visibleReports} comparisons={clientComparisons} clients={clients} users={users} showScope />
      </div>
    </div>
  );
};
