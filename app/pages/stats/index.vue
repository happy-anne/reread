<script setup lang="ts">
import type { ReadingLog } from "~/types";

const supabase = useSupabaseClient();
const user = useSupabaseUser();

const logs = ref<ReadingLog[]>([]);
const currentMonth = ref(new Date().toISOString().slice(0, 7)); // YYYY-MM

const statusEmoji: Record<string, string> = {
  completed: "🟢",
  partial: "🟡",
  not_done: "🔴",
  passed: "⚪",
};

const monthDisplay = computed(() => {
  const [y, m] = currentMonth.value.split("-");
  return `${y}년 ${parseInt(m)}월`;
});

const calendarDays = computed(() => {
  const [y, m] = currentMonth.value.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  const days: { date: string; log: ReadingLog | null }[] = [];

  // Pad start
  for (let i = 0; i < first.getDay(); i++) {
    days.push({ date: "", log: null });
  }
  for (let d = 1; d <= last.getDate(); d++) {
    const date = `${currentMonth.value}-${String(d).padStart(2, "0")}`;
    const log = logs.value.find((l) => l.log_date === date) ?? null;
    days.push({ date, log });
  }
  return days;
});

const stats = computed(() => {
  const completed = logs.value.filter((l) => l.status === "completed").length;
  const totalLogged = logs.value.filter((l) => l.status !== "passed").length;
  const totalPages = logs.value.reduce((s, l) => {
    if (l.actual_page && l.log_date) {
      return s + (l.actual_page - l.target_start_page + 1);
    }
    return s;
  }, 0);

  // Streak: consecutive days with completed or partial
  const sortedLogs = [...logs.value]
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

  return { completed, totalLogged, totalPages, streak };
});

function prevMonth() {
  const [y, m] = currentMonth.value.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  currentMonth.value = d.toISOString().slice(0, 7);
  fetchLogs();
}

function nextMonth() {
  const [y, m] = currentMonth.value.split("-").map(Number);
  const d = new Date(y, m, 1);
  currentMonth.value = d.toISOString().slice(0, 7);
  fetchLogs();
}

async function fetchLogs() {
  if (!user.value) return;
  const start = `${currentMonth.value}-01`;
  const [y, m] = currentMonth.value.split("-").map(Number);
  const end = new Date(y, m, 0).toISOString().slice(0, 10);

  const { data } = await supabase
    .from("reading_logs")
    .select("*")
    .eq("user_id", user.value.id)
    .gte("log_date", start)
    .lte("log_date", end);

  logs.value = (data as ReadingLog[]) ?? [];
}

onMounted(fetchLogs);
</script>

<template>
  <div class="px-4 pt-8 pb-4 max-w-lg mx-auto">
    <h1 class="text-2xl font-bold mb-6">Statistics</h1>

    <!-- Stats cards -->
    <div class="grid grid-cols-2 gap-3 mb-6">
      <div class="bg-slate-800 rounded-2xl p-4 border border-slate-700 text-center">
        <p class="text-2xl font-bold text-emerald-400">{{ stats.streak }}</p>
        <p class="text-xs text-slate-400 mt-1">Streak days</p>
      </div>
      <div class="bg-slate-800 rounded-2xl p-4 border border-slate-700 text-center">
        <p class="text-2xl font-bold text-emerald-400">{{ stats.totalPages.toLocaleString() }}</p>
        <p class="text-xs text-slate-400 mt-1">Pages read</p>
      </div>
      <div class="bg-slate-800 rounded-2xl p-4 border border-slate-700 text-center">
        <p class="text-2xl font-bold text-emerald-400">{{ stats.completed }}</p>
        <p class="text-xs text-slate-400 mt-1">Days completed</p>
      </div>
      <div class="bg-slate-800 rounded-2xl p-4 border border-slate-700 text-center">
        <p class="text-2xl font-bold text-emerald-400">
          {{ stats.totalLogged > 0 ? Math.round((stats.completed / stats.totalLogged) * 100) : 0 }}%
        </p>
        <p class="text-xs text-slate-400 mt-1">Completion rate</p>
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
