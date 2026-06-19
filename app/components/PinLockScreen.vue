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
    setTimeout(() => { pin.value = ""; error.value = false; }, 600);
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key >= "0" && e.key <= "9") press(e.key);
  else if (e.key === "Backspace") backspace();
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <div class="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center px-6">
    <h1 class="mb-2"><AppLogo size="2.0625rem" /></h1>
    <p class="text-gray-400 text-sm mb-8">PIN을 입력하세요</p>

    <div class="flex gap-4 mb-2" :class="{ 'animate-pulse': error }">
      <div
        v-for="(filled, i) in dots"
        :key="i"
        class="w-4 h-4 rounded-full border-2"
        :class="filled ? 'bg-black border-black' : 'border-gray-200'"
      />
    </div>
    <p class="h-5 text-red-500 text-xs mb-6">{{ error ? "PIN이 일치하지 않아요" : "" }}</p>

    <div class="grid grid-cols-3 gap-4 w-full max-w-xs">
      <button
        v-for="n in [1,2,3,4,5,6,7,8,9]"
        :key="n"
        data-circle
        @click="press(String(n))"
        class="aspect-square rounded-full hover:bg-gray-200 font-semibold transition-colors select-none" style="background:#f7f8f8;font-size:28px;touch-action:manipulation"
      >
        {{ n }}
      </button>
      <div />
      <button
        data-circle
        @click="press('0')"
        class="aspect-square rounded-full hover:bg-gray-200 font-semibold transition-colors select-none" style="background:#f7f8f8;font-size:28px;touch-action:manipulation"
      >
        0
      </button>
      <button
        data-circle
        @click="backspace"
        class="aspect-square rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors select-none" style="font-size:28px;touch-action:manipulation"
      >
        ⌫
      </button>
    </div>
  </div>
</template>
