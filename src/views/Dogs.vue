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
      <RouterLink
        v-for="dog in dogs"
        :key="dog.id"
        :to="`/dogs/${dog.id}`"
        class="block rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-300"
        :title="`Edit dog: ${dog.name || 'Dog'}`"
      >
        <div class="flex items-center gap-3">
          <div class="h-12 w-12 overflow-hidden rounded-full border bg-slate-100 shrink-0">
            <img
              v-if="dog.photoUrl"
              :src="dog.photoUrl"
              alt=""
              class="h-full w-full object-cover"
              loading="lazy"
            />
            <div v-else class="grid h-full w-full place-items-center">
              🐶
            </div>
          </div>

          <div class="min-w-0">
            <p class="truncate text-lg font-semibold">
              {{ dog.name || "Unnamed dog" }}
            </p>
            <p v-if="dog.birthday" class="mt-0.5 text-sm text-slate-600">
              Birthday: <span class="text-slate-900">{{ dog.birthday }}</span>
            </p>
          </div>
        </div>
      </RouterLink>
    </div>
      <p v-if="dogs.length === 0" class="text-slate-600">No dogs yet. Add one!</p>
  </div>
</template>