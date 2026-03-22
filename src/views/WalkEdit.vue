<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { authState } from "../state/authState";
import { listDogs } from "../lib/dogs";
import {
  createWalk,
  getWalk,
  updateWalk,
  dateToLocalInputValue,
  localInputValueToDate,
  defaultWalkTitle,
  removeWalk
} from "../lib/walks";

const route = useRoute();
const router = useRouter();

const uid = computed(() => authState.user?.uid);
const walkId = computed(() => route.params.walkId);
const isNew = computed(() => !walkId.value);

const loading = ref(true);
const saving = ref(false);
const error = ref("");

const dogs = ref([]);

const form = ref({
  title: "",
  dogIds: [],
  startedAtLocal: "",
  endedAtLocal: "",
  distanceMeters: "",
  description: "",
  weather: "",
  groundConditions: "",
  ratings: {}, // ok to keep even if you’re not rendering ratings yet
});

function toggleDog(dogId) {
  const set = new Set(form.value.dogIds);
  if (set.has(dogId)) set.delete(dogId);
  else set.add(dogId);
  form.value.dogIds = Array.from(set);
}

async function load() {
  loading.value = true;
  error.value = "";

  try {
    dogs.value = await listDogs(uid.value);

    if (!isNew.value) {
      const walk = await getWalk(uid.value, walkId.value);
      if (!walk) {
        error.value = "Walk not found.";
        return;
      }

      form.value = {
        title: walk.title ?? "",
        dogIds: walk.dogIds ?? [],
        startedAtLocal: dateToLocalInputValue(walk.startedAt?.toDate?.()),
        endedAtLocal: dateToLocalInputValue(walk.endedAt?.toDate?.()),
        distanceMeters: walk.distanceMeters ?? "",
        description: walk.description ?? "",
        weather: walk.weather ?? "",
        groundConditions: walk.groundConditions ?? "",
        ratings: walk.ratings ?? {},
      };
    } else {
      // sensible defaults for manual add
      const now = new Date();
      form.value.startedAtLocal = dateToLocalInputValue(now);
      form.value.endedAtLocal = "";
    }
  } catch (e) {
    error.value = e?.message ?? "Failed to load walk";
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  error.value = "";

  try {
    if (!form.value.startedAtLocal) {
      error.value = "Start time is required.";
      return;
    }

    const startedAt = localInputValueToDate(form.value.startedAtLocal);
    const endedAt = localInputValueToDate(form.value.endedAtLocal);

    if (!startedAt) {
      error.value = "Invalid start time.";
      return;
    }
    if (endedAt && endedAt < startedAt) {
      error.value = "End time cannot be before start time.";
      return;
    }
    if (!form.value.dogIds.length) {
      error.value = "Select at least one dog.";
      return;
    }

    const selectedDogNames = form.value.dogIds
        .map((id) => (dogs.value.find((d) => d.id === id)?.name || ""))
        .filter(Boolean);

    const title =
        form.value.title?.trim() ||
        defaultWalkTitle({ startedAt, dogNames: selectedDogNames });

    const payload = {
        title,
        dogIds: form.value.dogIds,
        startedAt,
        endedAt,
        distanceMeters: form.value.distanceMeters,
        description: form.value.description,
        weather: form.value.weather,
        groundConditions: form.value.groundConditions,
        source: "manual",
        ratings: form.value.ratings ?? {},
    };

    if (isNew.value) {
      const newId = await createWalk(uid.value, payload);
      router.replace(`/walks/${newId}`);
    } else {
      await updateWalk(uid.value, walkId.value, payload);
      router.push("/walks");
    }
  } catch (e) {
    error.value = e?.message ?? "Failed to save walk";
  } finally {
    saving.value = false;
  }
}

async function deleteThisWalk() {
  if (isNew.value) return;

  const ok = confirm("Delete this walk? This cannot be undone.");
  if (!ok) return;

  try {
    await removeWalk(uid.value, walkId.value);
    router.push("/walks");
  } catch (e) {
    alert(e?.message ?? "Failed to delete walk");
  }
}

onMounted(load);
</script>

<template>
  <div class="py-2">
    <div class="flex items-center gap-3">
      <h1 class="text-xl font-semibold">
        {{ isNew ? "Add walk (manual)" : "Edit walk" }}
      </h1>
      <RouterLink class="ml-auto text-sm text-slate-700 hover:text-slate-900" to="/walks">
        Back to Walks
      </RouterLink>
    </div>

    <p v-if="loading" class="mt-4 text-slate-600">Loading…</p>
    <p v-else-if="error" class="mt-4 text-sm text-red-600">{{ error }}</p>

    <form v-else class="mt-4 space-y-4" @submit.prevent="save">
        <section class="rounded-xl border bg-white p-4 space-y-3">
            <h2 class="font-semibold">Title</h2>
            <input
                v-model="form.title"
                class="mt-1 w-full rounded-lg border p-2"
                placeholder="(Optional) e.g. Morning walk"
            />
            <p class="text-xs text-slate-500">
                If left blank, we’ll generate a title when you save.
            </p>
        </section>

        <section class="rounded-xl border bg-white p-4 space-y-3">
            <h2 class="font-semibold">Conditions</h2>

            <label class="block">
                <span class="text-sm text-slate-700">Weather</span>
                <input
                v-model="form.weather"
                class="mt-1 w-full rounded-lg border p-2"
                placeholder="e.g. Sunny, light rain"
                />
            </label>

            <label class="block">
                <span class="text-sm text-slate-700">Ground conditions</span>
                <input
                v-model="form.groundConditions"
                class="mt-1 w-full rounded-lg border p-2"
                placeholder="e.g. Dry, muddy, icy"
                />
            </label>
        </section>

      <section class="rounded-xl border bg-white p-4">
        <h2 class="font-semibold">Dogs</h2>
        <p class="mt-1 text-sm text-slate-600">Select one or more dogs for this walk.</p>

        <div v-if="dogs.length === 0" class="mt-3 text-sm text-slate-600">
          No dogs yet. Add dogs first.
          <RouterLink class="text-slate-900 underline" to="/dogs/new">Add a dog</RouterLink>
        </div>

        <div v-else class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label
            v-for="dog in dogs"
            :key="dog.id"
            class="flex items-center gap-2 rounded-lg border p-2"
          >
            <input
              type="checkbox"
              :checked="form.dogIds.includes(dog.id)"
              @change="toggleDog(dog.id)"
            />
            <span class="text-sm">{{ dog.name }}</span>
          </label>
        </div>
      </section>

      <section class="rounded-xl border bg-white p-4 space-y-3">
        <h2 class="font-semibold">Times</h2>

        <label class="block">
          <span class="text-sm text-slate-700">Start time *</span>
          <input
            v-model="form.startedAtLocal"
            class="mt-1 w-full rounded-lg border p-2"
            type="datetime-local"
            required
          />
        </label>

        <label class="block">
          <span class="text-sm text-slate-700">End time</span>
          <input
            v-model="form.endedAtLocal"
            class="mt-1 w-full rounded-lg border p-2"
            type="datetime-local"
          />
        </label>
      </section>

      <section class="rounded-xl border bg-white p-4 space-y-3">
        <h2 class="font-semibold">Distance</h2>
        <label class="block">
          <span class="text-sm text-slate-700">Distance (meters)</span>
          <input
            v-model="form.distanceMeters"
            class="mt-1 w-full rounded-lg border p-2"
            inputmode="decimal"
            placeholder="e.g. 2500"
          />
          <p class="mt-1 text-xs text-slate-500">
            We’ll add nicer units (mi/km) later.
          </p>
        </label>
      </section>

      <section class="rounded-xl border bg-white p-4 space-y-3">
        <h2 class="font-semibold">Description</h2>
        <textarea
          v-model="form.description"
          class="mt-1 w-full rounded-lg border p-2"
          rows="4"
          placeholder="Notes about the walk..."
        />
      </section>

      <button
        class="w-full rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
        :disabled="saving"
      >
        {{ saving ? "Saving…" : "Save walk" }}
      </button>

      <div v-if="!isNew" class="pt-4">
        <button
            type="button"
            class="w-full rounded-lg border border-red-300 bg-white px-4 py-2 font-semibold text-red-700 hover:bg-red-50"
            @click="deleteThisWalk"
        >
            Delete walk
        </button>
      </div>
    </form>
  </div>
</template>