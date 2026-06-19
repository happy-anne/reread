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
        style="font-size:32px;font-weight:200;line-height:1"
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
        <div class="flex items-start mb-2">
          <!-- <span
            class="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
            :style="{ backgroundColor: getSetColor(set.color).hex }"
          /> -->
          <div>
            <h3 class="font-semibold text-black" style="font-size:18px">{{ set.name }}</h3>
            <p class="text-gray-400 mt-0.5" style="font-size:14px">
              {{ set.reread_count }}회독 • {{ set.start_date }} ~ {{ set.end_date }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap gap-1 mb-3">
          <span
            v-for="item in [...(set.items ?? [])].sort((a, b) => a.order_index - b.order_index)"
            :key="item.id"
            class="bg-gray-50 rounded-full px-2.5 py-0.5 text-gray-500" style="font-size:14px"
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
            <svg width="16" height="15" viewBox="0 0 30 29" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M23.25 0C24.1786 0 25.0719 0.344504 25.7588 0.962891L25.8936 1.09082L25.8955 1.0918L27.665 2.8623L27.667 2.86328C28.3654 3.56589 28.7578 4.51712 28.7578 5.50781C28.7577 6.49835 28.3653 7.44886 27.667 8.15137L27.665 8.15234L7.71289 28.1045C7.29381 28.5202 6.72796 28.7553 6.1377 28.7578H0.75C0.335931 28.7578 0.000234926 28.4218 0 28.0078V22.6191L0.0117188 22.3994C0.0638922 21.8899 0.288593 21.4107 0.652344 21.0439L20.6045 1.0918L20.6064 1.09082C21.3091 0.392379 22.2593 0 23.25 0ZM28.75 27.2578C29.1642 27.2578 29.5 27.5936 29.5 28.0078C29.5 28.422 29.1642 28.7578 28.75 28.7578H14.75C14.3358 28.7578 14 28.422 14 28.0078C14 27.5936 14.3358 27.2578 14.75 27.2578H28.75ZM23.25 1.5C22.6557 1.5 22.0856 1.73533 21.6641 2.1543L21.6631 2.15332L1.7168 22.0996C1.57824 22.2393 1.50083 22.4292 1.5 22.626V27.2578H6.13184C6.32749 27.257 6.51484 27.1791 6.6543 27.042L26.6045 7.0918C27.0224 6.67049 27.2577 6.10131 27.2578 5.50781C27.2578 4.9139 27.0229 4.34333 26.6045 3.92188L24.8359 2.15332C24.4144 1.73465 23.8441 1.5 23.25 1.5Z"/>
            </svg>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
