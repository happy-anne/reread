<script setup lang="ts">
const props = defineProps<{
  percent: number;
  size?: number;
  strokeHex?: string;
}>();

const size = props.size ?? 120;
const radius = 50;
const circumference = 2 * Math.PI * radius;

const offset = computed(() => {
  const clamped = Math.max(0, Math.min(100, props.percent));
  return circumference - (clamped / 100) * circumference;
});

const color = computed(() => props.strokeHex ?? "#34d399");
</script>

<template>
  <div class="relative inline-flex items-center justify-center" :style="{ width: size + 'px', height: size + 'px' }">
    <svg viewBox="0 0 120 120" :width="size" :height="size" class="-rotate-90">
      <circle cx="60" cy="60" :r="radius" fill="none" stroke-width="10" stroke="#e5e7eb" />
      <circle
        cx="60"
        cy="60"
        :r="radius"
        fill="none"
        stroke-width="10"
        stroke-linecap="round"
        :stroke="color"
        class="transition-all duration-500"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="offset"
      />
    </svg>
    <div class="absolute inset-0 flex flex-col items-center justify-center">
      <span class="text-xl font-bold" :style="{ color }">{{ Math.round(percent) }}%</span>
    </div>
  </div>
</template>
