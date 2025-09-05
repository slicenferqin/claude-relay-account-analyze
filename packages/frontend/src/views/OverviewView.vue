<template>
  <div class="overview-view">
    <!-- 顶部统计卡片 -->
    <div class="stats-overview">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><Key /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ dashboardStore.activeApiKeys.length }}</div>
                <div class="stat-title">活跃API Keys</div>
                <div class="stat-trend">
                  <el-icon class="trend-icon up"><ArrowUp /></el-icon>
                  <span class="trend-text">+5.2%</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon expense">
                <el-icon><Money /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ formatCurrency(dashboardStore.totalDailyCost) }}</div>
                <div class="stat-title">今日总消费</div>
                <div class="stat-trend">
                  <el-icon class="trend-icon down"><ArrowDown /></el-icon>
                  <span class="trend-text">-2.1%</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon requests">
                <el-icon><Promotion /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ formatNumber(dashboardStore.totalTodayRequests) }}</div>
                <div class="stat-title">今日总请求</div>
                <div class="stat-trend">
                  <el-icon class="trend-icon up"><ArrowUp /></el-icon>
                  <span class="trend-text">+8.7%</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon accounts">
                <el-icon><User /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ dashboardStore.activeAccountsCount }}</div>
                <div class="stat-title">活跃账号</div>
                <div class="stat-trend">
                  <el-icon class="trend-icon up"><ArrowUp /></el-icon>
                  <span class="trend-text">+1.3%</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 图表区域 -->
    <el-row :gutter="16">
      <!-- 请求趋势图 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="chart-header">
              <span>今日请求趋势</span>
              <el-radio-group v-model="requestsTimeRange" size="small">
                <el-radio-button label="24h">24小时</el-radio-button>
                <el-radio-button label="12h">12小时</el-radio-button>
                <el-radio-button label="6h">6小时</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="chart-container">
            <v-chart :option="requestsChartOption" style="height: 300px;" />
          </div>
        </el-card>
      </el-col>

      <!-- Token使用分布 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>Token使用分布</span>
          </template>
          <div class="chart-container">
            <v-chart :option="tokenDistributionOption" style="height: 300px;" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 第二行图表 -->
    <el-row :gutter="16" style="margin-top: 16px;">
      <!-- 费用趋势 -->
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>费用趋势</span>
          </template>
          <div class="chart-container">
            <v-chart :option="costTrendOption" style="height: 250px;" />
          </div>
        </el-card>
      </el-col>

      <!-- 平台分布 -->
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>平台分布</span>
          </template>
          <div class="chart-container">
            <v-chart :option="platformDistributionOption" style="height: 250px;" />
          </div>
        </el-card>
      </el-col>

      <!-- 实时系统指标 -->
      <el-col :span="8">
        <el-card>
          <template #header>
            <div class="chart-header">
              <span>实时系统指标</span>
              <el-tag :type="systemStatus" size="small">
                {{ systemStatusText }}
              </el-tag>
            </div>
          </template>
          <div class="system-metrics">
            <div class="metric-item" v-if="dashboardStore.systemMetrics">
              <div class="metric-label">每分钟请求</div>
              <div class="metric-value">{{ dashboardStore.systemMetrics.requests }}</div>
            </div>
            <div class="metric-item" v-if="dashboardStore.systemMetrics">
              <div class="metric-label">总Token</div>
              <div class="metric-value">{{ formatNumber(dashboardStore.systemMetrics.totalTokens) }}</div>
            </div>
            <div class="metric-item" v-if="dashboardStore.systemMetrics">
              <div class="metric-label">输入Token</div>
              <div class="metric-value">{{ formatNumber(dashboardStore.systemMetrics.inputTokens) }}</div>
            </div>
            <div class="metric-item" v-if="dashboardStore.systemMetrics">
              <div class="metric-label">输出Token</div>
              <div class="metric-value">{{ formatNumber(dashboardStore.systemMetrics.outputTokens) }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 顶部使用者和API Keys -->
    <el-row :gutter="16" style="margin-top: 16px;">
      <!-- TOP API Keys -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>使用量TOP API Keys</span>
          </template>
          <div class="top-list">
            <div 
              v-for="(apiKey, index) in topApiKeys" 
              :key="apiKey.keyId"
              class="top-item"
            >
              <div class="rank">{{ index + 1 }}</div>
              <div class="item-info">
                <div class="item-name">{{ apiKey.name }}</div>
                <div class="item-detail">
                  {{ formatNumber(apiKey.usage?.today?.requests || 0) }} 请求 • 
                  {{ formatCurrency(apiKey.usage?.today?.cost || 0) }}
                </div>
              </div>
              <div class="item-progress">
                <el-progress 
                  :percentage="getUsagePercentage(apiKey.usage?.today?.requests || 0)"
                  :stroke-width="6"
                  :show-text="false"
                />
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- TOP 账号 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>使用量TOP 账号</span>
          </template>
          <div class="top-list">
            <div 
              v-for="(account, index) in dashboardStore.topUsageAccounts" 
              :key="account.accountId"
              class="top-item"
            >
              <div class="rank">{{ index + 1 }}</div>
              <div class="item-info">
                <div class="item-name">{{ account.accountName }}</div>
                <div class="item-detail">
                  {{ formatNumber(account.todayTokenUsage) }} Tokens • 
                  {{ formatCurrency(account.todayExpense) }}
                </div>
              </div>
              <div class="item-progress">
                <el-progress 
                  :percentage="getTokenPercentage(account.todayTokenUsage)"
                  :stroke-width="6"
                  :show-text="false"
                />
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { use } from 'echarts/core';
import { LineChart, PieChart, BarChart } from 'echarts/charts';
import { 
  TitleComponent, 
  TooltipComponent, 
  LegendComponent,
  GridComponent 
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';

import {
  Key, Money, Promotion, User,
  ArrowUp, ArrowDown
} from '@element-plus/icons-vue';

import { useDashboardStore } from '../stores/dashboard';
import { formatNumber, formatCurrency } from '../utils/format';

// 注册ECharts组件
use([
  LineChart,
  PieChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  CanvasRenderer
]);

const dashboardStore = useDashboardStore();

// 响应式数据
const requestsTimeRange = ref('24h');

// 计算属性
const topApiKeys = computed(() => {
  return dashboardStore.apiKeys
    .sort((a, b) => (b.usage?.today?.requests || 0) - (a.usage?.today?.requests || 0))
    .slice(0, 5);
});

const systemStatus = computed(() => {
  if (!dashboardStore.systemMetrics) return 'info';
  const requests = dashboardStore.systemMetrics.requests;
  if (requests > 100) return 'danger';
  if (requests > 50) return 'warning';
  return 'success';
});

const systemStatusText = computed(() => {
  const statusMap = {
    'success': '正常',
    'warning': '繁忙',
    'danger': '高负载',
    'info': '无数据'
  };
  return statusMap[systemStatus.value] || '无数据';
});

// 图表配置
const requestsChartOption = computed(() => {
  // 模拟24小时数据
  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
  const data = Array.from({ length: 24 }, () => Math.floor(Math.random() * 100) + 50);

  return {
    tooltip: {
      trigger: 'axis',
      formatter: '{a}: {c} 请求'
    },
    xAxis: {
      type: 'category',
      data: hours,
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      name: '请求数'
    },
    series: [{
      name: '请求数',
      type: 'line',
      data: data,
      smooth: true,
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(59, 130, 246, 0.5)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0.1)' }
          ]
        }
      },
      lineStyle: {
        color: '#3b82f6'
      }
    }]
  };
});

