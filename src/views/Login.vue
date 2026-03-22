<script setup>
import { ref } from "vue";
import { signInWithEmail, signUpWithEmail } from "../lib/auth";
import { useRouter } from "vue-router";

const router = useRouter();

const mode = ref("signup"); // or "signin"
const email = ref("");
const password = ref("");
const error = ref("");

async function submit() {
  error.value = "";
  try {
    if (mode.value === "signup") {
      await signUpWithEmail(email.value, password.value);
    } else {
      await signInWithEmail(email.value, password.value);
    }
    router.push("/");
  } catch (e) {
    error.value = e?.message ?? "Authentication failed";
  }
}
</script>

<template>
  <div class="mx-auto max-w-sm p-4">
    <h1 class="text-xl font-semibold">Sign in</h1>

    <div class="mt-4 flex gap-2">
      <button
        class="rounded-lg px-3 py-2 text-sm"
        :class="mode === 'signin' ? 'bg-slate-900 text-white' : 'bg-slate-200'"
        @click="mode = 'signin'"
      >
        Sign in
      </button>
      <button
        class="rounded-lg px-3 py-2 text-sm"
        :class="mode === 'signup' ? 'bg-slate-900 text-white' : 'bg-slate-200'"
        @click="mode = 'signup'"
      >
        Create account
      </button>
    </div>

    <form class="mt-4 space-y-3" @submit.prevent="submit">
      <label class="block">
        <span class="text-sm text-slate-700">Email</span>
        <input v-model="email" class="mt-1 w-full rounded-lg border p-2" type="email" required />
      </label>

      <label class="block">
        <span class="text-sm text-slate-700">Password</span>
        <input v-model="password" class="mt-1 w-full rounded-lg border p-2" type="password" required />
      </label>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <button class="w-full rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white">
        {{ mode === "signup" ? "Create account" : "Sign in" }}
      </button>
    </form>
  </div>
</template>