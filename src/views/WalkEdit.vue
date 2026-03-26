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
  wildlifeSightings: [],
  weatherTags: [],
});

function isDogSelected(dogId) {
  return Array.isArray(form.value.dogIds) && form.value.dogIds.includes(dogId);
}

const hasSelectedDogs = computed(() => {
  const ids = form.value?.dogIds;
  return Array.isArray(ids) && ids.length > 0;
});

const showDogWarning = computed(() => !hasSelectedDogs.value);

function toggleDog(dogId) {
  if (!Array.isArray(form.value.dogIds)) form.value.dogIds = [];

  if (form.value.dogIds.includes(dogId)) {
    form.value.dogIds = form.value.dogIds.filter((id) => id !== dogId);
  } else {
    form.value.dogIds = [...form.value.dogIds, dogId];
  }
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

const addingWildlife = ref(false);

const newWildlife = ref({
  label: "",
  description: "",
});

function addWildlifeSighting() {
  const label = newWildlife.value.label.trim();
  const description = newWildlife.value.description.trim();

  if (!label) {
    error.value = "Please enter some text or select a label.";
    return;
  }

  const sighting = {
    id: crypto.randomUUID(),
    label,
    description,
    createdAt: new Date().toISOString(),
  };

  form.value.wildlifeSightings = [...(form.value.wildlifeSightings ?? []), sighting];

  // reset UI
  newWildlife.value = { label: "", description: "" };
  addingWildlife.value = false;
}

function removeWildlifeSighting(id) {
  form.value.wildlifeSightings = (form.value.wildlifeSightings ?? []).filter((s) => s.id !== id);
}

const weatherOptions = [
  { key: "sun", label: "Sunny", icon: "☀️" },
  { key: "wind", label: "Windy", icon: "💨" },
  { key: "rain", label: "Rain", icon: "🌧️" },
  { key: "cloud", label: "Cloudy", icon: "☁️" },
  { key: "snow", label: "Snow", icon: "❄️" },
];

function isWeatherSelected(key) {
  return Array.isArray(form.value.weatherTags) && form.value.weatherTags.includes(key);
}

function hapticTick() {
  // Only some browsers/devices support this
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(10); // 5–15ms feels like a light tick
  }
}

function toggleWeather(key) {
  hapticTick();
  
  const tags = Array.isArray(form.value.weatherTags) ? form.value.weatherTags : [];

  const next = tags.includes(key)
    ? tags.filter((t) => t !== key)
    : [...tags, key];

  form.value.weatherTags = next;

  // keep your existing display/storage string in sync (optional)
  const labels = next
    .map((k) => weatherOptions.find((o) => o.key === k)?.label)
    .filter(Boolean);

  form.value.weather = labels.join(", ");
}

