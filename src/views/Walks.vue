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
  const names = ids.map((id) => dogNameById.value[id]).filter(Boolean);
  // If a dog was deleted later, you might have an id with no name; show a fallback
  const missingCount = ids.length - names.length;
  if (missingCount > 0) names.push(`${missingCount} unknown`);
  return names.join(", ");
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const [dogs, w] = await Promise.all([listDogs(uid.value), listWalks(uid.value)]);

    dogNameById.value = Object.fromEntries(
      dogs.map((d) => [d.id, d.name || "(Unnamed)"])
    );

    walks.value = w;
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
      <div
        v-for="walk in walks"
        :key="walk.id"
        class="rounded-xl border bg-white p-4 shadow-sm"
        >
        <div class="min-w-0">
            <p class="truncate text-lg font-semibold">
            {{ walk.title || "Walk" }}
            </p>

            <p class="mt-1 text-sm text-slate-600">
                <span class="text-slate-900">{{ fmtWalkStart(walk.startedAt) }}</span>
            </p>

            <p class="mt-1 text-sm text-slate-600">
                Distance: <span class="text-slate-900">{{ fmtDistance(walk.distanceMeters) }}</span>
            </p>

            <p v-if="walk.description" class="mt-2 text-sm text-slate-700">
            {{ walk.description }}
            </p>
        </div>

        <div class="mt-3 flex justify-end">
            <RouterLink
            class="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            :to="`/walks/${walk.id}`"
            aria-label="Edit walk"
            title="Edit"
            >
            <!-- Pencil icon (inline SVG, no dependency) -->
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-5 w-5"
            >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            </RouterLink>
        </div>
        </div>

      <p v-if="walks.length === 0" class="text-slate-600">No walks yet. Add one!</p>
    </div>
  </div>
</template>