<script setup lang="ts">
const supabase = useSupabaseClient();
const user = useSupabaseUser();

const notificationTime = ref("21:00");
const restDays = ref<number[]>([]);
const saving = ref(false);
const savedMsg = ref(false);
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

async function fetchSettings() {
  if (!user.value) return;
  const { data } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.value.id)
    .single();
  if (data) {
    notificationTime.value = data.notification_time ?? "21:00";
    restDays.value = data.rest_days ?? [];
  }
}

function toggleRestDay(day: number) {
  const idx = restDays.value.indexOf(day);
  if (idx >= 0) restDays.value.splice(idx, 1);
  else restDays.value.push(day);
}

async function saveSettings() {
  if (!user.value) return;
  saving.value = true;
  await supabase.from("user_settings").upsert({
    user_id: user.value.id,
    notification_time: notificationTime.value,
    rest_days: restDays.value,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  saving.value = false;
  savedMsg.value = true;
  setTimeout(() => (savedMsg.value = false), 2000);
}

async function signOut() {
  await supabase.auth.signOut();
  navigateTo("/login");
}

onMounted(fetchSettings);
</script>

<template>
  <div class="px-4 pt-8 pb-4 max-w-lg mx-auto">
    <h1 class="text-2xl font-bold mb-6">Settings</h1>

    <div class="space-y-4">
      <!-- Notification -->
      <div class="bg-slate-800 rounded-2xl p-5 border border-slate-700">
        <h2 class="font-semibold mb-3">Notification</h2>
        <div>
          <label class="text-sm text-slate-400 block mb-1">Reminder time</label>
          <input
            v-model="notificationTime"
            type="time"
            class="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <!-- Rest days (default) -->
      <div class="bg-slate-800 rounded-2xl p-5 border border-slate-700">
        <h2 class="font-semibold mb-1">Default rest days</h2>
        <p class="text-slate-400 text-xs mb-3">Pre-fills new reading sets. Each set can still override this.</p>
        <div class="flex gap-2">
          <button
            v-for="(label, idx) in DAY_LABELS"
            :key="idx"
            type="button"
            @click="toggleRestDay(idx)"
            class="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
            :class="
              restDays.includes(idx)
                ? 'bg-slate-600 text-slate-300'
                : 'bg-slate-700 border border-slate-600 text-slate-400 hover:border-slate-500'
            "
          >
            {{ label }}
          </button>
        </div>
      </div>

      <button
        @click="saveSettings"
        :disabled="saving"
        class="w-full bg-emerald-500 disabled:opacity-40 text-slate-950 font-semibold py-2.5 rounded-xl text-sm transition-colors"
      >
        {{ saving ? "Saving..." : savedMsg ? "Saved!" : "Save Settings" }}
      </button>

      <!-- Account -->
      <div class="bg-slate-800 rounded-2xl p-5 border border-slate-700">
        <h2 class="font-semibold mb-1">Account</h2>
        <p class="text-slate-400 text-sm mb-4">{{ user?.email }}</p>
        <button
          @click="signOut"
          class="w-full bg-slate-700 hover:bg-red-900/30 text-red-400 hover:text-red-300 font-semibold py-2.5 rounded-xl text-sm transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  </div>
</template>
