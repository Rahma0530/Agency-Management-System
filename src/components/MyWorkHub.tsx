import React, { useMemo, useState } from 'react';
import {
  Building2,
  CheckSquare,
  Clock,
  AlertTriangle,
  FileText,
  Star,
  Gauge,
  PlusCircle,
  ArrowUpRight,
  ChevronRight,
  X,
  CheckCircle2,
} from 'lucide-react';
import {
  UserRecord,
  ClientRecord,
  PackageRecord,
  AssignmentRecord,
  TaskRecord,
  DailyLogRecord,
  ExtraNoteRecord,
  KpiScoreRecord,
  CapacityLogRecord,
  TaskStatus,
  UserRole,
  ServiceType,
  PerformancePeriodType,
} from '../types/database';
import { getRoleInfo, AppModuleId } from '../data/roles';
import { getTodayStr, isTaskOverdue, isTaskDueToday, getSortedEmployeeTasks } from '../lib/employeeWork';
import { resolveDepartmentClients } from '../lib/reportingEngine';
import { canSeeContractValue } from '../lib/permissions';
import { EmployeePerformancePage } from './EmployeePerformancePage';

interface MyWorkHubProps {
  currentUser: UserRecord;
  users: UserRecord[];
  clients: ClientRecord[];
  packages: PackageRecord[];
  assignments: AssignmentRecord[];
  tasks: TaskRecord[];
  dailyLogs: DailyLogRecord[];
  extraNotes: ExtraNoteRecord[];
  kpiScores: KpiScoreRecord[];
  capacityLogs: CapacityLogRecord[];
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onCreateDailyLog: (logData: {
    user_id: string;
    date: string;
    summary_text: string;
    linked_task_ids: string[];
  }) => Promise<void>;
  onCreateExtraNote: (noteData: {
    user_id: string;
    date: string;
    note_text: string;
    category: string;
  }) => Promise<void>;
  onGenerateKpiScore: (userId: string, periodType: PerformancePeriodType, referenceDate: Date) => Promise<void>;
  onNavigateToModule?: (module: AppModuleId, prefillAssigneeName?: string) => void;
}

// Ordering only, not section presence: am_agent/am_team_lead/sales lead with
// their client relationships (that's their actual unit of work — same
// distinction lib/capacity.ts already draws for usedCapacity); every other
// role leads with tasks. Every role except ai_engineer gets a My Clients
// section either way (see myClients below) — this only decides which section
// comes first.
const CLIENT_FIRST_LAYOUT_ROLES: UserRole[] = ['am_agent', 'am_team_lead', 'sales'];

// ai_engineer has no client relationship of any kind in this app's model —
// not even the task-derived one graphic_designer/video_editor get — so it's
// the one role with no My Clients section at all.
const hasClientsSection = (role: UserRole) => role !== 'ai_engineer';

// Sales has no TaskRecord assignments in this app's model — a task section
// for them would always be empty, so it's simply omitted rather than shown
// as a permanent "no tasks" placeholder.
const hasTasksSection = (role: UserRole) => role !== 'sales';

// The three pooled-client departments, keyed by their ServiceType — same
// mapping serviceFilterForRole in lib/reportingEngine.ts uses.
const SERVICE_BY_ROLE: Partial<Record<UserRole, ServiceType>> = {
  media_buying_team_lead: 'media_buying',
  media_buying_agent: 'media_buying',
  seo_team_lead: 'seo',
  seo_agent: 'seo',
  social_media_team_lead: 'social_media',
  social_media_agent: 'social_media',
};
const SERVICE_TEAM_LEAD_ROLES: UserRole[] = ['media_buying_team_lead', 'seo_team_lead', 'social_media_team_lead'];

// graphic_designer/video_editor have no AssignmentRecord relationship (that
// machinery only exists for the three departments above — 'creative' is a
// valid ServiceType but no UI path ever creates an assignments row for it),
// so "their" clients are derived from active task assignment instead: a
// genuinely different, more transient signal than an owned relationship, but
// the only one this app's data model actually gives these two roles.
const TASK_DERIVED_CLIENT_ROLES: UserRole[] = ['graphic_designer', 'video_editor'];

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  completed: 'Completed',
  blocked: 'Blocked',
};

