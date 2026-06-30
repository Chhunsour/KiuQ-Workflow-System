<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { usePerformanceStore, sumTotals } from '@/stores/performance';
import { useFollowupStore } from '@/stores/followup';
import { useIndexingStore } from '@/stores/indexing';
import { useProductSyncStore } from '@/stores/productSync';
import { supabase } from '@/lib/supabase';
import FormSelect from '@/components/ui/FormSelect.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import WebsiteFavicon from '@/components/ui/WebsiteFavicon.vue';

const auth = useAuthStore();
const performanceStore = usePerformanceStore();
const followupStore = useFollowupStore();
const indexingStore = useIndexingStore();
const productSyncStore = useProductSyncStore();

// --- STATE ---
const loading = ref(false);
const dateRangePreset = ref<'28' | 'this_month' | 'last_month' | 'custom'>('28');
const startDate = ref('');
const endDate = ref('');
const selectedMemberId = ref('me');

// Dynamic local state query results
const rawAssignments = ref<any[]>([]);
const csvExportLogs = ref<any[]>([]);
const productUpdateLogs = ref<any[]>([]);
const websites = ref<any[]>([]);
const membersList = ref<any[]>([]);

// --- DATE RANGE Preset ---
const setDatesFromPreset = () => {
  const now = new Date();
  if (dateRangePreset.value === '28') {
    const start = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    startDate.value = start.toISOString().slice(0, 10);
    endDate.value = now.toISOString().slice(0, 10);
  } else if (dateRangePreset.value === 'this_month') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    startDate.value = start.toISOString().slice(0, 10);
    endDate.value = now.toISOString().slice(0, 10);
  } else if (dateRangePreset.value === 'last_month') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
    startDate.value = start.toISOString().slice(0, 10);
    endDate.value = end.toISOString().slice(0, 10);
  }
};

watch(dateRangePreset, () => {
  setDatesFromPreset();
  void loadReportData();
});

const activeQueryMemberId = computed(() => {
  if (selectedMemberId.value === 'me') {
    return auth.user?.id || '';
  }
  return selectedMemberId.value; // 'all' or specific user id
});

// Helper for date filtering of slots
const isDateInRange = (dateStr: string | null | undefined) => {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= startDate.value && d <= endDate.value;
};

