<template>
  <div class="accounts-view">
    <!-- 统计卡片网格 -->
    <div class="accounts-grid">
      <el-row :gutter="16">
        <el-col 
          :span="6" 
          v-for="account in dashboardStore.accounts.slice(0, 4)" 
          :key="account.accountId"
        >
          <el-card class="account-card" @click="showAccountDetail(account)">
            <div class="account-header">
              <div class="account-info">
                <h3 class="account-name">{{ account.accountName }}</h3>
                <el-tag :type="getStatusTagType(account.status)" size="small">
                  {{ getStatusText(account.status) }}
                </el-tag>
              </div>
              <el-icon class="account-icon">
                <component :is="getPlatformIcon(account.platform)" />
              </el-icon>
            </div>

            <div class="account-metrics">
              <div class="metric">
                <span class="metric-label">今日Token:</span>
                <span class="metric-value">{{ formatNumber(account.todayTokenUsage) }}</span>
              </div>
              
              <div class="metric">
                <span class="metric-label">今日费用:</span>
                <span class="metric-value expense">{{ formatCurrency(account.todayExpense) }}</span>
              </div>
              
              <div class="metric">
                <span class="metric-label">近10分钟RPM:</span>
                <span class="metric-value">{{ account.recentAvgRpm }}</span>
              </div>
            </div>

            <div class="group-info" v-if="account.group">
              <el-divider />
              <div class="group-details">
                <div class="group-name">
                  <el-icon><UserFilled /></el-icon>
                  <span>{{ account.group.name }}</span>
                </div>
                <div class="group-stats">
                  <span class="group-stat">
                    总用户: {{ account.group.totalMembers }}
                  </span>
                  <span class="group-stat">
                    活跃: {{ account.group.activeMembers }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 最后使用时间 -->
            <div class="last-used">
              <span class="el-text" type="info" size="small">
                最后使用: {{ formatTime(account.lastUsedAt) }}
              </span>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 详细统计表格 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span>账号详细统计</span>
          <div class="header-actions">
            <el-input
              v-model="searchQuery"
              placeholder="搜索账号"
              :prefix-icon="Search"
              clearable
              style="width: 200px; margin-right: 8px;"
            />
            <el-select 
              v-model="platformFilter" 
              placeholder="选择平台"
              clearable
              style="width: 150px; margin-right: 8px;"
            >
              <el-option label="全部平台" value="" />
              <el-option label="Claude Console" value="claude-console" />
              <el-option label="Claude" value="claude" />
              <el-option label="Gemini" value="gemini" />
              <el-option label="OpenAI" value="openai" />
            </el-select>
            <el-button 
              type="primary" 
              :icon="Refresh"
              :loading="dashboardStore.loading"
              @click="refreshData"
            >
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <el-table 
        :data="filteredAccounts" 
        v-loading="dashboardStore.loading"
        stripe
        style="width: 100%"
        :flexible="true"
        @row-click="showAccountDetail"
      >
        <el-table-column prop="accountName" label="账号名称" min-width="150">
          <template #default="{ row }">
            <div class="account-name-cell">
              <span class="el-text" strong>{{ row.accountName }}</span>
              <el-tag :type="getPlatformTagType(row.platform)" size="small">
                {{ getPlatformName(row.platform) }}
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="todayTokenUsage" label="今日Token使用量" min-width="140" sortable>
          <template #default="{ row }">
            <span class="token-usage">{{ formatNumber(row.todayTokenUsage) }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="todayExpense" label="今日费用消耗" min-width="130" sortable>
          <template #default="{ row }">
            <span class="expense">{{ formatCurrency(row.todayExpense) }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="recentAvgRpm" label="近10分钟RPM" min-width="120" sortable>
          <template #default="{ row }">
            <div class="rpm-cell">
              <el-progress 
                :percentage="getRpmPercentage(row.recentAvgRpm)"
                :stroke-width="6"
                :show-text="false"
                :color="getRpmColor(row.recentAvgRpm)"
              />
              <span class="rpm-value">{{ row.recentAvgRpm }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="group" label="账号所属分组" min-width="130">
          <template #default="{ row }">
            <el-tag v-if="row.group" type="primary" size="small">
              {{ row.group.name }}
            </el-tag>
            <span v-else class="no-group">无分组</span>
          </template>
        </el-table-column>

        <el-table-column prop="group.totalMembers" label="分组用户数" width="110">
          <template #default="{ row }">
            <span v-if="row.group">{{ row.group.totalMembers }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column prop="group.activeMembers" label="分组活跃用户" min-width="130">
          <template #default="{ row }">
            <span v-if="row.group" class="active-users">
              {{ row.group.activeMembers }}/{{ row.group.totalMembers }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="lastUsedAt" label="最后使用时间" min-width="150">
          <template #default="{ row }">
            <el-tooltip :content="new Date(row.lastUsedAt).toLocaleString()">
              <span>{{ formatTime(row.lastUsedAt) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>

        <el-table-column label="操作" min-width="120" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click.stop="showAccountDetail(row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 账号详情对话框 -->
    <el-dialog 
      v-model="showDetailDialog" 
      :title="`账号详情: ${selectedAccount?.accountName}`"
      width="1000px"
    >
      <div v-if="selectedAccount" class="account-details">
        <el-tabs>
          <el-tab-pane label="基本信息" name="basic">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-descriptions title="账号信息" :column="1" border>
                  <el-descriptions-item label="账号名称">
                    {{ selectedAccount.accountName }}
                  </el-descriptions-item>
                  <el-descriptions-item label="平台">
                    <el-tag :type="getPlatformTagType(selectedAccount.platform)">
                      {{ getPlatformName(selectedAccount.platform) }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="状态">
                    <el-tag :type="getStatusTagType(selectedAccount.status)">
                      {{ getStatusText(selectedAccount.status) }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="是否活跃">
                    <el-tag :type="selectedAccount.isActive ? 'success' : 'danger'">
                      {{ selectedAccount.isActive ? '是' : '否' }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="最后使用时间">
                    {{ new Date(selectedAccount.lastUsedAt).toLocaleString() }}
                  </el-descriptions-item>
                </el-descriptions>
              </el-col>
              
              <el-col :span="12">
                <el-descriptions title="分组信息" :column="1" border>
                  <el-descriptions-item label="所属分组">
                    <el-tag v-if="selectedAccount.group" type="primary">
                      {{ selectedAccount.group.name }}
                    </el-tag>
                    <span v-else>无分组</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="分组总用户数" v-if="selectedAccount.group">
                    {{ selectedAccount.group.totalMembers }}
                  </el-descriptions-item>
                  <el-descriptions-item label="分组活跃用户数" v-if="selectedAccount.group">
                    {{ selectedAccount.group.activeMembers }}
                  </el-descriptions-item>
                </el-descriptions>
              </el-col>
            </el-row>
          </el-tab-pane>

          <el-tab-pane label="使用统计" name="usage">
            <el-row :gutter="16">
              <el-col :span="8">
                <div class="stat-item">
                  <div class="stat-title">今日Token使用量</div>
                  <div class="stat-value">{{ selectedAccount.todayTokenUsage || 0 }}</div>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="stat-item">
                  <div class="stat-title">今日费用消耗</div>
                  <div class="stat-value">${{ (selectedAccount.todayExpense || 0).toFixed(2) }}</div>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="stat-item">
                  <div class="stat-title">近10分钟平均RPM</div>
                  <div class="stat-value">{{ selectedAccount.recentAvgRpm || 0 }}</div>
                </div>
              </el-col>
            </el-row>

            <!-- 这里可以添加图表展示 -->
            <div class="usage-charts" style="margin-top: 20px;">
              <span class="el-text" type="info">使用趋势图表功能开发中...</span>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { 
  Search, Refresh, UserFilled, 
  Monitor, Connection 
} from '@element-plus/icons-vue';
import { useDashboardStore } from '../stores/dashboard';
import { useSocketStore } from '../stores/socket';
import { formatTime, formatNumber, formatCurrency } from '../utils/format';
import type { AccountStatistics } from "../types/account";

const dashboardStore = useDashboardStore();
const socketStore = useSocketStore();

// 响应式数据
const searchQuery = ref('');
const platformFilter = ref('');
const showDetailDialog = ref(false);
const selectedAccount = ref<AccountStatistics | null>(null);

// 计算属性
const filteredAccounts = computed(() => {
  let result = dashboardStore.accounts;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(account =>
      account.accountName.toLowerCase().includes(query) ||
      account.accountId.toLowerCase().includes(query)
    );
  }

  if (platformFilter.value) {
    result = result.filter(account => 
      account.platform === platformFilter.value
    );
  }

  return result;
});

// 方法
const refreshData = async () => {
  await dashboardStore.fetchAccounts();
};

const showAccountDetail = (account: AccountStatistics) => {
  selectedAccount.value = account;
  showDetailDialog.value = true;
  
  // 订阅实时更新
  socketStore.subscribeToAccount(account.accountId);
};

const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case 'claude-console':
    case 'claude':
      return Monitor;
    case 'gemini':
      return Monitor;
    case 'openai':
      return Connection;
    default:
      return Monitor;
  }
};

const getPlatformName = (platform: string): string => {
  const names: Record<string, string> = {
    'claude-console': 'Claude Console',
    'claude': 'Claude',
    'gemini': 'Gemini',
    'openai': 'OpenAI',
    'bedrock': 'Bedrock',
    'azure-openai': 'Azure OpenAI'
  };
  return names[platform] || platform;
};

const getPlatformTagType = (platform: string) => {
  const types: Record<string, string> = {
    'claude-console': 'primary',
    'claude': 'success',
    'gemini': 'warning',
    'openai': 'info'
  };
  return types[platform] || 'info';
};

const getStatusText = (status: string): string => {
  const texts: Record<string, string> = {
    'active': '活跃',
    'expired': '已过期',
    'error': '错误',
    'created': '已创建'
  };
  return texts[status] || status;
};

const getStatusTagType = (status: string) => {
  const types: Record<string, string> = {
    'active': 'success',
    'expired': 'warning',
    'error': 'danger',
    'created': 'info'
  };
  return types[status] || 'info';
};

const getRpmPercentage = (rpm: number): number => {
  const maxRpm = 100;
  return Math.min((rpm / maxRpm) * 100, 100);
};

const getRpmColor = (rpm: number): string => {
  if (rpm < 20) return '#67c23a';
  if (rpm < 60) return '#e6a23c';
  return '#f56c6c';
};

// 生命周期
onMounted(() => {
  refreshData();
});
</script>

<style scoped>
.accounts-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
}

/* 表格卡片自适应 */
.accounts-view > .el-card:last-child {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.accounts-view > .el-card:last-child :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.accounts-view > .el-card:last-child :deep(.el-table) {
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

.accounts-grid {
  margin-bottom: 16px;
}

.account-card {
  cursor: pointer;
  transition: all 0.3s ease;
  height: 100%;
}

.account-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.account-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.account-info h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
}

.account-icon {
  font-size: 24px;
  color: #3b82f6;
}

.account-metrics {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-label {
  font-size: 12px;
  color: #6b7280;
}

.metric-value {
  font-weight: 600;
  color: #1f2937;
}

.metric-value.expense {
  color: #ef4444;
}

.group-info {
  margin-top: 12px;
}

.group-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.group-name {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #374151;
}

.group-stats {
  display: flex;
  gap: 8px;
}

.group-stat {
  font-size: 11px;
  color: #6b7280;
}

.last-used {
  margin-top: 8px;
  text-align: right;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
}

.account-name-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.token-usage {
  font-weight: 600;
  color: #059669;
}

.expense {
  font-weight: 600;
  color: #dc2626;
}

.rpm-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rpm-value {
  font-size: 12px;
  font-weight: bold;
}

.no-group {
  color: #9ca3af;
  font-size: 12px;
}

.active-users {
  font-weight: 600;
  color: #059669;
}

.account-details {
  padding: 16px 0;
}

.usage-charts {
  padding: 20px;
  background: #f9fafb;
  border-radius: 8px;
  text-align: center;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.stat-title {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #1e293b;
}
</style>