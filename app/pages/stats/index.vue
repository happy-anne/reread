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
    <h1 class="text-2xl font-bold mb-6">Stats</h1>

    <!-- Set selector -->
    <div v-if="selectableSets.length > 0" class="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
      <select
        v-model="selectedSetId"
        class="w-full px-3 py-2 text-sm outline-none transition-colors" style="background:#FFF"
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
              class="flex-shrink-0 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-black transition-colors"
              title="편집"
            >
              <PencilIcon class="w-4 h-4" />
            </NuxtLink>
          </div>
          <p class="text-sm mt-0.5" style="color:#999">전체 {{ sets.length }}세트</p>
          <p class="text-sm mt-0.5" style="color:#999">
            {{ selectedSetProgress.pagesRead.toLocaleString() }} / {{ selectedSetProgress.totalPages.toLocaleString() }}쪽
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
          <span class="inline-block rounded-full" style="width:8px;height:8px;background:#ff4d50" />미완
        </span>
        <span class="flex items-center gap-1.5">
          <span class="inline-block rounded-full" style="width:8px;height:8px;background:#AAA" />패스
        </span>
      </div>
    </div>
  </div>
</template>
