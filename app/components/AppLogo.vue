<script setup lang="ts">
defineProps<{ size?: string }>();
</script>

<template>
  <span :class="size ?? 'text-5xl'" class="font-bold tracking-tight">
    <span class="text-black">re</span><span style="color:#0000ee">:</span><span class="text-black">read</span>
  </span>
</template>
