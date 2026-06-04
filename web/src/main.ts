import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import './assets/main.css';

const app = createApp(App);
app.use(createPinia());

const theme = useThemeStore();
theme.init();

const auth = useAuthStore();
void auth.init();

app.use(router);
app.mount('#app');
