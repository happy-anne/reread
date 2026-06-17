<script setup lang="ts">
definePageMeta({ layout: "auth" });

const supabase = useSupabaseClient();
const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");

async function login() {
  loading.value = true;
  error.value = "";
  const { error: err } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  });
  if (err) error.value = err.message;
  else {
    markLoginNow();
    navigateTo("/welcome");
  }
  loading.value = false;
}
</script>

<template>
  <div class="w-full max-w-sm">
    <div class="mb-8 text-center">
      <h1 class="text-2xl font-bold text-emerald-600">re:read</h1>
      <p class="text-gray-500 text-sm mt-1">Read again. With a plan.</p>
    </div>

    <form @submit.prevent="login" class="space-y-4">
      <div>
        <label class="block text-sm text-gray-500 mb-1">이메일</label>
        <input
          v-model="email"
          type="email"
          required
          class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label class="block text-sm text-gray-500 mb-1">비밀번호</label>
        <input
          v-model="password"
          type="password"
          required
          class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors"
          placeholder="••••••••"
        />
      </div>

      <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>

      <button
        type="submit"
        :disabled="loading"
        class="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-gray-900 font-semibold py-3 rounded-xl transition-colors"
      >
        {{ loading ? "로그인 중..." : "로그인" }}
      </button>
    </form>

    <p class="text-center text-sm text-gray-400 mt-6">
      계정이 없으신가요?
      <NuxtLink to="/signup" class="text-emerald-600 hover:underline">회원가입</NuxtLink>
    </p>
  </div>
</template>
