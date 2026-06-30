<script setup lang="ts">
import type { Book } from "~/types";

const supabase = useSupabaseClient();
const user = useSupabaseUser();

const books = ref<Book[]>([]);
const loading = ref(true);

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

async function deleteAll() {
  if (!user.value) return;
  if (!confirm(`책 ${books.value.length}권을 모두 삭제할까요? 관련 세트와 기록도 함께 삭제됩니다.`)) return;
  await supabase.from("books").delete().eq("user_id", user.value.id);
  books.value = [];
}

onMounted(fetchBooks);
</script>

<template>
  <div class="px-4 pt-8 pb-8 max-w-lg mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-black">책</h1>
      <NuxtLink
        to="/books/new"
        class="text-black leading-none"
        style="font-size:32px;font-weight:200;line-height:1"
        title="Add"
      >+</NuxtLink>
    </div>

    <div v-if="loading" class="text-gray-400 text-sm">불러오는 중...</div>

    <div v-else-if="books.length === 0" class="text-center py-16 text-gray-400">
      <img src="~/assets/images/ico_doc.svg" class="w-14 h-14 mx-auto mb-3" style="opacity:0.3" alt="" />
      <p>아직 책이 없어요. 첫 번째 책을 추가해보세요!</p>
    </div>

    <div v-else class="space-y-2.5">
      <div
        v-for="book in books"
        :key="book.id"
        class="bg-white rounded-2xl px-5 py-4 border border-gray-100 flex items-center justify-between"
      >
        <div>
          <h3 class="font-semibold text-black" style="font-size:18px">{{ book.title }}</h3>
          <p class="text-gray-400 mt-0.5" style="font-size:14px">
            {{ book.readable_pages }}쪽
            <span class="text-gray-300 ml-1">({{ book.start_page }}쪽부터)</span>
          </p>
        </div>
        <div class="flex gap-2 items-center">
          <NuxtLink :to="`/books/${book.id}/edit`" class="text-gray-400 hover:text-gray-800 p-1 transition-colors" title="수정">
            <svg width="24" height="24" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M96 215.999H48C45.8783 215.999 43.8435 215.156 42.3432 213.656C40.8429 212.156 40 210.121 40 207.999V163.299C39.9964 162.26 40.1977 161.231 40.5923 160.27C40.987 159.309 41.5673 158.435 42.3 157.699L162.3 37.6991C163.044 36.9432 163.932 36.343 164.91 35.9332C165.889 35.5235 166.939 35.3125 168 35.3125C169.061 35.3125 170.111 35.5235 171.09 35.9332C172.068 36.343 172.956 36.9432 173.7 37.6991L218.3 82.2991C219.056 83.0435 219.656 83.9308 220.066 84.9094C220.476 85.888 220.687 86.9382 220.687 87.9991C220.687 89.06 220.476 90.1103 220.066 91.0889C219.656 92.0674 219.056 92.9547 218.3 93.6991L96 215.999Z" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M216 216H96" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M136 64L192 120" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </NuxtLink>
        </div>
      </div>

      <div v-if="books.length >= 2" class="pt-2 text-center">
        <button @click="deleteAll" class="text-sm text-gray-400 hover:text-red-500 transition-colors">전체 삭제</button>
      </div>
    </div>
  </div>
</template>
