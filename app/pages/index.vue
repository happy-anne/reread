<script setup lang="ts">
definePageMeta({ layout: "auth" });

const user = useSupabaseUser();
if (user.value) navigateTo("/dashboard");
</script>

<template>
  <div class="w-full max-w-sm">
    <div class="mb-10 text-center">
      <h1 class="mb-1"><AppLogo size="44px" /></h1>
      <p class="text-gray-400 text-sm mt-2">Read again. With a plan.</p>
    </div>

    <p class="text-gray-500 text-center mb-10 leading-relaxed" style="font-size:15px">
      읽고 싶은 책들을 골라 회독 계획을 세우면,<br class="hidden sm:block" />오늘 읽을 분량을 자동으로 계산해드려요.
    </p>

    <div class="space-y-3">
      <NuxtLink
        to="/signup"
        class="block w-full bg-black hover:bg-gray-900 text-white font-medium py-3.5 rounded-lg text-sm text-center transition-colors"
      >
        시작하기
      </NuxtLink>
      <NuxtLink
        to="/login"
        class="block w-full bg-gray-100 hover:bg-gray-200 text-black font-medium py-3.5 rounded-lg text-sm text-center transition-colors"
      >
        로그인
      </NuxtLink>
    </div>
  </div>
</template>
