import React, { useState, useMemo } from 'react';
import {
  Target,
  TrendingUp,
  DollarSign,
  Calendar,
  User,
  Users,
  CheckCircle2,
  PauseCircle,
  Clock,
  AlertTriangle,
  Plus,
  Edit3,
  Filter,
  Search,
  X,
  ExternalLink,
  BarChart3,
  Layers,
  Eye,
  MousePointer,
  RefreshCw,
  SlidersHorizontal,
  Building2,
  ChevronRight,
  Info,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  CampaignRecord,
  CampaignStatus,
  ClientRecord,
  UserRecord,
  PackageRecord,
  BriefRecord,
  TaskRecord,
  DailyLogRecord,
  ExtraNoteRecord,
  AssignmentRecord,
} from '../types/database';
import { getRoleInfo } from '../data/roles';
import { ClientDashboard } from './ClientDashboard';

interface CampaignManagementModuleProps {
  campaigns: CampaignRecord[];
  clients: ClientRecord[];
  users: UserRecord[];
  currentUser: UserRecord;
  packages: PackageRecord[];
  briefs: BriefRecord[];
  tasks: TaskRecord[];
  dailyLogs: DailyLogRecord[];
  extraNotes: ExtraNoteRecord[];
  assignments: AssignmentRecord[];
  onCreateCampaign: (campaignData: Partial<CampaignRecord>) => Promise<void> | void;
  onUpdateCampaign: (id: string, updates: Partial<CampaignRecord>) => Promise<void> | void;
  isLoading?: boolean;
}

// Helpers to extract campaign attributes safely whether stored at top-level or in results JSON
export const getCampaignName = (c: CampaignRecord): string =>
  c.name || c.results?.name || c.campaign_id_external || 'حملة إعلانية ممولة';

export const getCampaignStatus = (c: CampaignRecord): CampaignStatus =>
  c.status || c.results?.status || 'active';

export const getCampaignObjective = (c: CampaignRecord): string =>
  c.objective || c.results?.objective || 'التحويلات والمبيعات (Conversions)';

export const getCampaignBudget = (c: CampaignRecord): number =>
  c.budget !== undefined && c.budget !== null ? c.budget : (c.results?.budget ?? c.spend ?? 0);

export const getCampaignStartDate = (c: CampaignRecord): string =>
  c.start_date || c.results?.start_date || c.date || '';

export const getCampaignEndDate = (c: CampaignRecord): string | null =>
  c.end_date || c.results?.end_date || null;

export const getCampaignOwnerId = (c: CampaignRecord): string | null =>
  c.owner_id || c.results?.owner_id || null;

export const getCampaignTeam = (c: CampaignRecord): string =>
  c.team || c.results?.team || 'Media Buying';

// Platform metadata styling
const PLATFORM_CONFIG: Record<
  string,
  { label: string; enLabel: string; bg: string; text: string; border: string; iconLabel: string }
> = {
  meta: {
    label: 'ميتا (Meta / Facebook & Instagram)',
    enLabel: 'Meta Ads',
    bg: 'rgba(24, 119, 242, 0.15)',
    text: '#60a5fa',
    border: 'rgba(24, 119, 242, 0.3)',
    iconLabel: 'Meta',
  },
  google: {
    label: 'جوجل (Google Ads & Search)',
    enLabel: 'Google Ads',
    bg: 'rgba(234, 67, 53, 0.15)',
    text: '#f87171',
    border: 'rgba(234, 67, 53, 0.3)',
    iconLabel: 'Google',
  },
  tiktok: {
    label: 'تيك توك (TikTok Ads)',
    enLabel: 'TikTok Ads',
    bg: 'rgba(0, 242, 234, 0.15)',
    text: '#22d3ee',
    border: 'rgba(0, 242, 234, 0.3)',
    iconLabel: 'TikTok',
  },
  linkedin: {
    label: 'لينكد إن (LinkedIn Ads)',
    enLabel: 'LinkedIn Ads',
    bg: 'rgba(10, 102, 194, 0.15)',
    text: '#38bdf8',
    border: 'rgba(10, 102, 194, 0.3)',
    iconLabel: 'LinkedIn',
  },
  snapchat: {
    label: 'سناب شات (Snapchat Ads)',
    enLabel: 'Snapchat Ads',
    bg: 'rgba(255, 252, 0, 0.15)',
    text: '#fde047',
    border: 'rgba(255, 252, 0, 0.3)',
    iconLabel: 'Snapchat',
  },
  x: {
    label: 'إكس (X / Twitter Ads)',
    enLabel: 'X Ads',
    bg: 'rgba(255, 255, 255, 0.1)',
    text: '#e2e8f0',
    border: 'rgba(255, 255, 255, 0.2)',
    iconLabel: 'X',
  },
};

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
> = {
  active: {
    label: 'نشطة (Active)',
    bg: 'rgba(169, 245, 193, 0.15)',
    text: 'var(--roas-good)',
    border: 'rgba(169, 245, 193, 0.3)',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  },
  paused: {
    label: 'متوقفة مؤقتاً (Paused)',
    bg: 'rgba(245, 226, 154, 0.15)',
    text: 'var(--roas-mid)',
    border: 'rgba(245, 226, 154, 0.3)',
    icon: <PauseCircle className="w-3.5 h-3.5 text-amber-400" />,
  },
  completed: {
    label: 'مكتملة (Completed)',
    bg: 'rgba(168, 155, 184, 0.15)',
    text: 'var(--lilac)',
    border: 'rgba(168, 155, 184, 0.3)',
    icon: <Clock className="w-3.5 h-3.5 text-purple-300" />,
  },
  draft: {
    label: 'مسودة (Draft)',
    bg: 'rgba(120, 113, 108, 0.15)',
    text: '#d6d3d1',
    border: 'rgba(120, 113, 108, 0.3)',
    icon: <Layers className="w-3.5 h-3.5 text-stone-400" />,
  },
  archived: {
    label: 'مؤرشفة (Archived)',
    bg: 'rgba(100, 116, 139, 0.15)',
    text: '#94a3b8',
    border: 'rgba(100, 116, 139, 0.3)',
    icon: <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />,
  },
};

