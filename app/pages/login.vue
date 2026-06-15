<script setup lang="ts">
definePageMeta({ layout: "auth" });

const supabase = useSupabaseClient();
const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");

async function login() {
  loading.value = true;
  error.value = "";
  const { error: err } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  });
  if (err) error.value = err.message;
  else navigateTo("/dashboard");
  loading.value = false;
}
</script>

<template>
  <div class="w-full max-w-sm">
    <div class="mb-8 text-center">
      <h1 class="text-2xl font-bold text-emerald-400">re:read</h1>
      <p class="text-slate-400 text-sm mt-1">Read again. With a plan.</p>
    </div>

    <form @submit.prevent="login" class="space-y-4">
      <div>
        <label class="block text-sm text-slate-400 mb-1">Email</label>
        <input
          v-model="email"
          type="email"
          required
          class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label class="block text-sm text-slate-400 mb-1">Password</label>
        <input
          v-model="password"
          type="password"
          required
          class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors"
          placeholder="••••••••"
        />
      </div>

      <p v-if="error" class="text-red-400 text-sm">{{ error }}</p>

      <button
        type="submit"
        :disabled="loading"
        class="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold py-3 rounded-xl transition-colors"
      >
        {{ loading ? "Signing in..." : "Sign in" }}
      </button>
    </form>

    <p class="text-center text-sm text-slate-500 mt-6">
      Don't have an account?
      <NuxtLink to="/signup" class="text-emerald-400 hover:underline">Sign up</NuxtLink>
    </p>
  </div>
</template>
