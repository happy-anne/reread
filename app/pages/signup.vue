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
    <div class="mb-8 text-center">
      <h1 class="text-2xl font-bold text-emerald-400">re:read</h1>
      <p class="text-slate-400 text-sm mt-1">Read again. With a plan.</p>
    </div>

    <div v-if="done" class="text-center space-y-4">
      <p class="text-emerald-400 font-semibold">이메일을 확인해주세요!</p>
      <p class="text-slate-400 text-sm"><strong>{{ email }}</strong>로 인증 링크를 보냈어요.</p>
      <NuxtLink to="/login" class="text-emerald-400 hover:underline text-sm">로그인으로 돌아가기</NuxtLink>
    </div>

    <form v-else @submit.prevent="signup" class="space-y-4">
      <div>
        <label class="block text-sm text-slate-400 mb-1">이메일</label>
        <input
          v-model="email"
          type="email"
          required
          class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label class="block text-sm text-slate-400 mb-1">비밀번호</label>
        <input
          v-model="password"
          type="password"
          required
          minlength="6"
          class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors"
          placeholder="6자 이상"
        />
      </div>

      <p v-if="error" class="text-red-400 text-sm">{{ error }}</p>

      <button
        type="submit"
        :disabled="loading"
        class="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold py-3 rounded-xl transition-colors"
      >
        {{ loading ? "계정 생성 중..." : "회원가입" }}
      </button>
    </form>

    <p class="text-center text-sm text-slate-500 mt-6">
      이미 계정이 있으신가요?
      <NuxtLink to="/login" class="text-emerald-400 hover:underline">로그인</NuxtLink>
    </p>
  </div>
</template>
