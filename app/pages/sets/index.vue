<script setup lang="ts">
import type { ReadingSet, ReadingSetItem } from "~/types";
import { getSetColor } from "~/composables/useSetColor";

const supabase = useSupabaseClient();
const user = useSupabaseUser();

const sets = ref<(ReadingSet & { items: ReadingSetItem[] })[]>([]);
const loading = ref(true);

async function fetchSets() {
  if (!user.value) return;
  const { data } = await supabase
    .from("reading_sets")
    .select("*, items:reading_set_items(*, book:books(*))")
    .eq("user_id", user.value.id)
    .order("created_at", { ascending: false });
  sets.value = (data as any[]) ?? [];
  loading.value = false;
}

const sortedSets = computed(() => {
  return [...sets.value].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return b.created_at.localeCompare(a.created_at);
  });
});

function getStatus(set: ReadingSet) {
  if (!set.is_active) return { label: "일시중지", color: "text-gray-400" };
  const today = new Date().toISOString().slice(0, 10);
  if (set.end_date < today) return { label: "완료", color: "text-gray-500" };
  if (set.start_date > today) return { label: "예정", color: "text-gray-500" };
  return { label: "진행 중", color: "text-gray-700" };
}

onMounted(fetchSets);
</script>

<template>
  <div class="px-4 pt-8 pb-4 max-w-lg mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-black">Sets</h1>
      <NuxtLink
        to="/sets/new"
        class="text-black leading-none"
        style="font-size:24px"
        title="새 세트"
      >+</NuxtLink>
    </div>

    <div v-if="loading" class="text-gray-400 text-sm">불러오는 중...</div>

    <div v-else-if="sets.length === 0" class="text-center py-16 text-gray-400">
      <p class="text-4xl mb-3">📋</p>
      <p>아직 읽기 세트가 없어요.</p>
      <p class="text-sm mt-1">세트를 만들어 회독 계획을 시작해보세요.</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="set in sortedSets"
        :key="set.id"
        class="bg-white rounded-2xl px-5 py-4 border border-gray-100 transition-opacity"
        :class="set.is_active ? '' : 'opacity-50'"
      >
        <div class="flex items-start justify-between mb-2">
          <div class="flex items-center gap-2">
            <span
              class="w-2.5 h-2.5 rounded-full flex-shrink-0"
              :style="{ backgroundColor: getSetColor(set.color).hex }"
            />
            <div>
              <h3 class="font-semibold text-black">{{ set.name }}</h3>
              <p class="text-gray-400 text-xs mt-0.5">
                {{ set.reread_count }}회독 • {{ set.start_date }} ~ {{ set.end_date }}
              </p>
            </div>
          </div>
          <span class="text-xs whitespace-nowrap ml-2 font-medium" :class="getStatus(set).color">{{ getStatus(set).label }}</span>
        </div>

        <div class="flex flex-wrap gap-1 mb-3 pl-[18px]">
          <span
            v-for="item in [...(set.items ?? [])].sort((a, b) => a.order_index - b.order_index)"
            :key="item.id"
            class="text-xs bg-gray-50 rounded-full px-2.5 py-0.5 text-gray-500"
          >
            {{ item.book?.title ?? "?" }}
          </span>
        </div>

        <div class="flex justify-end">
          <NuxtLink
            :to="`/sets/${set.id}/edit`"
            class="text-gray-400 hover:text-black transition-colors p-1"
            title="편집"
          >
            <!-- Compact pencil SVG -->
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
