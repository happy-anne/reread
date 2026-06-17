<script setup lang="ts">
import type { Book } from "~/types";
import { PencilIcon, TrashIcon } from "@heroicons/vue/24/outline";

const supabase = useSupabaseClient();
const user = useSupabaseUser();

const books = ref<Book[]>([]);
const loading = ref(true);
const showForm = ref(false);
const editing = ref<Book | null>(null);

const form = reactive({ title: "", total_pages: "", start_page: "1" });

async function fetchBooks() {
  if (!user.value) return;
  const { data } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", user.value.id)
    .order("created_at", { ascending: false });
  books.value = (data as Book[]) ?? [];
  loading.value = false;
}

function openCreate() {
  editing.value = null;
  Object.assign(form, { title: "", total_pages: "", start_page: "1" });
  showForm.value = true;
}

function openEdit(book: Book) {
  editing.value = book;
  Object.assign(form, {
    title: book.title,
    total_pages: String(book.total_pages),
    start_page: String(book.start_page),
  });
  showForm.value = true;
}

async function saveBook() {
  if (!user.value) return;
  const total = parseInt(form.total_pages);
  const start = parseInt(form.start_page);
  const readable = total - (start - 1);

  const payload = {
    title: form.title,
    total_pages: total,
    start_page: start,
    user_id: user.value.id,
  };

  if (editing.value) {
    await supabase.from("books").update(payload).eq("id", editing.value.id);
  } else {
    await supabase.from("books").insert(payload);
  }

  showForm.value = false;
  await fetchBooks();
}

async function deleteBook(id: string) {
  if (!confirm("이 책을 삭제할까요?")) return;
  await supabase.from("books").delete().eq("id", id);
  await fetchBooks();
}

onMounted(fetchBooks);
</script>

<template>
  <div class="px-4 pt-8 pb-4 max-w-lg mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Books</h1>
      <button
        @click="openCreate"
        class="bg-emerald-500 text-gray-900 font-semibold px-4 py-2 rounded-xl text-sm"
      >
        + Add
      </button>
    </div>

    <div v-if="loading" class="text-gray-400 text-sm">불러오는 중...</div>

    <div v-else-if="books.length === 0" class="text-center py-16 text-gray-400">
      <p class="text-4xl mb-3">📖</p>
      <p>아직 책이 없어요. 첫 번째 책을 추가해보세요!</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="book in books"
        :key="book.id"
        class="bg-white rounded-2xl px-5 py-4 border border-gray-200 flex items-center justify-between"
      >
        <div>
          <h3 class="font-semibold">{{ book.title }}</h3>
          <p class="text-gray-500 text-sm mt-0.5">
            {{ book.readable_pages }}쪽
            <span class="text-gray-300 ml-1">({{ book.start_page }}쪽부터)</span>
          </p>
        </div>
        <div class="flex gap-1">
          <button @click="openEdit(book)" class="text-gray-500 hover:text-white p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors" title="수정">
            <PencilIcon class="w-4 h-4" />
          </button>
          <button @click="deleteBook(book.id)" class="text-red-500 hover:text-red-600 p-2 rounded-lg bg-gray-100 hover:bg-red-50 transition-colors" title="삭제">
            <TrashIcon class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Form modal -->
    <Teleport to="body">
      <div v-if="showForm" class="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 px-4 pb-4">
        <div class="bg-white rounded-2xl p-6 w-full max-w-sm border border-gray-200">
          <h2 class="text-lg font-bold mb-4">{{ editing ? "책 수정" : "책 추가" }}</h2>
          <form @submit.prevent="saveBook" class="space-y-3">
            <div>
              <label class="text-sm text-gray-500 block mb-1">책 제목</label>
              <input v-model="form.title" required class="w-full bg-gray-100 border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label class="text-sm text-gray-500 block mb-1">전체 쪽수</label>
              <input v-model="form.total_pages" type="number" min="1" required class="w-full bg-gray-100 border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label class="text-sm text-gray-500 block mb-1">시작 쪽</label>
              <input v-model="form.start_page" type="number" min="1" required class="w-full bg-gray-100 border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              <p v-if="form.total_pages && form.start_page" class="text-xs text-gray-400 mt-1">
                읽을 쪽수: {{ Math.max(0, parseInt(form.total_pages) - (parseInt(form.start_page) - 1)) }}쪽
              </p>
            </div>
            <div class="flex gap-2 pt-2">
              <button type="button" @click="showForm = false" class="flex-1 bg-gray-100 text-gray-800 py-2.5 rounded-xl text-sm">취소</button>
              <button type="submit" class="flex-1 bg-emerald-500 text-gray-900 font-semibold py-2.5 rounded-xl text-sm">저장</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
