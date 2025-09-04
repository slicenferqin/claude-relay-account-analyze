<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useDashboardStore } from './stores/dashboard';
import { useSocketStore } from './stores/socket';

const dashboardStore = useDashboardStore();
const socketStore = useSocketStore();

onMounted(() => {
  // 初始化数据
  dashboardStore.initializeData();
});

onUnmounted(() => {
  // 清理WebSocket连接
  socketStore.disconnect();
});
</script>

<style>
#app {
  font-family: 'PingFang SC', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100vh;
  width: 100vw;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  height: 100vh;
  overflow: hidden;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>