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
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  overflow: hidden;
}

#app {
  font-family: 'PingFang SC', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

/* Element Plus 全局样式覆盖 */
.el-container {
  height: 100%;
}

/* 修夏 el-main 的默认 padding */
.el-main {
  padding: 0;
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