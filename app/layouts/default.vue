<script setup lang="ts">
const supabase = useSupabaseClient();
const locked = ref(false);

const PIN_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

function checkIdleLock() {
  if (!hasPin()) return;
  const last = Number(sessionStorage.getItem("reread_last_active") ?? "0");
  if (last === 0 || Date.now() - last > PIN_IDLE_TIMEOUT_MS) {
    sessionStorage.removeItem("reread_pin_unlocked");
    locked.value = true;
  }
}

function touchActivity() {
  sessionStorage.setItem("reread_last_active", String(Date.now()));
}

onMounted(() => {
  // Enforce 30-day login persistence
  if (getLoginAt() === null) {
    markLoginNow();
  } else if ((getDaysRemaining() ?? 1) <= 0) {
    clearLoginAt();
    supabase.auth.signOut().then(() => {
      navigateTo("/");
    });
    return;
  }

  if (hasPin() && !isUnlocked()) {
    locked.value = true;
  } else {
    touchActivity();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      checkIdleLock();
    } else {
      // 페이지가 숨겨지는 시점을 기록
      touchActivity();
    }
  });
});
</script>

<template>
  <div class="min-h-screen bg-[#f7f8f8] text-gray-900 flex flex-col">
    <main class="flex-1 pb-20">
      <slot />
    </main>
    <BottomNav />
    <PinLockScreen v-if="locked" @unlocked="locked = false; touchActivity()" />
  </div>
</template>
