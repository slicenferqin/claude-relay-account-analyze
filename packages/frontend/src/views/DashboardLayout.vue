<template>
  <div class="dashboard-layout">
    <el-container>
      <!-- 侧边栏 -->
      <el-aside width="250px" class="sidebar">
        <div class="logo">
          <h2>账号看板</h2>
          <span class="subtitle">Account Dashboard</span>
        </div>
        
        <el-menu
          :default-active="activeMenu"
          class="sidebar-menu"
          router
          unique-opened
        >
          <el-menu-item index="/dashboard/overview">
            <el-icon><Odometer /></el-icon>
            <span>总览</span>
          </el-menu-item>
          
          <el-menu-item index="/dashboard/apikeys">
            <el-icon><Key /></el-icon>
            <span>API Key管理</span>
          </el-menu-item>
          
          <el-menu-item index="/dashboard/accounts">
            <el-icon><User /></el-icon>
            <span>账号管理</span>
          </el-menu-item>
          
          <el-menu-item index="/dashboard/groups">
            <el-icon><UserFilled /></el-icon>
            <span>分组管理</span>
          </el-menu-item>
          
          <el-menu-item index="/dashboard/analytics">
            <el-icon><TrendCharts /></el-icon>
            <span>数据分析</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <el-container>
        <!-- 顶部栏 -->
        <el-header class="header">
          <div class="header-left">
            <h3 class="page-title">{{ currentPageTitle }}</h3>
            <el-breadcrumb separator="/">
              <el-breadcrumb-item>看板</el-breadcrumb-item>
              <el-breadcrumb-item>{{ currentPageTitle }}</el-breadcrumb-item>
            </el-breadcrumb>
          </div>
          
          <div class="header-right">
            <!-- 连接状态指示器 -->
            <div class="connection-status">
              <el-tooltip :content="connectionStatusText" placement="bottom">
                <el-icon 
                  :class="['status-icon', connectionStatusClass]"
                  :size="16"
                >
                  <component :is="connectionStatusIcon" />
                </el-icon>
              </el-tooltip>
            </div>

            <!-- 最后刷新时间 -->
            <div class="last-refresh" v-if="lastRefresh">
              <el-text size="small" type="info">
                最后刷新: {{ formatTime(lastRefresh) }}
              </el-text>
            </div>

            <!-- 自动刷新控制 -->
            <el-switch
              v-model="dashboardStore.isAutoRefresh"
              inline-prompt
              active-text="自动"
              inactive-text="手动"
              @change="onAutoRefreshChange"
            />

            <!-- 刷新按钮 -->
            <el-button 
              circle 
              :icon="Refresh" 
              :loading="dashboardStore.loading"
              @click="refreshData"
              title="刷新数据"
            />

            <!-- 设置 -->
            <el-dropdown @command="handleSettingsCommand">
              <el-button circle :icon="Setting" />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="refresh-interval">刷新间隔</el-dropdown-item>
                  <el-dropdown-item command="export">导出数据</el-dropdown-item>
                  <el-dropdown-item command="about">关于</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>

        <!-- 主内容区域 -->
        <el-main class="main-content">
          <el-scrollbar>
            <router-view v-slot="{ Component, route }">
              <transition name="fade" mode="out-in">
                <component :is="Component" :key="route.path" />
              </transition>
            </router-view>
          </el-scrollbar>
        </el-main>
      </el-container>
    </el-container>

    <!-- 设置对话框 -->
    <el-dialog 
      v-model="showSettingsDialog" 
      title="设置" 
      width="500px"
    >
      <div class="settings-content">
        <el-form label-width="120px">
          <el-form-item label="刷新间隔">
            <el-select 
              v-model="selectedRefreshInterval" 
              placeholder="选择刷新间隔"
              @change="onRefreshIntervalChange"
            >
              <el-option label="5秒" :value="5000" />
              <el-option label="10秒" :value="10000" />
              <el-option label="30秒" :value="30000" />
              <el-option label="1分钟" :value="60000" />
              <el-option label="5分钟" :value="300000" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showSettingsDialog = false">取消</el-button>
          <el-button type="primary" @click="saveSettings">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { 
  Odometer, Key, User, UserFilled, TrendCharts, 
  Refresh, Setting, Connection, Link 
} from '@element-plus/icons-vue';
import { useDashboardStore } from '../stores/dashboard';
import { useSocketStore } from '../stores/socket';

