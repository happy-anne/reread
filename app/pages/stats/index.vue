<script setup lang="ts">
import type { ReadingLog, ReadingSet, ReadingSetItem } from "~/types";
import { calcTotalPages } from "~/composables/useScheduler";
import { PencilIcon } from "@heroicons/vue/24/outline";
import { getSetColor } from "~/composables/useSetColor";

const supabase = useSupabaseClient();
const user = useSupabaseUser();

const monthLogs = ref<ReadingLog[]>([]);
const allLogs = ref<ReadingLog[]>([]);
const sets = ref<(ReadingSet & { items: ReadingSetItem[] })[]>([]);
const selectedSetId = ref<string>("");

const now = new Date();
const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
const currentMonth = ref(
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
);

function splitMonth(monthStr: string): [number, number] {
  const parts = monthStr.split("-").map(Number);
  return [parts[0]!, parts[1]!];
}

const statusColor: Record<string, string> = {
  completed: "#22C55E",
  partial: "#FFA72C",
  not_done: "#ff4d50",
  passed: "#AAA",
};

const monthDisplay = computed(() => {
  const [y, m] = splitMonth(currentMonth.value);
  return `${y}년 ${m}월`;
});

const filteredMonthLogs = computed(() => {
  if (!selectedSetId.value) return monthLogs.value;
  return monthLogs.value.filter((l) => l.set_id === selectedSetId.value);
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
    const log = filteredMonthLogs.value.find((l) => l.log_date === date) ?? null;
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

  const completedSets = sets.value.filter((s) => s.end_date < todayStr).length;

  return { completed, totalLogged, totalPages, streak, completedSets };
});

const selectableSets = computed(() => {
  return [...sets.value].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return b.created_at.localeCompare(a.created_at);
  });
});

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

