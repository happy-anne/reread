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
    <div class="mb-10 text-center">
      <h1 class="mb-1"><AppLogo size="44px" /></h1>
      <p class="text-gray-400 text-sm mt-2">Read again. With a plan.</p>
    </div>

    <form @submit.prevent="login" class="space-y-3">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">이메일</label>
        <input
          v-model="email"
          type="email"
          required
          class="w-full bg-gray-100 rounded-xl px-4 py-3 outline-none focus:bg-gray-200 transition-colors"
          placeholder="you@example.com"
          autocomplete="email"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">비밀번호</label>
        <input
          v-model="password"
          type="password"
          required
          class="w-full bg-gray-100 rounded-xl px-4 py-3 outline-none focus:bg-gray-200 transition-colors"
          placeholder="••••••••"
        />
      </div>

      <p v-if="error" class="text-red-500 text-sm pt-1">{{ error }}</p>

      <div class="pt-2">
        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-black hover:bg-gray-900 disabled:opacity-50 text-white font-medium py-3.5 text-sm transition-colors"
        >
          {{ loading ? "로그인 중..." : "로그인" }}
        </button>
      </div>
    </form>

    <p class="text-center text-sm text-gray-400 mt-6">
      계정이 없으신가요?
      <NuxtLink to="/signup" class="text-black font-medium hover:underline">회원가입</NuxtLink>
    </p>
  </div>
</template>
