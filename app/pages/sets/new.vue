<script setup lang="ts">
import type { Book, ReadingSetItem } from "~/types";
import { getReadingDates } from "~/composables/useScheduler";
import { SET_COLORS } from "~/composables/useSetColor";
// @ts-ignore
import draggable from "vuedraggable";

const supabase = useSupabaseClient();
const user = useSupabaseUser();

function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const books = ref<Book[]>([]);
const saving = ref(false);

const form = reactive({
  name: "",
  reread_count: 1,
  start_date: toLocalDateStr(new Date()),
  end_date: "",
  rest_days: [] as number[],
  color: "rose",
});

const selectedBooks = ref<{ book: Book; temp_id: string }[]>([]);
const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const hasInput = computed(() =>
  form.name.trim().length > 0 && selectedBooks.value.length > 0 && form.end_date.length > 0
);

async function fetchBooks() {
  if (!user.value) return;
  const { data } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", user.value.id)
    .order("title");
  books.value = (data as Book[]) ?? [];
}

async function fetchDefaultRestDays() {
  if (!user.value) return;
  const { data } = await supabase
    .from("user_settings")
    .select("rest_days")
    .eq("user_id", user.value.id)
    .single();
  if (data?.rest_days) form.rest_days = [...data.rest_days];
}

function isSelected(bookId: string) {
  return selectedBooks.value.some((s) => s.book.id === bookId);
}

function toggleBook(book: Book) {
  const idx = selectedBooks.value.findIndex((s) => s.book.id === book.id);
  if (idx >= 0) selectedBooks.value.splice(idx, 1);
  else selectedBooks.value.push({ book, temp_id: crypto.randomUUID() });
}

function toggleRestDay(day: number) {
  const idx = form.rest_days.indexOf(day);
  if (idx >= 0) form.rest_days.splice(idx, 1);
  else form.rest_days.push(day);
}

function setQuickEndDate(option: '1m' | '3m' | '6m' | 'year') {
  const start = form.start_date ? new Date(form.start_date + 'T00:00:00') : new Date();
  const end = new Date(start);
  if (option === '1m') end.setMonth(end.getMonth() + 1);
  else if (option === '3m') end.setMonth(end.getMonth() + 3);
  else if (option === '6m') end.setMonth(end.getMonth() + 6);
  else if (option === 'year') { end.setFullYear(end.getFullYear()); end.setMonth(11); end.setDate(31); }
  form.end_date = toLocalDateStr(end);
}

const totalPages = computed(() => {
  const sum = selectedBooks.value.reduce((s, { book }) => s + book.readable_pages, 0);
  return sum * form.reread_count;
});

const readingDays = computed(() => {
  if (!form.start_date || !form.end_date) return 0;
  return getReadingDates(form.start_date, form.end_date, form.rest_days).length;
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
      color: form.color,
    })
    .select()
    .single();

  if (error || !setData) { saving.value = false; return; }

  await supabase.from("reading_set_items").insert(
    selectedBooks.value.map(({ book }, idx) => ({
      set_id: setData.id,
      book_id: book.id,
      order_index: idx,
    }))
  );
  saving.value = false;
  navigateTo("/sets");
}

onMounted(() => {
  fetchBooks();
  fetchDefaultRestDays();
});
</script>

