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

async function deleteAll() {
  if (!user.value) return;
  if (!confirm(`세트 ${sets.value.length}개를 모두 삭제할까요? 관련 기록도 함께 삭제됩니다.`)) return;
  await supabase.from("reading_sets").delete().eq("user_id", user.value.id);
  sets.value = [];
}

onMounted(fetchSets);
</script>

<template>
  <div class="px-4 pt-8 pb-8 max-w-lg mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-black">세트</h1>
      <NuxtLink
        to="/sets/new"
        class="text-black leading-none"
        style="font-size:32px;font-weight:200;line-height:1"
        title="새 세트"
      >+</NuxtLink>
    </div>

    <div v-if="loading" class="text-gray-400 text-sm">불러오는 중...</div>

    <div v-else-if="sets.length === 0" class="text-center py-16 text-gray-400">
      <img src="~/assets/images/ico_doc.svg" class="w-14 h-14 mx-auto mb-3" style="opacity:0.3" alt="" />
      <p>아직 읽기 세트가 없어요.</p>
      <p class="text-sm mt-1">세트를 만들어 회독 계획을 시작해보세요.</p>
    </div>

    <div v-else class="space-y-2.5">
      <div
        v-for="set in sortedSets"
        :key="set.id"
        class="bg-white rounded-2xl px-5 py-4 border border-gray-100 transition-opacity"
        :class="set.is_active ? '' : 'opacity-50'"
      >
        <div class="flex items-start mb-2">
          <!-- <span
            class="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
            :style="{ backgroundColor: getSetColor(set.color).hex }"
          /> -->
          <div>
            <NuxtLink :to="`/sets/${set.id}/view`" class="font-semibold text-black hover:underline" style="font-size:18px">{{ set.name }}</NuxtLink>
            <p class="text-gray-400 mt-0.5" style="font-size:14px">
              {{ set.reread_count }}회독 • {{ set.start_date }} ~ {{ set.end_date }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap gap-1 mb-3">
          <span
            v-for="item in [...(set.items ?? [])].sort((a, b) => a.order_index - b.order_index)"
            :key="item.id"
            class="rounded-full px-2.5 py-0.5 text-gray-500" style="font-size:14px;background:#F3F4F6"
          >
            {{ item.book?.title ?? "?" }}
          </span>
        </div>

        <!-- 하단: 상태 + 편집 버튼 -->
        <div class="flex items-center justify-end gap-2">
          <span class="font-medium" style="font-size:14px" :class="getStatus(set).color">{{ getStatus(set).label }}</span>
          <NuxtLink
            :to="`/sets/${set.id}/edit`"
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
      </div>

      <div v-if="sets.length >= 2" class="pt-2 text-center">
        <button @click="deleteAll" class="text-sm text-gray-400 hover:text-red-500 transition-colors">전체 삭제</button>
      </div>
    </div>
  </div>
</template>