// --- DATA FETCHING ---
const loadReportData = async () => {
  loading.value = true;
  try {
    const [websitesRes, membersRes] = await Promise.all([
      supabase.from('websites').select('*').order('name'),
      supabase.from('profiles').select('id, full_name, email, role, status')
    ]);
    websites.value = websitesRes.data || [];
    membersList.value = membersRes.data || [];

    const { data: assigns } = await supabase
      .from('prompt_assignments')
      .select('*, website:website_id(name, domain), project:project_id(name), prompt:prompt_id(title, category)')
      .is('is_archived', false);
    rawAssignments.value = assigns || [];

    await Promise.all([
      followupStore.fetchBlogSlots(),
      followupStore.fetchPluginSlots(),
      followupStore.fetchSpeedSlots(),
      followupStore.fetchEbayEntries()
    ]);

    if (dateRangePreset.value === 'this_month') {
      performanceStore.rangeDays = 'this_month';
    } else if (dateRangePreset.value === 'last_month') {
      performanceStore.rangeDays = 'last_month';
    } else if (dateRangePreset.value === '28') {
      performanceStore.rangeDays = 28;
    } else {
      performanceStore.rangeDays = 'custom';
      performanceStore.customStartDate = startDate.value;
      performanceStore.customEndDate = endDate.value;
    }
    await performanceStore.fetchAll();

    const { data: exportLogs } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('action', 'csv_exported')
      .gte('created_at', startDate.value + 'T00:00:00Z')
      .lte('created_at', endDate.value + 'T23:59:59Z');
    csvExportLogs.value = exportLogs || [];

    const { data: productLogs } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('action', 'product_updated')
      .gte('created_at', startDate.value + 'T00:00:00Z')
      .lte('created_at', endDate.value + 'T23:59:59Z');
    productUpdateLogs.value = productLogs || [];

    await productSyncStore.fetchSourceProducts();
  } catch (err) {
    console.error('Failed to load summary data', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  setDatesFromPreset();
  void loadReportData();
});

// --- MEMBER SELECT OPTIONS ---
const memberFilterOptions = computed(() => {
  const opts = [{ value: 'me', label: 'My Summary' }];
  if (auth.isAdmin || auth.isHeadOrSupervisor) {
    opts.push({ value: 'all', label: 'All Members' });
    for (const m of membersList.value) {
      if (m.status === 'active' && m.id !== auth.user?.id) {
        opts.push({ value: m.id, label: m.full_name || m.email });
      }
    }
  }
  return opts;
});

// --- FILTERED METRICS CALCULATIONS ---

// Tasks
const filteredAssignments = computed(() => {
  let list = rawAssignments.value;
  const uid = activeQueryMemberId.value;
  if (uid !== 'all') {
    list = list.filter(a => a.assigned_member_id === uid);
  }
  return list;
});

const tasksCompleted = computed(() => {
  return filteredAssignments.value.filter(a => {
    if (!a.completed_at) return false;
    const date = a.completed_at.slice(0, 10);
    return date >= startDate.value && date <= endDate.value && ['completed', 'approved'].includes(a.status);
  });
});

const tasksInProgress = computed(() => {
  return filteredAssignments.value.filter(a => ['in_progress', 'needs_fix', 'waiting_review', 'to_do'].includes(a.status));
});

const tasksOverdue = computed(() => {
  const todayStr = new Date().toISOString().slice(0, 10);
  return filteredAssignments.value.filter(a => {
    return a.due_date && a.due_date < todayStr && !['completed', 'approved', 'submitted', 'postponed'].includes(a.status);
  });
});

// Follow-ups helper
const getFilteredSlots = (slots: any[]) => {
  let list = slots;
  const uid = activeQueryMemberId.value;
  if (uid !== 'all') {
    const memberWebsiteIds = new Set(
      websites.value.filter(w => w.created_by === uid || w.createdBy === uid).map(w => w.id)
    );
    list = list.filter(s => {
      if (s.userId) return s.userId === uid;
      return s.assignedTo === uid || (s.websiteId && memberWebsiteIds.has(s.websiteId));
    });
  }
  return list;
};

const resolveWebsiteForSlot = (websiteId: string, blogUrl?: string) => {
  const w = websites.value.find(x => x.id === websiteId);
  if (w) return w;
  let parsedDomain = 'deleted-website.com';
  if (blogUrl) {
    try { parsedDomain = new URL(blogUrl).hostname; } catch (e) {}
  }
  return {
    id: websiteId,
    name: parsedDomain !== 'deleted-website.com' ? `${parsedDomain} (Legacy)` : 'Legacy Website',
    domain: parsedDomain,
    status: 'inactive',
    faviconUrl: ''
  };
};

const allFollowups = computed(() => {
  const blog = getFilteredSlots(followupStore.blogSlots).map(s => ({
    ...s,
    fType: 'Blog',
    website: resolveWebsiteForSlot(s.websiteId, s.blogUrl),
    dateField: s.scheduledDate,
    statusField: s.status
  }));
  const plugin = getFilteredSlots(followupStore.pluginSlots).map(s => ({
    ...s,
    fType: 'Plugin',
    website: resolveWebsiteForSlot(s.websiteId),
    dateField: s.weekStart,
    statusField: s.status
  }));
  const speed = getFilteredSlots(followupStore.speedSlots).map(s => ({
    ...s,
    fType: 'Speed',
    website: resolveWebsiteForSlot(s.websiteId),
    dateField: s.weekStart,
    statusField: s.status
  }));
  const ebay = getFilteredSlots(followupStore.ebayEntries).map(s => ({
    ...s,
    fType: 'eBay',
    website: { name: 'eBay Click Integration', domain: 'ebay.com' },
    dateField: s.date,
    statusField: s.status
  }));
  return [...blog, ...plugin, ...speed, ...ebay];
});

// Grouped Counts
const groupStats = computed(() => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const types = [
    { key: 'Plugin', label: 'Plugin Updates' },
    { key: 'eBay', label: 'eBay Clicks' },
    { key: 'Speed', label: 'Website Optimization' },
    { key: 'Blog', label: 'Blog Posted / Blog Follow-Up' }
  ];

  return types.map(t => {
    const slots = allFollowups.value.filter(s => s.fType === t.key);
    const completed = slots.filter(s => (s.statusField === 'done' || s.statusField === 'late') && isDateInRange(s.dateField)).length;
    const pending = slots.filter(s => s.statusField === 'pending').length;
    const missed = slots.filter(s => s.statusField === 'missed' || (s.statusField === 'pending' && s.dateField && s.dateField < todayStr)).length;
    
    return {
      label: t.label,
      completed,
      pending,
      missed
    };
  });
});

