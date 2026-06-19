<script setup lang="ts">
const props = defineProps<{ size?: string }>();
const fontSize = computed(() => props.size ?? '3.1875rem');
</script>

<template>
  <span class="font-bold" :style="{ fontSize, letterSpacing: '0' }">
    <span class="text-black">re</span><span style="color:#a6aeba">:</span><span class="text-black">read</span>
  </span>
</template>
