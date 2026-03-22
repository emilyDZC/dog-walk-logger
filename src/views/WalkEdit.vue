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
import { uploadWalkPhoto } from "../lib/walkPhotos";

const route = useRoute();
const router = useRouter();

const uid = computed(() => authState.user?.uid);
const walkId = computed(() => route.params.walkId);
const isNew = computed(() => !walkId.value);

const uploadingWalkPhoto = ref(false);
const lastWalkPhotoName = ref("");

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
  photos: [],
});

function toggleDog(dogId) {
  const set = new Set(form.value.dogIds);
  if (set.has(dogId)) set.delete(dogId);
  else set.add(dogId);
  form.value.dogIds = Array.from(set);
}

async function onWalkPhotoSelected(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const fileName = file.name;
  e.target.value = ""; // allow re-pick same file

  if (isNew.value) {
    alert("Save the walk first, then add photos.");
    return;
  }

  uploadingWalkPhoto.value = true;
  try {
    const res = await uploadWalkPhoto(uid.value, walkId.value, file);
    // update local state immediately so user sees it without reload
    form.value.photos = [...(form.value.photos ?? []), { ...res, createdAt: new Date().toISOString() }];
    lastWalkPhotoName.value = fileName;
  } catch (err) {
    alert(err?.message ?? "Failed to upload photo");
  } finally {
    uploadingWalkPhoto.value = false;
  }
}

async function load() {
  loading.value = true;
  error.value = "";

  try {
    dogs.value = await listDogs(uid.value);
    console.log("new: ", isNew.value)
    console.log("dogs: ", dogs.value)

    if (isNew.value && dogs.value.length === 0) {
      router.replace("/dogs/new");
      return;
    }

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
        photos: walk.photos ?? [],
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
  <h2 class="font-semibold">Walk photos</h2>

  <div class="flex flex-wrap gap-2">
    <!-- existing photos -->
    <a
      v-for="p in form.photos"
      :key="p.id || p.url"
      :href="p.url"
      target="_blank"
      rel="noreferrer"
      class="block h-24 w-24 overflow-hidden rounded-lg border bg-slate-100"
      title="Open photo"
    >
      <img :src="p.url" alt="" class="h-full w-full object-cover" />
    </a>

    <!-- add photo tile (at the right / end) -->
    <label
      class="grid h-24 w-24 cursor-pointer place-items-center rounded-lg border bg-white text-4xl font-semibold text-slate-500 hover:bg-slate-50"
      :class="isNew ? 'pointer-events-none opacity-60' : ''"
      title="Add photo"
      aria-label="Add photo"
    >
      +
      <input
        type="file"
        accept="image/*"
        capture="environment"
        class="hidden"
        @change="onWalkPhotoSelected"
      />
    </label>
  </div>

  <p v-if="uploadingWalkPhoto" class="text-sm text-slate-600">Uploading…</p>
  <p v-else-if="lastWalkPhotoName" class="text-sm text-emerald-700">
    Uploaded: {{ lastWalkPhotoName }}
  </p>
  <p v-else-if="isNew" class="text-xs text-slate-500">
    Save the walk first, then you can add photos.
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

      <section class="rounded-xl border bg-white p-4 space-y-3">
        <h2 class="font-semibold">Which dogs came on this walk?</h2>

        <div class="space-y-2">
            <label
            v-for="dog in dogs"
            :key="dog.id"
            class="flex items-center gap-3 rounded-lg border p-2 hover:bg-slate-50"
            >
            <input
                type="checkbox"
                class="h-4 w-4"
                :value="dog.id"
                v-model="form.dogIds"
            />

            <div class="h-9 w-9 overflow-hidden rounded-full border bg-slate-100 shrink-0">
                <img
                    v-if="dog.photoUrl"
                    :src="dog.photoUrl"
                    alt=""
                    class="h-full w-full object-cover"
                />
                <div v-else class="grid h-full w-full place-items-center text-sm">
                🐶
                </div>
            </div>

            <span class="font-medium text-slate-900">
                {{ dog.name }}
            </span>
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