// Main Counts
const followupsCompletedCount = computed(() => {
  return allFollowups.value.filter(s => (s.statusField === 'done' || s.statusField === 'late') && isDateInRange(s.dateField)).length;
});

const pluginCompletedCount = computed(() => {
  return allFollowups.value.filter(s => s.fType === 'Plugin' && (s.statusField === 'done' || s.statusField === 'late') && isDateInRange(s.dateField)).length;
});

const ebayCompletedCount = computed(() => {
  return allFollowups.value.filter(s => s.fType === 'eBay' && (s.statusField === 'done' || s.statusField === 'late') && isDateInRange(s.dateField)).length;
});

const speedCompletedCount = computed(() => {
  return allFollowups.value.filter(s => s.fType === 'Speed' && (s.statusField === 'done' || s.statusField === 'late') && isDateInRange(s.dateField)).length;
});

const blogCompletedCount = computed(() => {
  return allFollowups.value.filter(s => s.fType === 'Blog' && (s.statusField === 'done' || s.statusField === 'late') && isDateInRange(s.dateField)).length;
});

const pendingFollowupsCount = computed(() => allFollowups.value.filter(s => s.statusField === 'pending').length);
const missedFollowupsCount = computed(() => {
  const todayStr = new Date().toISOString().slice(0, 10);
  return allFollowups.value.filter(s => s.statusField === 'missed' || (s.statusField === 'pending' && s.dateField && s.dateField < todayStr)).length;
});

const websitesWorkedOnCount = computed(() => {
  const set = new Set<string>();
  allFollowups.value.forEach(f => {
    if ((f.statusField === 'done' || f.statusField === 'late') && isDateInRange(f.dateField) && f.websiteId) {
      set.add(f.websiteId);
    }
  });
  return set.size;
});

// GSC Performance computed stats
const gscPerformanceList = computed(() => {
  const map = new Map<string, { clicks: number; impressions: number; wpos: number; count: number }>();
  
  performanceStore.daily.forEach(d => {
    if (!isDateInRange(d.date)) return;
    const curr = map.get(d.website_id) || { clicks: 0, impressions: 0, wpos: 0, count: 0 };
    curr.clicks += d.clicks;
    curr.impressions += d.impressions;
    curr.wpos += d.position * d.impressions;
    curr.count += 1;
    map.set(d.website_id, curr);
  });
  
  const list: any[] = [];
  websites.value.forEach(site => {
    const conn = performanceStore.connectionByWebsite.get(site.id);
    if (!conn) return;
    
    const stats = map.get(site.id) || { clicks: 0, impressions: 0, wpos: 0, count: 0 };
    const avgPosition = stats.impressions ? stats.wpos / stats.impressions : 0;
    const ctr = stats.impressions ? stats.clicks / stats.impressions : 0;
    
    list.push({
      id: site.id,
      name: site.name,
      domain: site.domain,
      favicon: site.favicon_url || '',
      clicks: stats.clicks,
      impressions: stats.impressions,
      ctr,
      position: avgPosition
    });
  });
  
  return list.sort((a, b) => b.clicks - a.clicks);
});

const totalGscClicks = computed(() => {
  return gscPerformanceList.value.reduce((acc, x) => acc + x.clicks, 0);
});

const totalGscImpressions = computed(() => {
  return gscPerformanceList.value.reduce((acc, x) => acc + x.impressions, 0);
});