const tokenDistributionOption = computed(() => {
  const data = [
    { name: 'Input Tokens', value: 45 },
    { name: 'Output Tokens', value: 30 },
    { name: 'Cache Create', value: 15 },
    { name: 'Cache Read', value: 10 }
  ];

  return {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c}% ({d}%)'
    },
    series: [{
      name: 'Token分布',
      type: 'pie',
      radius: ['40%', '70%'],
      data: data,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  };
});

const costTrendOption = computed(() => {
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const costs = [120, 132, 101, 134, 90, 230, 210];

  return {
    tooltip: {
      trigger: 'axis',
      formatter: '{a}: ${c}'
    },
    xAxis: {
      type: 'category',
      data: days
    },
    yAxis: {
      type: 'value',
      name: '费用 ($)'
    },
    series: [{
      name: '费用',
      type: 'bar',
      data: costs,
      itemStyle: {
        color: '#10b981'
      }
    }]
  };
});

const platformDistributionOption = computed(() => {
  const platformData = dashboardStore.accounts.reduce((acc, account) => {
    acc[account.platform] = (acc[account.platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(platformData).map(([name, value]) => ({ name, value }));

  return {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    series: [{
      name: '平台分布',
      type: 'pie',
      radius: '60%',
      data: data,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  };
});

// 方法
const getUsagePercentage = (requests: number): number => {
  const maxRequests = Math.max(...topApiKeys.value.map(key => key.usage?.today?.requests || 0));
  return maxRequests > 0 ? (requests / maxRequests) * 100 : 0;
};

const getTokenPercentage = (tokens: number): number => {
  const maxTokens = Math.max(...dashboardStore.topUsageAccounts.map(acc => acc.todayTokenUsage));
  return maxTokens > 0 ? (tokens / maxTokens) * 100 : 0;
};

// 生命周期
onMounted(() => {
  // 初始化数据
  dashboardStore.initializeData();
});
</script>

<style scoped>
.overview-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
}

.stats-overview {
  margin-bottom: 16px;
}

.stat-card {
  height: 120px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 100%;
}

.stat-icon {
  font-size: 32px;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  width: 56px;
  height: 56px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon.expense {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.stat-icon.requests {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}

.stat-icon.accounts {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #1f2937;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-title {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 8px;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 4px;
}

.trend-icon {
  font-size: 12px;
}

.trend-icon.up {
  color: #10b981;
}

.trend-icon.down {
  color: #ef4444;
}

.trend-text {
  font-size: 12px;
  font-weight: 600;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  padding: 8px;
}

.system-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 16px;
}

.metric-item {
  text-align: center;
}

.metric-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 8px;
}

.metric-value {
  font-size: 18px;
  font-weight: bold;
  color: #1f2937;
}

.top-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.top-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 6px;
  background: #f9fafb;
  transition: background-color 0.2s;
}

.top-item:hover {
  background: #f3f4f6;
}

.rank {
  width: 24px;
  height: 24px;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.item-info {
  flex: 1;
}

.item-name {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 2px;
}

.item-detail {
  font-size: 12px;
  color: #6b7280;
}

.item-progress {
  width: 80px;
}
</style>