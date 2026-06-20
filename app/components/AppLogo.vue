<script setup lang="ts">
const props = defineProps<{ size?: string; colonColor?: string; textColor?: string }>();
const fontSize = computed(() => props.size ?? '3.1875rem');
const colonColor = computed(() => props.colonColor ?? '#a6aeba');
const textColor = computed(() => props.textColor ?? '#191F28');
</script>

<template>
  <span class="font-bold" :style="{ fontSize, letterSpacing: '0' }">
    <span :style="{ color: textColor }">re</span><span :style="{ color: colonColor }">:</span><span :style="{ color: textColor }">read</span>
  </span>
</template>