// Website Summary Table Details
const websiteSummaries = computed(() => {
  const list: any[] = [];
  const todayStr = new Date().toISOString().slice(0, 10);
  
  // 1. Regular Websites in database (plus missing/legacy ones with slots)
  const resolvedWebsites = [...websites.value];
  allFollowups.value.forEach(f => {
    if (f.websiteId && !resolvedWebsites.some(w => w.id === f.websiteId)) {
      resolvedWebsites.push(resolveWebsiteForSlot(f.websiteId, f.blogUrl) as any);
    }
  });

  resolvedWebsites.forEach(site => {
    const siteSlots = allFollowups.value.filter(s => s.websiteId === site.id);
    
    const plugins = siteSlots.filter(s => s.fType === 'Plugin' && (s.statusField === 'done' || s.statusField === 'late') && isDateInRange(s.dateField)).length;
    const optimizations = siteSlots.filter(s => s.fType === 'Speed' && (s.statusField === 'done' || s.statusField === 'late') && isDateInRange(s.dateField)).length;
    const blogs = siteSlots.filter(s => s.fType === 'Blog' && (s.statusField === 'done' || s.statusField === 'late') && isDateInRange(s.dateField)).length;
    
    const pending = siteSlots.filter(s => s.statusField === 'pending').length;
    const missed = siteSlots.filter(s => s.statusField === 'missed' || (s.statusField === 'pending' && s.dateField && s.dateField < todayStr)).length;
    
    list.push({
      name: site.name,
      domain: site.domain,
      favicon: site.favicon_url || '',
      plugins,
      ebay: '-',
      optimizations,
      blogs,
      pending,
      missed
    });
  });

  // 2. eBay Click Sync pseudo-site
  const ebaySlots = allFollowups.value.filter(s => s.fType === 'eBay');
  const ebayCompleted = ebaySlots.filter(s => (s.statusField === 'done' || s.statusField === 'late') && isDateInRange(s.dateField)).length;
  const ebayPending = ebaySlots.filter(s => s.statusField === 'pending').length;
  const ebayMissed = ebaySlots.filter(s => s.statusField === 'missed' || (s.statusField === 'pending' && s.dateField && s.dateField < todayStr)).length;
  
  if (ebaySlots.length > 0) {
    list.push({
      name: 'eBay Click Integration',
      domain: 'ebay.com',
      favicon: '',
      plugins: '-',
      ebay: ebayCompleted,
      optimizations: '-',
      blogs: '-',
      pending: ebayPending,
      missed: ebayMissed
    });
  }

  return list;
});

// Recent Activity Section
const recentActivityList = computed(() => {
  const list: any[] = [];

  allFollowups.value.forEach(s => {
    if ((s.statusField === 'done' || s.statusField === 'late') && s.dateField && isDateInRange(s.dateField)) {
      list.push({
        date: s.dateField.slice(0, 10),
        website: s.website?.name || 'Legacy Website',
        type: s.fType,
        desc: s.notes || `${s.fType} Checklist finished`,
        status: 'Done'
      });
    }
  });

  productUpdateLogs.value.forEach(l => {
    const site = websites.value.find(w => w.id === l.metadata?.website_id);
    list.push({
      date: l.created_at?.slice(0, 10) || '',
      website: site?.name || l.metadata?.website_name || 'Master Catalog',
      type: 'Product Update',
      desc: l.description || 'Exported product catalog',
      status: 'Done'
    });
  });

  return list.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
});

// Pending Section
const pendingList = computed(() => {
  const list: any[] = [];
  
  allFollowups.value.forEach(f => {
    if (f.statusField === 'pending') {
      list.push({
        website: f.website?.name || 'General',
        type: f.fType,
        dueDate: f.dateField || '-',
        status: f.statusField
      });
    }
  });

  return list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
});
</script>

