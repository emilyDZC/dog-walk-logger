<script setup>
import { authState } from "./state/authState";
import { signOutUser } from "./lib/auth";
import { useRoute, useRouter } from "vue-router";
import logo from "./assets/dog-pic.jpeg";
import { computed } from "vue";

const router = useRouter();
const route = useRoute();

const isDogsPage = computed(() => route.path.startsWith("/dogs"));
const isWalksPage = computed(() =>
  route.path === "/" || route.path.startsWith("/walks")
);

async function handleSignOut() {
  await signOutUser();
  router.replace("/login");
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <header class="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
      <nav class="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3">
        <RouterLink to="/" class="flex items-center gap-2 font-extrabold tracking-tight">
          <span
            class="grid h-10 w-10 overflow-hidden rounded-xl shadow-sm"
            aria-hidden="true"
            title="DogWalks"
          >
            <img :src="logo" alt="" class="h-full w-full object-cover" />
          </span>

          <span class="text-slate-900">MyDogWalks</span>
        </RouterLink>

        <div v-if="authState.user" class="ml-auto flex items-center gap-3 text-sm">
          <RouterLink
            v-if="isWalksPage"
            class="text-slate-700 hover:text-slate-900"
            to="/dogs"
          >
            My Dogs
          </RouterLink>

          <RouterLink
            v-else-if="isDogsPage"
            class="text-slate-700 hover:text-slate-900"
            to="/walks"
          >
            My Walks
          </RouterLink>

          <button
            class="rounded-md bg-slate-200 px-3 py-1.5"
            @click="handleSignOut"
          >
            Sign out
          </button>
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
