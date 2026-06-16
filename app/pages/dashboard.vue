<script setup lang="ts">
import type { ReadingSet, ReadingSetItem, ReadingLog, DailySchedule } from "~/types";
import { buildSchedule, getReadingDates } from "~/composables/useScheduler";

const supabase = useSupabaseClient();
const user = useSupabaseUser();

function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

const today = toLocalDateStr(new Date());
const loading = ref(true);
const activeSets = ref<(ReadingSet & { items: ReadingSetItem[] })[]>([]);
const todayLogs = ref<ReadingLog[]>([]);
const todaySchedules = ref<{ set_id: string; schedule: DailySchedule }[]>([]);

const pageInput = ref<Record<string, number | null>>({});
const saving = ref<Record<string, boolean>>({});

async function fetchData() {
  if (!user.value) return;
  loading.value = true;

  const { data: sets } = await supabase
    .from("reading_sets")
    .select("*, items:reading_set_items(*, book:books(*))")
    .eq("user_id", user.value.id)
    .lte("start_date", today)
    .gte("end_date", today);

  activeSets.value = (sets as any[]) ?? [];

  // Build today's schedule for each active set
  todaySchedules.value = [];
  for (const set of activeSets.value) {
    const dates = getReadingDates(set.start_date, set.end_date, set.rest_days ?? []);
    const schedule = buildSchedule(set, dates);
    const todayEntry = schedule.find((s) => s.date === today);
    if (todayEntry) {
      todaySchedules.value.push({ set_id: set.id, schedule: todayEntry });
    }
  }

  // Fetch today's logs
  const { data: logs } = await supabase
    .from("reading_logs")
    .select("*")
    .eq("user_id", user.value!.id)
    .eq("log_date", today);

  todayLogs.value = (logs as ReadingLog[]) ?? [];
  loading.value = false;
}

function getLog(setId: string) {
  return todayLogs.value.find((l) => l.set_id === setId);
}

function getStatus(setId: string) {
  const log = getLog(setId);
  if (!log) return "not_done";
  return log.status;
}

function determineStatus(target_end: number, actual: number): ReadingLog["status"] {
  if (actual >= target_end) return "completed";
  return "partial";
}

async function saveProgress(setId: string, schedule: DailySchedule, actual: number) {
  if (!user.value) return;
  saving.value[setId] = true;

  const status = determineStatus(schedule.end_page, actual);
  const payload = {
    user_id: user.value.id,
    set_id: setId,
    book_id: schedule.book_id,
    log_date: today,
    target_start_page: schedule.start_page,
    target_end_page: schedule.end_page,
    actual_page: actual,
    status,
  };

  const existing = getLog(setId);
  if (existing) {
    await supabase.from("reading_logs").update(payload).eq("id", existing.id);
  } else {
    await supabase.from("reading_logs").insert(payload);
  }

  await fetchData();
  saving.value[setId] = false;
}

async function markPassed(setId: string, schedule: DailySchedule) {
  if (!user.value) return;
  saving.value[setId] = true;

  const payload = {
    user_id: user.value.id,
    set_id: setId,
    book_id: schedule.book_id,
    log_date: today,
    target_start_page: schedule.start_page,
    target_end_page: schedule.end_page,
    actual_page: null,
    status: "passed" as const,
  };

  const existing = getLog(setId);
  if (existing) {
    await supabase.from("reading_logs").update(payload).eq("id", existing.id);
  } else {
    await supabase.from("reading_logs").insert(payload);
  }

  await fetchData();
  saving.value[setId] = false;
}

const statusColor: Record<string, string> = {
  completed: "text-emerald-400",
  partial: "text-yellow-400",
  not_done: "text-slate-500",
  passed: "text-slate-400",
};
const statusLabel: Record<string, string> = {
  completed: "Completed",
  partial: "Partial",
  not_done: "Not started",
  passed: "Passed",
};

onMounted(fetchData);
</script>

<template>
  <div class="px-4 pt-8 pb-4 max-w-lg mx-auto">
    <div class="mb-6">
      <p class="text-slate-400 text-sm">{{ today }}</p>
      <h1 class="text-2xl font-bold mt-0.5">Today's Reading</h1>
    </div>

    <div v-if="loading" class="text-slate-500 text-sm">Loading...</div>

    <div v-else-if="todaySchedules.length === 0" class="text-center py-16 text-slate-500">
      <p class="text-4xl mb-3">📚</p>
      <p>No active reading sets for today.</p>
      <NuxtLink to="/sets" class="text-emerald-400 text-sm mt-2 inline-block hover:underline">
        Create a reading set →
      </NuxtLink>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="{ set_id, schedule } in todaySchedules"
        :key="set_id"
        class="bg-slate-800 rounded-2xl p-5 border border-slate-700"
      >
        <!-- Set name -->
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs text-slate-400 font-medium">
            {{ activeSets.find((s) => s.id === set_id)?.name }}
          </span>
          <span class="text-xs px-2 py-0.5 rounded-full bg-slate-700" :class="statusColor[getStatus(set_id)]">
            {{ statusLabel[getStatus(set_id)] }}
          </span>
        </div>

        <!-- Book + Range -->
        <h2 class="text-lg font-semibold mb-1">{{ schedule.book_title }}</h2>
        <p class="text-emerald-400 text-2xl font-bold mb-4">
          p{{ schedule.start_page }} – p{{ schedule.end_page }}
          <span class="text-sm text-slate-400 font-normal ml-2">({{ schedule.pages_count }} pages)</span>
        </p>

        <!-- Round badge -->
        <p class="text-xs text-slate-500 mb-4">Round {{ schedule.reread_round }}</p>

        <!-- Quick page buttons -->
        <div class="flex flex-wrap gap-2 mb-3">
          <button
            v-for="p in range(schedule.start_page, schedule.end_page)"
            :key="p"
            @click="saveProgress(set_id, schedule, p)"
            :disabled="saving[set_id]"
            class="px-3 py-1.5 rounded-lg text-sm font-mono transition-colors"
            :class="
              getLog(set_id)?.actual_page === p
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
            "
          >
            {{ p }}
          </button>
        </div>

        <!-- Direct input -->
        <div class="flex gap-2 items-center">
          <input
            v-model.number="pageInput[set_id]"
            type="number"
            :min="schedule.start_page"
            :max="schedule.end_page + 100"
            :placeholder="`or type page (e.g. ${schedule.end_page + 10})`"
            class="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <button
            @click="pageInput[set_id] && saveProgress(set_id, schedule, pageInput[set_id]!)"
            :disabled="saving[set_id] || !pageInput[set_id]"
            class="bg-emerald-500 disabled:opacity-40 text-slate-950 font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            Save
          </button>
        </div>

        <!-- Pass button -->
        <button
          @click="markPassed(set_id, schedule)"
          :disabled="saving[set_id]"
          class="mt-3 w-full text-slate-500 hover:text-slate-300 text-sm py-1 transition-colors"
        >
          Pass today
        </button>
      </div>
    </div>
  </div>
</template>

