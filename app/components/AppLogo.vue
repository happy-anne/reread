<script setup lang="ts">
defineProps<{ size?: string }>();
</script>

<template>
  <span :class="size ?? 'text-5xl'" class="font-bold" style="letter-spacing:0">
    <span class="text-black">re</span><span style="color:#3182f6">:</span><span class="text-black">read</span>
  </span>
</template>
