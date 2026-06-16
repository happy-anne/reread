<script setup lang="ts">
definePageMeta({ layout: "auth" });

const user = useSupabaseUser();
if (user.value) navigateTo("/dashboard");
</script>

<template>
  <div class="w-full max-w-sm text-center">
    <div class="mb-10">
      <h1 class="text-5xl font-extrabold text-emerald-400 tracking-tight">re:read</h1>
      <p class="text-slate-400 text-sm mt-2">Read again. With a plan.</p>
    </div>

    <div class="mb-12 flex flex-col items-center gap-4 text-slate-400 text-sm leading-relaxed">
      <p>읽고 싶은 책들을 골라 회독 계획을 세우면,</p>
      <p>오늘 읽을 분량을 자동으로 계산해드려요.</p>
    </div>

    <div class="space-y-3">
      <NuxtLink
        to="/signup"
        class="block w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-3 rounded-xl transition-colors"
      >
        시작하기
      </NuxtLink>
      <NuxtLink
        to="/login"
        class="block w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 rounded-xl transition-colors"
      >
        로그인
      </NuxtLink>
    </div>
  </div>
</template>
