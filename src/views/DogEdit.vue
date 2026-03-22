<script setup>
    import { computed, onMounted, ref } from "vue";
    import { useRoute, useRouter } from "vue-router";
    import { authState } from "../state/authState";
    import { createDog, getDog, updateDog } from "../lib/dogs";

    const route = useRoute();
    const router = useRouter();

    const uid = computed(() => authState.user?.uid);
    const dogId = computed(() => route.params.dogId);

    const isNew = computed(() => !dogId.value);

    const loading = ref(true);
    const saving = ref(false);
    const error = ref("");

    const form = ref({
    name: "",
    birthday: "",
    weight: "",
    favourite_food: "",
    });

    async function load() {
    loading.value = true;
    error.value = "";

    try {
        if (isNew.value) return;
        const dog = await getDog(uid.value, dogId.value);
        if (!dog) {
        error.value = "Dog not found.";
        return;
        }
        form.value = {
        name: dog.name ?? "",
        birthday: dog.birthday ?? "",
        weight: dog.weight ?? "",
        favourite_food: dog.favourite_food ?? "",
        };
    } catch (e) {
        error.value = e?.message ?? "Failed to load dog";
    } finally {
        loading.value = false;
    }
    }

    async function save() {
    saving.value = true;
    error.value = "";

    try {
        if (!form.value.name.trim()) {
        error.value = "Name is required.";
        return;
        }

        if (isNew.value) {
        const newId = await createDog(uid.value, form.value);
        router.replace(`/dogs/${newId}`);
        } else {
        await updateDog(uid.value, dogId.value, form.value);
        router.push("/dogs");
        }
    } catch (e) {
        error.value = e?.message ?? "Failed to save dog";
    } finally {
        saving.value = false;
    }
    }

    onMounted(load);
</script>

<template>
  <div class="py-2">
    <div class="flex items-center gap-3">
      <h1 class="text-xl font-semibold">
        {{ isNew ? "Add dog" : "Edit dog" }}
      </h1>
      <RouterLink class="ml-auto text-sm text-slate-700 hover:text-slate-900" to="/dogs">
        Back to Dogs
      </RouterLink>
    </div>

    <p v-if="loading" class="mt-4 text-slate-600">Loading…</p>
    <p v-else-if="error" class="mt-4 text-sm text-red-600">{{ error }}</p>

    <form v-else class="mt-4 space-y-4" @submit.prevent="save">
      <label class="block">
        <span class="text-sm text-slate-700">Name *</span>
        <input
          v-model="form.name"
          class="mt-1 w-full rounded-lg border p-2"
          autocomplete="off"
          required
        />
      </label>

      <label class="block">
        <span class="text-sm text-slate-700">Birthday</span>
        <input v-model="form.birthday" class="mt-1 w-full rounded-lg border p-2" type="date" />
      </label>

      <label class="block">
        <span class="text-sm text-slate-700">Weight</span>
        <input
          v-model="form.weight"
          class="mt-1 w-full rounded-lg border p-2"
          inputmode="decimal"
          placeholder="e.g., 12.5 kg"
        />
        <p class="mt-1 text-xs text-slate-500">Tip: include units (kg/lb) for now.</p>
      </label>

      <label class="block">
        <span class="text-sm text-slate-700">Favourite food</span>
        <input v-model="form.favourite_food" class="mt-1 w-full rounded-lg border p-2" />
      </label>

      <button
        class="w-full rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
        :disabled="saving"
      >
        {{ saving ? "Saving…" : "Save" }}
      </button>
    </form>
  </div>
</template>