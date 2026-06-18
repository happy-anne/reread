<script setup lang="ts">
definePageMeta({ layout: "auth" });

const supabase = useSupabaseClient();
const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");
const done = ref(false);

async function signup() {
  loading.value = true;
  error.value = "";
  const { error: err } = await supabase.auth.signUp({
    email: email.value,
    password: password.value,
  });
  if (err) error.value = err.message;
  else done.value = true;
  loading.value = false;
}
</script>

<template>
  <div class="w-full max-w-sm">
    <div class="mb-10 text-center">
      <h1 class="mb-1"><AppLogo /></h1>
      <p class="text-gray-400 text-sm mt-2">Read again. With a plan.</p>
    </div>

    <div v-if="done" class="text-center space-y-4">
      <p class="text-black font-semibold">이메일을 확인해주세요!</p>
      <p class="text-gray-500 text-sm"><strong>{{ email }}</strong>로 인증 링크를 보냈어요.</p>
      <NuxtLink to="/login" class="text-black font-medium hover:underline text-sm">로그인으로 돌아가기</NuxtLink>
    </div>

    <form v-else @submit.prevent="signup" class="space-y-3">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">이메일</label>
        <input
          v-model="email"
          type="email"
          required
          class="w-full bg-gray-100 rounded-xl px-4 py-3 outline-none focus:bg-gray-200 transition-colors"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">비밀번호</label>
        <input
          v-model="password"
          type="password"
          required
          minlength="6"
          class="w-full bg-gray-100 rounded-xl px-4 py-3 outline-none focus:bg-gray-200 transition-colors"
          placeholder="6자 이상"
        />
      </div>

      <p v-if="error" class="text-red-500 text-sm pt-1">{{ error }}</p>

      <div class="pt-2">
        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-black hover:bg-gray-900 disabled:opacity-50 text-white font-medium py-3.5 rounded-full text-sm transition-colors"
        >
          {{ loading ? "계정 생성 중..." : "회원가입" }}
        </button>
      </div>
    </form>

    <p class="text-center text-sm text-gray-400 mt-6">
      이미 계정이 있으신가요?
      <NuxtLink to="/login" class="text-black font-medium hover:underline">로그인</NuxtLink>
    </p>
  </div>
</template>
