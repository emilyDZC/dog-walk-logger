<script setup>
import { authState } from "./state/authState";
import { signOutUser } from "./lib/auth";
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <header class="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
      <nav class="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3">
        <RouterLink class="font-semibold" to="/">DogWalks</RouterLink>

        <div v-if="authState.user" class="ml-auto flex items-center gap-3 text-sm">
          <RouterLink class="text-slate-700 hover:text-slate-900" to="/dogs">Dogs</RouterLink>
          <RouterLink class="text-slate-700 hover:text-slate-900" to="/walks">Walks</RouterLink>
          <button class="rounded-md bg-slate-200 px-3 py-1.5" @click="signOutUser()">Sign out</button>
        </div>

        <div v-else class="ml-auto">
          <RouterLink class="text-slate-700 hover:text-slate-900 text-sm" to="/login">Sign in</RouterLink>
        </div>
      </nav>
    </header>

    <main class="mx-auto max-w-4xl px-4 py-4">
      <RouterView />
    </main>
  </div>
</template>