<script setup lang="ts">
const supabase = useSupabaseClient();
const user = useSupabaseUser();

const form = reactive({ title: "", total_pages: "", start_page: "1" });
const saving = ref(false);

async function saveBook() {
  if (!user.value) return;
  saving.value = true;
  const total = parseInt(form.total_pages);
  const start = parseInt(form.start_page);
  await supabase.from("books").insert({
    title: form.title,
    total_pages: total,
    start_page: start,
    user_id: user.value.id,
  });
  saving.value = false;
  navigateTo("/books");
}
</script>

<template>
  <div class="px-4 pt-8 pb-4 max-w-lg mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <NuxtLink to="/books" class="text-gray-400 hover:text-black transition-colors p-1 -ml-1">
        <svg width="10" height="17" viewBox="0 0 10 17" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 1L1 8.5L9 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </NuxtLink>
      <h1 class="text-2xl font-bold text-black">책 추가</h1>
    </div>

    <form @submit.prevent="saveBook" class="space-y-4">
      <div class="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
        <div>
          <label class="text-sm font-medium text-gray-700 block mb-1.5">책 제목</label>
          <input v-model="form.title" required placeholder="제목을 입력하세요" class="w-full bg-gray-100 px-4 py-3 text-sm outline-none focus:bg-gray-200 transition-colors" />
        </div>
        <div>
          <label class="text-sm font-medium text-gray-700 block mb-1.5">전체 쪽수</label>
          <input v-model="form.total_pages" type="number" min="1" required placeholder="0" class="w-full bg-gray-100 px-4 py-3 text-sm outline-none focus:bg-gray-200 transition-colors" />
        </div>
        <div>
          <label class="text-sm font-medium text-gray-700 block mb-1.5">시작 쪽</label>
          <input v-model="form.start_page" type="number" min="1" required class="w-full bg-gray-100 px-4 py-3 text-sm outline-none focus:bg-gray-200 transition-colors" />
          <p v-if="form.total_pages && form.start_page" class="text-xs text-gray-400 mt-1">
            읽을 쪽수: {{ Math.max(0, parseInt(form.total_pages) - (parseInt(form.start_page) - 1)) }}쪽
          </p>
        </div>
      </div>

      <button
        type="submit"
        :disabled="saving"
        class="w-full bg-black text-white font-medium py-3.5 text-sm disabled:opacity-40"
      >
        {{ saving ? "저장 중..." : "저장" }}
      </button>
    </form>
  </div>
</template>
