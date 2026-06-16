<script setup lang="ts">
const emit = defineEmits<{ unlocked: [] }>();

const pin = ref("");
const error = ref(false);

const dots = computed(() => Array.from({ length: 4 }, (_, i) => i < pin.value.length));

function press(digit: string) {
  if (pin.value.length >= 4) return;
  error.value = false;
  pin.value += digit;
  if (pin.value.length === 4) check();
}

function backspace() {
  pin.value = pin.value.slice(0, -1);
}

async function check() {
  const ok = await verifyPin(pin.value);
  if (ok) {
    markUnlocked();
    emit("unlocked");
  } else {
    error.value = true;
    setTimeout(() => {
      pin.value = "";
    }, 400);
  }
}
</script>

<template>
  <div class="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center px-6">
    <h1 class="text-2xl font-extrabold text-emerald-400 mb-2">re:read</h1>
    <p class="text-slate-400 text-sm mb-8">PIN을 입력하세요</p>

    <div class="flex gap-4 mb-2" :class="{ 'animate-pulse': error }">
      <div
        v-for="(filled, i) in dots"
        :key="i"
        class="w-4 h-4 rounded-full border-2"
        :class="filled ? 'bg-emerald-400 border-emerald-400' : 'border-slate-600'"
      />
    </div>
    <p class="h-5 text-red-400 text-xs mb-6">{{ error ? "PIN이 일치하지 않아요" : "" }}</p>

    <div class="grid grid-cols-3 gap-4 w-full max-w-xs">
      <button
        v-for="n in [1,2,3,4,5,6,7,8,9]"
        :key="n"
        @click="press(String(n))"
        class="aspect-square rounded-full bg-slate-800 hover:bg-slate-700 text-xl font-semibold text-slate-100 transition-colors"
      >
        {{ n }}
      </button>
      <div />
      <button
        @click="press('0')"
        class="aspect-square rounded-full bg-slate-800 hover:bg-slate-700 text-xl font-semibold text-slate-100 transition-colors"
      >
        0
      </button>
      <button
        @click="backspace"
        class="aspect-square rounded-full flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
      >
        ⌫
      </button>
    </div>
  </div>
</template>
