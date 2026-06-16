<script setup lang="ts">
import type { ReadingLog, ReadingSet, ReadingSetItem } from "~/types";
import { calcTotalPages } from "~/composables/useScheduler";

const supabase = useSupabaseClient();
const user = useSupabaseUser();

const monthLogs = ref<ReadingLog[]>([]); // logs for the visible calendar month
const allLogs = ref<ReadingLog[]>([]); // all-time logs, for streak + cumulative stats
const sets = ref<(ReadingSet & { items: ReadingSetItem[] })[]>([]);
const selectedSetId = ref<string>("");

const now = new Date();
const currentMonth = ref(
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
);

function splitMonth(monthStr: string): [number, number] {
  const parts = monthStr.split("-").map(Number);
  return [parts[0]!, parts[1]!];
}

const statusEmoji: Record<string, string> = {
  completed: "🟢",
  partial: "🟡",
  not_done: "🔴",
  passed: "⚪",
};

const monthDisplay = computed(() => {
  const [y, m] = splitMonth(currentMonth.value);
  return `${y}년 ${m}월`;
});

const calendarDays = computed(() => {
  const [y, m] = splitMonth(currentMonth.value);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  const days: { date: string; log: ReadingLog | null }[] = [];

  for (let i = 0; i < first.getDay(); i++) {
    days.push({ date: "", log: null });
  }
  for (let d = 1; d <= last.getDate(); d++) {
    const date = `${currentMonth.value}-${String(d).padStart(2, "0")}`;
    const log = monthLogs.value.find((l) => l.log_date === date) ?? null;
    days.push({ date, log });
  }
  return days;
});

const stats = computed(() => {
  const completed = allLogs.value.filter((l) => l.status === "completed").length;
  const totalLogged = allLogs.value.filter((l) => l.status !== "passed").length;
  const totalPages = allLogs.value.reduce((s, l) => {
    if (l.actual_page) return s + (l.actual_page - l.target_start_page + 1);
    return s;
  }, 0);

  // Streak: consecutive days (from today backward) with completed or partial
  const sortedLogs = [...allLogs.value]
    .filter((l) => l.status === "completed" || l.status === "partial")
    .sort((a, b) => b.log_date.localeCompare(a.log_date));

  let streak = 0;
  let cur = new Date();
  for (const log of sortedLogs) {
    const logDate = new Date(log.log_date);
    const diff = Math.round((cur.getTime() - logDate.getTime()) / 86400000);
    if (diff <= 1) {
      streak++;
      cur = logDate;
    } else break;
  }

  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const completedSets = sets.value.filter((s) => s.end_date < today).length;

  return { completed, totalLogged, totalPages, streak, completedSets };
});

// Sets shown in the selector: active first, then by most recent
const selectableSets = computed(() => {
  return [...sets.value].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return b.created_at.localeCompare(a.created_at);
  });
});

// Progress for the selected set: pages read so far / total pages across all reread rounds
const selectedSetProgress = computed(() => {
  const set = sets.value.find((s) => s.id === selectedSetId.value);
  if (!set) return null;

  const setLogs = allLogs.value.filter((l) => l.set_id === set.id && l.actual_page != null);
  const pagesRead = setLogs.reduce((sum, l) => sum + (l.actual_page! - l.target_start_page + 1), 0);
  const totalPages = calcTotalPages(set.items ?? [], set.reread_count);
  const percent = totalPages > 0 ? Math.min(100, (pagesRead / totalPages) * 100) : 0;

  return { name: set.name, pagesRead, totalPages, percent };
});

watch(selectableSets, (list) => {
  if (!selectedSetId.value && list.length > 0) selectedSetId.value = list[0]!.id;
});

function prevMonth() {
  const [y, m] = splitMonth(currentMonth.value);
  const d = new Date(y, m - 2, 1);
  currentMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  fetchMonthLogs();
}

function nextMonth() {
  const [y, m] = splitMonth(currentMonth.value);
  const d = new Date(y, m, 1);
  currentMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  fetchMonthLogs();
}

async function fetchMonthLogs() {
  if (!user.value) return;
  const start = `${currentMonth.value}-01`;
  const [y, m] = splitMonth(currentMonth.value);
  const end = new Date(y, m, 0).toISOString().slice(0, 10);

  const { data } = await supabase
    .from("reading_logs")
    .select("*")
    .eq("user_id", user.value.id)
    .gte("log_date", start)
    .lte("log_date", end);

  monthLogs.value = (data as ReadingLog[]) ?? [];
}

