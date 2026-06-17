<script setup lang="ts">
definePageMeta({ layout: "auth" });

const user = useSupabaseUser();
if (!user.value) navigateTo("/login");

const lines = [
  "읽고 싶은 책들을 골라",
  "회독 계획을 세우면,",
  "오늘 읽을 분량을",
  "자동으로 계산해드려요.",
];

const visibleChars = ref<number[]>(lines.map(() => 0));
const done = ref(false);

onMounted(() => {
  let lineIdx = 0;
  let charIdx = 0;

  const tick = setInterval(() => {
    if (lineIdx >= lines.length) {
      clearInterval(tick);
      done.value = true;
      setTimeout(() => navigateTo("/dashboard"), 1200);
      return;
    }

    const line = lines[lineIdx]!;
    charIdx++;
    visibleChars.value[lineIdx] = charIdx;

    if (charIdx >= line.length) {
      lineIdx++;
      charIdx = 0;
    }
  }, 60);
});
</script>

<template>
  <div class="w-full max-w-sm text-center">
    <div class="mb-12">
      <h1 class="text-5xl font-extrabold text-emerald-400 tracking-tight">re:read</h1>
      <p class="text-slate-400 text-sm mt-2">Read again. With a plan.</p>
    </div>

    <div class="flex flex-col items-center gap-3 text-slate-300 text-base leading-relaxed min-h-[7rem]">
      <p
        v-for="(line, i) in lines"
        :key="i"
        class="transition-opacity duration-300"
        :class="visibleChars[i] > 0 ? 'opacity-100' : 'opacity-0'"
      >
        {{ line.slice(0, visibleChars[i]) }}<span v-if="visibleChars[i] > 0 && visibleChars[i] < line.length" class="animate-pulse">|</span>
      </p>
    </div>

    <div class="mt-12 flex justify-center">
      <div class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
    </div>
  </div>
</template>
