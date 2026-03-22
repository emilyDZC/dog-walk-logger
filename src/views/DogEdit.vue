<script setup>
    import { computed, onMounted, ref } from "vue";
    import { useRoute, useRouter } from "vue-router";
    import { authState } from "../state/authState";
    import { createDog, getDog, updateDog, deleteDog } from "../lib/dogs";
    import { uploadDogPhoto } from "../lib/dogPhotos";

    const route = useRoute();
    const router = useRouter();

    const uid = computed(() => authState.user?.uid);
    const dogId = computed(() => route.params.dogId);

    const isNew = computed(() => !dogId.value);

    const loading = ref(true);
    const saving = ref(false);
    const error = ref("");
    const deleting = ref(false);

    const uploadingPhoto = ref(false);
    const lastUploadedFileName = ref("");

    const form = ref({
        name: "",
        birthday: "",
        weight: "",
        favourite_food: "",
        photoUrl: "",
        photoPath: "",
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
                photoUrl: dog.photoUrl ?? "",
                photoPath: dog.photoPath ?? "",
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

    async function onPhotoSelected(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        const fileName = file.name;

        // clear immediately so the browser UI doesn't matter / allows re-pick same file
        e.target.value = "";

        if (isNew.value) {
            alert("Save the dog first, then add a photo.");
            return;
        }

        uploadingPhoto.value = true;
        try {
            const res = await uploadDogPhoto(uid.value, dogId.value, file);
            form.value.photoUrl = res.photoUrl;
            form.value.photoPath = res.photoPath;
            lastUploadedFileName.value = fileName;
        } catch (err) {
            alert(err?.message ?? "Failed to upload photo");
        } finally {
            uploadingPhoto.value = false;
        }
    }

    async function onDelete() {
        if (isNew.value) return;

        const ok = confirm(`Delete ${form.value.name || "this dog"}? This cannot be undone.`);
        if (!ok) return;

        deleting.value = true;
        error.value = "";

        try {
            await deleteDog(uid.value, dogId.value);
            router.push("/dogs");
        } catch (e) {
            error.value = e?.message ?? "Failed to delete dog";
        } finally {
            deleting.value = false;
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

      <section class="rounded-xl border bg-white p-4 space-y-3">
        <h2 class="font-semibold">Profile photo</h2>

        <div class="flex items-center gap-4">
            <div class="h-20 w-20 overflow-hidden rounded-full border bg-slate-100">
            <img
                v-if="form.photoUrl"
                :src="form.photoUrl"
                alt=""
                class="h-full w-full object-cover"
            />
            <div v-else class="grid h-full w-full place-items-center text-2xl">
                🐶
            </div>
            </div>

            <div class="flex-1">
            <label
                class="inline-flex cursor-pointer items-center justify-center rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                :class="isNew ? 'pointer-events-none opacity-60' : ''"
            >
                {{ form.photoUrl ? "Change photo" : "Add photo" }}
                <input type="file" accept="image/*" class="hidden" @change="onPhotoSelected" />
            </label>

            <p v-if="uploadingPhoto" class="mt-2 text-sm text-slate-600">Uploading…</p>

            <p v-else-if="form.photoUrl" class="mt-2 text-sm text-emerald-700">
                Uploaded<span v-if="lastUploadedFileName">: {{ lastUploadedFileName }}</span>
            </p>

            <p v-else-if="isNew" class="mt-2 text-xs text-slate-500">
                Save the dog first, then you can upload a photo.
            </p>

            <p v-else class="mt-2 text-xs text-slate-500">
                Choose a photo to upload.
            </p>
            </div>
        </div>
        </section>

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

      <button
        v-if="!isNew"
        type="button"
        class="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
        :disabled="deleting"
        @click="onDelete"
        >
        {{ deleting ? "Deleting…" : "Delete dog" }}
        </button>
    </form>
  </div>
</template>