async function load() {
  loading.value = true;
  error.value = "";

  try {
    dogs.value = await listDogs(uid.value);

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
        wildlifeSightings: walk.wildlifeSightings ?? [],
        weatherTags: walk.weatherTags ?? [],
      };
    } else {
      if (!Array.isArray(form.value.dogIds)) form.value.dogIds = [];
      if (form.value.dogIds.length === 0 && dogs.value.length > 0) {
        form.value.dogIds = [dogs.value[0].id];
      }
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

    if (!hasSelectedDogs.value) {
      error.value = "Please select at least one dog for this walk.";
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
        wildlifeSightings: form.value.wildlifeSightings ?? [],
        weatherTags: form.value.weatherTags ?? [],
    };

    if (isNew.value) {
      await createWalk(uid.value, payload);
      router.replace(`/walks`);
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

                <div class="mt-2 flex flex-wrap gap-2">
                  <button
                    v-for="opt in weatherOptions"
                    :key="opt.key"
                    type="button"
                    class="grid h-12 w-12 place-items-center rounded-full border transition"
                    :class="
                      isWeatherSelected(opt.key)
                        ? 'border-amber-300 bg-amber-50 ring-2 ring-amber-200'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    "
                    :aria-pressed="isWeatherSelected(opt.key)"
                    :aria-label="opt.label"
                    :title="opt.label"
                    @click="toggleWeather(opt.key)"
                  >
                    <span aria-hidden="true" class="text-2xl leading-none">
                      {{ opt.icon }}
                    </span>
                  </button>
                </div>

                <!-- optional -->
                <p v-if="form.weather" class="mt-2 text-xs text-slate-500">
                  Selected: <span class="text-slate-700">{{ form.weather }}</span>
                </p>
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
        <div class="flex items-center justify-between gap-3">
          <h2 class="font-semibold">Dogs on this walk</h2>
          <p class="text-xs text-slate-500">Tap an avatar to select/deselect</p>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            v-for="dog in dogs"
            :key="dog.id"
            type="button"
            class="group relative"
            :title="isDogSelected(dog.id) ? `Deselect ${dog.name}` : `Select ${dog.name}`"
            @click="toggleDog(dog.id)"
          >
            <div
              class="h-12 w-12 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-sm transition"
              :class="isDogSelected(dog.id) ? 'opacity-100 grayscale-0' : 'opacity-60 grayscale'"
            >
              <img
                v-if="dog.photoUrl"
                :src="dog.photoUrl"
                alt=""
                class="h-full w-full object-cover"
              />
              <div v-else class="grid h-full w-full place-items-center text-lg">
                🐶
              </div>
            </div>

            <!-- tiny check indicator -->
            <div
              v-if="isDogSelected(dog.id)"
              class="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-[11px] font-extrabold text-white ring-2 ring-white"
            >
              ✓
            </div>
          </button>
        </div>

        <p v-if="!hasSelectedDogs" class="text-sm font-semibold text-amber-700">
          Please select at least one dog for this walk.
        </p>
      </section>

      <section class="rounded-xl border bg-white p-4 space-y-3">
        <div class="flex items-center justify-between gap-3">
          <h2 class="font-semibold">Wildlife sightings</h2>

          <button
            type="button"
            class="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
            @click="addingWildlife = !addingWildlife"
          >
            {{ addingWildlife ? "Cancel" : "Add wildlife sighting" }}
          </button>
        </div>

        <!-- Existing sightings -->
        <div v-if="(form.wildlifeSightings?.length ?? 0) > 0" class="space-y-2">
          <div
            v-for="s in form.wildlifeSightings"
            :key="s.id"
            class="rounded-lg border bg-slate-50 p-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-semibold text-slate-900">{{ s.label }}</p>
                <p v-if="s.description" class="mt-1 text-sm text-slate-700">
                  {{ s.description }}
                </p>
              </div>

              <button
                type="button"
                class="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                :aria-label="`Remove wildlife sighting: ${s.label}`"
                title="Remove"
                @click="removeWildlifeSighting(s.id)"
              >
                <span aria-hidden="true" class="text-xl leading-none">×</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Add wildlife form -->
        <div v-if="addingWildlife" class="rounded-lg border bg-white p-3 space-y-2">
          <label class="block">
            <span class="text-sm text-slate-700">What did you see? *</span>
            <input
              v-model="newWildlife.label"
              class="mt-1 w-full rounded-lg border p-2"
              placeholder="e.g. Deer, Rabbit, Heron"
              list="wildlife-suggestions"
            />
            <datalist id="wildlife-suggestions">
              <!-- we’ll fill this in next step -->
            </datalist>
          </label>

          <label class="block">
            <span class="text-sm text-slate-700">Description</span>
            <textarea
              v-model="newWildlife.description"
              class="mt-1 w-full rounded-lg border p-2"
              rows="3"
              placeholder="Any notes..."
            />
          </label>

          <button
            type="button"
            class="w-full rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white"
            @click="addWildlifeSighting"
          >
            Add sighting
          </button>
          <p class="text-xs text-slate-500">
            You still need to save the walk after this step.
          </p>
        </div>

        <p v-else class="text-xs text-slate-500">
          Log any wildlife you saw on this walk.
        </p>
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
        class="w-full rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        :disabled="saving || !hasSelectedDogs"
        @click="save"
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