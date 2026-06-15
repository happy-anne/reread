<script setup lang="ts">
const supabase = useSupabaseClient();
const user = useSupabaseUser();

const notificationTime = ref("21:00");
const saving = ref(false);
const savedMsg = ref(false);

async function fetchSettings() {
  if (!user.value) return;
  const { data } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.value.id)
    .single();
  if (data) {
    notificationTime.value = data.notification_time ?? "21:00";
  }
}

async function saveSettings() {
  if (!user.value) return;
  saving.value = true;
  await supabase.from("user_settings").upsert({
    user_id: user.value.id,
    notification_time: notificationTime.value,
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
        <button
          @click="saveSettings"
          :disabled="saving"
          class="mt-3 w-full bg-emerald-500 disabled:opacity-40 text-slate-950 font-semibold py-2.5 rounded-xl text-sm transition-colors"
        >
          {{ saving ? "Saving..." : savedMsg ? "Saved!" : "Save" }}
        </button>
      </div>

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
