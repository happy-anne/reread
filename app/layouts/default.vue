<script setup lang="ts">
const supabase = useSupabaseClient();
const locked = ref(false);

onMounted(() => {
  // Enforce 30-day login persistence
  if (getLoginAt() === null) {
    markLoginNow(); // grace period for sessions that predate this feature
  } else if ((getDaysRemaining() ?? 1) <= 0) {
    clearLoginAt();
    supabase.auth.signOut().then(() => {
      navigateTo("/login");
    });
    return;
  }

  if (hasPin() && !isUnlocked()) {
    locked.value = true;
  }
});
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
    <main class="flex-1 pb-20">
      <slot />
    </main>
    <BottomNav />
    <PinLockScreen v-if="locked" @unlocked="locked = false" />
  </div>
</template>
