import React, { useState, useMemo } from 'react';
import {
  X,
  Building2,
  Calendar,
  DollarSign,
  UserCheck,
  FileText,
  Target,
  CheckSquare,
  Activity,
  Layers,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Clock,
  Sparkles,
  ExternalLink,
  Shield,
  Plus,
  Edit2,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import {
  ClientRecord,
  ClientStatus,
  PackageRecord,
  UserRecord,
  BriefRecord,
  CampaignRecord,
  TaskRecord,
  DailyLogRecord,
  ExtraNoteRecord,
  AssignmentRecord,
  ServiceType,
  TaskStatus,
} from '../types/database';
import { DynamicBriefForm } from './DynamicBriefForm';
import {
  getCampaignName,
  getCampaignStatus,
  getCampaignBudget,
  getCampaignObjective,
  getCampaignStartDate,
  getCampaignEndDate,
  getCampaignOwnerId,
} from './CampaignManagementModule';

interface ClientDashboardProps {
  client: ClientRecord;
  packageRecord?: PackageRecord;
  allPackages: PackageRecord[];
  users: UserRecord[];
  currentUser: UserRecord;
  briefs: BriefRecord[];
  campaigns: CampaignRecord[];
  tasks: TaskRecord[];
  dailyLogs: DailyLogRecord[];
  extraNotes: ExtraNoteRecord[];
  assignments: AssignmentRecord[];
  initialTab?: DashboardTab;
  onClose: () => void;
  onSaveBrief?: (briefData: {
    client_id: string;
    service_type: ServiceType;
    fields: Record<string, any>;
    version: number;
    submitted_by: string;
  }) => Promise<void>;
  onAssignAMAgent?: (clientId: string, agentId: string) => Promise<void>;
  onUpdateTaskStatus?: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onCreateCampaign?: (campaignData: Partial<CampaignRecord>) => Promise<void> | void;
  onUpdateClientStatus?: (
    clientId: string,
    newStatus: ClientStatus,
    options?: { churn_reason?: string; renewal_date?: string }
  ) => Promise<void>;
  onMarkClientViewed?: (clientId: string) => Promise<void> | void;
}

type DashboardTab = 'overview' | 'team' | 'briefs' | 'campaigns' | 'tasks' | 'logs';

const CLIENT_STATUS_META: Record<ClientStatus, { label: string; bg: string; color: string; border: string }> = {
  lead: { label: 'Lead', bg: 'rgba(168, 155, 184, 0.15)', color: 'var(--lilac)', border: 'rgba(168, 155, 184, 0.3)' },
  onboarding: { label: 'Onboarding', bg: 'rgba(123, 47, 247, 0.2)', color: 'var(--purple-light)', border: 'rgba(123, 47, 247, 0.35)' },
  active: { label: 'Active', bg: 'rgba(169, 245, 193, 0.2)', color: 'var(--roas-good)', border: 'rgba(169, 245, 193, 0.3)' },
  renewal: { label: 'Renewal', bg: 'rgba(245, 226, 154, 0.2)', color: 'var(--roas-mid)', border: 'rgba(245, 226, 154, 0.3)' },
  churned: { label: 'Churned', bg: 'rgba(245, 163, 163, 0.2)', color: 'var(--roas-bad)', border: 'rgba(245, 163, 163, 0.3)' },
};

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  client,
  packageRecord,
  allPackages,
  users,
  currentUser,
  briefs,
  campaigns,
  tasks,
  dailyLogs,
  extraNotes,
  assignments,
  initialTab,
  onClose,
  onSaveBrief,
  onAssignAMAgent,
  onUpdateTaskStatus,
  onCreateCampaign,
  onUpdateClientStatus,
  onMarkClientViewed,
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab || 'overview');
  const [selectedBriefService, setSelectedBriefService] = useState<ServiceType | null>(null);
  const [isAssigningAM, setIsAssigningAM] = useState(false);
  const [selectedAMId, setSelectedAMId] = useState(client.am_agent_id || '');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showChurnConfirm, setShowChurnConfirm] = useState(false);
  const [churnReasonInput, setChurnReasonInput] = useState('');

  // Resolve client services from package
  const pkg = packageRecord || allPackages.find((p) => p.id === client.package_id);
  const services: ServiceType[] = pkg?.services || [];

  // Initialize active brief service
  React.useEffect(() => {
    if (services.length > 0 && !selectedBriefService) {
      setSelectedBriefService(services[0]);
    }
  }, [services, selectedBriefService]);

  // Clear the "New" indicator once the assigned AM Team Lead opens this client
  React.useEffect(() => {
    if (
      onMarkClientViewed &&
      currentUser.role === 'am_team_lead' &&
      client.am_team_lead_id === currentUser.id &&
      !client.am_team_lead_viewed_at
    ) {
      onMarkClientViewed(client.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id]);

  // Client Briefs
  const clientBriefs = useMemo(
    () => briefs.filter((b) => b.client_id === client.id),
    [briefs, client.id]
  );

  // Client Tasks
  const clientTasks = useMemo(
    () => tasks.filter((t) => t.client_id === client.id),
    [tasks, client.id]
  );

  // Client Campaigns
  const clientCampaigns = useMemo(
    () => campaigns.filter((c) => c.client_id === client.id),
    [campaigns, client.id]
  );

  // Client Logs & Notes
  const clientLogs = useMemo(() => {
    const taskIds = new Set(clientTasks.map((t) => t.id));
    return dailyLogs.filter(
      (log) =>
        (log.summary_text && log.summary_text.includes(client.name)) ||
        (log.linked_task_ids && log.linked_task_ids.some((id) => taskIds.has(id)))
    );
  }, [dailyLogs, clientTasks, client.name]);

  // Assigned Specialists
  const assignedAM = users.find((u) => u.id === client.am_agent_id);
  const salesOwner = users.find((u) => u.id === client.sales_owner_id);
  const amLead = users.find((u) => u.id === client.am_team_lead_id);

  const clientAssignments = useMemo(
    () => assignments.filter((a) => a.client_id === client.id),
    [assignments, client.id]
  );

  const assignedMediaBuyer = useMemo(() => {
    const asg = clientAssignments.find((a) => a.service_type === 'media_buying');
    return asg ? users.find((u) => u.id === asg.agent_id) : null;
  }, [clientAssignments, users]);

  const assignedSEOSpecialist = useMemo(() => {
    const asg = clientAssignments.find((a) => a.service_type === 'seo');
    return asg ? users.find((u) => u.id === asg.agent_id) : null;
  }, [clientAssignments, users]);

  const assignedSocialSpecialist = useMemo(() => {
    const asg = clientAssignments.find((a) => a.service_type === 'social_media');
    return asg ? users.find((u) => u.id === asg.agent_id) : null;
  }, [clientAssignments, users]);

  // Campaign Access Evaluation under RLS:
  // - Operational: Media Buying Team Lead, Media Buying Agent (assigned only)
  // - View-Only: Executive, Head of Technical, AM Team Lead, AM Agent (assigned only)
  // - Forbidden: SEO, Social Media, Design, Video, Sales
  const hasCampaignOperationalAccess =
    currentUser.role === 'media_buying_team_lead' ||
    (currentUser.role === 'media_buying_agent' &&
      (assignedMediaBuyer?.id === currentUser.id ||
        clientCampaigns.some((c) => c.owner_id === currentUser.id)));

  const hasCampaignViewAccess =
    hasCampaignOperationalAccess ||
    currentUser.role === 'executive' ||
    currentUser.role === 'head_of_technical' ||
    currentUser.role === 'am_team_lead' ||
    (currentUser.role === 'am_agent' && client.am_agent_id === currentUser.id);

  const canEditAM =
    currentUser.role === 'am_team_lead' ||
    currentUser.role === 'executive' ||
    currentUser.role === 'head_of_technical';

  // Only the AM department can actually enter/edit brief data: am_agent is the primary author
  // (they run the client meeting), am_team_lead can edit as department oversight/fallback.
  // Everyone else who is allowed to see brief content at all (service teams, executive/HoT) is
  // read-only, and only when a real save handler was actually wired through by the parent
  // screen — never a silent no-op.
  const canEditBrief =
    (currentUser.role === 'am_agent' || currentUser.role === 'am_team_lead') &&
    typeof onSaveBrief === 'function';

  // Brief content (answers gathered from the client meeting) is deliberately restricted to the
  // AM department (who capture it), the operational service teams it's written for, and
  // leadership oversight — mirrors hasCampaignViewAccess above. Sales' role ends at handoff to
  // AM, so they never see brief content, regardless of whether any brief data exists yet — this
  // must be an explicit allow-list, not a byproduct of a prop the caller forgot to pass.
  const hasBriefViewAccess =
    currentUser.role === 'am_agent' ||
    currentUser.role === 'am_team_lead' ||
    currentUser.role === 'executive' ||
    currentUser.role === 'head_of_technical' ||
    currentUser.role === 'seo_team_lead' ||
    currentUser.role === 'seo_agent' ||
    currentUser.role === 'media_buying_team_lead' ||
    currentUser.role === 'media_buying_agent' ||
    currentUser.role === 'social_media_team_lead' ||
    currentUser.role === 'social_media_agent' ||
    currentUser.role === 'graphic_designer' ||
    currentUser.role === 'video_editor';

  // Per spec, the brief feature only becomes available once an AM Agent has actually been
  // assigned to run the discovery meeting — before that there's nothing to document yet.
  const isAMAgentAssigned = !!client.am_agent_id;

  const amAgents = users.filter((u) => u.role === 'am_agent');

  const handleAssignAM = async () => {
    if (!selectedAMId || !onAssignAMAgent) return;
    setIsAssigningAM(true);
    try {
      await onAssignAMAgent(client.id, selectedAMId);
    } finally {
      setIsAssigningAM(false);
    }
  };

  // Lifecycle transition permissions
  const canManageLifecycle =
    currentUser.role === 'am_team_lead' ||
    currentUser.role === 'executive' ||
    currentUser.role === 'head_of_technical' ||
    (currentUser.role === 'am_agent' && client.am_agent_id === currentUser.id);

  const canHandoffToAM =
    currentUser.role === 'sales' && client.sales_owner_id === currentUser.id && client.status === 'lead';

  const handleTransition = async (newStatus: ClientStatus, options?: { churn_reason?: string; renewal_date?: string }) => {
    if (!onUpdateClientStatus) return;
    setIsUpdatingStatus(true);
    try {
      await onUpdateClientStatus(client.id, newStatus, options);
      if (newStatus === 'churned') {
        setShowChurnConfirm(false);
        setChurnReasonInput('');
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const isRenewalApproaching =
    client.status === 'active' &&
    !!client.renewal_date &&
    (() => {
      const daysUntil = (new Date(client.renewal_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysUntil <= 30 && daysUntil >= -365;
    })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-6xl h-[92vh] max-h-[950px] rounded-2xl flex flex-col overflow-hidden shadow-2xl border relative"
        style={{
          background: 'var(--gradient-card)',
          borderColor: 'var(--border-strong)',
        }}
      >
        {/* TOP BAR */}
        <div className="p-5 border-b border-purple-900/40 bg-purple-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg text-white shadow-lg shrink-0"
              style={{ background: 'var(--gradient-badge)', border: '1px solid var(--border-medium)' }}
            >
              <Building2 className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-white">{client.name}</h2>
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider"
                  style={{
                    background: (CLIENT_STATUS_META[client.status] || CLIENT_STATUS_META.onboarding).bg,
                    color: (CLIENT_STATUS_META[client.status] || CLIENT_STATUS_META.onboarding).color,
                    border: `1px solid ${(CLIENT_STATUS_META[client.status] || CLIENT_STATUS_META.onboarding).border}`,
                  }}
                >
                  {(CLIENT_STATUS_META[client.status] || CLIENT_STATUS_META.onboarding).label}
                </span>
                <span className="text-xs text-stone-400 font-mono">ID: {client.id}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-stone-300 mt-1 flex-wrap">
                <span>Industry: <strong className="text-white">{client.industry || 'General Business'}</strong></span>
                <span>Contract: <strong className="text-emerald-400 font-mono">{client.contract_value ? `${client.contract_value.toLocaleString()} SAR/mo` : 'Custom'}</strong></span>
                <span>Start Date: <strong className="text-stone-200">{client.start_date || 'Immediate'}</strong></span>
                <span>Renewal Date: <strong className="text-stone-200">{client.renewal_date || 'Not set'}</strong></span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-purple-900/30 hover:bg-purple-900/60 text-stone-400 hover:text-white transition-colors self-end sm:self-center"
            title="Close Dashboard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAVIGATION TABS */}
        <div className="px-6 border-b border-purple-900/30 bg-[#120d1f]/90 flex items-center gap-2 overflow-x-auto shrink-0 py-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-purple-600 text-white shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-purple-950/30'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Overview & Contract</span>
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'team'
                ? 'bg-purple-600 text-white shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-purple-950/30'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Assigned Team</span>
          </button>

          <button
            onClick={() => setActiveTab('briefs')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'briefs'
                ? 'bg-purple-600 text-white shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-purple-950/30'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Service Briefs{hasBriefViewAccess && isAMAgentAssigned ? ` (${clientBriefs.length})` : ''}</span>
          </button>

          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'campaigns'
                ? 'bg-purple-600 text-white shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-purple-950/30'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Campaigns & Performance ({clientCampaigns.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'tasks'
                ? 'bg-purple-600 text-white shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-purple-950/30'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Tasks & Deliverables ({clientTasks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'logs'
                ? 'bg-purple-600 text-white shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-purple-950/30'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Activity Logs ({clientLogs.length})</span>
          </button>
        </div>

        {/* TAB CONTENTS */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* 1. OVERVIEW & CONTRACT */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Contract Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-purple-900/30 bg-[#161224]/80">
                  <span className="text-xs text-stone-400 block mb-1">Contracted Package</span>
                  <p className="text-sm font-bold text-white mb-2">{pkg?.name || 'Custom Agency Plan'}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {services.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          background:
                            s === 'media_buying'
                              ? 'rgba(14, 165, 233, 0.2)'
                              : s === 'seo'
                              ? 'rgba(16, 185, 129, 0.2)'
                              : 'rgba(236, 72, 153, 0.2)',
                          color:
                            s === 'media_buying'
                              ? '#38bdf8'
                              : s === 'seo'
                              ? '#34d399'
                              : '#f472b6',
                        }}
                      >
                        {s.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-purple-900/30 bg-[#161224]/80">
                  <span className="text-xs text-stone-400 block mb-1">Monthly Investment</span>
                  <p className="text-2xl font-bold text-emerald-400 font-mono">
                    {client.contract_value ? `${client.contract_value.toLocaleString()} SAR` : 'N/A'}
                  </p>
                  <span className="text-[11px] text-stone-400 mt-1 block">Retainer service fee per cycle</span>
                </div>

                <div className="p-4 rounded-xl border border-purple-900/30 bg-[#161224]/80">
                  <span className="text-xs text-stone-400 block mb-1">Onboarding Progress</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-stone-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-purple-500 h-full rounded-full transition-all"
                        style={{
                          width: `${
                            services.length > 0
                              ? Math.round(
                                  (services.filter((s) =>
                                    clientBriefs.some((b) => b.service_type === s)
                                  ).length /
                                    services.length) *
                                    100
                                )
                              : 100
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-purple-300 font-mono">
                      {services.filter((s) => clientBriefs.some((b) => b.service_type === s)).length}/
                      {services.length} Briefs
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-400 mt-1 block">
                    {client.am_agent_id ? 'Account Manager Assigned' : 'Awaiting AM Assignment'}
                  </span>
                </div>
              </div>

              {/* Client Lifecycle */}
              <div className="p-4 rounded-xl border border-purple-900/30 bg-[#161224]/80 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span>Client Lifecycle</span>
                  </h3>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider"
                    style={{
                      background: (CLIENT_STATUS_META[client.status] || CLIENT_STATUS_META.onboarding).bg,
                      color: (CLIENT_STATUS_META[client.status] || CLIENT_STATUS_META.onboarding).color,
                      border: `1px solid ${(CLIENT_STATUS_META[client.status] || CLIENT_STATUS_META.onboarding).border}`,
                    }}
                  >
                    {(CLIENT_STATUS_META[client.status] || CLIENT_STATUS_META.onboarding).label}
                  </span>
                </div>

                {client.status === 'churned' && (
                  <div className="p-3 rounded-lg bg-red-950/30 border border-red-800/40 text-xs text-red-300">
                    <strong className="block mb-0.5">Churn Reason</strong>
                    <span>{client.churn_reason || 'No reason recorded.'}</span>
                  </div>
                )}

                {isRenewalApproaching && (
                  <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 text-xs text-amber-300 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Renewal date ({client.renewal_date}) is approaching. Confirm to move this client into the
                      Renewal stage.
                    </span>
                  </div>
                )}

                {client.status !== 'churned' && !showChurnConfirm && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {client.status === 'lead' && canHandoffToAM && onUpdateClientStatus && (
                      <button
                        onClick={() => handleTransition('onboarding')}
                        disabled={isUpdatingStatus}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-200 bg-emerald-900/40 hover:bg-emerald-800/60 hover:text-white border border-emerald-700/40 transition-all"
                      >
                        Hand Off to AM
                      </button>
                    )}

                    {client.status === 'onboarding' && canManageLifecycle && onUpdateClientStatus && (
                      <button
                        onClick={() => handleTransition('active')}
                        disabled={isUpdatingStatus}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-200 bg-emerald-900/40 hover:bg-emerald-800/60 hover:text-white border border-emerald-700/40 transition-all"
                      >
                        Mark as Active
                      </button>
                    )}

                    {client.status === 'active' && canManageLifecycle && onUpdateClientStatus && (
                      <button
                        onClick={() => handleTransition('renewal')}
                        disabled={isUpdatingStatus}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-200 bg-amber-900/40 hover:bg-amber-800/60 hover:text-white border border-amber-700/40 transition-all"
                      >
                        Move to Renewal
                      </button>
                    )}

                    {client.status === 'renewal' && canManageLifecycle && onUpdateClientStatus && (
                      <button
                        onClick={() => {
                          const nextRenewal = client.renewal_date
                            ? (() => {
                                const d = new Date(client.renewal_date as string);
                                d.setFullYear(d.getFullYear() + 1);
                                return d.toISOString().split('T')[0];
                              })()
                            : undefined;
                          handleTransition('active', nextRenewal ? { renewal_date: nextRenewal } : undefined);
                        }}
                        disabled={isUpdatingStatus}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-200 bg-emerald-900/40 hover:bg-emerald-800/60 hover:text-white border border-emerald-700/40 transition-all"
                      >
                        Confirm Renewal
                      </button>
                    )}

                    {(client.status === 'onboarding' || client.status === 'active' || client.status === 'renewal') &&
                      canManageLifecycle &&
                      onUpdateClientStatus && (
                        <button
                          onClick={() => setShowChurnConfirm(true)}
                          disabled={isUpdatingStatus}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-300 bg-red-950/30 hover:bg-red-900/50 hover:text-white border border-red-800/40 transition-all"
                        >
                          Mark as Churned
                        </button>
                      )}

                    {client.status === 'lead' && !canHandoffToAM && (
                      <span className="text-[11px] text-stone-400">
                        Awaiting handoff from Sales to Account Management.
                      </span>
                    )}
                  </div>
                )}

                {showChurnConfirm && (
                  <div className="p-3 rounded-lg bg-red-950/20 border border-red-800/40 space-y-2">
                    <label className="block text-xs font-semibold text-red-300">
                      Churn Reason <span className="text-red-400">*</span> (required, this action is permanent)
                    </label>
                    <textarea
                      value={churnReasonInput}
                      onChange={(e) => setChurnReasonInput(e.target.value)}
                      placeholder="e.g. Budget cuts, switched to in-house team..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg text-xs bg-black/30 border border-red-900/40 text-white outline-none focus:border-red-400"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setShowChurnConfirm(false);
                          setChurnReasonInput('');
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-300 bg-stone-800/40 hover:bg-stone-800/70 border border-stone-700/40 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleTransition('churned', { churn_reason: churnReasonInput.trim() })}
                        disabled={isUpdatingStatus || !churnReasonInput.trim()}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-red-700 hover:bg-red-600 disabled:opacity-50 transition-all"
                      >
                        Confirm Churn
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Summary Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Active Deliverables */}
                <div className="p-4 rounded-xl border border-purple-900/30 bg-[#161224]/80">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-purple-400" />
                      <span>Pending Deliverables</span>
                    </h3>
                    <span className="text-xs text-purple-300">
                      {clientTasks.filter((t) => t.status !== 'completed').length} Active Tasks
                    </span>
                  </div>
                  <div className="space-y-2">
                    {clientTasks.slice(0, 4).map((task) => (
                      <div
                        key={task.id}
                        className="p-2.5 rounded-lg border border-purple-900/20 bg-purple-950/20 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold text-white">{task.title}</p>
                          <span className="text-[11px] text-stone-400">Team: {task.team}</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-purple-200 bg-purple-900/50 uppercase">
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                    {clientTasks.length === 0 && (
                      <p className="text-xs text-stone-500 py-3 text-center">No tasks scheduled for this client.</p>
                    )}
                  </div>
                </div>

                {/* Performance Snapshot */}
                <div className="p-4 rounded-xl border border-purple-900/30 bg-[#161224]/80">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span>Campaign Performance Snapshot</span>
                    </h3>
                    <span className="text-xs text-emerald-400">
                      {clientCampaigns.filter((c) => c.status === 'active').length} Active Campaigns
                    </span>
                  </div>

                  {hasCampaignViewAccess ? (
                    clientCampaigns.length > 0 ? (
                      <div className="space-y-2">
                        {clientCampaigns.slice(0, 3).map((cmp) => (
                          <div
                            key={cmp.id}
                            className="p-2.5 rounded-lg border border-purple-900/20 bg-purple-950/20 flex items-center justify-between"
                          >
                            <div>
                              <p className="text-xs font-bold text-white">{getCampaignName(cmp)}</p>
                              <span className="text-[11px] text-stone-400">Platform: {cmp.platform.toUpperCase()}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-mono font-bold text-emerald-300">
                                {cmp.results?.roas ? `${cmp.results.roas}x ROAS` : 'Active'}
                              </span>
                              <span className="text-[10px] text-stone-400 block">
                                {cmp.spend ? `${cmp.spend.toLocaleString()} SAR spend` : ''}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-stone-500 py-3 text-center">No live campaigns linked to this client record.</p>
                    )
                  ) : (
                    <div className="p-4 rounded-lg bg-stone-900/40 text-center text-xs text-stone-400">
                      <Lock className="w-4 h-4 mx-auto mb-1 text-stone-500" />
                      <span>Campaign performance visibility is restricted for your role.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. ASSIGNED TEAM */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Account Manager Card */}
                <div className="p-4 rounded-xl border border-purple-900/30 bg-[#161224]/80">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
                      Account Manager (AM)
                    </span>
                    {canEditAM && (
                      <button
                        onClick={handleAssignAM}
                        disabled={isAssigningAM}
                        className="text-xs px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all disabled:opacity-50"
                      >
                        {isAssigningAM ? 'Assigning...' : 'Update AM'}
                      </button>
                    )}
                  </div>
                  {canEditAM ? (
                    <div className="space-y-2">
                      <select
                        value={selectedAMId}
                        onChange={(e) => setSelectedAMId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-[#100c1c] border border-purple-900/50 text-white focus:outline-none focus:border-purple-400"
                      >
                        <option value="">-- Unassigned --</option>
                        {amAgents.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name} ({agent.email})
                          </option>
                        ))}
                      </select>
                      {assignedAM && (
                        <p className="text-xs text-stone-400 mt-1">
                          Current Assigned AM: <strong className="text-white">{assignedAM.name}</strong>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 mt-1">
                      <div className="w-9 h-9 rounded-lg bg-purple-900/40 border border-purple-700/40 flex items-center justify-center font-bold text-sm text-purple-300">
                        {assignedAM?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{assignedAM?.name || 'Unassigned'}</p>
                        <p className="text-xs text-stone-400">{assignedAM?.email || 'Awaiting assignment'}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sales Representative Card */}
                <div className="p-4 rounded-xl border border-purple-900/30 bg-[#161224]/80">
                  <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider block mb-3">
                    Sales Representative (Acquisition)
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-900/20 border border-amber-700/30 flex items-center justify-center font-bold text-sm text-amber-300">
                      {salesOwner?.name?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{salesOwner?.name || 'Sales Team'}</p>
                      <p className="text-xs text-stone-400">{salesOwner?.email || 'sales@agency.com'}</p>
                    </div>
                  </div>
                </div>

                {/* Media Buying Specialist */}
                {services.includes('media_buying') && (
                  <div className="p-4 rounded-xl border border-purple-900/30 bg-[#161224]/80">
                    <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider block mb-3">
                      Media Buying Specialist
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-sky-900/20 border border-sky-700/30 flex items-center justify-center font-bold text-sm text-sky-300">
                        {assignedMediaBuyer?.name?.charAt(0) || 'M'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{assignedMediaBuyer?.name || 'Assigned per Campaign'}</p>
                        <p className="text-xs text-stone-400">{assignedMediaBuyer?.email || 'Paid Media Department'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* SEO Specialist */}
                {services.includes('seo') && (
                  <div className="p-4 rounded-xl border border-purple-900/30 bg-[#161224]/80">
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-3">
                      SEO Specialist
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-900/20 border border-emerald-700/30 flex items-center justify-center font-bold text-sm text-emerald-300">
                        {assignedSEOSpecialist?.name?.charAt(0) || 'S'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{assignedSEOSpecialist?.name || 'Assigned per Brief'}</p>
                        <p className="text-xs text-stone-400">{assignedSEOSpecialist?.email || 'Organic Search Department'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Social Media Specialist */}
                {services.includes('social_media') && (
                  <div className="p-4 rounded-xl border border-purple-900/30 bg-[#161224]/80">
                    <span className="text-xs font-semibold text-pink-400 uppercase tracking-wider block mb-3">
                      Social Media Specialist
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-pink-900/20 border border-pink-700/30 flex items-center justify-center font-bold text-sm text-pink-300">
                        {assignedSocialSpecialist?.name?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{assignedSocialSpecialist?.name || 'Assigned per Calendar'}</p>
                        <p className="text-xs text-stone-400">{assignedSocialSpecialist?.email || 'Social Media Department'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. SERVICE BRIEFS */}
          {activeTab === 'briefs' && (
            <div className="space-y-4">
              {!hasBriefViewAccess ? (
                <div className="p-8 text-center rounded-xl bg-purple-950/20 border border-purple-900/30">
                  <Shield className="w-10 h-10 text-purple-400 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-white">Brief Access Restricted</h3>
                  <p className="text-xs text-stone-400 max-w-md mx-auto mt-1">
                    Service brief content is available only to the Account Management team, the
                    relevant operational service teams, and Executive/Head of Technical oversight.
                    It is not available for your role.
                  </p>
                </div>
              ) : !isAMAgentAssigned ? (
                <div className="p-8 text-center rounded-xl bg-amber-950/20 border border-amber-900/30">
                  <Clock className="w-10 h-10 text-amber-400 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-white">Awaiting AM Agent Assignment</h3>
                  <p className="text-xs text-stone-400 max-w-md mx-auto mt-1">
                    Service briefs can be documented once an Account Manager is assigned to this
                    client.
                  </p>
                  {currentUser.role === 'am_team_lead' && (
                    <button
                      onClick={() => setActiveTab('team')}
                      className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-purple-200 bg-purple-900/40 hover:bg-purple-800/60 hover:text-white border border-purple-700/40 transition-all inline-flex items-center gap-1.5 mx-auto"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Go to Assigned Team</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Service Sub-tabs */}
                  <div className="flex items-center gap-2 border-b border-purple-900/30 pb-3">
                    {services.map((srv) => {
                      const hasBrief = clientBriefs.some((b) => b.service_type === srv);
                      const isSelected = selectedBriefService === srv;
                      return (
                        <button
                          key={srv}
                          onClick={() => setSelectedBriefService(srv)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-purple-600 text-white shadow'
                              : 'bg-stone-900/60 text-stone-400 hover:text-white border border-stone-800'
                          }`}
                        >
                          <span>{srv.replace('_', ' ').toUpperCase()} Brief</span>
                          {hasBrief ? (
                            <span className="w-2 h-2 rounded-full bg-emerald-400" title="Submitted" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-amber-400" title="Pending" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {selectedBriefService ? (
                    <div className="p-4 rounded-xl border border-purple-900/30 bg-[#161224]/80">
                      <DynamicBriefForm
                        clientId={client.id}
                        clientName={client.name}
                        serviceType={selectedBriefService}
                        existingBrief={clientBriefs.find((b) => b.service_type === selectedBriefService)}
                        onSaveBrief={onSaveBrief || (async () => {})}
                        currentUserId={currentUser.id}
                        canEdit={canEditBrief}
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-stone-400">No service brief selected.</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* 4. ACTIVE CAMPAIGNS & PERFORMANCE */}
          {activeTab === 'campaigns' && (
            <div className="space-y-4">
              {!hasCampaignViewAccess ? (
                <div className="p-8 text-center rounded-xl bg-purple-950/20 border border-purple-900/30">
                  <Shield className="w-10 h-10 text-purple-400 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-white">Campaign Access Restricted</h3>
                  <p className="text-xs text-stone-400 max-w-md mx-auto mt-1">
                    Campaign management and performance results are available only to authorized Media Buying and Executive/Account Management roles.
                  </p>
                </div>
              ) : clientCampaigns.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-purple-950/20 border border-purple-900/30">
                  <Target className="w-10 h-10 text-purple-400 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-white">No Active Campaigns</h3>
                  <p className="text-xs text-stone-400 max-w-md mx-auto mt-1">
                    There are no ad campaigns currently registered for {client.name}.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-xs text-stone-400 flex items-center justify-between">
                    <span>
                      Client Category: <strong className="text-white">{client.industry || 'Standard'}</strong> • All Advertising Platforms
                    </span>
                    <span className="text-emerald-400 font-bold">
                      {hasCampaignOperationalAccess ? 'Operational Access Enabled' : 'View-Only Access'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clientCampaigns.map((cmp) => {
                      const res = cmp.results || {};
                      const owner = users.find((u) => u.id === getCampaignOwnerId(cmp));
                      const startDate = getCampaignStartDate(cmp);
                      const endDate = getCampaignEndDate(cmp);
                      return (
                        <div
                          key={cmp.id}
                          className="p-4 rounded-xl border border-purple-900/30 bg-[#161224]/80 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-950 text-sky-300 border border-sky-800/40">
                                  {cmp.platform}
                                </span>
                                <span
                                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                                  style={{
                                    background: cmp.status === 'active' ? 'rgba(169, 245, 193, 0.2)' : 'rgba(245, 226, 154, 0.2)',
                                    color: cmp.status === 'active' ? 'var(--roas-good)' : 'var(--roas-mid)',
                                  }}
                                >
                                  {cmp.status}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-white">{getCampaignName(cmp)}</h4>
                            </div>
                            <span className="text-xs font-mono font-bold text-emerald-400">
                              {res.roas ? `${res.roas}x ROAS` : ''}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-400">
                            <span>
                              Objective: <strong className="text-stone-200">{getCampaignObjective(cmp)}</strong>
                            </span>
                            <span className="text-stone-600">•</span>
                            <span>
                              {startDate || 'Not set'} {endDate ? `to ${endDate}` : '(ongoing)'}
                            </span>
                            <span className="text-stone-600">•</span>
                            <span>
                              Owner: <strong className="text-stone-200">{owner?.name || 'Not set'}</strong>
                            </span>
                          </div>

                          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-purple-900/20 text-center">
                            <div>
                              <span className="text-[10px] text-stone-400 block">Spend</span>
                              <span className="text-xs font-mono font-bold text-white">
                                {cmp.spend ? `${cmp.spend.toLocaleString()} SAR` : '0'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-stone-400 block">Clicks</span>
                              <span className="text-xs font-mono font-bold text-white">
                                {res.clicks ? res.clicks.toLocaleString() : '0'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-stone-400 block">Conversions</span>
                              <span className="text-xs font-mono font-bold text-emerald-400">
                                {res.conversions || '0'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-stone-400 block">CPA</span>
                              <span className="text-xs font-mono font-bold text-purple-300">
                                {res.cpa ? `${res.cpa} SAR` : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. TASKS & DEADLINES */}
          {activeTab === 'tasks' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-stone-400">Tasks assigned across operational agency teams</span>
                <span className="text-xs text-purple-300 font-bold">{clientTasks.length} Total Tasks</span>
              </div>
              <div className="space-y-2">
                {clientTasks.map((t) => {
                  const assignee = users.find((u) => u.id === t.assigned_to);
                  return (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl border border-purple-900/30 bg-[#161224]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-purple-950 text-purple-300 border border-purple-800/40">
                            {t.team}
                          </span>
                          <span
                            className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider"
                            style={{
                              background:
                                t.priority === 'urgent'
                                  ? 'rgba(239, 68, 68, 0.2)'
                                  : t.priority === 'high'
                                  ? 'rgba(249, 115, 22, 0.2)'
                                  : 'rgba(168, 155, 184, 0.15)',
                              color:
                                t.priority === 'urgent'
                                  ? '#f87171'
                                  : t.priority === 'high'
                                  ? '#fb923c'
                                  : 'var(--lilac)',
                            }}
                          >
                            {t.priority}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white">{t.title}</h4>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          Assigned to: <strong className="text-stone-200">{assignee?.name || 'Unassigned'}</strong> • Due: {t.due_date || 'No deadline'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <select
                          value={t.status}
                          onChange={(e) => onUpdateTaskStatus && onUpdateTaskStatus(t.id, e.target.value as TaskStatus)}
                          className="px-2.5 py-1 rounded-lg text-xs bg-[#100c1c] border border-purple-900/40 text-white focus:outline-none"
                        >
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="in_review">In Review</option>
                          <option value="completed">Completed</option>
                          <option value="blocked">Blocked</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
                {clientTasks.length === 0 && (
                  <p className="text-xs text-stone-500 py-6 text-center">No tasks currently assigned to this client.</p>
                )}
              </div>
            </div>
          )}

          {/* 6. LOGS & NOTES */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <span className="text-xs text-stone-400 block mb-2">Team activity logs & operational milestones</span>
              <div className="space-y-2">
                {clientLogs.map((log) => {
                  const author = users.find((u) => u.id === log.user_id);
                  return (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-xl border border-purple-900/30 bg-[#161224]/80 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-purple-300">{author?.name || 'Specialist'}</span>
                        <span className="text-stone-500 font-mono">{log.date}</span>
                      </div>
                      <p className="text-xs text-stone-200 leading-relaxed">{log.summary_text}</p>
                    </div>
                  );
                })}
                {clientLogs.length === 0 && (
                  <p className="text-xs text-stone-500 py-6 text-center">No activity logs recorded yet for this client.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
