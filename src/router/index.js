import { createRouter, createWebHistory } from "vue-router";
import { authState } from "../state/authState";

import Home from "../views/Home.vue";
import Dogs from "../views/Dogs.vue";
import DogEdit from "../views/DogEdit.vue";
import Walks from "../views/Walks.vue";
import WalkEdit from "../views/WalkEdit.vue";
import Login from "../views/Login.vue";

const routes = [
  { path: "/login", name: "login", component: Login },
  { path: "/", name: "home", component: Home },
  { path: "/dogs", name: "dogs", component: Dogs },
  { path: "/dogs/new", name: "dog-new", component: DogEdit, meta: { requiresAuth: true } },
  { path: "/dogs/:dogId", name: "dog-edit", component: DogEdit, meta: { requiresAuth: true } },
  { path: "/walks", name: "walks", component: Walks },
  { path: "/walks/new", name: "walk-new", component: WalkEdit, meta: { requiresAuth: true } },
  { path: "/walks/:walkId", name: "walk-edit", component: WalkEdit, meta: { requiresAuth: true } },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  // wait until auth is known
  if (!authState.ready && to.meta.requiresAuth) return false;

  if (to.meta.requiresAuth && !authState.user) {
    return { name: "login" };
  }

  if (to.name === "login" && authState.user) {
    return { name: "home" };
  }
});