async function fetchAll() {
  if (!user.value) return;
  const [{ data: logs }, { data: setsData }] = await Promise.all([
    supabase.from("reading_logs").select("*").eq("user_id", user.value.id),
    supabase
      .from("reading_sets")
      .select("*, items:reading_set_items(*, book:books(*))")
      .eq("user_id", user.value.id),
  ]);
  allLogs.value = (logs as ReadingLog[]) ?? [];
  sets.value = (setsData as any[]) ?? [];
  await fetchMonthLogs();
}

onMounted(fetchAll);
</script>

<template>
  <div class="px-4 pt-8 pb-4 max-w-lg mx-auto">
    <h1 class="text-2xl font-bold mb-6">Statistics</h1>

    <!-- Set progress -->
    <div v-if="selectableSets.length > 0" class="bg-slate-800 rounded-2xl p-4 border border-slate-700 mb-4">
      <select
        v-model="selectedSetId"
        class="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500 mb-4"
      >
        <option v-for="set in selectableSets" :key="set.id" :value="set.id">
          {{ set.name }}{{ set.is_active ? "" : " (Paused)" }}
        </option>
      </select>

      <div v-if="selectedSetProgress" class="flex items-center gap-5">
        <DonutProgress :percent="selectedSetProgress.percent" :size="100" />
        <div>
          <p class="font-semibold mb-1">{{ selectedSetProgress.name }}</p>
          <p class="text-emerald-400 text-sm">
            {{ selectedSetProgress.pagesRead.toLocaleString() }} / {{ selectedSetProgress.totalPages.toLocaleString() }} pages
          </p>
        </div>
      </div>
    </div>

    <!-- Stats cards -->
    <div class="grid grid-cols-2 gap-3 mb-6">
      <div class="bg-slate-800 rounded-2xl p-4 border border-slate-700 text-center">
        <p class="text-2xl font-bold text-emerald-400">{{ stats.streak }}</p>
        <p class="text-xs text-slate-400 mt-1">Streak days</p>
      </div>
      <div class="bg-slate-800 rounded-2xl p-4 border border-slate-700 text-center">
        <p class="text-2xl font-bold text-emerald-400">{{ stats.totalPages.toLocaleString() }}</p>
        <p class="text-xs text-slate-400 mt-1">Total pages read</p>
      </div>
      <div class="bg-slate-800 rounded-2xl p-4 border border-slate-700 text-center">
        <p class="text-2xl font-bold text-emerald-400">
          {{ stats.totalLogged > 0 ? Math.round((stats.completed / stats.totalLogged) * 100) : 0 }}%
        </p>
        <p class="text-xs text-slate-400 mt-1">Completion rate</p>
      </div>
      <div class="bg-slate-800 rounded-2xl p-4 border border-slate-700 text-center">
        <p class="text-2xl font-bold text-emerald-400">{{ stats.completedSets }}</p>
        <p class="text-xs text-slate-400 mt-1">Sets finished</p>
      </div>
    </div>

    <!-- Calendar -->
    <div class="bg-slate-800 rounded-2xl p-4 border border-slate-700">
      <div class="flex items-center justify-between mb-4">
        <button @click="prevMonth" class="text-slate-400 hover:text-white px-2">‹</button>
        <h2 class="font-semibold">{{ monthDisplay }}</h2>
        <button @click="nextMonth" class="text-slate-400 hover:text-white px-2">›</button>
      </div>

      <div class="grid grid-cols-7 gap-1 mb-1">
        <div v-for="d in ['S','M','T','W','T','F','S']" :key="d" class="text-center text-xs text-slate-500 py-1">
          {{ d }}
        </div>
      </div>

      <div class="grid grid-cols-7 gap-1">
        <div
          v-for="(day, i) in calendarDays"
          :key="i"
          class="aspect-square flex flex-col items-center justify-center rounded-lg text-xs"
          :class="day.date ? 'bg-slate-700/50' : ''"
        >
          <template v-if="day.date">
            <span class="text-slate-400">{{ parseInt(day.date.slice(-2)) }}</span>
            <span v-if="day.log" class="text-xs leading-none mt-0.5">
              {{ statusEmoji[day.log.status] }}
            </span>
          </template>
        </div>
      </div>

      <!-- Legend -->
      <div class="flex gap-3 mt-4 justify-center text-xs text-slate-500">
        <span>🟢 Done</span>
        <span>🟡 Partial</span>
        <span>🔴 Missed</span>
        <span>⚪ Passed</span>
      </div>
    </div>
  </div>
</template>