watch(selectedSetId, () => {
  fetchMonthLogs();
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
    <h1 class="text-2xl font-bold mb-6">통계</h1>

    <!-- Set selector -->
    <div v-if="selectableSets.length > 0" class="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
      <select
        v-model="selectedSetId"
        class="stats-select w-full outline-none transition-colors"
      >
        <option v-for="set in selectableSets" :key="set.id" :value="set.id">
          {{ set.name }}{{ set.is_active ? "" : " (일시중지)" }}
        </option>
      </select>
    </div>

    <!-- Set progress -->
    <div v-if="selectedSetProgress" class="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
      <div class="flex items-center gap-5">
        <DonutProgress
          :percent="selectedSetProgress.percent"
          :size="100"
          :strokeHex="getSetColor(sets.find(s=>s.id===selectedSetId)?.color??'').hex"
        />
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                :class="getSetColor(sets.find(s=>s.id===selectedSetId)?.color??'').dot" />
              <p class="font-semibold text-black truncate text-lg">{{ selectedSetProgress.name }}</p>
            </div>
            <NuxtLink
              :to="`/sets/${selectedSetId}/edit`"
              class="flex-shrink-0 text-gray-400 hover:text-black transition-colors p-1"
              title="편집"
            >
              <svg width="16" height="15" viewBox="0 0 30 29" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M23.25 0C24.1786 0 25.0719 0.344504 25.7588 0.962891L25.8936 1.09082L25.8955 1.0918L27.665 2.8623L27.667 2.86328C28.3654 3.56589 28.7578 4.51712 28.7578 5.50781C28.7577 6.49835 28.3653 7.44886 27.667 8.15137L27.665 8.15234L7.71289 28.1045C7.29381 28.5202 6.72796 28.7553 6.1377 28.7578H0.75C0.335931 28.7578 0.000234926 28.4218 0 28.0078V22.6191L0.0117188 22.3994C0.0638922 21.8899 0.288593 21.4107 0.652344 21.0439L20.6045 1.0918L20.6064 1.09082C21.3091 0.392379 22.2593 0 23.25 0ZM28.75 27.2578C29.1642 27.2578 29.5 27.5936 29.5 28.0078C29.5 28.422 29.1642 28.7578 28.75 28.7578H14.75C14.3358 28.7578 14 28.422 14 28.0078C14 27.5936 14.3358 27.2578 14.75 27.2578H28.75ZM23.25 1.5C22.6557 1.5 22.0856 1.73533 21.6641 2.1543L21.6631 2.15332L1.7168 22.0996C1.57824 22.2393 1.50083 22.4292 1.5 22.626V27.2578H6.13184C6.32749 27.257 6.51484 27.1791 6.6543 27.042L26.6045 7.0918C27.0224 6.67049 27.2577 6.10131 27.2578 5.50781C27.2578 4.9139 27.0229 4.34333 26.6045 3.92188L24.8359 2.15332C24.4144 1.73465 23.8441 1.5 23.25 1.5Z"/>
              </svg>
            </NuxtLink>
          </div>
          <p class="mt-0.5" style="color:#999;font-size:14px">
            {{ selectedSetProgress.pagesRead.toLocaleString() }}/{{ selectedSetProgress.totalPages.toLocaleString() }}쪽 · {{ sets.length }}세트
          </p>
        </div>
      </div>
    </div>

    <!-- Stats cards -->
    <div class="flex gap-2 mb-6 overflow-x-auto pb-1">
      <div class="bg-white rounded-2xl p-3 border border-gray-100 text-center flex-1 min-w-[72px]">
        <p class="text-lg font-bold text-black">{{ stats.streak }}</p>
        <p class="text-[13px] text-gray-400 mt-0.5">연속 일수</p>
      </div>
      <div class="bg-white rounded-2xl p-3 border border-gray-100 text-center flex-1 min-w-[72px]">
        <p class="text-lg font-bold text-black">{{ stats.totalPages.toLocaleString() }}</p>
        <p class="text-[13px] text-gray-400 mt-0.5">총 읽은 쪽</p>
      </div>
      <div class="bg-white rounded-2xl p-3 border border-gray-100 text-center flex-1 min-w-[72px]">
        <p class="text-lg font-bold text-black">
          {{ stats.totalLogged > 0 ? Math.round((stats.completed / stats.totalLogged) * 100) : 0 }}%
        </p>
        <p class="text-[13px] text-gray-400 mt-0.5">완료율</p>
      </div>
      <div class="bg-white rounded-2xl p-3 border border-gray-100 text-center flex-1 min-w-[72px]">
        <p class="text-lg font-bold text-black">{{ stats.completedSets }}</p>
        <p class="text-[13px] text-gray-400 mt-0.5">끝난 세트</p>
      </div>
    </div>

    <!-- Calendar -->
    <div class="bg-white rounded-2xl p-4 border border-gray-100">
      <div class="flex items-center justify-between mb-4">
        <button @click="prevMonth" class="text-gray-500 hover:text-gray-900 px-2">‹</button>
        <h2 class="font-semibold">{{ monthDisplay }}</h2>
        <button @click="nextMonth" class="text-gray-500 hover:text-gray-900 px-2">›</button>
      </div>

      <div class="grid grid-cols-7 gap-1 mb-1">
        <div v-for="d in ['일','월','화','수','목','금','토']" :key="d" class="text-center text-xs text-gray-400 py-1">
          {{ d }}
        </div>
      </div>

      <div class="grid grid-cols-7 gap-1">
        <div
          v-for="(day, i) in calendarDays"
          :key="i"
          class="aspect-square flex flex-col items-center justify-start rounded-lg text-xs pt-1"
          :class="day.date === todayStr ? 'bg-gray-100' : ''"
        >
          <template v-if="day.date">
            <span class="text-gray-500 leading-none">{{ parseInt(day.date.slice(-2)) }}</span>
            <span
              v-if="day.log"
              class="mt-1.5 rounded-full flex-shrink-0"
              style="width:8px;height:8px;display:inline-block"
              :style="{ backgroundColor: statusColor[day.log.status] }"
            />
          </template>
        </div>
      </div>

      <!-- Legend -->
      <div class="flex gap-4 mt-4 justify-center text-xs text-gray-400">
        <span class="flex items-center gap-1.5">
          <span class="inline-block rounded-full" style="width:8px;height:8px;background:#22C55E" />완료
        </span>
        <span class="flex items-center gap-1.5">
          <span class="inline-block rounded-full" style="width:8px;height:8px;background:#FFA72C" />부분
        </span>
        <span class="flex items-center gap-1.5">
          <span class="inline-block rounded-full" style="width:8px;height:8px;background:#ff4d50" />못읽음
        </span>
        <span class="flex items-center gap-1.5">
          <span class="inline-block rounded-full" style="width:8px;height:8px;background:#AAA" />패스
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-select {
  appearance: none;
  -webkit-appearance: none;
  background: #FFF;
  padding: 0;
  padding-right: 24px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%236B7684' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 0 center;
  background-size: 18px;
}
</style>
