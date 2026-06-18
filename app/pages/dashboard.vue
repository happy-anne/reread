<script setup lang="ts">
import type { ReadingSet, ReadingSetItem, ReadingLog, DailySchedule } from "~/types";
import { computeLiveSchedule } from "~/composables/useScheduler";
import { getSetColor } from "~/composables/useSetColor";

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
const allLogs = ref<ReadingLog[]>([]);
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
    .eq("is_active", true)
    .lte("start_date", today)
    .gte("end_date", today);

  activeSets.value = (sets as any[]) ?? [];

  const setIds = activeSets.value.map((s) => s.id);
  if (setIds.length > 0) {
    const { data: logs } = await supabase
      .from("reading_logs")
      .select("*")
      .eq("user_id", user.value!.id)
      .in("set_id", setIds);
    allLogs.value = (logs as ReadingLog[]) ?? [];
  } else {
    allLogs.value = [];
  }

  todaySchedules.value = [];
  for (const set of activeSets.value) {
    const setLogs = allLogs.value.filter((l) => l.set_id === set.id);
    const liveSchedule = computeLiveSchedule(set, set.items, today, setLogs);

    const todayLog = setLogs.find((l) => l.log_date === today);
    const schedule: DailySchedule | null = todayLog
      ? {
          date: today,
          book_id: todayLog.book_id,
          book_title:
            set.items.find((i) => i.book_id === todayLog.book_id)?.book?.title ?? liveSchedule?.book_title ?? "",
          start_page: todayLog.target_start_page,
          end_page: todayLog.target_end_page,
          pages_count: todayLog.target_end_page - todayLog.target_start_page + 1,
          reread_round: liveSchedule?.reread_round ?? 1,
          book_occurrence: todayLog.book_occurrence,
        }
      : liveSchedule;

    if (schedule) {
      todaySchedules.value.push({ set_id: set.id, schedule });
    }
  }

  loading.value = false;
}

function getLog(setId: string) {
  return allLogs.value.find((l) => l.set_id === setId && l.log_date === today);
}

function getStatus(setId: string) {
  const log = getLog(setId);
  if (!log) return "pending";
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
    book_occurrence: schedule.book_occurrence,
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
    book_occurrence: schedule.book_occurrence,
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

onMounted(fetchData);
</script>

<template>
  <div class="px-4 pt-8 pb-4 max-w-lg mx-auto">
    <!-- Brand header -->
    <div class="text-center mb-8">
      <h1 class="mb-1"><AppLogo size="text-4xl" /></h1>
      <p class="text-gray-400 text-xs mt-1">Read again. With a plan.</p>
    </div>

    <div v-if="loading" class="text-gray-400 text-sm text-center">불러오는 중...</div>

    <div v-else-if="todaySchedules.length === 0" class="text-center py-16 text-gray-400">
      <p class="text-4xl mb-3">📚</p>
      <p>오늘 진행 중인 읽기 세트가 없어요.</p>
      <NuxtLink to="/sets" class="text-black text-sm mt-2 inline-block underline">
        읽기 세트 만들기 →
      </NuxtLink>
    </div>

    <div v-else class="space-y-5">
      <div
        v-for="{ set_id, schedule } in todaySchedules"
        :key="set_id"
        class="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100"
      >
        <!-- Set name + color dot + round -->
        <div class="flex items-center justify-center gap-2 mb-4">
          <span
            class="w-2.5 h-2.5 rounded-full flex-shrink-0"
            :style="{ backgroundColor: getSetColor(activeSets.find(s=>s.id===set_id)?.color??'').hex }"
          />
          <p class="text-xs text-gray-400 font-medium">
            {{ activeSets.find((s) => s.id === set_id)?.name }} · Round {{ schedule.reread_round }}
          </p>
        </div>

        <!-- Status illustration -->
        <StatusIllustration :status="getStatus(set_id)" />

        <!-- Book -->
        <h2 class="text-center text-lg font-semibold mt-4 mb-6">{{ schedule.book_title }}</h2>

        <!-- Page buttons + inline direct input -->
        <div class="flex flex-wrap justify-center gap-2">
          <button
            v-for="p in range(schedule.start_page, schedule.end_page)"
            :key="p"
            @click="saveProgress(set_id, schedule, p)"
            :disabled="saving[set_id]"
            class="px-3 py-1.5 rounded-full text-sm font-mono transition-colors"
            :class="
              getLog(set_id)?.actual_page === p
                ? 'text-white font-bold'
                : 'bg-white hover:bg-gray-100 text-gray-800 border border-gray-100'
            "
            :style="getLog(set_id)?.actual_page === p ? 'background-color:#0000ee' : ''"
          >
            {{ p }}
          </button>

          <input
            v-model.number="pageInput[set_id]"
            type="number"
            :min="schedule.start_page"
            :max="schedule.end_page + 100"
            placeholder="직접"
            class="w-16 text-center bg-white border border-gray-200 rounded-full px-2 py-1.5 outline-none focus:border-gray-400"
          />
          <button
            v-if="pageInput[set_id]"
            @click="saveProgress(set_id, schedule, pageInput[set_id]!)"
            :disabled="saving[set_id]"
            class="disabled:opacity-40 text-white font-medium px-4 py-1.5 rounded-full text-sm transition-colors"
            style="background-color:#0000ee"
          >
            저장
          </button>
        </div>

        <!-- Pass button -->
        <button
          @click="markPassed(set_id, schedule)"
          :disabled="saving[set_id]"
          class="mt-3 w-full text-gray-400 hover:text-gray-600 text-sm py-1 transition-colors"
        >
          오늘 패스
        </button>
      </div>
    </div>
  </div>
</template>
