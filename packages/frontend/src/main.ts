import { createApp } from 'vue';
import { createPinia } from 'pinia';
import 'element-plus/dist/index.css';
import './styles/element-text.css';

import App from './App.vue';
import router from './router';
import { useSocketStore } from './stores/socket';

// 创建应用实例
const app = createApp(App);

// 使用Pinia状态管理
const pinia = createPinia();
app.use(pinia);

// 使用Vue Router
app.use(router);

// 挂载应用
app.mount('#app');

// 初始化WebSocket连接
const socketStore = useSocketStore();
socketStore.connect();