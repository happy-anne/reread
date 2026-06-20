<script setup lang="ts">
import bgImage from "~/assets/images/onboarding_bg.jpg";

definePageMeta({ layout: false });

const user = useSupabaseUser();
if (user.value) navigateTo("/dashboard");
</script>

<template>
  <div
    class="min-h-screen flex flex-col justify-between sm:justify-center sm:items-center py-14 sm:py-0 relative overflow-hidden" style="padding-left:40px;padding-right:40px"
    :style="`background-image: url(${bgImage}); background-size: cover; background-position: center;`"
  >
    <!-- 검정 오버레이 20% -->
    <div class="absolute inset-0 bg-black/20 pointer-events-none" />

    <!-- 상단부 -->
    <div class="relative z-10 sm:text-center sm:mb-16">
      <h1><AppLogo size="40px" colonColor="rgba(255,255,255,0.5)" textColor="#ffffff" /></h1>
      <p class="text-white/70 text-sm">Read again. With a plan.</p>
      <p class="text-white mt-6 text-base font-medium">오늘도 한 페이지의 여행을.</p>
    </div>

    <!-- 하단부 -->
    <div class="relative z-10 w-full sm:max-w-sm sm:mx-auto">
      <NuxtLink
        to="/login"
        class="block w-full bg-black hover:bg-gray-900 text-white font-medium py-3.5 rounded-lg text-sm text-center transition-colors"
      >
        로그인
      </NuxtLink>
      <p class="text-center text-sm text-white/60 mt-4">
        계정이 없으신가요?
        <NuxtLink to="/signup" class="text-white font-medium hover:underline">회원가입</NuxtLink>
      </p>
    </div>
  </div>
</template>
