<script setup lang="ts">
definePageMeta({ layout: "auth" });

const user = useSupabaseUser();
if (!user.value) navigateTo("/login");

const LOGO = "re:read";
const logoChars = ref(0);
const showDesc = ref(false);

onMounted(() => {
  const tick = setInterval(() => {
    logoChars.value++;
    if (logoChars.value >= LOGO.length) {
      clearInterval(tick);
      setTimeout(() => {
        showDesc.value = true;
        setTimeout(() => navigateTo("/dashboard"), 2200);
      }, 300);
    }
  }, 100);
});
</script>

<template>
  <div class="w-full max-w-sm text-center">
    <div class="mb-12">
      <h1 class="text-5xl font-extrabold text-emerald-600 tracking-tight min-h-[3.5rem]">
        {{ LOGO.slice(0, logoChars) }}<span v-if="logoChars < LOGO.length" class="animate-pulse opacity-60">|</span>
      </h1>
      <p class="text-gray-500 text-sm mt-2">Read again. With a plan.</p>
    </div>

    <div
      class="text-gray-600 text-base leading-[1.5] transition-opacity duration-700"
      :class="showDesc ? 'opacity-100' : 'opacity-0'"
    >
      <p>읽고 싶은 책들을 골라</p>
      <p>회독 계획을 세우면,</p>
      <p class="mt-2">오늘 읽을 분량을</p>
      <p>자동으로 계산해드려요.</p>
    </div>

    <div class="mt-12 flex justify-center">
      <div class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
    </div>
  </div>
</template>
