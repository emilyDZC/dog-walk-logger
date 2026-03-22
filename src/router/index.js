import { createRouter, createWebHistory } from "vue-router";
import { authState, waitForAuthReady } from "../state/authState";

import Dogs from "../views/Dogs.vue";
import DogEdit from "../views/DogEdit.vue";
import Walks from "../views/Walks.vue";
import WalkEdit from "../views/WalkEdit.vue";
import Login from "../views/Login.vue";

const routes = [
  { path: "/login", name: "login", component: Login },
  { path: "/", name: "home", component: Walks, meta: { requiresAuth: true } },
  { path: "/dogs", name: "dogs", component: Dogs },
  { path: "/dogs/new", name: "dog-new", component: DogEdit, meta: { requiresAuth: true } },
  { path: "/dogs/:dogId", name: "dog-edit", component: DogEdit, meta: { requiresAuth: true } },
  { path: "/walks", redirect: "/" },
  { path: "/walks/new", name: "walk-new", component: WalkEdit, meta: { requiresAuth: true } },
  { path: "/walks/:walkId", name: "walk-edit", component: WalkEdit, meta: { requiresAuth: true } },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  if (to.meta.requiresAuth) {
    await waitForAuthReady();

    if (!authState.user) {
      // send logged-out users to signup-first page
      return { name: "login" };
    }
  }

  // If already logged in, keep them out of /login
  if (to.name === "login") {
    await waitForAuthReady();
    if (authState.user) return "/";
  }
});