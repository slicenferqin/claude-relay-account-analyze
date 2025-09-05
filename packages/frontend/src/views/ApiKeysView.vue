<template>
  <div class="api-keys-view">
    <!-- 头部操作区 -->
    <div class="header-actions">
      <div class="filters">
        <el-space>
          <el-select 
            v-model="filters.groupId" 
            placeholder="选择分组"
            clearable
            @change="applyFilters"
          >
            <el-option label="全部分组" value="" />
            <el-option 
              v-for="group in dashboardStore.groups" 
              :key="group.id"
              :label="group.name" 
              :value="group.id" 
            />
          </el-select>

          <el-select 
            v-model="filters.isActive" 
            placeholder="状态"
            @change="applyFilters"
          >
            <el-option label="全部状态" :value="undefined" />
            <el-option label="活跃" :value="true" />
            <el-option label="非活跃" :value="false" />
          </el-select>

          <el-input
            v-model="filters.search"
            placeholder="搜索API Key"
            :prefix-icon="Search"
            clearable
            @input="onSearchInput"
            style="width: 200px"
          />
        </el-space>
      </div>

      <div class="actions">
        <el-button 
          type="primary" 
          :icon="Refresh"
          :loading="dashboardStore.loading"
          @click="refreshData"
        >
          刷新
        </el-button>
        
        <el-button :icon="Download" @click="exportData">
          导出
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-card>
            <div class="stat-card">
              <div class="stat-value">{{ dashboardStore.activeApiKeys.length }}</div>
              <div class="stat-label">活跃API Keys</div>
              <el-icon class="stat-icon"><Key /></el-icon>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="6">
          <el-card>
            <div class="stat-card">
              <div class="stat-value">{{ formatCurrency(dashboardStore.totalDailyCost) }}</div>
              <div class="stat-label">今日总消费</div>
              <el-icon class="stat-icon"><Money /></el-icon>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="6">
          <el-card>
            <div class="stat-card">
              <div class="stat-value">{{ formatNumber(dashboardStore.totalTodayRequests) }}</div>
              <div class="stat-label">今日总请求</div>
              <el-icon class="stat-icon"><Promotion /></el-icon>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="6">
          <el-card>
            <div class="stat-card">
              <div class="stat-value">{{ dashboardStore.averageRPM }}</div>
              <div class="stat-label">平均RPM</div>
              <el-icon class="stat-icon"><Timer /></el-icon>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- API Keys表格 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span>API Key 列表</span>
          <el-text type="info" size="small">
            共 {{ filteredApiKeys.length }} 个API Key
          </el-text>
        </div>
      </template>

      <el-table 
        :data="filteredApiKeys" 
        v-loading="dashboardStore.loading"
        stripe
        style="width: 100%"
        :flexible="true"
        @row-click="showApiKeyDetail"
      >
        <el-table-column prop="name" label="API Key名称" min-width="200">
          <template #default="{ row }">
            <div class="api-key-name">
              <el-text strong>{{ row.name }}</el-text>
              <div class="tags" v-if="row.tags?.length">
                <el-tag 
                  v-for="tag in row.tags.slice(0, 2)" 
                  :key="tag"
                  size="small"
                  type="info"
                >
                  {{ tag }}
                </el-tag>
                <el-text v-if="row.tags.length > 2" size="small" type="info">
                  +{{ row.tags.length - 2 }}
                </el-text>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="lastUsedAt" label="最后使用时间" min-width="150" sortable>
          <template #default="{ row }">
            <el-tooltip 
              v-if="row.lastUsedAt" 
              :content="new Date(row.lastUsedAt).toLocaleString()"
            >
              <span>{{ formatTime(row.lastUsedAt) }}</span>
            </el-tooltip>
            <span v-else class="never-used">从未使用</span>
          </template>
        </el-table-column>

        <el-table-column prop="rpm" label="RPM" width="100" sortable>
          <template #default="{ row }">
            <div class="rpm-display">
              <el-progress 
                :percentage="calculateRpmPercentage(row.rpm)"
                :color="getRpmColor(row.rpm)"
                :stroke-width="6"
                :show-text="false"
              />
              <span class="rpm-text">{{ row.rpm }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="currentGroup" label="所属分组" min-width="120">
          <template #default="{ row }">
            <el-tag v-if="row.currentGroup" type="primary" size="small">
              {{ row.currentGroup.name }}
            </el-tag>
            <el-text v-else type="info" size="small">未分组</el-text>
          </template>
        </el-table-column>

        <el-table-column prop="usage.today.cost" label="今日消费" width="110" sortable>
          <template #default="{ row }">
            <span :class="getCostClass(row.usage?.today?.cost || 0)">
              {{ formatCurrency(row.usage?.today?.cost || 0) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column prop="usage.today.requests" label="今日请求" width="110" sortable>
          <template #default="{ row }">
            {{ formatNumber(row.usage?.today?.requests || 0) }}
          </template>
        </el-table-column>

        <el-table-column prop="usage.today.totalTokens" label="今日Token" min-width="130" sortable>
          <template #default="{ row }">
            {{ formatNumber(row.usage?.today?.totalTokens || 0) }}
          </template>
        </el-table-column>

        <el-table-column prop="isActive" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'danger'" size="small">
              {{ row.isActive ? '活跃' : '非活跃' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" min-width="140" fixed="right">
          <template #default="{ row }">
            <el-space>
              <el-button size="small" @click.stop="showApiKeyDetail(row)">
                详情
              </el-button>
              <el-button size="small" @click.stop="showUsageChart(row)">
                趋势
              </el-button>
            </el-space>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- API Key详情对话框 -->
    <el-dialog 
      v-model="showDetailDialog" 
      :title="`API Key: ${selectedApiKey?.name}`"
      width="800px"
    >
      <div v-if="selectedApiKey" class="api-key-details">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-descriptions title="基本信息" :column="1" border>
              <el-descriptions-item label="名称">
                {{ selectedApiKey.name }}
              </el-descriptions-item>
              <el-descriptions-item label="描述">
                {{ selectedApiKey.description || '无' }}
              </el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag :type="selectedApiKey.isActive ? 'success' : 'danger'">
                  {{ selectedApiKey.isActive ? '活跃' : '非活跃' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="所属分组">
                <el-tag v-if="selectedApiKey.currentGroup" type="primary">
                  {{ selectedApiKey.currentGroup.name }}
                </el-tag>
                <span v-else>未分组</span>
              </el-descriptions-item>
              <el-descriptions-item label="最后使用">
                {{ new Date(selectedApiKey.lastUsedAt).toLocaleString() }}
              </el-descriptions-item>
            </el-descriptions>
          </el-col>
          
          <el-col :span="12">
            <el-descriptions title="使用统计" :column="1" border>
              <el-descriptions-item label="RPM">
                {{ selectedApiKey.rpm }}
              </el-descriptions-item>
              <el-descriptions-item label="今日请求">
                {{ formatNumber(selectedApiKey.usage?.today?.requests || 0) }}
              </el-descriptions-item>
              <el-descriptions-item label="今日Token">
                {{ formatNumber(selectedApiKey.usage?.today?.totalTokens || 0) }}
              </el-descriptions-item>
              <el-descriptions-item label="今日费用">
                {{ formatCurrency(selectedApiKey.usage?.today?.cost || 0) }}
              </el-descriptions-item>
              <el-descriptions-item label="费用限制">
                {{ selectedApiKey.limits?.dailyCostLimit 
                   ? formatCurrency(selectedApiKey.limits.dailyCostLimit) 
                   : '无限制' }}
              </el-descriptions-item>
            </el-descriptions>
          </el-col>
        </el-row>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Search, Refresh, Download, Key, Money, Promotion, Timer } from '@element-plus/icons-vue';
import { useDashboardStore } from '../stores/dashboard';
import { useSocketStore } from '../stores/socket';
import { formatTime, formatNumber, formatCurrency } from '../utils/format';
import { debounce } from 'lodash-es';
import type { ApiKeyStatistics } from "../types/apikey";

const dashboardStore = useDashboardStore();
const socketStore = useSocketStore();

// 响应式数据
const filters = ref({
  groupId: '',
  isActive: true,
  search: ''
});

const showDetailDialog = ref(false);
const selectedApiKey = ref<ApiKeyStatistics | null>(null);

// 计算属性
const filteredApiKeys = computed(() => {
  let result = dashboardStore.apiKeys;

  if (filters.value.groupId) {
    result = result.filter(key => 
      key.currentGroup?.id === filters.value.groupId
    );
  }

  if (filters.value.isActive !== undefined) {
    result = result.filter(key => 
      key.isActive === filters.value.isActive
    );
  }

  if (filters.value.search) {
    const searchTerm = filters.value.search.toLowerCase();
    result = result.filter(key =>
      key.name.toLowerCase().includes(searchTerm) ||
      key.description?.toLowerCase().includes(searchTerm) ||
      key.keyId.toLowerCase().includes(searchTerm)
    );
  }

  // 默认按最后使用时间倒序排序
  result = [...result].sort((a, b) => {
    // 处理空值情况
    if (!a.lastUsedAt && !b.lastUsedAt) return 0;
    if (!a.lastUsedAt) return 1; // 未使用的排在后面
    if (!b.lastUsedAt) return -1;
    
    // 转换为时间戳比较
    const timeA = new Date(a.lastUsedAt).getTime();
    const timeB = new Date(b.lastUsedAt).getTime();
    return timeB - timeA; // 倒序
  });

  return result;
});

// 方法
const applyFilters = () => {
  dashboardStore.updateApiKeyFilters({
    groupId: filters.value.groupId || undefined,
    isActive: filters.value.isActive,
    search: filters.value.search || undefined
  });
};

const onSearchInput = debounce(() => {
  applyFilters();
}, 500);

const refreshData = async () => {
  await dashboardStore.fetchApiKeys();
};

const exportData = () => {
  // TODO: 实现数据导出
  console.log('Export API Keys data');
};

const showApiKeyDetail = (apiKey: ApiKeyStatistics) => {
  selectedApiKey.value = apiKey;
  showDetailDialog.value = true;
  
  // 订阅实时更新
  socketStore.subscribeToApiKey(apiKey.keyId);
};

const showUsageChart = (apiKey: ApiKeyStatistics) => {
  // TODO: 显示使用趋势图表
  console.log('Show usage chart for', apiKey.name);
};

const calculateRpmPercentage = (rpm: number): number => {
  // 假设最大RPM为100，可以根据实际情况调整
  const maxRpm = 100;
  return Math.min((rpm / maxRpm) * 100, 100);
};

const getRpmColor = (rpm: number): string => {
  if (rpm < 10) return '#67c23a';  // 绿色
  if (rpm < 50) return '#e6a23c';  // 橙色
  return '#f56c6c';  // 红色
};

const getCostClass = (cost: number): string => {
  if (cost > 50) return 'high-cost';
  if (cost > 20) return 'medium-cost';
  return 'low-cost';
};

// 生命周期
onMounted(async () => {
  // 先获取分组数据，再获取API Keys
  await dashboardStore.fetchGroups();
  await refreshData();
});

onUnmounted(() => {
  // 取消所有订阅
  dashboardStore.apiKeys.forEach(apiKey => {
    socketStore.unsubscribe('apikey', apiKey.keyId);
  });
});
</script>

<style scoped>
.api-keys-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0; /* 确保内容可以正常收缩 */
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stats-cards {
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #1f2937;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
  margin-top: 4px;
}

.stat-icon {
  font-size: 32px;
  color: #3b82f6;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.api-key-name {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tags {
  display: flex;
  gap: 4px;
  align-items: center;
}

.rpm-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rpm-text {
  font-size: 12px;
  font-weight: bold;
}

.high-cost {
  color: #f56c6c;
  font-weight: bold;
}

.medium-cost {
  color: #e6a23c;
  font-weight: bold;
}

.low-cost {
  color: #67c23a;
}

.api-key-details {
  padding: 16px 0;
}

.never-used {
  color: #909399;
  font-style: italic;
}

/* 表格卡片自适应高度 */
.api-keys-view > .el-card:last-child {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.api-keys-view > .el-card:last-child :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.api-keys-view > .el-card:last-child :deep(.el-table) {
  flex: 1;
  width: 100% !important;
}

/* 确保表格横向充满容器 */
:deep(.el-table__header-wrapper),
:deep(.el-table__body-wrapper),
:deep(.el-table__footer-wrapper) {
  width: 100%;
}

/* 表格滚动条样式优化 */
:deep(.el-table__body-wrapper) {
  overflow-x: auto;
  overflow-y: auto;
}

/* 适配不同屏幕尺寸 */
@media (max-width: 1920px) {
  :deep(.el-table) {
    font-size: 14px;
  }
}

@media (min-width: 1921px) {
  :deep(.el-table) {
    font-size: 15px;
  }
}
</style>