<script setup lang="ts">
definePageMeta({ layout: "auth" });
// Supabase redirects here after email confirmation
// @nuxtjs/supabase handles the token exchange automatically
onMounted(() => {
  navigateTo("/dashboard");
});
</script>
<template>
  <div class="text-center text-slate-400">Confirming your account...</div>
</template>