<template>
  <div class="px-4 pt-8 pb-8 max-w-lg mx-auto overflow-x-hidden">
    <div class="flex items-center gap-3 mb-6">
      <NuxtLink to="/sets" class="text-gray-400 hover:text-black transition-colors p-1 -ml-1">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </NuxtLink>
      <h1 class="text-2xl font-bold text-black">새 읽기 세트</h1>
    </div>

    <form @submit.prevent="save" class="space-y-2.5">
      <!-- 세트 이름 -->
      <div class="bg-white rounded-2xl p-5 border border-gray-100">
        <label class="text-sm font-medium text-gray-700 block mb-1.5">세트 이름</label>
        <input
          v-model="form.name"
          required
          placeholder="예) 2026 고전 읽기"
          class="w-full bg-gray-100 px-4 py-3 text-sm outline-none focus:bg-gray-200 transition-colors"
        />
      </div>

      <!-- 세트 색상 -->
      <div class="bg-white rounded-2xl p-5 border border-gray-100">
        <label class="text-sm font-medium text-gray-700 block mb-3">세트 색상</label>
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="c in SET_COLORS"
            :key="c.id"
            type="button"
            data-circle
            @click="form.color = c.id"
            class="w-8 h-8 rounded-full transition-transform"
            :class="[c.dot, form.color === c.id ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'opacity-50 hover:opacity-80']"
            :title="c.label"
          />
        </div>
      </div>

      <!-- 책 선택 -->
      <div class="bg-white rounded-2xl p-5 border border-gray-100">
        <label class="text-sm font-medium text-gray-700 block mb-3">책 선택</label>
        <div v-if="books.length === 0" class="text-gray-400 text-sm">
          아직 책이 없어요. <NuxtLink to="/books" class="text-black underline">책을 먼저 추가해주세요.</NuxtLink>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="book in books"
            :key="book.id"
            type="button"
            @click="toggleBook(book)"
            :class="isSelected(book.id) ? 'bg-gray-100 text-black' : 'bg-white text-gray-700'"
            class="flex items-center gap-2 px-3 py-2 border transition-colors" style="font-size:15px;border-color:rgba(0,0,0,0.1)"
          >
            <span class="font-medium">{{ book.title }}</span>
            <svg v-if="isSelected(book.id)" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- 읽는 순서 -->
      <div v-if="selectedBooks.length > 1" class="bg-white rounded-2xl p-5 border border-gray-100">
        <label class="text-sm font-medium text-gray-700 block mb-2">읽는 순서 (드래그로 변경)</label>
        <draggable v-model="selectedBooks" item-key="temp_id" handle=".drag-handle" class="space-y-2">
          <template #item="{ element, index }">
            <div class="flex items-center gap-3 bg-gray-100 px-4 py-3" style="border-radius:8px">
              <span class="drag-handle cursor-grab text-gray-400 text-lg select-none">⠿</span>
              <span class="text-sm text-gray-400 w-5">{{ index + 1 }}</span>
              <span class="flex-1 text-sm font-medium text-black">{{ element.book.title }}</span>
            </div>
          </template>
        </draggable>
      </div>

      <!-- 회독 횟수 -->
      <div class="bg-white rounded-2xl p-5 border border-gray-100">
        <label class="text-sm font-medium text-gray-700 block mb-1.5">회독 횟수</label>
        <input
          v-model.number="form.reread_count"
          type="number"
          min="1"
          max="10"
          required
          class="w-full bg-gray-100 px-4 py-3 text-sm outline-none focus:bg-gray-200 transition-colors"
        />
      </div>

      <!-- 기간 카드 -->
      <div class="bg-white rounded-2xl p-5 border border-gray-100">
        <label class="text-sm font-medium text-gray-700 block mb-3">기간</label>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p class="text-xs text-gray-400 mb-1">시작일</p>
            <input
              v-model="form.start_date"
              type="date"
              required
              class="w-full bg-gray-100 px-3 py-2.5 text-sm outline-none focus:bg-gray-200 transition-colors"
            />
          </div>
          <div>
            <p class="text-xs text-gray-400 mb-1">종료일</p>
            <input
              v-model="form.end_date"
              type="date"
              required
              class="w-full bg-gray-100 px-3 py-2.5 text-sm outline-none focus:bg-gray-200 transition-colors"
            />
          </div>
        </div>
        <div class="flex gap-1.5">
          <button type="button" @click="setQuickEndDate('1m')" class="flex-1 bg-gray-100 text-gray-600 text-xs font-medium py-2 hover:bg-gray-200 transition-colors">1개월</button>
          <button type="button" @click="setQuickEndDate('3m')" class="flex-1 bg-gray-100 text-gray-600 text-xs font-medium py-2 hover:bg-gray-200 transition-colors">3개월</button>
          <button type="button" @click="setQuickEndDate('6m')" class="flex-1 bg-gray-100 text-gray-600 text-xs font-medium py-2 hover:bg-gray-200 transition-colors">6개월</button>
          <button type="button" @click="setQuickEndDate('year')" class="flex-1 bg-gray-100 text-gray-600 text-xs font-medium py-2 hover:bg-gray-200 transition-colors">연말</button>
        </div>
      </div>

      <!-- 쉬는 날 -->
      <div class="bg-white rounded-2xl p-5 border border-gray-100">
        <label class="text-sm font-medium text-gray-700 block mb-3">쉬는 날</label>
        <div class="flex gap-1.5">
          <button
            v-for="(label, idx) in DAY_LABELS"
            :key="idx"
            type="button"
            @click="toggleRestDay(idx)"
            class="flex-1 py-2 text-xs font-medium transition-colors"
            :class="form.rest_days.includes(idx) ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
          >
            {{ label }}
          </button>
        </div>
      </div>

      <!-- 스케줄 미리보기 -->
      <div v-if="totalPages > 0 && dailyPages > 0" class="bg-white rounded-2xl p-5 border border-gray-100">
        <p class="text-xs text-gray-400 mb-3">스케줄 미리보기</p>
        <div class="grid grid-cols-3 gap-3 text-center">
          <div>
            <p class="text-xl font-bold text-black">{{ totalPages.toLocaleString() }}</p>
            <p class="text-xs text-gray-400 mt-0.5">총 쪽수</p>
          </div>
          <div>
            <p class="text-xl font-bold text-black">{{ readingDays }}</p>
            <p class="text-xs text-gray-400 mt-0.5">읽는 날</p>
          </div>
          <div>
            <p class="text-xl font-bold text-black">{{ dailyPages }}</p>
            <p class="text-xs text-gray-400 mt-0.5">일일 쪽수</p>
          </div>
        </div>
      </div>

      <button
        type="submit"
        :disabled="saving || selectedBooks.length === 0 || !form.end_date"
        class="w-full font-medium py-3.5 transition-colors text-sm"
        :class="hasInput ? 'bg-black text-white' : 'bg-gray-100 text-gray-400 cursor-default'"
      >
        {{ saving ? "생성 중..." : "세트 만들기" }}
      </button>
    </form>
  </div>
</template>