export const MyWorkHub: React.FC<MyWorkHubProps> = ({
  currentUser,
  users,
  clients,
  packages,
  assignments,
  tasks,
  dailyLogs,
  extraNotes,
  kpiScores,
  capacityLogs,
  onUpdateTaskStatus,
  onCreateDailyLog,
  onCreateExtraNote,
  onGenerateKpiScore,
  onNavigateToModule,
}) => {
  const roleInfo = getRoleInfo(currentUser.role);
  const layout: 'client-first' | 'task-first' = CLIENT_FIRST_LAYOUT_ROLES.includes(currentUser.role)
    ? 'client-first'
    : 'task-first';
  const showClients = hasClientsSection(currentUser.role);

  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3800);
  };

  const [isPerformanceOpen, setIsPerformanceOpen] = useState(false);

  const [isLoggingDailyActivity, setIsLoggingDailyActivity] = useState(false);
  const [dailySummary, setDailySummary] = useState('');
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);

  const [isLoggingExtraEffort, setIsLoggingExtraEffort] = useState(false);
  const [extraEffortText, setExtraEffortText] = useState('');
  const [isSubmittingExtraEffort, setIsSubmittingExtraEffort] = useState(false);

  const todayStr = useMemo(() => getTodayStr(), []);

  // ---------------------------------------------------------------------
  // My Clients — every role except ai_engineer (see hasClientsSection),
  // resolved differently per role's actual relationship to a client.
  // ---------------------------------------------------------------------
  const myClients = useMemo(() => {
    if (!showClients) return [];
    const role = currentUser.role;

    if (role === 'sales') {
      return clients.filter((c) => c.sales_owner_id === currentUser.id);
    }
    // am_team_lead: sees a client from the moment it's created (they're
    // responsible for receiving/routing it) — no status filter.
    if (role === 'am_team_lead') {
      return clients;
    }
    // am_agent: a lead has no am_agent_id yet, so this already excludes
    // pre-handoff clients without needing an explicit status filter.
    if (role === 'am_agent') {
      return clients.filter((c) => c.am_agent_id === currentUser.id);
    }

    const service = SERVICE_BY_ROLE[role];
    if (service) {
      const departmentClients = resolveDepartmentClients(service, clients, packages);
      if (SERVICE_TEAM_LEAD_ROLES.includes(role)) return departmentClients;
      // Agent: further narrowed to clients they're formally assigned to for
      // this exact service — mirrors resolveClientsForSubject's agent branch.
      return departmentClients.filter((c) =>
        assignments.some((a) => a.client_id === c.id && a.service_type === service && a.agent_id === currentUser.id)
      );
    }

    if (TASK_DERIVED_CLIENT_ROLES.includes(role)) {
      return clients.filter((c) => tasks.some((t) => t.client_id === c.id && t.assigned_to === currentUser.id));
    }

    return [];
  }, [showClients, currentUser.role, currentUser.id, clients, packages, assignments, tasks]);

  // ---------------------------------------------------------------------
  // My Tasks & Deadlines
  // ---------------------------------------------------------------------
  const showTasks = hasTasksSection(currentUser.role);
  const sortedTasks = useMemo(
    () => (showTasks ? getSortedEmployeeTasks(tasks, currentUser.id) : []),
    [showTasks, tasks, currentUser.id]
  );
  const overdueTasks = useMemo(() => sortedTasks.filter((t) => isTaskOverdue(t, todayStr)), [sortedTasks, todayStr]);
  const dueTodayTasks = useMemo(() => sortedTasks.filter((t) => isTaskDueToday(t, todayStr)), [sortedTasks, todayStr]);
  const activeTasks = useMemo(() => sortedTasks.filter((t) => t.status !== 'completed'), [sortedTasks]);

  // Deep-work escape hatch: whichever of the role's task-shaped modules is
  // actually available, preferring the richer Daily Operations board.
  const taskEscapeModule: AppModuleId | null = roleInfo.allowedModules.includes('daily_operations')
    ? 'daily_operations'
    : roleInfo.allowedModules.includes('tasks')
    ? 'tasks'
    : null;

  // Full-client-queue escape hatch: for AM/sales, 'onboarding' IS their
  // client queue (AMQueue/SalesPortalView). For the department roles this
  // section now also covers, 'onboarding' would route to AMQueue instead —
  // not their client queue at all — so they get service_briefs (their own
  // actual client-facing queue) if they have it, otherwise no escape hatch
  // rather than a wrong one. graphic_designer/video_editor have neither, so
  // this My Clients card is the only client view they get, full stop.
  const clientEscapeModule: AppModuleId | null = CLIENT_FIRST_LAYOUT_ROLES.includes(currentUser.role)
    ? roleInfo.allowedModules.includes('onboarding')
      ? 'onboarding'
      : null
    : roleInfo.allowedModules.includes('service_briefs')
    ? 'service_briefs'
    : null;

  const handleAdvanceStatus = async (task: TaskRecord) => {
    const order: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'completed'];
    const idx = order.indexOf(task.status);
    if (idx < 0 || idx >= order.length - 1) return;
    try {
      await onUpdateTaskStatus(task.id, order[idx + 1]);
      showNotification(`"${task.title}" moved to ${STATUS_LABELS[order[idx + 1]]}.`);
    } catch {
      showNotification('Unable to update task status.', 'error');
    }
  };

  // ---------------------------------------------------------------------
  // Daily Log & Extra Effort — self-only, same shape as DailyOperationsModule.tsx
  // ---------------------------------------------------------------------
  const myRecentLogs = useMemo(
    () =>
      dailyLogs
        .filter((l) => l.user_id === currentUser.id)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5),
    [dailyLogs, currentUser.id]
  );
  const myRecentExtraNotes = useMemo(
    () =>
      extraNotes
        .filter((n) => n.user_id === currentUser.id && n.category !== 'blocker')
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5),
    [extraNotes, currentUser.id]
  );

  const handleSubmitDailyLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dailySummary.trim()) return;
    setIsSubmittingLog(true);
    try {
      await onCreateDailyLog({
        user_id: currentUser.id,
        date: todayStr,
        summary_text: dailySummary.trim(),
        linked_task_ids: [],
      });
      setDailySummary('');
      setIsLoggingDailyActivity(false);
      showNotification('Daily activity log saved successfully.');
    } catch {
      showNotification('Unable to save the daily activity.', 'error');
    } finally {
      setIsSubmittingLog(false);
    }
  };

  const handleSubmitExtraEffort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraEffortText.trim()) return;
    setIsSubmittingExtraEffort(true);
    try {
      await onCreateExtraNote({
        user_id: currentUser.id,
        date: todayStr,
        note_text: extraEffortText.trim(),
        category: 'initiative',
      });
      setExtraEffortText('');
      setIsLoggingExtraEffort(false);
      showNotification('Extra effort documented successfully.');
    } catch {
      showNotification('Unable to save the extra effort note.', 'error');
    } finally {
      setIsSubmittingExtraEffort(false);
    }
  };

  // ---------------------------------------------------------------------
  // Sections
  // ---------------------------------------------------------------------
  const clientsSection = showClients && (
    <div className="p-4 rounded-[18px] space-y-3" style={{ background: 'var(--gradient-card)', border: '1px solid var(--border-medium)' }}>
      <div className="flex items-center justify-between pb-2 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-purple-400" />
          <h3 className="text-xs font-bold text-white">My Clients</h3>
        </div>
        <span className="text-[11px] text-stone-400 font-mono">{myClients.length}</span>
      </div>
      {myClients.length === 0 ? (
        <p className="text-xs text-stone-500 py-4 text-center">No clients currently assigned to you.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto">
          {myClients.map((client) => {
            const showValue = canSeeContractValue(currentUser.role, client.sales_owner_id === currentUser.id);
            return (
              <div
                key={client.id}
                className="p-3 rounded-xl border border-stone-800 bg-stone-900/60 flex items-center justify-between gap-2"
              >
                <div>
                  <p className="text-xs font-bold text-white">{client.name}</p>
                  <p className="text-[10px] text-stone-400 capitalize">{client.status}</p>
                </div>
                <div className="text-right">
                  {showValue && client.contract_value ? (
                    <span className="text-[10px] font-mono text-emerald-400 block">
                      {client.contract_value.toLocaleString()} SAR
                    </span>
                  ) : null}
                  {client.renewal_date && (
                    <span className="text-[10px] font-mono text-stone-500">Renews {client.renewal_date}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {onNavigateToModule && clientEscapeModule && (
        <button
          onClick={() => onNavigateToModule(clientEscapeModule)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[11px] font-bold text-purple-200 bg-purple-900/20 hover:bg-purple-800/40 hover:text-white border border-purple-700/30 transition-all"
        >
          <span>Open full client queue</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  const tasksSection = showTasks && (
    <div className="p-4 rounded-[18px] space-y-3" style={{ background: 'var(--gradient-card)', border: '1px solid var(--border-medium)' }}>
      <div className="flex items-center justify-between pb-2 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-purple-400" />
          <h3 className="text-xs font-bold text-white">My Tasks & Deadlines</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {overdueTasks.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-950/80 text-red-400 border border-red-500/40 font-mono">
              {overdueTasks.length} overdue
            </span>
          )}
          {dueTodayTasks.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-950/80 text-amber-300 border border-amber-500/40 font-mono">
              {dueTodayTasks.length} due today
            </span>
          )}
        </div>
      </div>

      {activeTasks.length === 0 ? (
        <div className="p-6 text-center text-stone-400 text-xs border border-dashed border-stone-800 rounded-xl">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5 opacity-80" />
          <p>All clear! No active tasks pending.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {activeTasks.map((task) => {
            const client = clients.find((c) => c.id === task.client_id);
            const overdue = isTaskOverdue(task, todayStr);
            const dueToday = isTaskDueToday(task, todayStr);
            return (
              <div
                key={task.id}
                className="p-3 rounded-xl border border-stone-800 hover:border-purple-500/40 bg-stone-900/60 transition-all flex items-center justify-between gap-3"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-white">{task.title}</span>
                    {overdue && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-950 text-red-400">Overdue</span>
                    )}
                    {!overdue && dueToday && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-950 text-amber-300">Due today</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 text-[11px] text-stone-400">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-purple-400" />
                      {client ? client.name : 'Unassigned client'}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {STATUS_LABELS[task.status]}
                    </span>
                  </div>
                </div>
                {task.status !== 'completed' && task.status !== 'blocked' && (
                  <button
                    onClick={() => handleAdvanceStatus(task)}
                    className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-purple-600/30 text-purple-200 hover:bg-purple-600/50 transition-colors"
                  >
                    Advance
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {onNavigateToModule && taskEscapeModule && (
        <button
          onClick={() => onNavigateToModule(taskEscapeModule)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[11px] font-bold text-purple-200 bg-purple-900/20 hover:bg-purple-800/40 hover:text-white border border-purple-700/30 transition-all"
        >
          <span>Open full task board</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  const dailyLogSection = (
    <div className="p-4 rounded-[18px] space-y-3" style={{ background: 'var(--gradient-card)', border: '1px solid var(--border-medium)' }}>
      <div className="flex items-center justify-between pb-2 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-400" />
          <h3 className="text-xs font-bold text-white">Daily Log</h3>
        </div>
        <button
          onClick={() => setIsLoggingDailyActivity(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white shadow-md hover:opacity-90 transition-all"
          style={{ background: 'var(--gradient-badge)', border: '1px solid var(--border-strong)' }}
        >
          <PlusCircle className="w-3.5 h-3.5 text-purple-200" />
          <span>Log Today's Activity</span>
        </button>
      </div>

      {isLoggingDailyActivity && (
        <form onSubmit={handleSubmitDailyLog} className="p-3 rounded-xl bg-stone-900/60 border border-stone-800 space-y-2">
          <textarea
            value={dailySummary}
            onChange={(e) => setDailySummary(e.target.value)}
            placeholder="What did you work on today?"
            rows={3}
            className="w-full px-3 py-2 rounded-lg text-xs bg-black/30 border border-stone-800 text-white outline-none focus:border-purple-400"
            autoFocus
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsLoggingDailyActivity(false);
                setDailySummary('');
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingLog || !dailySummary.trim()}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition-all"
            >
              {isSubmittingLog ? 'Saving...' : 'Save Log'}
            </button>
          </div>
        </form>
      )}

      {myRecentLogs.length === 0 ? (
        <p className="text-xs text-stone-500 py-2 text-center">No daily logs yet.</p>
      ) : (
        <div className="space-y-1.5">
          {myRecentLogs.map((log) => (
            <div key={log.id} className="p-2.5 rounded-lg bg-stone-900/50 border border-stone-800/60 text-xs">
              <span className="text-stone-500 font-mono text-[10px]">{log.date}</span>
              <p className="text-stone-200 mt-0.5">{log.summary_text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const extraEffortSection = (
    <div className="p-4 rounded-[18px] space-y-3" style={{ background: 'var(--gradient-card)', border: '1px solid var(--border-medium)' }}>
      <div className="flex items-center justify-between pb-2 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-300" />
          <h3 className="text-xs font-bold text-white">Log Extra Effort</h3>
        </div>
        <button
          onClick={() => setIsLoggingExtraEffort(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-amber-200 bg-amber-950/30 hover:bg-amber-900/40 border border-amber-800/40 transition-all"
          title="Document effort beyond normal task scope"
        >
          <Star className="w-3.5 h-3.5 text-amber-300" />
          <span>Log Extra Effort</span>
        </button>
      </div>

      {isLoggingExtraEffort && (
        <form onSubmit={handleSubmitExtraEffort} className="p-3 rounded-xl bg-stone-900/60 border border-stone-800 space-y-2">
          <textarea
            value={extraEffortText}
            onChange={(e) => setExtraEffortText(e.target.value)}
            placeholder="Describe the initiative or effort beyond your normal scope..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg text-xs bg-black/30 border border-stone-800 text-white outline-none focus:border-amber-400"
            autoFocus
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsLoggingExtraEffort(false);
                setExtraEffortText('');
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingExtraEffort || !extraEffortText.trim()}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-700 hover:bg-amber-600 disabled:opacity-50 transition-all"
            >
              {isSubmittingExtraEffort ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {myRecentExtraNotes.length === 0 ? (
        <p className="text-xs text-stone-500 py-2 text-center">Nothing documented yet.</p>
      ) : (
        <div className="space-y-1.5">
          {myRecentExtraNotes.map((note) => (
            <div key={note.id} className="p-2.5 rounded-lg bg-stone-900/50 border border-stone-800/60 text-xs">
              <span className="text-stone-500 font-mono text-[10px]">{note.date}</span>
              <p className="text-stone-200 mt-0.5">{note.note_text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const orderedSections =
    layout === 'client-first'
      ? [clientsSection, tasksSection, dailyLogSection, extraEffortSection]
      : [tasksSection, clientsSection, dailyLogSection, extraEffortSection];

  return (
    <div className="space-y-6" id="my-work-hub">
      {notification && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 shadow-lg transition-all ${
            notification.type === 'success'
              ? 'bg-[rgba(169,245,193,0.15)] border border-[var(--roas-good)] text-[var(--roas-good)]'
              : 'bg-[rgba(245,163,163,0.15)] border border-[var(--roas-bad)] text-[var(--roas-bad)]'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span className="font-semibold">{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-xs opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div
        className="p-4 rounded-[18px] flex flex-col md:flex-row md:items-center justify-between gap-4"
        style={{ background: 'var(--gradient-card)', border: '1px solid var(--border-medium)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shadow-md shrink-0"
            style={{ background: 'var(--gradient-badge)', border: '1px solid var(--border-strong)' }}
          >
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Welcome, {currentUser.name}</h2>
            <p className="text-xs text-stone-400 mt-0.5">
              {roleInfo.englishTitle} • {todayStr}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsPerformanceOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-200 bg-emerald-900/20 hover:bg-emerald-800/40 hover:text-white border border-emerald-700/30 transition-all"
        >
          <Gauge className="w-3.5 h-3.5" />
          <span>My Performance</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Sections, ordered by layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {orderedSections.map((section, i) => (
          <React.Fragment key={i}>{section}</React.Fragment>
        ))}
      </div>

      {isPerformanceOpen && (
        <EmployeePerformancePage
          employee={currentUser}
          users={users}
          clients={clients}
          tasks={tasks}
          capacityLogs={capacityLogs}
          kpiScores={kpiScores}
          extraNotes={extraNotes}
          onGenerateKpiScore={onGenerateKpiScore}
          onClose={() => setIsPerformanceOpen(false)}
          canGenerate={false}
        />
      )}
    </div>
  );
};
