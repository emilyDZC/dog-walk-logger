import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";
import { router } from "./router";
import { initAuthListener } from "./state/authState";

initAuthListener();

createApp(App).use(router).mount("#app");