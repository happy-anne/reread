<script setup lang="ts">
import type { Book } from "~/types";

const supabase = useSupabaseClient();
const user = useSupabaseUser();
const route = useRoute();
const id = route.params.id as string;

const form = reactive({ title: "", total_pages: "", start_page: "1" });
const original = reactive({ title: "", total_pages: "", start_page: "1" });
const saving = ref(false);
const deleteTarget = ref(false);
const createdAt = ref("");
const updatedAt = ref("");

function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

const hasChanges = computed(
  () =>
    form.title !== original.title ||
    form.total_pages !== original.total_pages ||
    form.start_page !== original.start_page
);

onMounted(async () => {
  const { data } = await supabase.from("books").select("*").eq("id", id).single();
  if (data) {
    const book = data as Book;
    const vals = {
      title: book.title,
      total_pages: String(book.total_pages),
      start_page: String(book.start_page),
    };
    Object.assign(form, vals);
    Object.assign(original, vals);
    createdAt.value = book.created_at;
    updatedAt.value = book.updated_at;
  }
});

async function saveBook() {
  if (!user.value || !hasChanges.value) return;
  saving.value = true;
  await supabase.from("books").update({
    title: form.title,
    total_pages: parseInt(form.total_pages),
    start_page: parseInt(form.start_page),
  }).eq("id", id);
  saving.value = false;
  navigateTo("/books");
}

async function doDelete() {
  await supabase.from("books").delete().eq("id", id);
  navigateTo("/books");
}
</script>

<template>
  <div class="px-4 pt-8 pb-8 max-w-lg mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <NuxtLink to="/books" class="text-gray-400 hover:text-black transition-colors p-1 -ml-1">
        <svg width="10" height="17" viewBox="0 0 10 17" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 1L1 8.5L9 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </NuxtLink>
      <h1 class="text-2xl font-bold text-black">책 수정</h1>
    </div>

    <form @submit.prevent="saveBook" class="space-y-4">
      <div class="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
        <div>
          <label class="text-sm text-gray-500 block mb-1.5">책 제목</label>
          <input v-model="form.title" required class="w-full bg-gray-100 px-4 py-3 text-sm outline-none focus:bg-gray-200 transition-colors" />
        </div>
        <div>
          <label class="text-sm text-gray-500 block mb-1.5">전체 쪽수</label>
          <input v-model="form.total_pages" type="number" min="1" required class="w-full bg-gray-100 px-4 py-3 text-sm outline-none focus:bg-gray-200 transition-colors" />
        </div>
        <div>
          <label class="text-sm text-gray-500 block mb-1.5">시작 쪽</label>
          <input v-model="form.start_page" type="number" min="1" required class="w-full bg-gray-100 px-4 py-3 text-sm outline-none focus:bg-gray-200 transition-colors" />
          <p v-if="form.total_pages && form.start_page" class="text-xs text-gray-400 mt-1">
            읽을 쪽수: {{ Math.max(0, parseInt(form.total_pages) - (parseInt(form.start_page) - 1)) }}쪽
          </p>
        </div>
      </div>

      <button
        type="submit"
        :disabled="saving"
        class="w-full font-medium py-3.5 text-sm transition-colors"
        :class="hasChanges ? 'bg-black text-white' : 'bg-gray-100 text-gray-400 cursor-default'"
      >
        {{ saving ? "저장 중..." : "저장" }}
      </button>

      <div v-if="createdAt" class="text-center mt-1 mb-2" style="font-size:12px;color:#999;line-height:1.7">
        <p>최초 작성일 {{ formatDate(createdAt) }}</p>
        <p>최종 편집일 {{ formatDate(updatedAt) }}</p>
      </div>

      <button
        type="button"
        @click="deleteTarget = true"
        class="w-full text-center text-sm py-2 bg-transparent"
        style="color:#999"
      >
        책 삭제
      </button>
    </form>

    <!-- 삭제 확인 모달 -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
        <div class="bg-white rounded-2xl p-6 w-full max-w-sm">
          <h3 class="font-bold text-black mb-1" style="font-size:22px">책을 삭제할까요?</h3>
          <p class="text-sm text-gray-400 mb-5">삭제 후에는 복구할 수 없어요.</p>
          <div class="flex gap-2">
            <button @click="deleteTarget = false" class="flex-1 bg-gray-100 text-gray-700 font-medium py-3 text-sm">취소</button>
            <button @click="doDelete" class="flex-1 bg-black text-white font-medium py-3 text-sm">삭제</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