<template>
  <div class="monthly-report-page px-6 py-4">
    <!-- Header Block -->
    <header class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/40 pb-5">
      <div>
        <span class="text-xs uppercase tracking-wider font-semibold text-text-muted">Work Activity Logging</span>
        <h1 class="page-title text-2xl font-bold mt-1 text-text-main">Monthly Summary</h1>
        <p class="text-xs text-text-muted mt-1">Quick summary dashboard showing follow-up checks and task activities.</p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-[10px] uppercase font-bold text-text-muted">Range Preset</label>
          <select v-model="dateRangePreset" class="input w-36 text-xs">
            <option value="28">Last 28 Days</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        <div v-if="dateRangePreset === 'custom'" class="flex items-center gap-2">
          <div class="flex flex-col gap-1">
            <label class="text-[10px] uppercase font-bold text-text-muted">Start</label>
            <input type="date" v-model="startDate" class="input text-xs w-32" @change="loadReportData" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-[10px] uppercase font-bold text-text-muted">End</label>
            <input type="date" v-model="endDate" class="input text-xs w-32" @change="loadReportData" />
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-[10px] uppercase font-bold text-text-muted">Member Filter</label>
          <FormSelect v-model="selectedMemberId" :options="memberFilterOptions" class="w-40 text-xs" @update:model-value="loadReportData" />
        </div>
      </div>
    </header>

    <LoadingBlock :loading="loading" :error="null" :retry="loadReportData">
      <!-- 1. KPI Summary Cards -->
      <section class="mt-6">
        <div class="grid grid-cols-2 md:grid-cols-5 xl:grid-cols-10 gap-4">
          <div class="card card-pad bg-card/60 flex flex-col justify-between">
            <span class="text-[9px] uppercase font-bold text-text-muted">Follow-ups Done</span>
            <span class="text-2xl font-extrabold mt-1 text-text-main font-mono" style="font-family: 'Pliant', sans-serif;">
              {{ followupsCompletedCount }}
            </span>
          </div>

          <div class="card card-pad bg-card/60 flex flex-col justify-between">
            <span class="text-[9px] uppercase font-bold text-text-muted">Plugins Updated</span>
            <span class="text-2xl font-extrabold mt-1 text-text-main font-mono" style="font-family: 'Pliant', sans-serif;">
              {{ pluginCompletedCount }}
            </span>
          </div>

          <div class="card card-pad bg-card/60 flex flex-col justify-between">
            <span class="text-[9px] uppercase font-bold text-text-muted">eBay Clicks</span>
            <span class="text-2xl font-extrabold mt-1 text-text-main font-mono" style="font-family: 'Pliant', sans-serif;">
              {{ ebayCompletedCount }}
            </span>
          </div>

          <div class="card card-pad bg-card/60 flex flex-col justify-between">
            <span class="text-[9px] uppercase font-bold text-text-muted">Optimizations</span>
            <span class="text-2xl font-extrabold mt-1 text-text-main font-mono" style="font-family: 'Pliant', sans-serif;">
              {{ speedCompletedCount }}
            </span>
          </div>

          <div class="card card-pad bg-card/60 flex flex-col justify-between">
            <span class="text-[9px] uppercase font-bold text-text-muted">Blogs Posted</span>
            <span class="text-2xl font-extrabold mt-1 text-text-main font-mono" style="font-family: 'Pliant', sans-serif;">
              {{ blogCompletedCount }}
            </span>
          </div>

          <div class="card card-pad bg-card/60 flex flex-col justify-between">
            <span class="text-[9px] uppercase font-bold text-text-muted">GSC Clicks</span>
            <span class="text-2xl font-extrabold mt-1 text-emerald-500 font-mono" style="font-family: 'Pliant', sans-serif;">
              {{ totalGscClicks.toLocaleString() }}
            </span>
          </div>

          <div class="card card-pad bg-card/60 flex flex-col justify-between">
            <span class="text-[9px] uppercase font-bold text-text-muted">GSC Impressions</span>
            <span class="text-2xl font-extrabold mt-1 text-blue-500 font-mono" style="font-family: 'Pliant', sans-serif;">
              {{ totalGscImpressions.toLocaleString() }}
            </span>
          </div>

          <div class="card card-pad bg-card/60 flex flex-col justify-between">
            <span class="text-[9px] uppercase font-bold text-text-muted">Pending Follows</span>
            <span class="text-2xl font-extrabold mt-1 text-text-main font-mono" style="font-family: 'Pliant', sans-serif;">
              {{ pendingFollowupsCount }}
            </span>
          </div>

          <div class="card card-pad bg-card/60 flex flex-col justify-between border-red-500/20">
            <span class="text-[9px] uppercase font-bold text-text-muted text-red-500">Missed Follows</span>
            <span class="text-2xl font-extrabold mt-1 text-red-500 font-mono" style="font-family: 'Pliant', sans-serif;">
              {{ missedFollowupsCount }}
            </span>
          </div>

          <div class="card card-pad bg-card/60 flex flex-col justify-between">
            <span class="text-[9px] uppercase font-bold text-text-muted font-bold text-primary">Sites Worked On</span>
            <span class="text-2xl font-extrabold mt-1 text-primary font-mono" style="font-family: 'Pliant', sans-serif;">
              {{ websitesWorkedOnCount }}
            </span>
          </div>
        </div>
      </section>

      <!-- 2. Follow-Up Summary grouped by type -->
      <section class="mt-8">
        <h2 class="text-sm font-bold text-text-main mb-3">Follow-Up Type Breakdown</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div v-for="g in groupStats" :key="g.label" class="card card-pad flex flex-col justify-between bg-card/45 border-border/60">
            <span class="text-xs font-bold text-text-main block">{{ g.label }}</span>
            <div class="grid grid-cols-3 gap-2 mt-4 text-center">
              <div class="bg-green-500/10 p-2 rounded">
                <span class="text-[9px] uppercase font-bold text-green-500 block">Completed</span>
                <span class="text-lg font-bold text-text-main font-mono" style="font-family: 'Pliant', sans-serif;">{{ g.completed }}</span>
              </div>
              <div class="bg-amber-500/10 p-2 rounded">
                <span class="text-[9px] uppercase font-bold text-amber-500 block">Pending</span>
                <span class="text-lg font-bold text-text-main font-mono" style="font-family: 'Pliant', sans-serif;">{{ g.pending }}</span>
              </div>
              <div class="bg-red-500/10 p-2 rounded">
                <span class="text-[9px] uppercase font-bold text-red-500 block">Missed</span>
                <span class="text-lg font-bold text-text-main font-mono" style="font-family: 'Pliant', sans-serif;">{{ g.missed }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 3. Website Summary details table -->
      <section class="mt-8">
        <h2 class="text-sm font-bold text-text-main mb-3">Website Summary Breakdown</h2>
        <div class="card card-pad">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-border text-text-soft font-bold uppercase tracking-wider text-[10px]">
                  <th class="pb-2">Website</th>
                  <th class="pb-2 text-center w-28">Plugin Updates</th>
                  <th class="pb-2 text-center w-24">eBay Clicks</th>
                  <th class="pb-2 text-center w-28">Optimizations</th>
                  <th class="pb-2 text-center w-28">Blogs Posted</th>
                  <th class="pb-2 text-center w-20">Pending</th>
                  <th class="pb-2 text-center w-20 text-red-500">Missed</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/30">
                <tr v-for="site in websiteSummaries" :key="site.name" class="hover:bg-soft/10">
                  <td class="py-2.5 flex items-center gap-2">
                    <img v-if="site.favicon" :src="site.favicon" class="w-4 h-4 rounded" alt="" />
                    <div class="min-w-0">
                      <strong class="text-text-main block">{{ site.name }}</strong>
                      <span v-if="site.domain" class="text-[10px] text-text-muted block truncate w-36">{{ site.domain }}</span>
                    </div>
                  </td>
                  <td class="py-2.5 text-center font-semibold font-mono" style="font-family: 'Pliant', sans-serif;">{{ site.plugins }}</td>
                  <td class="py-2.5 text-center font-semibold font-mono" style="font-family: 'Pliant', sans-serif;">{{ site.ebay }}</td>
                  <td class="py-2.5 text-center font-semibold font-mono" style="font-family: 'Pliant', sans-serif;">{{ site.optimizations }}</td>
                  <td class="py-2.5 text-center font-semibold font-mono" style="font-family: 'Pliant', sans-serif;">{{ site.blogs }}</td>
                  <td class="py-2.5 text-center font-semibold text-amber-500 font-mono" style="font-family: 'Pliant', sans-serif;">{{ site.pending }}</td>
                  <td class="py-2.5 text-center font-semibold text-red-500 font-mono" style="font-family: 'Pliant', sans-serif;">{{ site.missed }}</td>
                </tr>
                <tr v-if="websiteSummaries.length === 0">
                  <td colspan="7" class="text-center py-6 text-text-muted italic">No website activities found for the selected range.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- 4. GSC Website Performance details table -->
      <section class="mt-8">
        <h2 class="text-sm font-bold text-text-main mb-3">Website Performance (Google Search Console)</h2>
        <div class="card card-pad">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-border text-text-soft font-bold uppercase tracking-wider text-[10px]">
                  <th class="pb-2">Website</th>
                  <th class="pb-2 text-right w-32">Clicks</th>
                  <th class="pb-2 text-right w-36">Impressions</th>
                  <th class="pb-2 text-right w-32">Average CTR</th>
                  <th class="pb-2 text-right w-32">Average Position</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/30">
                <tr v-for="site in gscPerformanceList" :key="site.id" class="hover:bg-soft/10">
                  <td class="py-2.5 flex items-center gap-2">
                    <WebsiteFavicon :favicon-url="site.favicon" :domain="site.domain" :name="site.name" :size="16" />
                    <div class="min-w-0">
                      <strong class="text-text-main block">{{ site.name }}</strong>
                      <span class="text-[10px] text-text-muted block truncate w-36">{{ site.domain }}</span>
                    </div>
                  </td>
                  <td class="py-2.5 text-right font-bold text-emerald-500 font-mono" style="font-family: 'Pliant', sans-serif;">
                    {{ site.clicks.toLocaleString() }}
                  </td>
                  <td class="py-2.5 text-right font-semibold text-text-muted font-mono" style="font-family: 'Pliant', sans-serif;">
                    {{ site.impressions.toLocaleString() }}
                  </td>
                  <td class="py-2.5 text-right font-semibold text-blue-500 font-mono" style="font-family: 'Pliant', sans-serif;">
                    {{ (site.ctr * 100).toFixed(2) }}%
                  </td>
                  <td class="py-2.5 text-right font-semibold text-amber-500 font-mono" style="font-family: 'Pliant', sans-serif;">
                    {{ site.position.toFixed(1) }}
                  </td>
                </tr>
                <tr v-if="gscPerformanceList.length === 0">
                  <td colspan="5" class="text-center py-6 text-text-muted italic">No Search Console performance data available for this range. Connect Google Search Console or sync to retrieve data.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- 4. Recent Activity Section -->
      <section class="mt-8">
        <h2 class="text-sm font-bold text-text-main mb-3">Recent Activity Logs</h2>
        <div class="card card-pad">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-border text-text-soft font-bold uppercase tracking-wider text-[10px]">
                  <th class="pb-2 w-28">Date</th>
                  <th class="pb-2 w-48">Website</th>
                  <th class="pb-2 w-28">Type</th>
                  <th class="pb-2">What was done</th>
                  <th class="pb-2 text-center w-24">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/30">
                <tr v-for="(act, idx) in recentActivityList" :key="idx" class="hover:bg-soft/10">
                  <td class="py-2 text-text-muted font-mono" style="font-family: 'Pliant', sans-serif;">{{ act.date }}</td>
                  <td class="py-2 text-text-main font-semibold">{{ act.website }}</td>
                  <td class="py-2 text-text-secondary">{{ act.type }}</td>
                  <td class="py-2 text-text-main font-medium truncate max-w-xs" :title="act.desc">{{ act.desc }}</td>
                  <td class="py-2 text-center">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-500">
                      {{ act.status }}
                    </span>
                  </td>
                </tr>
                <tr v-if="recentActivityList.length === 0">
                  <td colspan="5" class="text-center py-6 text-text-muted italic">No recent completed items logged in this range.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- 5. Pending section -->
      <section class="mt-8 pb-12">
        <h2 class="text-sm font-bold text-text-main mb-3 text-amber-500">Pending Actions Required</h2>
        <div class="card card-pad border-amber-500/10 bg-amber-500/5">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-amber-500/20 text-amber-500 font-bold uppercase tracking-wider text-[10px]">
                  <th class="pb-2 w-56">Website / Project</th>
                  <th class="pb-2 w-44">Follow-Up Type</th>
                  <th class="pb-2 w-28 text-right">Due Date</th>
                  <th class="pb-2 text-center w-28">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-amber-500/10">
                <tr v-for="(pend, idx) in pendingList.slice(0, 15)" :key="idx" class="hover:bg-amber-500/5">
                  <td class="py-2.5 font-bold text-text-main">{{ pend.website }}</td>
                  <td class="py-2.5 text-text-secondary font-semibold">{{ pend.type }}</td>
                  <td class="py-2.5 text-right font-mono" style="font-family: 'Pliant', sans-serif;">{{ pend.dueDate }}</td>
                  <td class="py-2.5 text-center">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500">
                      {{ pend.status }}
                    </span>
                  </td>
                </tr>
                <tr v-if="pendingList.length === 0">
                  <td colspan="4" class="text-center py-6 text-green-500 italic font-semibold">✓ All activities are completed. No pending work!</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </LoadingBlock>
  </div>
</template>

<style scoped>
.page-title {
  font-family: 'Raleway', 'Kantumruy Pro', sans-serif;
}
.font-mono {
  font-family: 'Pliant', monospace;
}
</style>
