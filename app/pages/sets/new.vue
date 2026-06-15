<script setup lang="ts">
import type { Book, ReadingSetItem } from "~/types";
// @ts-ignore - vuedraggable types
import draggable from "vuedraggable";

const supabase = useSupabaseClient();
const user = useSupabaseUser();

const books = ref<Book[]>([]);
const saving = ref(false);

const form = reactive({
  name: "",
  reread_count: 2,
  start_date: new Date().toISOString().slice(0, 10),
  end_date: "",
  rest_days: [] as number[],
});

// Selected books with draggable order
const selectedBooks = ref<{ book: Book; temp_id: string }[]>([]);

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

async function fetchBooks() {
  if (!user.value) return;
  const { data } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", user.value.id)
    .order("title");
  books.value = (data as Book[]) ?? [];
}

function isSelected(bookId: string) {
  return selectedBooks.value.some((s) => s.book.id === bookId);
}

function toggleBook(book: Book) {
  const idx = selectedBooks.value.findIndex((s) => s.book.id === book.id);
  if (idx >= 0) {
    selectedBooks.value.splice(idx, 1);
  } else {
    selectedBooks.value.push({ book, temp_id: crypto.randomUUID() });
  }
}

function toggleRestDay(day: number) {
  const idx = form.rest_days.indexOf(day);
  if (idx >= 0) form.rest_days.splice(idx, 1);
  else form.rest_days.push(day);
}

// Preview: total pages & daily pages
const totalPages = computed(() => {
  const sum = selectedBooks.value.reduce((s, { book }) => s + book.readable_pages, 0);
  return sum * form.reread_count;
});

const readingDays = computed(() => {
  if (!form.start_date || !form.end_date) return 0;
  let count = 0;
  const cur = new Date(form.start_date);
  const end = new Date(form.end_date);
  while (cur <= end) {
    if (!form.rest_days.includes(cur.getDay())) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
});

const dailyPages = computed(() =>
  readingDays.value > 0 ? Math.ceil(totalPages.value / readingDays.value) : 0
);

async function save() {
  if (!user.value || selectedBooks.value.length === 0) return;
  saving.value = true;

  const { data: setData, error } = await supabase
    .from("reading_sets")
    .insert({
      user_id: user.value.id,
      name: form.name,
      reread_count: form.reread_count,
      start_date: form.start_date,
      end_date: form.end_date,
      rest_days: form.rest_days,
    })
    .select()
    .single();

  if (error || !setData) {
    saving.value = false;
    return;
  }

  const items = selectedBooks.value.map(({ book }, idx) => ({
    set_id: setData.id,
    book_id: book.id,
    order_index: idx,
  }));

  await supabase.from("reading_set_items").insert(items);
  saving.value = false;
  navigateTo("/sets");
}

onMounted(fetchBooks);
</script>

<template>
  <div class="px-4 pt-8 pb-4 max-w-lg mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <NuxtLink to="/sets" class="text-slate-400 hover:text-white">←</NuxtLink>
      <h1 class="text-2xl font-bold">New Reading Set</h1>
    </div>

    <form @submit.prevent="save" class="space-y-6">
      <!-- Set name -->
      <div>
        <label class="text-sm text-slate-400 block mb-1">Set name</label>
        <input
          v-model="form.name"
          required
          placeholder="e.g. 2026 Classics"
          class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500"
        />
      </div>

      <!-- Book selection -->
      <div>
        <label class="text-sm text-slate-400 block mb-2">Select books</label>
        <div v-if="books.length === 0" class="text-slate-500 text-sm">
          No books yet. <NuxtLink to="/books" class="text-emerald-400 underline">Add books first.</NuxtLink>
        </div>
        <div class="space-y-2">
          <button
            v-for="book in books"
            :key="book.id"
            type="button"
            @click="toggleBook(book)"
            class="w-full text-left px-4 py-3 rounded-xl border transition-colors text-sm"
            :class="
              isSelected(book.id)
                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
            "
          >
            <span class="font-medium">{{ book.title }}</span>
            <span class="text-slate-400 ml-2">{{ book.readable_pages }}p</span>
          </button>
        </div>
      </div>

      <!-- Reading order (drag) -->
      <div v-if="selectedBooks.length > 1">
        <label class="text-sm text-slate-400 block mb-2">Reading order (drag to reorder)</label>
        <draggable
          v-model="selectedBooks"
          item-key="temp_id"
          handle=".drag-handle"
          class="space-y-2"
        >
          <template #item="{ element, index }">
            <div class="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
              <span class="drag-handle cursor-grab text-slate-500 text-lg select-none">⠿</span>
              <span class="text-sm text-slate-400 w-5">{{ index + 1 }}</span>
              <span class="flex-1 text-sm font-medium">{{ element.book.title }}</span>
            </div>
          </template>
        </draggable>
      </div>

      <!-- Reread count -->
      <div>
        <label class="text-sm text-slate-400 block mb-1">Reread count</label>
        <input
          v-model.number="form.reread_count"
          type="number"
          min="1"
          max="10"
          required
          class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500"
        />
      </div>

      <!-- Dates -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-sm text-slate-400 block mb-1">Start date</label>
          <input
            v-model="form.start_date"
            type="date"
            required
            class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-sm outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label class="text-sm text-slate-400 block mb-1">End date</label>
          <input
            v-model="form.end_date"
            type="date"
            required
            class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-sm outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <!-- Rest days -->
      <div>
        <label class="text-sm text-slate-400 block mb-2">Rest days</label>
        <div class="flex gap-2">
          <button
            v-for="(label, idx) in DAY_LABELS"
            :key="idx"
            type="button"
            @click="toggleRestDay(idx)"
            class="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
            :class="
              form.rest_days.includes(idx)
                ? 'bg-slate-600 text-slate-300'
                : 'bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-500'
            "
          >
            {{ label }}
          </button>
        </div>
      </div>

      <!-- Preview -->
      <div v-if="totalPages > 0 && dailyPages > 0" class="bg-slate-800 rounded-2xl p-4 border border-slate-700">
        <p class="text-xs text-slate-400 mb-2">Schedule preview</p>
        <div class="grid grid-cols-3 gap-3 text-center">
          <div>
            <p class="text-xl font-bold text-emerald-400">{{ totalPages.toLocaleString() }}</p>
            <p class="text-xs text-slate-500">Total pages</p>
          </div>
          <div>
            <p class="text-xl font-bold text-emerald-400">{{ readingDays }}</p>
            <p class="text-xs text-slate-500">Reading days</p>
          </div>
          <div>
            <p class="text-xl font-bold text-emerald-400">{{ dailyPages }}</p>
            <p class="text-xs text-slate-500">Pages/day</p>
          </div>
        </div>
      </div>

      <button
        type="submit"
        :disabled="saving || selectedBooks.length === 0 || !form.end_date"
        class="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-semibold py-3 rounded-xl transition-colors"
      >
        {{ saving ? "Creating..." : "Create Set" }}
      </button>
    </form>
  </div>
</template>
