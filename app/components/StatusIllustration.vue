<script setup lang="ts">
const props = defineProps<{
  status: "completed" | "partial" | "not_done" | "passed";
}>();

const config = {
  completed: {
    ring: "stroke-emerald-400",
    glow: "bg-emerald-400/15",
    fg: "text-emerald-400",
    label: "Completed",
  },
  partial: {
    ring: "stroke-yellow-400",
    glow: "bg-yellow-400/15",
    fg: "text-yellow-400",
    label: "Partial",
  },
  not_done: {
    ring: "stroke-slate-600",
    glow: "bg-slate-600/10",
    fg: "text-slate-500",
    label: "Not started",
  },
  passed: {
    ring: "stroke-sky-400",
    glow: "bg-sky-400/15",
    fg: "text-sky-400",
    label: "Passed",
  },
}[props.status];
</script>

<template>
  <div class="flex flex-col items-center justify-center">
    <div class="relative w-24 h-24 flex items-center justify-center">
      <div class="absolute inset-0 rounded-full blur-xl" :class="config.glow" />

      <svg viewBox="0 0 100 100" class="w-24 h-24 relative">
        <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" stroke-width="4" class="text-slate-800" />

        <!-- Completed: open book with checkmark -->
        <g v-if="status === 'completed'">
          <circle cx="50" cy="50" r="44" fill="none" :class="config.ring" stroke-width="4" />
          <path d="M32 42 Q50 34 50 42 Q50 34 68 42 L68 64 Q50 56 50 64 Q50 56 32 64 Z"
                fill="none" stroke="currentColor" stroke-width="2.5" class="text-emerald-300" stroke-linejoin="round" />
          <path d="M40 50 L48 58 L62 44" fill="none" stroke="currentColor" stroke-width="3.5"
                stroke-linecap="round" stroke-linejoin="round" class="text-emerald-400" />
        </g>

        <!-- Partial: half-filled book -->
        <g v-else-if="status === 'partial'">
          <circle cx="50" cy="50" r="44" fill="none" :class="config.ring" stroke-width="4"
                  stroke-dasharray="138" stroke-dashoffset="69" stroke-linecap="round" transform="rotate(-90 50 50)" />
          <path d="M32 42 Q50 34 50 42 Q50 34 68 42 L68 64 Q50 56 50 64 Q50 56 32 64 Z"
                fill="none" stroke="currentColor" stroke-width="2.5" class="text-yellow-300" stroke-linejoin="round" />
          <line x1="50" y1="42" x2="50" y2="64" stroke="currentColor" stroke-width="2.5" class="text-yellow-400" />
        </g>

        <!-- Not done: empty/closed book -->
        <g v-else-if="status === 'not_done'">
          <rect x="36" y="36" width="28" height="28" rx="3" fill="none" stroke="currentColor"
                stroke-width="2.5" class="text-slate-600" />
          <line x1="50" y1="36" x2="50" y2="64" stroke="currentColor" stroke-width="2" class="text-slate-600" />
        </g>

        <!-- Passed: forward/skip arrow -->
        <g v-else-if="status === 'passed'">
          <circle cx="50" cy="50" r="44" fill="none" :class="config.ring" stroke-width="4" stroke-dasharray="6 6" />
          <path d="M40 36 L58 50 L40 64" fill="none" stroke="currentColor" stroke-width="3.5"
                stroke-linecap="round" stroke-linejoin="round" class="text-sky-400" />
          <line x1="62" y1="36" x2="62" y2="64" stroke="currentColor" stroke-width="3.5"
                stroke-linecap="round" class="text-sky-400" />
        </g>
      </svg>
    </div>
    <p class="text-sm font-medium mt-2" :class="config.fg">{{ config.label }}</p>
  </div>
</template>
