<script setup lang="ts">
import type { ReadingLog, ReadingSet, ReadingSetItem } from "~/types";
import { buildBookSequence, computeLiveSchedule } from "~/composables/useScheduler";
import { getSetColor } from "~/composables/useSetColor";

const supabase = useSupabaseClient();
const user = useSupabaseUser();
const route = useRoute();
const setId = route.params.id as string;

const loading = ref(true);
const currentSet = ref<(ReadingSet & { items: ReadingSetItem[] }) | null>(null);
const logs = ref<ReadingLog[]>([]);
const openOccurrences = ref<Set<number>>(new Set());

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toggleOccurrence(occurrence: number) {
  if (openOccurrences.value.has(occurrence)) {
    openOccurrences.value.delete(occurrence);
  } else {
    openOccurrences.value.add(occurrence);
  }
}

async function fetchData() {
  if (!user.value) return;
  loading.value = true;

  const [{ data: setData }, { data: logsData }] = await Promise.all([
    supabase
      .from("reading_sets")
      .select("*, items:reading_set_items(*, book:books(*))")
      .eq("id", setId)
      .eq("user_id", user.value.id)
      .single(),
    supabase.from("reading_logs").select("*").eq("set_id", setId).eq("user_id", user.value.id),
  ]);

  currentSet.value = (setData as any) ?? null;
  logs.value = (logsData as ReadingLog[]) ?? [];
  loading.value = false;

  if (currentSet.value) {
    const items = [...(currentSet.value.items ?? [])].sort((a, b) => a.order_index - b.order_index);
    const today = toLocalDateStr(new Date());
    const schedule = computeLiveSchedule(currentSet.value, items, today, logs.value);
    if (schedule) {
      openOccurrences.value = new Set([schedule.book_occurrence]);
    } else {
      const sequence = buildBookSequence(items, currentSet.value.reread_count);
      const last = sequence[sequence.length - 1];
      openOccurrences.value = last ? new Set([last.occurrence]) : new Set();
    }
  }
}

const sortedItems = computed(() => {
  if (!currentSet.value?.items) return [];
  return [...currentSet.value.items].sort((a, b) => a.order_index - b.order_index);
});

const restDayLabels = computed(() => {
  if (!currentSet.value || currentSet.value.rest_days.length === 0) return "없음";
  return [...currentSet.value.rest_days].sort().map((d) => DAY_LABELS[d]).join(", ");
});

const occurrenceViews = computed(() => {
  if (!currentSet.value) return [];
  const sequence = buildBookSequence(sortedItems.value, currentSet.value.reread_count);
  return sequence.map(({ book, round, occurrence }) => {
    const readPages = new Set<number>();
    for (const log of logs.value) {
      if (log.book_occurrence !== occurrence || log.actual_page == null) continue;
      for (let p = log.target_start_page; p <= log.actual_page; p++) {
        readPages.add(p);
      }
    }
    return {
      occurrence,
      round,
      book,
      readPages,
      readCount: readPages.size,
      totalCount: book.readable_pages,
    };
  });
});

onMounted(fetchData);
</script>

<template>
  <div class="px-4 pt-8 pb-8 max-w-lg mx-auto overflow-x-hidden">
    <div class="flex items-center gap-3 mb-6">
      <NuxtLink to="/sets" class="text-gray-400 hover:text-black transition-colors p-1 -ml-1">
        <svg width="10" height="17" viewBox="0 0 10 17" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 1L1 8.5L9 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </NuxtLink>
      <h1 class="text-2xl font-bold text-black flex-1">읽기 세트 보기</h1>
      <NuxtLink
        :to="`/sets/${setId}/edit`"
        class="text-gray-400 hover:text-black transition-colors p-1"
        title="편집"
      >
        <svg width="24" height="24" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M96 215.999H48C45.8783 215.999 43.8435 215.156 42.3432 213.656C40.8429 212.156 40 210.121 40 207.999V163.299C39.9964 162.26 40.1977 161.231 40.5923 160.27C40.987 159.309 41.5673 158.435 42.3 157.699L162.3 37.6991C163.044 36.9432 163.932 36.343 164.91 35.9332C165.889 35.5235 166.939 35.3125 168 35.3125C169.061 35.3125 170.111 35.5235 171.09 35.9332C172.068 36.343 172.956 36.9432 173.7 37.6991L218.3 82.2991C219.056 83.0435 219.656 83.9308 220.066 84.9094C220.476 85.888 220.687 86.9382 220.687 87.9991C220.687 89.06 220.476 90.1103 220.066 91.0889C219.656 92.0674 219.056 92.9547 218.3 93.6991L96 215.999Z" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M216 216H96" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M136 64L192 120" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </NuxtLink>
    </div>

    <div v-if="loading" class="text-gray-400 text-sm">불러오는 중...</div>

    <div v-else-if="currentSet" class="space-y-2.5">
      <!-- 세트 정보 -->
      <div class="bg-white rounded-2xl p-5 border border-gray-100">
        <div class="flex items-center gap-2 mb-2">
          <span
            class="w-2.5 h-2.5 rounded-full flex-shrink-0"
            :style="{ backgroundColor: getSetColor(currentSet.color).hex }"
          />
          <h2 class="font-semibold text-black" style="font-size:18px">{{ currentSet.name }}</h2>
        </div>
        <div class="space-y-1 text-gray-500" style="font-size:14px">
          <p>{{ currentSet.reread_count }}회독 · {{ currentSet.start_date }} ~ {{ currentSet.end_date }}</p>
          <p>쉬는 요일 · {{ restDayLabels }}</p>
          <p>
            읽는 책 ·
            <span v-for="(item, i) in sortedItems" :key="item.id"
              >{{ item.book?.title ?? "?" }}<template v-if="i < sortedItems.length - 1"> → </template></span
            >
          </p>
        </div>
      </div>

      <!-- 책별/회독별 페이지 현황 -->
      <div
        v-for="view in occurrenceViews"
        :key="view.occurrence"
        class="bg-white rounded-2xl p-5 border border-gray-100"
      >
        <button
          type="button"
          class="flex items-center justify-between w-full"
          :class="openOccurrences.has(view.occurrence) ? 'mb-3' : ''"
          @click="toggleOccurrence(view.occurrence)"
        >
          <h3 class="font-semibold text-black" style="font-size:15px">
            {{ view.book.title }}<template v-if="currentSet.reread_count > 1"> · R{{ view.round }}</template>
          </h3>
          <div class="flex items-center gap-2">
            <span class="text-gray-400" style="font-size:13px">{{ view.readCount }} / {{ view.totalCount }}쪽</span>
            <svg
              width="12" height="12" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg"
              class="text-gray-400 transition-transform flex-shrink-0"
              :style="openOccurrences.has(view.occurrence) ? 'transform:rotate(180deg)' : ''"
            >
              <path d="M208 96L128 176L48 96" stroke="currentColor" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </button>
        <div v-if="openOccurrences.has(view.occurrence)" class="flex flex-wrap gap-1">
          <span
            v-for="p in range(view.book.start_page, view.book.total_pages)"
            :key="p"
            class="flex items-center justify-center font-mono transition-colors"
            :class="view.readPages.has(p) ? 'text-black' : 'bg-white text-gray-700 border'"
            :style="
              view.readPages.has(p)
                ? 'background-color:rgba(0,0,0,0.15);width:26px;height:26px;font-size:10px;border-radius:4px'
                : 'width:26px;height:26px;font-size:10px;border-radius:4px;border-color:rgba(0,0,0,0.1)'
            "
          >
            {{ p }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
