import { createPinia } from 'pinia';
import { createApp } from 'vue';
import './style.css';
import './design/bubblemorphism.css';
import App from './App.vue';
import { i18n } from './i18n';
import { router } from './router';

createApp(App).use(createPinia()).use(router).use(i18n).mount('#app');
