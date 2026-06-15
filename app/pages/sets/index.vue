<script setup lang="ts">
import type { ReadingSet, ReadingSetItem } from "~/types";

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

async function deleteSet(id: string) {
  if (!confirm("Delete this reading set?")) return;
  await supabase.from("reading_sets").delete().eq("id", id);
  await fetchSets();
}

function getStatus(set: ReadingSet) {
  const today = new Date().toISOString().slice(0, 10);
  if (set.end_date < today) return { label: "Completed", color: "text-emerald-400" };
  if (set.start_date > today) return { label: "Upcoming", color: "text-blue-400" };
  return { label: "Active", color: "text-yellow-400" };
}

onMounted(fetchSets);
</script>

<template>
  <div class="px-4 pt-8 pb-4 max-w-lg mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Reading Sets</h1>
      <NuxtLink
        to="/sets/new"
        class="bg-emerald-500 text-slate-950 font-semibold px-4 py-2 rounded-xl text-sm"
      >
        + New Set
      </NuxtLink>
    </div>

    <div v-if="loading" class="text-slate-500 text-sm">Loading...</div>

    <div v-else-if="sets.length === 0" class="text-center py-16 text-slate-500">
      <p class="text-4xl mb-3">📋</p>
      <p>No reading sets yet.</p>
      <p class="text-sm mt-1">Create a set to start your re-reading plan.</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="set in sets"
        :key="set.id"
        class="bg-slate-800 rounded-2xl px-5 py-4 border border-slate-700"
      >
        <div class="flex items-start justify-between mb-2">
          <div>
            <h3 class="font-semibold">{{ set.name }}</h3>
            <p class="text-slate-400 text-xs mt-0.5">
              {{ set.reread_count }}x • {{ set.start_date }} ~ {{ set.end_date }}
            </p>
          </div>
          <span class="text-xs" :class="getStatus(set).color">{{ getStatus(set).label }}</span>
        </div>

        <div class="flex flex-wrap gap-1 mb-3">
          <span
            v-for="item in [...(set.items ?? [])].sort((a, b) => a.order_index - b.order_index)"
            :key="item.id"
            class="text-xs bg-slate-700 rounded-lg px-2 py-0.5 text-slate-300"
          >
            {{ item.book?.title ?? "?" }}
          </span>
        </div>

        <div class="flex gap-2">
          <NuxtLink
            :to="`/sets/${set.id}/edit`"
            class="flex-1 text-center text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 py-1.5 rounded-lg transition-colors"
          >
            Edit
          </NuxtLink>
          <button
            @click="deleteSet(set.id)"
            class="flex-1 text-sm bg-slate-700 hover:bg-red-900/30 text-red-400 hover:text-red-300 py-1.5 rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