const route = useRoute();
const dashboardStore = useDashboardStore();
const socketStore = useSocketStore();

// 临时实现formatTime函数
const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  if (diffMs < 60000) { // 小于1分钟
    return '刚刚';
  } else if (diffMs < 3600000) { // 小于1小时
    return `${Math.floor(diffMs / 60000)}分钟前`;
  } else if (diffMs < 86400000) { // 小于1天
    return `${Math.floor(diffMs / 3600000)}小时前`;
  } else {
    return date.toLocaleDateString('zh-CN');
  }
};

// 响应式数据
const showSettingsDialog = ref(false);
const selectedRefreshInterval = ref(dashboardStore.refreshInterval);
const refreshTimer = ref<number | null>(null);

// 计算属性
const activeMenu = computed(() => route.path);

const currentPageTitle = computed(() => {
  const routeMeta = route.meta as { title?: string };
  return routeMeta.title || '看板';
});

const lastRefresh = computed(() => dashboardStore.lastRefresh);

const connectionStatusClass = computed(() => {
  return socketStore.isConnected ? 'connected' : 'disconnected';
});

const connectionStatusIcon = computed(() => {
  return socketStore.isConnected ? Connection : Link;
});

const connectionStatusText = computed(() => {
  if (socketStore.isConnected) {
    return '实时连接正常';
  }
  return socketStore.connectionError || '连接已断开';
});

// 方法
const refreshData = async () => {
  await dashboardStore.refreshAllData();
};

const onAutoRefreshChange = (enabled: boolean) => {
  if (enabled) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
};

const onRefreshIntervalChange = (interval: number) => {
  dashboardStore.setRefreshInterval(interval);
  if (dashboardStore.isAutoRefresh) {
    stopAutoRefresh();
    startAutoRefresh();
  }
};

const startAutoRefresh = () => {
  stopAutoRefresh();
  
  refreshTimer.value = window.setInterval(async () => {
    if (!dashboardStore.loading) {
      await refreshData();
    }
  }, dashboardStore.refreshInterval);
};

const stopAutoRefresh = () => {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value);
    refreshTimer.value = null;
  }
};

const handleSettingsCommand = (command: string) => {
  switch (command) {
    case 'refresh-interval':
      showSettingsDialog.value = true;
      break;
    case 'export':
      // TODO: 实现数据导出功能
      console.log('Export data');
      break;
    case 'about':
      // TODO: 显示关于对话框
      console.log('About');
      break;
  }
};

const saveSettings = () => {
  dashboardStore.setRefreshInterval(selectedRefreshInterval.value);
  showSettingsDialog.value = false;
  
  if (dashboardStore.isAutoRefresh) {
    stopAutoRefresh();
    startAutoRefresh();
  }
};

// 生命周期
onMounted(() => {
  // 订阅系统指标
  socketStore.subscribeToSystemMetrics();
  
  // 如果启用了自动刷新，开始定时器
  if (dashboardStore.isAutoRefresh) {
    startAutoRefresh();
  }
});

onUnmounted(() => {
  stopAutoRefresh();
});
</script>

<style scoped>
.dashboard-layout {
  height: 100vh;
  width: 100vw;
}

.sidebar {
  background-color: #001529;
  color: white;
  overflow: hidden;
}

.logo {
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid #1f2937;
}

.logo h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #ffffff;
}

.subtitle {
  font-size: 12px;
  color: #9ca3af;
  display: block;
  margin-top: 4px;
}

.sidebar-menu {
  border-right: none;
  background-color: transparent;
}

.sidebar-menu .el-menu-item {
  color: #d1d5db;
}

.sidebar-menu .el-menu-item:hover {
  background-color: #1f2937;
}

.sidebar-menu .el-menu-item.is-active {
  background-color: #1e40af;
  color: #ffffff;
}

.header {
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: #1f2937;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.connection-status .status-icon {
  transition: color 0.3s;
}

.connection-status .connected {
  color: #10b981;
}

.connection-status .disconnected {
  color: #ef4444;
}

.last-refresh {
  font-size: 12px;
  color: #6b7280;
}

.main-content {
  background: #f5f5f5;
  padding: 24px;
  overflow: hidden;
}

.settings-content {
  padding: 20px 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>