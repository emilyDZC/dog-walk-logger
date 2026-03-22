<script setup>
import { onMounted, ref, computed } from "vue";
import { authState } from "../state/authState";
import { listDogs, removeDog } from "../lib/dogs";

const loading = ref(true);
const error = ref("");
const dogs = ref([]);

const uid = computed(() => authState.user?.uid);

async function load() {
  loading.value = true;
  error.value = "";
  try {
    dogs.value = await listDogs(uid.value);
  } catch (e) {
    error.value = e?.message ?? "Failed to load dogs";
  } finally {
    loading.value = false;
  }
}

async function deleteDog(dog) {
  const ok = confirm(`Delete ${dog.name}? This cannot be undone.`);
  if (!ok) return;

  try {
    await removeDog(uid.value, dog.id);
    await load();
  } catch (e) {
    alert(e?.message ?? "Failed to delete dog");
  }
}

onMounted(load);
</script>

<template>
  <div class="py-2">
    <div class="flex items-center gap-3">
      <h1 class="text-xl font-semibold">My Dogs</h1>
      <RouterLink
        class="ml-auto rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
        to="/dogs/new"
      >
        Add dog
      </RouterLink>
    </div>

    <p v-if="loading" class="mt-4 text-slate-600">Loading…</p>
    <p v-else-if="error" class="mt-4 text-sm text-red-600">{{ error }}</p>

    <div v-else class="mt-4 space-y-3">
      <div
        v-for="dog in dogs"
        :key="dog.id"
        class="rounded-xl border bg-white p-4 shadow-sm"
      >
        <div class="flex items-start gap-3">
          <div class="min-w-0">
            <p class="truncate text-lg font-semibold">{{ dog.name || "(Unnamed)" }}</p>
            <p class="mt-1 text-sm text-slate-600">
              Birthday: <span class="text-slate-800">{{ dog.birthday || "—" }}</span>
              <span class="mx-2 text-slate-300">•</span>
              Weight: <span class="text-slate-800">{{ dog.weight || "—" }}</span>
            </p>
            <p class="mt-1 text-sm text-slate-600">
              Favourite food:
              <span class="text-slate-800">{{ dog.favourite_food || "—" }}</span>
            </p>
          </div>

          <div class="ml-auto flex shrink-0 gap-2">
            <RouterLink
              class="rounded-lg bg-slate-200 px-3 py-2 text-sm"
              :to="`/dogs/${dog.id}`"
            >
              Edit
            </RouterLink>
            <button
              class="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white"
              @click="deleteDog(dog)"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <p v-if="dogs.length === 0" class="text-slate-600">No dogs yet. Add one!</p>
    </div>
  </div>
</template>