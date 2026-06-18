<script setup lang="ts">
const props = defineProps<{
  status: "completed" | "partial" | "not_done" | "passed" | "pending";
}>();

const config = {
  pending: {
    ring: "stroke-emerald-600",
    fg: "text-emerald-600",
    label: "오늘의 독서",
    message: "오늘은 어떤 페이지를 만나게 될까요?",
  },
  completed: {
    ring: "stroke-emerald-500",
    fg: "text-emerald-600",
    label: "Completed",
    message: "대단해요! 오늘도 스스로와의 약속을 지켜냈어요.",
  },
  partial: {
    ring: "stroke-yellow-400",
    fg: "text-yellow-400",
    label: "Partial",
    message: "천천히 가도 괜찮아요. 오늘도 앞으로 나아갔어요.",
  },
  not_done: {
    ring: "stroke-slate-600",
    fg: "text-gray-400",
    label: "Not started",
    message: "괜찮아요. 내일 다시 펼치면 그걸로 충분해요.",
  },
  passed: {
    ring: "stroke-sky-400",
    fg: "text-sky-400",
    label: "Passed",
    message: "쉬어가는 하루도 독서 여정의 일부예요.",
  },
}[props.status];
</script>

<template>
  <div class="flex flex-col items-center justify-center">
    <div class="relative w-24 h-24 flex items-center justify-center">
      <svg viewBox="0 0 100 100" class="w-24 h-24">
        <circle cx="50" cy="50" r="44" fill="none" stroke="#e5e7eb" stroke-width="4" />

        <!-- Pending: open book with question mark -->
        <g v-if="status === 'pending'">
          <circle cx="50" cy="50" r="44" fill="none" :class="config.ring" stroke-width="3" stroke-dasharray="8 4" />
          <path d="M32 42 Q50 34 50 42 Q50 34 68 42 L68 64 Q50 56 50 64 Q50 56 32 64 Z"
                fill="none" stroke="currentColor" stroke-width="2.5" class="text-emerald-700" stroke-linejoin="round" />
          <line x1="50" y1="42" x2="50" y2="64" stroke="currentColor" stroke-width="2.5" class="text-emerald-700" />
          <text x="50" y="54" text-anchor="middle" font-size="14" font-weight="bold" class="fill-emerald-500">?</text>
        </g>

        <!-- Completed: open book with checkmark -->
        <g v-else-if="status === 'completed'">
          <circle cx="50" cy="50" r="44" fill="none" :class="config.ring" stroke-width="4" />
          <path d="M32 42 Q50 34 50 42 Q50 34 68 42 L68 64 Q50 56 50 64 Q50 56 32 64 Z"
                fill="none" stroke="currentColor" stroke-width="2.5" class="text-emerald-600" stroke-linejoin="round" />
          <path d="M40 50 L48 58 L62 44" fill="none" stroke="currentColor" stroke-width="3.5"
                stroke-linecap="round" stroke-linejoin="round" class="text-emerald-600" />
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
                stroke-width="2.5" class="text-gray-300" />
          <line x1="50" y1="36" x2="50" y2="64" stroke="currentColor" stroke-width="2" class="text-gray-300" />
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
    <p class="text-xs text-gray-500 mt-1 text-center px-4 leading-relaxed">{{ config.message }}</p>
  </div>
</template>
