import { reactive } from "vue";
import { onAuthChanged } from "../lib/auth";

export const authState = reactive({
  user: null,
  ready: false,
});

let _unsub = null;

export function initAuthListener() {
  if (_unsub) return;
  _unsub = onAuthChanged((user) => {
    authState.user = user ?? null;
    authState.ready = true;
  });
}

export function waitForAuthReady() {
  if (authState.ready) return Promise.resolve();
  return new Promise((resolve) => {
    const t = setInterval(() => {
      if (authState.ready) {
        clearInterval(t);
        resolve();
      }
    }, 20);
  });
}