export const CampaignManagementModule: React.FC<CampaignManagementModuleProps> = ({
  campaigns,
  clients,
  users,
  currentUser,
  packages,
  briefs,
  tasks,
  dailyLogs,
  extraNotes,
  assignments,
  onCreateCampaign,
  onUpdateCampaign,
  isLoading = false,
}) => {
  const roleInfo = getRoleInfo(currentUser.role);

  // Filter States
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // UI Modal States
  const [selectedCampaignForDetails, setSelectedCampaignForDetails] = useState<CampaignRecord | null>(null);
  const [dashboardClientId, setDashboardClientId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [campaignToEdit, setCampaignToEdit] = useState<CampaignRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form State for Create / Edit
  const [formData, setFormData] = useState({
    clientId: '',
    name: '',
    platform: 'meta',
    objective: 'التحويلات والمبيعات (Conversions / Purchases)',
    status: 'active' as CampaignStatus,
    budget: 5000,
    spend: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    ownerId: currentUser.id,
    team: 'Media Buying',
    externalId: '',
    // Metrics in results
    impressions: '',
    clicks: '',
    conversions: '',
    roas: '',
    ctr: '',
    cpc: '',
    cpa: '',
  });

  // -------------------------------------------------------------
  // 1. RLS ACCESS & VISIBILITY ENFORCEMENT
  // -------------------------------------------------------------
  const canCreate = useMemo(() => {
    return !!roleInfo.canCreateCampaign;
  }, [roleInfo]);

  const canEdit = (campaign: CampaignRecord): boolean => {
    // Executive and Head of Technical are view-only
    if (currentUser.role === 'executive' || currentUser.role === 'head_of_technical') {
      return false;
    }
    // Media Buying Team Lead has full management permissions across all campaigns
    if (currentUser.role === 'media_buying_team_lead') {
      return true;
    }
    // Media Buying Agent: edit access is based on client assignment, not who created/owns
    // the campaign — an assigned agent can edit every campaign for their client, even ones
    // their team lead created.
    if (currentUser.role === 'media_buying_agent') {
      return assignments.some(
        (a) =>
          a.client_id === campaign.client_id &&
          a.service_type === 'media_buying' &&
          a.agent_id === currentUser.id
      );
    }
    // AM Agent: same client-assignment rule (client.am_agent_id), not ownership/creator —
    // can edit any campaign for a client formally assigned to them.
    if (currentUser.role === 'am_agent') {
      const client = clients.find((c) => c.id === campaign.client_id);
      return client?.am_agent_id === currentUser.id;
    }
    // AM Team Lead remains view-only
    return false;
  };

  // Visible Campaigns according to Supabase RLS
  const visibleCampaigns = useMemo(() => {
    // 1. Sales Team: Strictly NO access to campaign data
    if (currentUser.role === 'sales') {
      return [];
    }
    // 2. Executive & Head of Technical: see all campaigns (view-only)
    if (currentUser.role === 'executive' || currentUser.role === 'head_of_technical') {
      return campaigns;
    }
    // 3. Media Buying Lead: see all campaigns
    if (currentUser.role === 'media_buying_team_lead') {
      return campaigns;
    }
    // 4. Media Buying Agent: ONLY campaigns for clients they're personally assigned to —
    //    strict client-based exclusivity, not campaign ownership.
    if (currentUser.role === 'media_buying_agent') {
      const myClientIds = new Set(
        assignments
          .filter((a) => a.service_type === 'media_buying' && a.agent_id === currentUser.id)
          .map((a) => a.client_id)
      );
      return campaigns.filter((c) => myClientIds.has(c.client_id));
    }
    // 5. AM Team Lead: all campaigns for clients in agency
    if (currentUser.role === 'am_team_lead') {
      return campaigns;
    }
    // 6. AM Agent: campaigns of assigned clients
    if (currentUser.role === 'am_agent') {
      const myClientIds = new Set(
        clients.filter((c) => c.am_agent_id === currentUser.id).map((c) => c.id)
      );
      return campaigns.filter((c) => myClientIds.has(c.client_id));
    }
    return [];
  }, [campaigns, clients, currentUser, assignments]);

  // Clients accessible to current user for campaign linking
  const accessibleClients = useMemo(() => {
    if (currentUser.role === 'executive' || currentUser.role === 'head_of_technical' || currentUser.role === 'media_buying_team_lead') {
      return clients;
    }
    if (currentUser.role === 'media_buying_agent') {
      const myClientIds = new Set(
        assignments
          .filter((a) => a.service_type === 'media_buying' && a.agent_id === currentUser.id)
          .map((a) => a.client_id)
      );
      return clients.filter((c) => myClientIds.has(c.id));
    }
    if (currentUser.role === 'am_agent') {
      return clients.filter((c) => c.am_agent_id === currentUser.id);
    }
    if (currentUser.role === 'sales') {
      return clients.filter((c) => c.sales_owner_id === currentUser.id);
    }
    return clients;
  }, [clients, currentUser, assignments]);

  // -------------------------------------------------------------
  // 2. DASHBOARD KPI SUMMARY COMPUTATION
  // (Derived exclusively from available data without inventing artificial metrics)
  // -------------------------------------------------------------
  const dashboardStats = useMemo(() => {
    const total = visibleCampaigns.length;
    const active = visibleCampaigns.filter((c) => getCampaignStatus(c) === 'active').length;
    const paused = visibleCampaigns.filter((c) => getCampaignStatus(c) === 'paused').length;
    const completed = visibleCampaigns.filter((c) => getCampaignStatus(c) === 'completed').length;

    const totalSpend = visibleCampaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
    const totalBudget = visibleCampaigns.reduce((sum, c) => sum + getCampaignBudget(c), 0);
    const budgetUtilization = totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0;

    // Only compute ROAS if roas is recorded in campaign results
    const campaignsWithRoas = visibleCampaigns.filter(
      (c) => c.results?.roas !== undefined && typeof c.results.roas === 'number'
    );
    const avgRoas =
      campaignsWithRoas.length > 0
        ? campaignsWithRoas.reduce((sum, c) => sum + c.results.roas, 0) / campaignsWithRoas.length
        : null;

    // Total conversions strictly from existing results
    const campaignsWithConversions = visibleCampaigns.filter(
      (c) => c.results?.conversions !== undefined && typeof c.results.conversions === 'number'
    );
    const totalConversions =
      campaignsWithConversions.length > 0
        ? campaignsWithConversions.reduce((sum, c) => sum + c.results.conversions, 0)
        : null;

    // Platform breakdown
    const platformsMap: Record<string, { count: number; spend: number }> = {};
    visibleCampaigns.forEach((c) => {
      const plat = c.platform || 'other';
      if (!platformsMap[plat]) {
        platformsMap[plat] = { count: 0, spend: 0 };
      }
      platformsMap[plat].count += 1;
      platformsMap[plat].spend += c.spend || 0;
    });

    return {
      total,
      active,
      paused,
      completed,
      totalSpend,
      totalBudget,
      budgetUtilization,
      avgRoas,
      totalConversions,
      platformsMap,
    };
  }, [visibleCampaigns]);

  // -------------------------------------------------------------
  // 3. FILTERING LOGIC
  // -------------------------------------------------------------
  const filteredCampaigns = useMemo(() => {
    return visibleCampaigns.filter((c) => {
      // 1. Client filter
      if (selectedClientId !== 'all' && c.client_id !== selectedClientId) {
        return false;
      }
      // 2. Platform filter
      if (selectedPlatform !== 'all' && c.platform !== selectedPlatform) {
        return false;
      }
      // 3. Status filter
      if (selectedStatus !== 'all' && getCampaignStatus(c) !== selectedStatus) {
        return false;
      }
      // 4. Team filter
      if (selectedTeam !== 'all' && getCampaignTeam(c) !== selectedTeam) {
        return false;
      }
      // 5. Employee / Owner filter
      if (selectedOwnerId !== 'all' && getCampaignOwnerId(c) !== selectedOwnerId) {
        return false;
      }
      // 6. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const name = getCampaignName(c).toLowerCase();
        const extId = (c.campaign_id_external || '').toLowerCase();
        const client = clients.find((cl) => cl.id === c.client_id);
        const clientName = (client?.name || '').toLowerCase();
        if (!name.includes(query) && !extId.includes(query) && !clientName.includes(query)) {
          return false;
        }
      }
      // 7. Date filter
      if (selectedDateRange !== 'all') {
        const cDate = getCampaignStartDate(c);
        if (!cDate) return true;
        const now = new Date();
        const campaignDate = new Date(cDate);
        const diffDays = (now.getTime() - campaignDate.getTime()) / (1000 * 3600 * 24);

        if (selectedDateRange === 'today' && diffDays > 1) return false;
        if (selectedDateRange === '7d' && diffDays > 7) return false;
        if (selectedDateRange === '30d' && diffDays > 30) return false;
      }

      return true;
    });
  }, [
    visibleCampaigns,
    selectedClientId,
    selectedPlatform,
    selectedStatus,
    selectedTeam,
    selectedOwnerId,
    selectedDateRange,
    searchQuery,
    clients,
  ]);

  // Handle open create modal
  const handleOpenCreateModal = () => {
    setActionError(null);
    setFormData({
      clientId: accessibleClients[0]?.id || '',
      name: '',
      platform: 'meta',
      objective: 'التحويلات والمبيعات (Conversions / Purchases)',
      status: 'active',
      budget: 5000,
      spend: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      ownerId: currentUser.id,
      team: 'Media Buying',
      externalId: '',
      impressions: '',
      clicks: '',
      conversions: '',
      roas: '',
      ctr: '',
      cpc: '',
      cpa: '',
    });
    setCampaignToEdit(null);
    setIsCreateModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEditModal = (campaign: CampaignRecord) => {
    if (!canEdit(campaign)) {
      setActionError('ليس لديك صلاحية لتعديل هذه الحملة وفق قواعد أمان RLS');
      return;
    }
    setActionError(null);
    setCampaignToEdit(campaign);
    setFormData({
      clientId: campaign.client_id,
      name: getCampaignName(campaign),
      platform: campaign.platform,
      objective: getCampaignObjective(campaign),
      status: getCampaignStatus(campaign),
      budget: getCampaignBudget(campaign),
      spend: campaign.spend || 0,
      startDate: getCampaignStartDate(campaign),
      endDate: getCampaignEndDate(campaign) || '',
      ownerId: getCampaignOwnerId(campaign) || currentUser.id,
      team: getCampaignTeam(campaign),
      externalId: campaign.campaign_id_external || '',
      impressions: campaign.results?.impressions !== undefined ? String(campaign.results.impressions) : '',
      clicks: campaign.results?.clicks !== undefined ? String(campaign.results.clicks) : '',
      conversions: campaign.results?.conversions !== undefined ? String(campaign.results.conversions) : '',
      roas: campaign.results?.roas !== undefined ? String(campaign.results.roas) : '',
      ctr: campaign.results?.ctr !== undefined ? String(campaign.results.ctr) : '',
      cpc: campaign.results?.cpc !== undefined ? String(campaign.results.cpc) : '',
      cpa: campaign.results?.cpa !== undefined ? String(campaign.results.cpa) : '',
    });
    setIsCreateModalOpen(true);
  };

  // Submit Create or Edit
  const handleSubmitCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId) {
      setActionError('يرجى اختيار العميل المرتبط بالحملة');
      return;
    }
    if (!formData.name.trim()) {
      setActionError('يرجى إدخال اسم الحملة الإعلانية');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      // Build results object strictly with values that the user provided
      const existingResults = campaignToEdit?.results || {};
      const newResults: Record<string, any> = {
        ...existingResults,
        name: formData.name.trim(),
        objective: formData.objective,
        status: formData.status,
        budget: Number(formData.budget),
        start_date: formData.startDate,
        end_date: formData.endDate || null,
        owner_id: formData.ownerId,
        team: formData.team,
      };

      if (formData.impressions) newResults.impressions = Number(formData.impressions);
      if (formData.clicks) newResults.clicks = Number(formData.clicks);
      if (formData.conversions) newResults.conversions = Number(formData.conversions);
      if (formData.roas) newResults.roas = Number(formData.roas);
      if (formData.ctr) newResults.ctr = Number(formData.ctr);
      if (formData.cpc) newResults.cpc = Number(formData.cpc);
      if (formData.cpa) newResults.cpa = Number(formData.cpa);

      const payload: Partial<CampaignRecord> = {
        client_id: formData.clientId,
        name: formData.name.trim(),
        platform: formData.platform,
        objective: formData.objective,
        status: formData.status,
        campaign_id_external: formData.externalId.trim() || null,
        spend: Number(formData.spend) || 0,
        budget: Number(formData.budget) || null,
        start_date: formData.startDate || null,
        end_date: formData.endDate || null,
        owner_id: formData.ownerId || null,
        team: formData.team || 'Media Buying',
        date: formData.startDate || new Date().toISOString().split('T')[0],
        results: newResults,
      };

      if (campaignToEdit) {
        await onUpdateCampaign(campaignToEdit.id, payload);
        // If details modal is open for this campaign, refresh it
        if (selectedCampaignForDetails?.id === campaignToEdit.id) {
          setSelectedCampaignForDetails({
            ...campaignToEdit,
            ...payload,
            results: newResults,
          } as CampaignRecord);
        }
      } else {
        await onCreateCampaign(payload);
      }

      setIsCreateModalOpen(false);
      setCampaignToEdit(null);
    } catch (err: any) {
      setActionError(err?.message || 'حدث خطأ أثناء حفظ بيانات الحملة');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Toggle Status (Active <-> Paused)
  const handleQuickToggleStatus = async (campaign: CampaignRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit(campaign)) return;
    const currentSt = getCampaignStatus(campaign);
    const newSt: CampaignStatus = currentSt === 'active' ? 'paused' : 'active';
    try {
      await onUpdateCampaign(campaign.id, {
        status: newSt,
        results: {
          ...(campaign.results || {}),
          status: newSt,
        },
      });
      if (selectedCampaignForDetails?.id === campaign.id) {
        setSelectedCampaignForDetails({
          ...selectedCampaignForDetails,
          status: newSt,
          results: { ...(selectedCampaignForDetails.results || {}), status: newSt },
        });
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setSelectedClientId('all');
    setSelectedPlatform('all');
    setSelectedStatus('all');
    setSelectedTeam('all');
    setSelectedOwnerId('all');
    setSelectedDateRange('all');
    setSearchQuery('');
  };

  const isFiltered =
    selectedClientId !== 'all' ||
    selectedPlatform !== 'all' ||
    selectedStatus !== 'all' ||
    selectedTeam !== 'all' ||
    selectedOwnerId !== 'all' ||
    selectedDateRange !== 'all' ||
    searchQuery.trim() !== '';

  const activeDashboardClient = clients.find((c) => c.id === dashboardClientId) || null;

  return (
    <div className="space-y-6 animate-fadeIn" dir="rtl">
      {/* ------------------------------------------------------------- */}
      {/* MODULE HEADER & RLS SCOPE BANNER */}
      {/* ------------------------------------------------------------- */}
      <div
        className="rounded-[20px] p-5 shadow-xl relative overflow-hidden"
        style={{
          background: 'var(--gradient-hero)',
          border: '1px solid var(--border-medium)',
        }}
      >
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="text-[11px] px-3 py-1 font-bold flex items-center gap-1.5"
                style={{
                  borderRadius: 'var(--radius-pill)',
                  background: 'rgba(123, 47, 247, 0.35)',
                  color: 'var(--purple-light)',
                  border: '1px solid var(--border-strong)',
                }}
              >
                <Target className="w-3.5 h-3.5 text-purple-300" />
                <span>وحدة إدارة الحملات الإعلانية (Campaign Management)</span>
              </span>

              <span
                className="text-[11px] px-2.5 py-0.5 font-medium flex items-center gap-1"
                style={{
                  borderRadius: 'var(--radius-pill)',
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                }}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>حماية RLS نشطة • {roleInfo.arabicTitle}</span>
              </span>
            </div>

            <h2 className="text-xl font-bold" style={{ color: 'var(--white)' }}>
              إدارة ومتابعة الحملات الإعلانية الممولة (Paid Advertising Hub)
            </h2>
            <p className="text-xs leading-relaxed max-w-3xl" style={{ color: 'var(--lilac)' }}>
              ربط مباشر بين العميل، والخدمة التسويقية، والموظف المسؤول، مع تحكم دقيق بمؤشرات الأداء، والميزانيات، ونسب الاستهلاك، ومتابعة العائد الإعلاني الفعلي عبر مختلف المنصات (Meta, Google, TikTok, LinkedIn).
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {canCreate ? (
              <button
                id="btn-create-campaign-main"
                onClick={handleOpenCreateModal}
                className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg active:scale-98"
                style={{
                  background: 'var(--gradient-badge)',
                  color: 'var(--white)',
                  border: '1px solid var(--border-strong)',
                }}
              >
                <Plus className="w-4 h-4 text-white" />
                <span>إنشاء حملة إعلانية جديدة</span>
              </button>
            ) : (
              <div
                className="px-3 py-1.5 rounded-xl text-[11px] flex items-center gap-1.5"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--lilac)',
                  border: '1px solid var(--border-subtle)',
                }}
                title="إنشاء الحملات مخصص لفريق الميديا باينج والإدارة الفنية وحسابات العملاء"
              >
                <Info className="w-3.5 h-3.5 text-stone-400" />
                <span>صلاحية العرض والتحليل (Read-Only)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DASHBOARD SUMMARY CARDS */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Total Visible Campaigns */}
        <div
          className="p-4 rounded-2xl transition-all"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between text-xs mb-2" style={{ color: 'var(--lilac)' }}>
            <span>إجمالي الحملات</span>
            <Target className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold font-mono" style={{ color: 'var(--white)' }}>
            {dashboardStats.total}
          </div>
          <div className="text-[10px] mt-1 text-stone-400">
            {dashboardStats.active} نشطة • {dashboardStats.paused} متوقفة
          </div>
        </div>

        {/* Card 2: Total Spend */}
        <div
          className="p-4 rounded-2xl transition-all"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between text-xs mb-2" style={{ color: 'var(--lilac)' }}>
            <span>الإنفاق الفعلي</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono" style={{ color: 'var(--roas-good)' }}>
            ${dashboardStats.totalSpend.toLocaleString()}
          </div>
          <div className="text-[10px] mt-1 text-stone-400">
            من إجمالي ${dashboardStats.totalBudget.toLocaleString()}
          </div>
        </div>

        {/* Card 3: Budget Utilization */}
        <div
          className="p-4 rounded-2xl transition-all"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between text-xs mb-2" style={{ color: 'var(--lilac)' }}>
            <span>نسبة استهلاك الميزانية</span>
            <BarChart3 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono" style={{ color: 'var(--roas-mid)' }}>
            {dashboardStats.budgetUtilization.toFixed(1)}%
          </div>
          <div className="w-full bg-stone-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(dashboardStats.budgetUtilization, 100)}%`,
                background:
                  dashboardStats.budgetUtilization > 90
                    ? 'var(--roas-bad)'
                    : dashboardStats.budgetUtilization > 60
                    ? 'var(--roas-mid)'
                    : 'var(--roas-good)',
              }}
            />
          </div>
        </div>

        {/* Card 4: Average ROAS */}
        <div
          className="p-4 rounded-2xl transition-all"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between text-xs mb-2" style={{ color: 'var(--lilac)' }}>
            <span>متوسط العائد ROAS</span>
            <TrendingUp className="w-4 h-4 text-purple-300" />
          </div>
          <div className="text-xl font-bold font-mono" style={{ color: 'var(--white)' }}>
            {dashboardStats.avgRoas !== null ? `${dashboardStats.avgRoas.toFixed(2)}x` : '—'}
          </div>
          <div className="text-[10px] mt-1 text-stone-400">
            {dashboardStats.avgRoas !== null ? 'محسوب من النتائج المسجلة' : 'لا توجد بيانات ROAS'}
          </div>
        </div>

        {/* Card 5: Total Conversions */}
        <div
          className="p-4 rounded-2xl transition-all"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between text-xs mb-2" style={{ color: 'var(--lilac)' }}>
            <span>إجمالي التحويلات</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-300">
            {dashboardStats.totalConversions !== null ? dashboardStats.totalConversions.toLocaleString() : '—'}
          </div>
          <div className="text-[10px] mt-1 text-stone-400">
            {dashboardStats.totalConversions !== null ? 'تحويل / صفقة محققة' : 'لا توجد بيانات'}
          </div>
        </div>

        {/* Card 6: Active Platforms */}
        <div
          className="p-4 rounded-2xl transition-all"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between text-xs mb-2" style={{ color: 'var(--lilac)' }}>
            <span>المنصات المستخدمة</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold font-mono" style={{ color: 'var(--white)' }}>
            {Object.keys(dashboardStats.platformsMap).length}
          </div>
          <div className="text-[10px] mt-1 text-stone-400 truncate">
            {Object.keys(dashboardStats.platformsMap).join(', ') || 'لا توجد'}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PLATFORMS BREAKDOWN STRIP */}
      {/* ------------------------------------------------------------- */}
      {Object.keys(dashboardStats.platformsMap).length > 0 && (
        <div
          className="p-4 rounded-2xl flex flex-wrap items-center gap-3"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span className="text-xs font-bold text-stone-300 flex items-center gap-1.5 ml-2">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>توزيع المنصات:</span>
          </span>

          {Object.entries(dashboardStats.platformsMap).map(([plat, rawData]) => {
            const data = rawData as { count: number; spend: number };
            const cfg = PLATFORM_CONFIG[plat] || {
              label: plat,
              enLabel: plat,
              bg: 'rgba(255, 255, 255, 0.1)',
              text: '#ffffff',
              border: 'rgba(255, 255, 255, 0.2)',
            };
            return (
              <button
                key={plat}
                onClick={() => setSelectedPlatform(selectedPlatform === plat ? 'all' : plat)}
                className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 transition-all ${
                  selectedPlatform === plat ? 'ring-2 ring-purple-400 shadow-md' : 'hover:opacity-90'
                }`}
                style={{
                  background: cfg.bg,
                  color: cfg.text,
                  border: `1px solid ${cfg.border}`,
                }}
              >
                <span className="font-bold">{cfg.enLabel}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 font-mono">
                  {data.count} حملات • ${data.spend.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* FILTERS TOOLBAR */}
      {/* ------------------------------------------------------------- */}
      <div
        className="p-4 rounded-2xl space-y-3"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث باسم الحملة، معرف المنصة، أو اسم العميل..."
              className="w-full pl-4 pr-9 py-2 rounded-xl text-xs outline-none transition-all"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--white)',
                border: '1px solid var(--border-medium)',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Clear Filters */}
          {isFiltered && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>إعادة تعيين الفلاتر</span>
            </button>
          )}
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1 border-t border-white/5">
          {/* 1. Client Filter */}
          <div className="space-y-1">
            <label className="text-[10px] text-stone-400 font-bold flex items-center gap-1">
              <Building2 className="w-3 h-3 text-purple-400" />
              <span>العميل:</span>
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl text-xs outline-none cursor-pointer"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--white)',
                border: '1px solid var(--border-medium)',
              }}
            >
              <option value="all" className="bg-stone-900 text-white">
                جميع العملاء ({accessibleClients.length})
              </option>
              {accessibleClients.map((c) => (
                <option key={c.id} value={c.id} className="bg-stone-900 text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Platform Filter */}
          <div className="space-y-1">
            <label className="text-[10px] text-stone-400 font-bold flex items-center gap-1">
              <Layers className="w-3 h-3 text-purple-400" />
              <span>المنصة:</span>
            </label>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl text-xs outline-none cursor-pointer"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--white)',
                border: '1px solid var(--border-medium)',
              }}
            >
              <option value="all" className="bg-stone-900 text-white">
                جميع المنصات
              </option>
              <option value="meta" className="bg-stone-900 text-white">
                Meta Ads (FB/Insta)
              </option>
              <option value="google" className="bg-stone-900 text-white">
                Google Ads
              </option>
              <option value="tiktok" className="bg-stone-900 text-white">
                TikTok Ads
              </option>
              <option value="linkedin" className="bg-stone-900 text-white">
                LinkedIn Ads
              </option>
              <option value="snapchat" className="bg-stone-900 text-white">
                Snapchat Ads
              </option>
              <option value="x" className="bg-stone-900 text-white">
                X Ads
              </option>
            </select>
          </div>

          {/* 3. Status Filter */}
          <div className="space-y-1">
            <label className="text-[10px] text-stone-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-purple-400" />
              <span>الحالة:</span>
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl text-xs outline-none cursor-pointer"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--white)',
                border: '1px solid var(--border-medium)',
              }}
            >
              <option value="all" className="bg-stone-900 text-white">
                جميع الحالات
              </option>
              <option value="active" className="bg-stone-900 text-white">
                نشطة (Active)
              </option>
              <option value="paused" className="bg-stone-900 text-white">
                متوقفة (Paused)
              </option>
              <option value="completed" className="bg-stone-900 text-white">
                مكتملة (Completed)
              </option>
              <option value="draft" className="bg-stone-900 text-white">
                مسودة (Draft)
              </option>
              <option value="archived" className="bg-stone-900 text-white">
                مؤرشفة (Archived)
              </option>
            </select>
          </div>

          {/* 4. Date Range Filter */}
          <div className="space-y-1">
            <label className="text-[10px] text-stone-400 font-bold flex items-center gap-1">
              <Calendar className="w-3 h-3 text-purple-400" />
              <span>التاريخ / الفترة:</span>
            </label>
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl text-xs outline-none cursor-pointer"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--white)',
                border: '1px solid var(--border-medium)',
              }}
            >
              <option value="all" className="bg-stone-900 text-white">
                جميع الفترات
              </option>
              <option value="today" className="bg-stone-900 text-white">
                اليوم
              </option>
              <option value="7d" className="bg-stone-900 text-white">
                آخر 7 أيام
              </option>
              <option value="30d" className="bg-stone-900 text-white">
                آخر 30 يوماً
              </option>
            </select>
          </div>

          {/* 5. Team Filter */}
          <div className="space-y-1">
            <label className="text-[10px] text-stone-400 font-bold flex items-center gap-1">
              <Users className="w-3 h-3 text-purple-400" />
              <span>الفريق المسؤول:</span>
            </label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl text-xs outline-none cursor-pointer"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--white)',
                border: '1px solid var(--border-medium)',
              }}
            >
              <option value="all" className="bg-stone-900 text-white">
                جميع الفرق
              </option>
              <option value="Media Buying" className="bg-stone-900 text-white">
                Media Buying
              </option>
              <option value="Account Management" className="bg-stone-900 text-white">
                Account Management
              </option>
              <option value="Creative & Design" className="bg-stone-900 text-white">
                Creative & Design
              </option>
            </select>
          </div>

          {/* 6. Employee / Owner Filter */}
          <div className="space-y-1">
            <label className="text-[10px] text-stone-400 font-bold flex items-center gap-1">
              <User className="w-3 h-3 text-purple-400" />
              <span>الموظف المسؤول:</span>
            </label>
            <select
              value={selectedOwnerId}
              onChange={(e) => setSelectedOwnerId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl text-xs outline-none cursor-pointer"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--white)',
                border: '1px solid var(--border-medium)',
              }}
            >
              <option value="all" className="bg-stone-900 text-white">
                جميع المسؤولين
              </option>
              {users
                .filter((u) => u.team === 'Media Buying' || u.role.includes('lead') || u.id === currentUser.id)
                .map((u) => (
                  <option key={u.id} value={u.id} className="bg-stone-900 text-white">
                    {u.name} ({u.team || u.role})
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* CAMPAIGNS LIST & CARDS */}
      {/* ------------------------------------------------------------- */}
      {isLoading ? (
        <div className="p-12 text-center rounded-2xl bg-black/20 border border-white/5 space-y-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-stone-400">جاري تحميل بيانات الحملات الإعلانية وتطبيق سياسات RLS...</p>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div
          className="p-12 text-center rounded-2xl space-y-3"
          style={{
            background: 'var(--surface)',
            border: '1px dashed var(--border-medium)',
          }}
        >
          <Target className="w-10 h-10 text-stone-500 mx-auto" />
          <h3 className="text-sm font-bold" style={{ color: 'var(--white)' }}>
            لا توجد حملات إعلانية مطابقة للبحث أو الصلاحيات
          </h3>
          <p className="text-xs text-stone-400 max-w-md mx-auto">
            {isFiltered
              ? 'لم يتم العثور على أي حملة تطابق الفلاتر المحددة أعلاه. جرب تغيير الفلاتر أو إعادة تعيينها.'
              : 'لم يتم تسجيل أي حملات إعلانية مرئية لهذا الحساب حتى الآن.'}
          </p>
          {isFiltered && (
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'var(--white)',
                border: '1px solid var(--border-medium)',
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>إعادة تعيين جميع الفلاتر</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-stone-400 px-1">
            <span>
              عرض <strong className="text-white font-mono">{filteredCampaigns.length}</strong> من أصل{' '}
              <strong className="text-white font-mono">{visibleCampaigns.length}</strong> حملة مرئية
            </span>
            <span className="text-[11px]">انقر على أي حملة لعرض صفحة التفاصيل الكاملة</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filteredCampaigns.map((campaign) => {
              const client = clients.find((c) => c.id === campaign.client_id);
              const owner = users.find((u) => u.id === getCampaignOwnerId(campaign));
              const name = getCampaignName(campaign);
              const status = getCampaignStatus(campaign);
              const objective = getCampaignObjective(campaign);
              const budget = getCampaignBudget(campaign);
              const startDate = getCampaignStartDate(campaign);
              const endDate = getCampaignEndDate(campaign);
              const team = getCampaignTeam(campaign);
              const spend = campaign.spend || 0;
              const spendPct = budget > 0 ? (spend / budget) * 100 : 0;

              const platformCfg = PLATFORM_CONFIG[campaign.platform] || {
                label: campaign.platform,
                enLabel: campaign.platform,
                bg: 'rgba(255, 255, 255, 0.1)',
                text: '#ffffff',
                border: 'rgba(255, 255, 255, 0.2)',
              };

              const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.active;
              const userCanEdit = canEdit(campaign);

              // Results performance summary
              const results = campaign.results || {};
              const hasPerformanceMetrics = Object.keys(results).some(
                (k) => !['name', 'objective', 'status', 'budget', 'start_date', 'end_date', 'owner_id', 'team'].includes(k)
              );

              return (
                <div
                  key={campaign.id}
                  id={`campaign-card-${campaign.id}`}
                  onClick={() => setSelectedCampaignForDetails(campaign)}
                  className="rounded-2xl p-4 transition-all duration-200 cursor-pointer hover:border-purple-500/40 hover:shadow-lg group"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Identity, Platform, Client & Objective */}
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Platform Badge */}
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1"
                          style={{
                            background: platformCfg.bg,
                            color: platformCfg.text,
                            border: `1px solid ${platformCfg.border}`,
                          }}
                        >
                          {platformCfg.enLabel}
                        </span>

                        {/* Status Badge */}
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1"
                          style={{
                            background: statusCfg.bg,
                            color: statusCfg.text,
                            border: `1px solid ${statusCfg.border}`,
                          }}
                        >
                          {statusCfg.icon}
                          <span>{statusCfg.label}</span>
                        </span>

                        {/* Client Relation Badge */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (client) setDashboardClientId(client.id);
                          }}
                          disabled={!client}
                          title={client ? `View ${client.name}'s dashboard` : undefined}
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1 transition-colors hover:bg-purple-900/40 hover:text-purple-200 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-white"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: 'var(--white)',
                            border: '1px solid var(--border-medium)',
                          }}
                        >
                          <Building2 className="w-3 h-3 text-purple-400" />
                          <span>{client?.name || 'عميل غير محدد'}</span>
                        </button>

                        {campaign.campaign_id_external && (
                          <span className="text-[10px] font-mono text-stone-400">
                            ID: {campaign.campaign_id_external}
                          </span>
                        )}
                      </div>

                      {/* Campaign Name */}
                      <h4
                        className="text-sm md:text-base font-bold transition-colors group-hover:text-purple-300"
                        style={{ color: 'var(--white)' }}
                      >
                        {name}
                      </h4>

                      {/* Marketing Objective */}
                      <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--lilac)' }}>
                        <span className="flex items-center gap-1">
                          <Target className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span>الهدف: {objective}</span>
                        </span>

                        <span className="text-stone-500">•</span>

                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>
                            {startDate || 'غير محدد'} {endDate ? `إلى ${endDate}` : '(مستمرة)'}
                          </span>
                        </span>

                        <span className="text-stone-500">•</span>

                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>المسؤول: {owner?.name || 'غير محدد'} ({team})</span>
                        </span>
                      </div>
                    </div>

                    {/* Middle: Budget vs Spend */}
                    <div className="w-full lg:w-56 shrink-0 space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="flex items-center justify-between text-xs">
                        <span style={{ color: 'var(--lilac)' }}>الإنفاق / الميزانية:</span>
                        <span className="font-mono font-bold" style={{ color: 'var(--white)' }}>
                          ${spend.toLocaleString()} / ${budget.toLocaleString()}
                        </span>
                      </div>

                      <div className="w-full bg-stone-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(spendPct, 100)}%`,
                            background:
                              spendPct > 100
                                ? 'var(--roas-bad)'
                                : spendPct > 80
                                ? 'var(--roas-mid)'
                                : 'var(--roas-good)',
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono">
                        <span>معدل الاستهلاك</span>
                        <span>{spendPct.toFixed(1)}%</span>
                      </div>
                    </div>

                    {/* Right: Performance Summary Chips (Only existing metrics) */}
                    <div className="w-full lg:w-72 shrink-0 space-y-2">
                      <div className="text-[10px] font-bold text-stone-400">
                        مؤشرات الأداء الفعلية (Performance Summary):
                      </div>

                      {hasPerformanceMetrics ? (
                        <div className="grid grid-cols-3 gap-1.5">
                          {results.roas !== undefined && (
                            <div className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-center">
                              <div className="text-[9px] text-emerald-400">ROAS</div>
                              <div className="text-xs font-bold font-mono text-emerald-300">
                                {results.roas}x
                              </div>
                            </div>
                          )}

                          {results.conversions !== undefined && (
                            <div className="p-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/20 text-center">
                              <div className="text-[9px] text-cyan-400">تحويلات</div>
                              <div className="text-xs font-bold font-mono text-cyan-300">
                                {Number(results.conversions).toLocaleString()}
                              </div>
                            </div>
                          )}

                          {results.clicks !== undefined && (
                            <div className="p-1.5 rounded-lg bg-purple-950/40 border border-purple-500/20 text-center">
                              <div className="text-[9px] text-purple-300">نقرات</div>
                              <div className="text-xs font-bold font-mono text-purple-200">
                                {Number(results.clicks).toLocaleString()}
                              </div>
                            </div>
                          )}

                          {results.impressions !== undefined && !results.roas && (
                            <div className="p-1.5 rounded-lg bg-blue-950/40 border border-blue-500/20 text-center">
                              <div className="text-[9px] text-blue-300">ظهور</div>
                              <div className="text-xs font-bold font-mono text-blue-200">
                                {Number(results.impressions).toLocaleString()}
                              </div>
                            </div>
                          )}

                          {results.ctr !== undefined && !results.conversions && (
                            <div className="p-1.5 rounded-lg bg-amber-950/40 border border-amber-500/20 text-center">
                              <div className="text-[9px] text-amber-300">CTR</div>
                              <div className="text-xs font-bold font-mono text-amber-200">
                                {results.ctr}%
                              </div>
                            </div>
                          )}

                          {results.cpa !== undefined && (
                            <div className="p-1.5 rounded-lg bg-stone-800/60 border border-stone-700 text-center">
                              <div className="text-[9px] text-stone-300">CPA</div>
                              <div className="text-xs font-bold font-mono text-white">
                                ${results.cpa}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 text-center text-[11px] text-stone-400">
                          لا توجد مقاييس أداء إضافية مسجلة بعد
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/5">
                      {userCanEdit && (
                        <>
                          <button
                            title={status === 'active' ? 'إيقاف الحملة مؤقتاً' : 'تفعيل الحملة'}
                            onClick={(e) => handleQuickToggleStatus(campaign, e)}
                            className="p-2 rounded-xl text-xs transition-all hover:scale-105"
                            style={{
                              background: status === 'active' ? 'rgba(245, 226, 154, 0.15)' : 'rgba(169, 245, 193, 0.15)',
                              color: status === 'active' ? 'var(--roas-mid)' : 'var(--roas-good)',
                              border: '1px solid var(--border-medium)',
                            }}
                          >
                            {status === 'active' ? <PauseCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          </button>

                          <button
                            title="تعديل بيانات الحملة"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal(campaign);
                            }}
                            className="p-2 rounded-xl text-xs transition-all hover:scale-105"
                            style={{
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: 'var(--white)',
                              border: '1px solid var(--border-medium)',
                            }}
                          >
                            <Edit3 className="w-4 h-4 text-purple-300" />
                          </button>
                        </>
                      )}

                      <button
                        title="عرض تفاصيل الحملة"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCampaignForDetails(campaign);
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                        style={{
                          background: 'rgba(123, 47, 247, 0.25)',
                          color: 'var(--purple-light)',
                          border: '1px solid var(--border-strong)',
                        }}
                      >
                        <span>التفاصيل</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: CAMPAIGN DETAILS VIEW */}
      {/* ------------------------------------------------------------- */}
      {selectedCampaignForDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn"
          dir="rtl"
          onClick={() => setSelectedCampaignForDetails(null)}
        >
          <div
            className="w-full max-w-3xl rounded-3xl p-6 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto"
            style={{
              background: 'var(--surface-modal)',
              border: '1px solid var(--border-strong)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Platform */}
                  {(() => {
                    const cfg =
                      PLATFORM_CONFIG[selectedCampaignForDetails.platform] || {
                        label: selectedCampaignForDetails.platform,
                        enLabel: selectedCampaignForDetails.platform,
                        bg: 'rgba(255, 255, 255, 0.1)',
                        text: '#ffffff',
                        border: 'rgba(255, 255, 255, 0.2)',
                      };
                    return (
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                        style={{
                          background: cfg.bg,
                          color: cfg.text,
                          border: `1px solid ${cfg.border}`,
                        }}
                      >
                        {cfg.enLabel}
                      </span>
                    );
                  })()}

                  {/* Status */}
                  {(() => {
                    const st = getCampaignStatus(selectedCampaignForDetails);
                    const cfg = STATUS_CONFIG[st] || STATUS_CONFIG.active;
                    return (
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1"
                        style={{
                          background: cfg.bg,
                          color: cfg.text,
                          border: `1px solid ${cfg.border}`,
                        }}
                      >
                        {cfg.icon}
                        <span>{cfg.label}</span>
                      </span>
                    );
                  })()}

                  {selectedCampaignForDetails.campaign_id_external && (
                    <span className="text-xs font-mono text-stone-400">
                      معرف الحملة: {selectedCampaignForDetails.campaign_id_external}
                    </span>
                  )}
                </div>

                <h3 className="text-lg md:text-xl font-bold" style={{ color: 'var(--white)' }}>
                  {getCampaignName(selectedCampaignForDetails)}
                </h3>
              </div>

              <button
                onClick={() => setSelectedCampaignForDetails(null)}
                className="p-2 rounded-xl text-stone-400 hover:text-white transition-all"
                style={{ background: 'rgba(255, 255, 255, 0.05)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Client & Service Relation Box */}
            {(() => {
              const client = clients.find((c) => c.id === selectedCampaignForDetails.client_id);
              const owner = users.find((u) => u.id === getCampaignOwnerId(selectedCampaignForDetails));
              const amAgent = users.find((u) => u.id === client?.am_agent_id);

              return (
                <div
                  className="p-4 rounded-2xl space-y-3"
                  style={{
                    background: 'rgba(123, 47, 247, 0.1)',
                    border: '1px solid var(--border-medium)',
                  }}
                >
                  <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" />
                    <span>الربط المؤسسي بالعميل والخدمة (Client & Service Relation):</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-stone-400 block text-[11px]">اسم العميل:</span>
                      <button
                        onClick={() => {
                          if (!client) return;
                          setSelectedCampaignForDetails(null);
                          setDashboardClientId(client.id);
                        }}
                        disabled={!client}
                        className="text-white text-sm font-bold hover:text-purple-300 hover:underline disabled:no-underline disabled:hover:text-white"
                      >
                        {client?.name || 'غير محدد'}
                      </button>
                      <span className="text-[10px] text-stone-400 block">{client?.industry || ''}</span>
                    </div>

                    <div>
                      <span className="text-stone-400 block text-[11px]">مدير الحسابات (AM):</span>
                      <strong className="text-purple-200">{amAgent?.name || 'قيد الإسناد'}</strong>
                      <span className="text-[10px] text-stone-400 block">
                        حالة العميل: {client?.status || 'active'}
                      </span>
                    </div>

                    <div>
                      <span className="text-stone-400 block text-[11px]">الموظف/الفريق المسؤول عن الإعلانات:</span>
                      <strong className="text-cyan-300">{owner?.name || 'فريق الميديا باينج'}</strong>
                      <span className="text-[10px] text-stone-400 block">
                        {getCampaignTeam(selectedCampaignForDetails)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Campaign Core Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div
                className="p-3 rounded-xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}
              >
                <span className="text-[11px] text-stone-400 block">هدف الحملة (Objective):</span>
                <strong className="text-white text-xs mt-1 block">
                  {getCampaignObjective(selectedCampaignForDetails)}
                </strong>
              </div>

              <div
                className="p-3 rounded-xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}
              >
                <span className="text-[11px] text-stone-400 block">تاريخ البدء والانتهاء:</span>
                <strong className="text-white text-xs mt-1 block font-mono">
                  {getCampaignStartDate(selectedCampaignForDetails)}
                  {getCampaignEndDate(selectedCampaignForDetails) ? ` ← ${getCampaignEndDate(selectedCampaignForDetails)}` : ' (مفتوحة)'}
                </strong>
              </div>

              <div
                className="p-3 rounded-xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}
              >
                <span className="text-[11px] text-stone-400 block">الميزانية المرصودة:</span>
                <strong className="text-white text-xs mt-1 block font-mono">
                  ${getCampaignBudget(selectedCampaignForDetails).toLocaleString()}
                </strong>
              </div>

              <div
                className="p-3 rounded-xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}
              >
                <span className="text-[11px] text-stone-400 block">الإنفاق الفعلي:</span>
                <strong className="text-emerald-400 text-xs mt-1 block font-mono">
                  ${(selectedCampaignForDetails.spend || 0).toLocaleString()}
                </strong>
              </div>
            </div>

            {/* Performance Metrics Section (Strictly existing metrics) */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                <span>نتائج ومؤشرات الأداء المسجلة في قاعدة البيانات (Campaign Performance):</span>
              </h4>

              {(() => {
                const results = selectedCampaignForDetails.results || {};
                const metricEntries = Object.entries(results).filter(
                  ([k]) => !['name', 'objective', 'status', 'budget', 'start_date', 'end_date', 'owner_id', 'team'].includes(k)
                );

                if (metricEntries.length === 0) {
                  return (
                    <div className="p-4 rounded-xl text-center text-xs text-stone-400 bg-white/[0.02] border border-white/5">
                      لا توجد مقاييس أداء إضافية مسجلة في سجل هذه الحملة.
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {metricEntries.map(([key, val]) => {
                      const displayKey: Record<string, string> = {
                        roas: 'العائد الإعلاني ROAS',
                        impressions: 'مرات الظهور (Impressions)',
                        clicks: 'النقرات (Clicks)',
                        conversions: 'التحويلات (Conversions)',
                        ctr: 'نسبة النقر للظهور (CTR %)',
                        cpc: 'تكلفة النقرة (CPC $)',
                        cpa: 'تكلفة التحويل (CPA $)',
                        spend: 'الإنفاق الإعلاني (Spend)',
                        reach: 'الوصول (Reach)',
                      };

                      return (
                        <div
                          key={key}
                          className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center space-y-1"
                        >
                          <span className="text-[11px] text-stone-400 block">
                            {displayKey[key] || key}
                          </span>
                          <strong className="text-base font-bold font-mono text-purple-200">
                            {typeof val === 'number'
                              ? key === 'roas'
                                ? `${val}x`
                                : key === 'ctr'
                                ? `${val}%`
                                : key.startsWith('cp') || key === 'spend'
                                ? `$${val}`
                                : val.toLocaleString()
                              : String(val)}
                          </strong>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              {canEdit(selectedCampaignForDetails) && (
                <button
                  onClick={() => {
                    const c = selectedCampaignForDetails;
                    setSelectedCampaignForDetails(null);
                    handleOpenEditModal(c);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
                  style={{
                    background: 'var(--gradient-badge)',
                    color: 'var(--white)',
                    border: '1px solid var(--border-strong)',
                  }}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>تعديل الحملة</span>
                </button>
              )}

              <button
                onClick={() => setSelectedCampaignForDetails(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--white)',
                  border: '1px solid var(--border-medium)',
                }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: CAMPAIGN CREATION & EDITING */}
      {/* ------------------------------------------------------------- */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto animate-fadeIn"
          dir="rtl"
          onClick={() => !isSubmitting && setIsCreateModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl p-6 shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto"
            style={{
              background: 'var(--surface-modal)',
              border: '1px solid var(--border-strong)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(123, 47, 247, 0.25)' }}
                >
                  <Target className="w-4 h-4 text-purple-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold" style={{ color: 'var(--white)' }}>
                    {campaignToEdit ? 'تعديل بيانات الحملة الإعلانية' : 'إنشاء حملة إعلانية ممولة جديدة'}
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    ربط الحملة بالعميل، والمنصة، والميزانية، ومؤشرات الأداء الفعلية
                  </p>
                </div>
              </div>

              <button
                disabled={isSubmitting}
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-white transition-all"
                style={{ background: 'rgba(255, 255, 255, 0.05)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitCampaign} className="space-y-4">
              {/* Client Selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-300 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>العميل المرتبط بالحملة (مطلوب):</span>
                </label>
                <select
                  required
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs outline-none cursor-pointer"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--white)',
                    border: '1px solid var(--border-medium)',
                  }}
                >
                  <option value="" disabled className="bg-stone-900 text-white">
                    اختر العميل...
                  </option>
                  {accessibleClients.map((c) => (
                    <option key={c.id} value={c.id} className="bg-stone-900 text-white">
                      {c.name} ({c.industry || 'بدون تصنيف'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Campaign Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-300">اسم الحملة الإعلانية (مطلوب):</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: حملة عروض اليوم الوطني - مبيعات المتجر الإلكتروني"
                  className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--white)',
                    border: '1px solid var(--border-medium)',
                  }}
                />
              </div>

              {/* Platform & Objective */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-300">المنصة الإعلانية:</label>
                  <select
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs outline-none cursor-pointer"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--white)',
                      border: '1px solid var(--border-medium)',
                    }}
                  >
                    <option value="meta" className="bg-stone-900 text-white">
                      Meta Ads (Facebook & Instagram)
                    </option>
                    <option value="google" className="bg-stone-900 text-white">
                      Google Ads (Search, Display, Performance Max)
                    </option>
                    <option value="tiktok" className="bg-stone-900 text-white">
                      TikTok Ads
                    </option>
                    <option value="linkedin" className="bg-stone-900 text-white">
                      LinkedIn Ads
                    </option>
                    <option value="snapchat" className="bg-stone-900 text-white">
                      Snapchat Ads
                    </option>
                    <option value="x" className="bg-stone-900 text-white">
                      X (Twitter) Ads
                    </option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-300">الهدف الإعلاني (Objective):</label>
                  <input
                    type="text"
                    value={formData.objective}
                    onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                    placeholder="مثال: التحويلات والمبيعات، أو توليد العملاء المحتملين"
                    className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--white)',
                      border: '1px solid var(--border-medium)',
                    }}
                  />
                </div>
              </div>

              {/* Status & External ID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-300">حالة الحملة:</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as CampaignStatus })}
                    className="w-full px-3 py-2 rounded-xl text-xs outline-none cursor-pointer"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--white)',
                      border: '1px solid var(--border-medium)',
                    }}
                  >
                    <option value="active" className="bg-stone-900 text-white">
                      نشطة (Active)
                    </option>
                    <option value="paused" className="bg-stone-900 text-white">
                      متوقفة مؤقتاً (Paused)
                    </option>
                    <option value="completed" className="bg-stone-900 text-white">
                      مكتملة (Completed)
                    </option>
                    <option value="draft" className="bg-stone-900 text-white">
                      مسودة (Draft)
                    </option>
                    <option value="archived" className="bg-stone-900 text-white">
                      مؤرشفة (Archived)
                    </option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-300">معرف الحملة في المنصة (اختياري):</label>
                  <input
                    type="text"
                    value={formData.externalId}
                    onChange={(e) => setFormData({ ...formData, externalId: e.target.value })}
                    placeholder="مثال: act_682940284_cmp01"
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono outline-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--white)',
                      border: '1px solid var(--border-medium)',
                    }}
                  />
                </div>
              </div>

              {/* Budget & Spend */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-300">الميزانية المرصودة ($ USD):</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono outline-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--white)',
                      border: '1px solid var(--border-medium)',
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-300">الإنفاق الفعلي الحالي ($ USD):</label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={formData.spend}
                    onChange={(e) => setFormData({ ...formData, spend: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono outline-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--white)',
                      border: '1px solid var(--border-medium)',
                    }}
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-300">تاريخ بدء الحملة:</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono outline-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--white)',
                      border: '1px solid var(--border-medium)',
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-300">تاريخ الانتهاء (اختياري):</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono outline-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--white)',
                      border: '1px solid var(--border-medium)',
                    }}
                  />
                </div>
              </div>

              {/* Owner & Team */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-300">الموظف المسؤول:</label>
                  <select
                    value={formData.ownerId}
                    onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs outline-none cursor-pointer"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--white)',
                      border: '1px solid var(--border-medium)',
                    }}
                  >
                    {users
                      .filter((u) => u.team === 'Media Buying' || u.role.includes('lead') || u.id === currentUser.id)
                      .map((u) => (
                        <option key={u.id} value={u.id} className="bg-stone-900 text-white">
                          {u.name} ({u.team || u.role})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-300">الفريق المسؤول:</label>
                  <select
                    value={formData.team}
                    onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs outline-none cursor-pointer"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--white)',
                      border: '1px solid var(--border-medium)',
                    }}
                  >
                    <option value="Media Buying" className="bg-stone-900 text-white">
                      Media Buying
                    </option>
                    <option value="Account Management" className="bg-stone-900 text-white">
                      Account Management
                    </option>
                    <option value="Creative & Design" className="bg-stone-900 text-white">
                      Creative & Design
                    </option>
                  </select>
                </div>
              </div>

              {/* Existing Performance Metrics Inputs (Only existing metrics) */}
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2.5">
                <div className="text-xs font-bold text-stone-300 flex items-center justify-between">
                  <span>مؤشرات أداء الحملة (اختياري - تُخزن في نتائج الحملة):</span>
                  <span className="text-[10px] text-stone-400">تحديث مؤشرات المنصة</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-stone-400 block mb-0.5">ROAS (العائد):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.roas}
                      onChange={(e) => setFormData({ ...formData, roas: e.target.value })}
                      placeholder="مثال: 3.25"
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs font-mono outline-none"
                      style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'white' }}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-stone-400 block mb-0.5">التحويلات (Conversions):</label>
                    <input
                      type="number"
                      step="1"
                      value={formData.conversions}
                      onChange={(e) => setFormData({ ...formData, conversions: e.target.value })}
                      placeholder="مثال: 120"
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs font-mono outline-none"
                      style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'white' }}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-stone-400 block mb-0.5">النقرات (Clicks):</label>
                    <input
                      type="number"
                      step="1"
                      value={formData.clicks}
                      onChange={(e) => setFormData({ ...formData, clicks: e.target.value })}
                      placeholder="مثال: 3500"
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs font-mono outline-none"
                      style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'white' }}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-stone-400 block mb-0.5">مرات الظهور (Impressions):</label>
                    <input
                      type="number"
                      step="100"
                      value={formData.impressions}
                      onChange={(e) => setFormData({ ...formData, impressions: e.target.value })}
                      placeholder="مثال: 85000"
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs font-mono outline-none"
                      style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'white' }}
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--white)',
                    border: '1px solid var(--border-medium)',
                  }}
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg"
                  style={{
                    background: 'var(--gradient-badge)',
                    color: 'var(--white)',
                    border: '1px solid var(--border-strong)',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>جاري الحفظ في قاعدة البيانات...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>{campaignToEdit ? 'حفظ التعديلات' : 'إنشاء الحملة وتفعيلها'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeDashboardClient && (
        <ClientDashboard
          client={activeDashboardClient}
          packageRecord={packages.find((p) => p.id === activeDashboardClient.package_id)}
          allPackages={packages}
          users={users}
          currentUser={currentUser}
          briefs={briefs}
          campaigns={campaigns}
          tasks={tasks}
          dailyLogs={dailyLogs}
          extraNotes={extraNotes}
          assignments={assignments}
          initialTab="campaigns"
          onClose={() => setDashboardClientId(null)}
        />
      )}
    </div>
  );
};
