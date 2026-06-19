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
      <h1 class="text-5xl font-bold tracking-tight min-h-[3.5rem]">
        <span class="text-black">{{ "re".slice(0, Math.min(logoChars, 2)) }}</span>
        <span v-if="logoChars > 2" style="color:#a6aeba">:</span>
        <span class="text-black">{{ "read".slice(0, Math.max(0, logoChars - 3)) }}</span>
        <span v-if="logoChars < LOGO.length" class="animate-pulse opacity-40 text-black">|</span>
      </h1>
      <p class="text-gray-400 text-sm mt-2">Read again. With a plan.</p>
    </div>

    <div
      class="text-gray-500 text-sm leading-[1.5] transition-opacity duration-700"
      :class="showDesc ? 'opacity-100' : 'opacity-0'"
    >
      <p>오늘도 한 페이지의 여행을.</p>
    </div>

    <div class="mt-12 flex justify-center">
      <div class="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
    </div>
  </div>
</template>
