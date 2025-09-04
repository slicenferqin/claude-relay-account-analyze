<template>
  <div class="groups-view">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>分组管理</span>
          <el-button type="primary" :icon="Refresh" @click="refreshGroups">
            刷新
          </el-button>
        </div>
      </template>

      <div class="groups-grid">
        <el-row :gutter="16">
          <el-col 
            :span="8" 
            v-for="group in dashboardStore.groups" 
            :key="group.id"
            style="margin-bottom: 16px;"
          >
            <el-card class="group-card" @click="showGroupDetails(group)">
              <div class="group-header">
                <h3 class="group-name">{{ group.name }}</h3>
                <el-tag type="primary" size="small">{{ group.platform }}</el-tag>
              </div>

              <div class="group-stats">
                <div class="stat">
                  <span class="stat-label">成员数量:</span>
                  <span class="stat-value">{{ group.memberCount }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">创建时间:</span>
                  <span class="stat-value">{{ formatTime(group.createdAt) }}</span>
                </div>
              </div>

              <div class="group-description" v-if="group.description">
                <el-text type="info" size="small">{{ group.description }}</el-text>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <div v-if="dashboardStore.groups.length === 0" class="empty-state">
        <el-empty description="暂无分组数据" />
      </div>
    </el-card>

    <!-- 分组详情对话框 -->
    <el-dialog 
      v-model="showDetailDialog" 
      :title="`分组详情: ${selectedGroup?.name}`"
      width="800px"
    >
      <div v-if="selectedGroup && groupMembers" class="group-details">
        <el-descriptions title="分组信息" :column="2" border>
          <el-descriptions-item label="分组名称">
            {{ selectedGroup.name }}
          </el-descriptions-item>
          <el-descriptions-item label="平台">
            {{ selectedGroup.platform }}
          </el-descriptions-item>
          <el-descriptions-item label="成员数量">
            {{ selectedGroup.memberCount }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ new Date(selectedGroup.createdAt).toLocaleString() }}
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            {{ selectedGroup.description || '无描述' }}
          </el-descriptions-item>
        </el-descriptions>

        <el-divider />

        <h4>成员账户</h4>
        <el-table :data="groupMembers.accounts" stripe>
          <el-table-column prop="accountName" label="账户名称" />
          <el-table-column prop="platform" label="平台" />
          <el-table-column prop="isActive" label="状态">
            <template #default="{ row }">
              <el-tag :type="row.isActive ? 'success' : 'danger'" size="small">
                {{ row.isActive ? '活跃' : '非活跃' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="lastUsedAt" label="最后使用时间">
            <template #default="{ row }">
              {{ formatTime(row.lastUsedAt) }}
            </template>
          </el-table-column>
        </el-table>

        <el-divider />

        <h4>关联API Keys</h4>
        <el-table :data="groupMembers.apiKeys" stripe>
          <el-table-column prop="name" label="API Key名称" />
          <el-table-column prop="isActive" label="状态">
            <template #default="{ row }">
              <el-tag :type="row.isActive ? 'success' : 'danger'" size="small">
                {{ row.isActive ? '活跃' : '非活跃' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="rpm" label="RPM" />
          <el-table-column prop="usage.today.cost" label="今日费用">
            <template #default="{ row }">
              {{ formatCurrency(row.usage?.today?.cost || 0) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Refresh } from '@element-plus/icons-vue';
import { useDashboardStore } from '../stores/dashboard';
import { formatTime, formatCurrency } from '../utils/format';
import type { AccountGroup } from "../types/group";

const dashboardStore = useDashboardStore();

// 响应式数据
const showDetailDialog = ref(false);
const selectedGroup = ref<AccountGroup | null>(null);
const groupMembers = ref<any>(null);

// 方法
const refreshGroups = async () => {
  await dashboardStore.fetchGroups();
};

const showGroupDetails = async (group: AccountGroup) => {
  selectedGroup.value = group;
  showDetailDialog.value = true;
  
  try {
    groupMembers.value = await dashboardStore.getGroupMembers(group.id);
  } catch (error) {
    console.error('Error loading group members:', error);
  }
};

// 生命周期
onMounted(() => {
  refreshGroups();
});
</script>

<style scoped>
.groups-view {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.groups-grid {
  min-height: 400px;
}

.group-card {
  cursor: pointer;
  transition: all 0.3s ease;
  height: 160px;
}

.group-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.group-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.group-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
}

.stat-value {
  font-size: 12px;
  font-weight: 600;
  color: #1f2937;
}

.group-description {
  margin-top: 12px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
}

.group-details {
  padding: 16px 0;
}

.group-details h4 {
  margin: 16px 0 8px 0;
  color: #1f2937;
}
</style>