<script setup>
import { computed, onMounted, ref } from "vue";
import { authState } from "../state/authState";
import { listWalks } from "../lib/walks";
import { listDogs } from "../lib/dogs";

const uid = computed(() => authState.user?.uid);

const loading = ref(true);
const error = ref("");
const walks = ref([]);
const dogNameById = ref({});
const dogById = ref({});
const hasDogs = ref(false);

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function fmtWalkStart(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);

  const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
  const day = ordinal(d.getDate());
  const month = d.toLocaleDateString(undefined, { month: "long" });

  let hours = d.getHours(); // 0-23
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  if (hours === 0) hours = 12;

  // You asked for 3.54pm (dot, no space, lowercase)
  return `${weekday} ${day} ${month} ${hours}.${minutes}${ampm}`;
}

function fmtDistance(meters) {
  if (meters == null || Number.isNaN(Number(meters))) return "—";
  const km = Number(meters) / 1000;
  return `${km.toFixed(2)} km`;
}

function dogNamesForWalk(walk) {
  const ids = walk?.dogIds ?? [];
  if (!ids.length) return "—";
  const names = ids.map((id) => dogById.value[id]?.name).filter(Boolean);
  const missingCount = ids.length - names.length;
  if (missingCount > 0) names.push(`${missingCount} unknown`);
  return names.join(", ");
}

function dogPhotosForWalk(walk) {
  const ids = walk?.dogIds ?? [];
  // return objects for dogs that have a photoUrl
  return ids
    .map((id) => dogById.value[id])
    .filter((d) => d?.photoUrl)
    .map((d) => ({ name: d.name, photoUrl: d.photoUrl }));
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const [dogs, w] = await Promise.all([listDogs(uid.value), listWalks(uid.value)]);

    dogById.value = Object.fromEntries(
        dogs.map((d) => [
            d.id,
            {
                name: d.name || "(Unnamed)",
                photoUrl: d.photoUrl || "",
            },
        ])
    );

    walks.value = w;
    hasDogs.value = (dogs?.length ?? 0) > 0;
  } catch (e) {
    error.value = e?.message ?? "Failed to load walks";
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="py-2">
    <div class="flex items-center gap-3">
      <h1 class="text-xl font-semibold">Walks</h1>

      <RouterLink
        class="ml-auto rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
        to="/walks/new"
      >
        Add walk (manual)
      </RouterLink>
    </div>

    <p v-if="loading" class="mt-4 text-slate-600">Loading…</p>
    <p v-else-if="error" class="mt-4 text-sm text-red-600">{{ error }}</p>

    <div v-else class="mt-4 space-y-3">
      <RouterLink
        v-for="walk in walks"
        :key="walk.id"
        :to="`/walks/${walk.id}`"
        class="block rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-300"
        :title="`Edit walk: ${walk.title || 'Walk'}`"
      >
        <div class="flex items-start gap-4">
          <!-- Left: walk details -->
          <div class="min-w-0 flex-1">
            <p class="truncate text-lg font-semibold">
              {{ walk.title || "Walk" }}
            </p>

            <p class="mt-1 text-sm text-slate-600">
              <span class="text-slate-900">{{ fmtWalkStart(walk.startedAt) }}</span>
            </p>

            <p class="mt-1 text-sm text-slate-600">
              Distance:
              <span class="text-slate-900">{{ fmtDistance(walk.distanceMeters) }}</span>
            </p>

            <p v-if="walk.description" class="mt-2 text-sm text-slate-700">
              {{ walk.description }}
            </p>

            <div class="mt-2 flex items-center gap-3">
              <div v-if="dogPhotosForWalk(walk).length" class="flex -space-x-2">
                <div
                  v-for="d in dogPhotosForWalk(walk)"
                  :key="d.photoUrl"
                  class="h-7 w-7 overflow-hidden rounded-full border-2 border-white bg-slate-100"
                  :title="d.name"
                >
                  <img :src="d.photoUrl" alt="" class="h-full w-full object-cover" />
                </div>
              </div>

              <!-- If you ever want names too, you can add them back here -->
              <!-- <div class="text-sm text-slate-600 truncate">
                <span class="text-slate-900">{{ dogNamesForWalk(walk) }}</span>
              </div> -->
            </div>
          </div>

          <!-- Right: first walk photo thumbnail -->
          <img
            v-if="walk.photos?.length && walk.photos[0]?.url"
            :src="walk.photos[0].url"
            alt=""
            class="h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-slate-100 object-cover"
            loading="lazy"
          />
        </div>
      </RouterLink>
    </div>

      <div v-if="walks.length === 0" class="mt-6 rounded-2xl border border-white/60 bg-white/70 p-6 text-center shadow-sm backdrop-blur">
        <div class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-200 to-pink-200 text-3xl">
          🐾
        </div>

        <p class="mt-3 text-lg font-extrabold">
          {{ hasDogs ? "No walks yet" : "Add a dog first" }}
        </p>

        <p class="mt-1 text-sm text-slate-700">
          <span v-if="hasDogs">Add your first walk.</span>
          <span v-else>You’ll need at least one dog before you can save a walk.</span>
        </p>

        <RouterLink
          :to="hasDogs ? '/walks/new' : '/dogs/new'"
          class="mt-4 inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-amber-400 to-pink-500 px-4 py-2 text-sm font-extrabold text-white shadow-sm"
        >
          {{ hasDogs ? "Add a walk" : "Add a dog" }}
        </RouterLink>
      </div>
    </div>
</template>