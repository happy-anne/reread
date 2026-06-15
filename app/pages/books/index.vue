<script setup lang="ts">
import type { Book } from "~/types";

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
    readable_pages: readable,
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
  if (!confirm("Delete this book?")) return;
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
        class="bg-emerald-500 text-slate-950 font-semibold px-4 py-2 rounded-xl text-sm"
      >
        + Add
      </button>
    </div>

    <div v-if="loading" class="text-slate-500 text-sm">Loading...</div>

    <div v-else-if="books.length === 0" class="text-center py-16 text-slate-500">
      <p class="text-4xl mb-3">📖</p>
      <p>No books yet. Add your first book!</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="book in books"
        :key="book.id"
        class="bg-slate-800 rounded-2xl px-5 py-4 border border-slate-700 flex items-center justify-between"
      >
        <div>
          <h3 class="font-semibold">{{ book.title }}</h3>
          <p class="text-slate-400 text-sm mt-0.5">
            {{ book.readable_pages }} pages
            <span class="text-slate-600 ml-1">(starts p{{ book.start_page }})</span>
          </p>
        </div>
        <div class="flex gap-2">
          <button @click="openEdit(book)" class="text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors">
            Edit
          </button>
          <button @click="deleteBook(book.id)" class="text-red-400 hover:text-red-300 text-sm px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-red-900/30 transition-colors">
            Del
          </button>
        </div>
      </div>
    </div>

    <!-- Form modal -->
    <Teleport to="body">
      <div v-if="showForm" class="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 px-4 pb-4">
        <div class="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-700">
          <h2 class="text-lg font-bold mb-4">{{ editing ? "Edit Book" : "Add Book" }}</h2>
          <form @submit.prevent="saveBook" class="space-y-3">
            <div>
              <label class="text-sm text-slate-400 block mb-1">Title</label>
              <input v-model="form.title" required class="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label class="text-sm text-slate-400 block mb-1">Total pages</label>
              <input v-model="form.total_pages" type="number" min="1" required class="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label class="text-sm text-slate-400 block mb-1">Start page</label>
              <input v-model="form.start_page" type="number" min="1" required class="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              <p v-if="form.total_pages && form.start_page" class="text-xs text-slate-500 mt-1">
                Readable: {{ Math.max(0, parseInt(form.total_pages) - (parseInt(form.start_page) - 1)) }} pages
              </p>
            </div>
            <div class="flex gap-2 pt-2">
              <button type="button" @click="showForm = false" class="flex-1 bg-slate-700 text-slate-200 py-2.5 rounded-xl text-sm">Cancel</button>
              <button type="submit" class="flex-1 bg-emerald-500 text-slate-950 font-semibold py-2.5 rounded-xl text-sm">Save</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
