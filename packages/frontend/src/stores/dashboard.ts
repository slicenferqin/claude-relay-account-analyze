import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { 
  ApiKeyStatistics, 
  ApiKeyQueryParams
} from '../types/apikey';
import { 
  AccountStatistics,
  AccountQueryParams 
} from '../types/account';
import { AccountGroup } from '../types/group';
import { SystemMetrics } from '../types/system';
import { apiClient } from '../utils/api';
import { useSocketStore } from './socket';

export const useDashboardStore = defineStore('dashboard', () => {
  // 状态
  const apiKeys = ref<ApiKeyStatistics[]>([]);
  const accounts = ref<AccountStatistics[]>([]);
  const groups = ref<AccountGroup[]>([]);
  const systemMetrics = ref<SystemMetrics | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 分页和过滤状态
  const apiKeyFilters = ref<ApiKeyQueryParams>({
    page: 1,
    limit: 20,
    isActive: true
  });
  
  const accountFilters = ref<AccountQueryParams>({
    page: 1,
    limit: 20,
    status: 'active'
  });

  // 实时更新控制
  const refreshInterval = ref(10000); // 10秒
  const lastRefresh = ref<Date | null>(null);
  const isAutoRefresh = ref(true);

  // 计算属性
  const activeApiKeys = computed(() => {
    return apiKeys.value.filter(key => key.isActive);
  });

  const totalDailyCost = computed(() => {
    return apiKeys.value.reduce((sum, key) => {
      return sum + (key.usage?.today?.cost || 0);
    }, 0);
  });

  const topUsageAccounts = computed(() => {
    return accounts.value
      .sort((a, b) => b.todayTokenUsage - a.todayTokenUsage)
      .slice(0, 10);
  });

  const activeAccountsCount = computed(() => {
    return accounts.value.filter(account => account.isActive).length;
  });

  const totalTodayRequests = computed(() => {
    return apiKeys.value.reduce((sum, key) => {
      return sum + (key.usage?.today?.requests || 0);
    }, 0);
  });

  const averageRPM = computed(() => {
    const totalRpm = apiKeys.value.reduce((sum, key) => sum + key.rpm, 0);
    return apiKeys.value.length > 0 ? Math.round(totalRpm / apiKeys.value.length) : 0;
  });

  // Actions
  const fetchApiKeys = async (filters: ApiKeyQueryParams = {}) => {
    try {
      loading.value = true;
      error.value = null;
      
      const response = await apiClient.get('/api/apikeys', {
        params: { ...apiKeyFilters.value, ...filters }
      });
      
      if (response.data.success) {
        apiKeys.value = response.data.data;
        lastRefresh.value = new Date();
        // 返回完整响应数据，包括分页信息
        return response.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch API keys');
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error fetching API keys:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchAccounts = async (filters: AccountQueryParams = {}) => {
    try {
      loading.value = true;
      error.value = null;
      
      const response = await apiClient.get('/api/accounts', {
        params: { ...accountFilters.value, ...filters }
      });
      
      if (response.data.success) {
        accounts.value = response.data.data;
        lastRefresh.value = new Date();
      } else {
        throw new Error(response.data.error || 'Failed to fetch accounts');
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error fetching accounts:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await apiClient.get('/api/groups');
      
      if (response.data.success) {
        groups.value = response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch groups');
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error fetching groups:', err);
    }
  };

  const fetchSystemMetrics = async () => {
    try {
      const response = await apiClient.get('/api/realtime/system-metrics');
      
      if (response.data.success) {
        systemMetrics.value = response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch system metrics');
      }
    } catch (err) {
      console.error('Error fetching system metrics:', err);
    }
  };

  const getApiKeyById = async (keyId: string) => {
    try {
      const response = await apiClient.get(`/api/apikeys/${keyId}`);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch API key');
      }
    } catch (err) {
      console.error(`Error fetching API key ${keyId}:`, err);
      throw err;
    }
  };

  const getAccountById = async (accountId: string) => {
    try {
      const response = await apiClient.get(`/api/accounts/${accountId}`);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch account');
      }
    } catch (err) {
      console.error(`Error fetching account ${accountId}:`, err);
      throw err;
    }
  };

  const getGroupMembers = async (groupId: string) => {
    try {
      const response = await apiClient.get(`/api/groups/${groupId}/members`);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch group members');
      }
    } catch (err) {
      console.error(`Error fetching group members for ${groupId}:`, err);
      throw err;
    }
  };

  const updateApiKeyFilters = (newFilters: Partial<ApiKeyQueryParams>) => {
    apiKeyFilters.value = { ...apiKeyFilters.value, ...newFilters };
    fetchApiKeys();
  };

  const updateAccountFilters = (newFilters: Partial<AccountQueryParams>) => {
    accountFilters.value = { ...accountFilters.value, ...newFilters };
    fetchAccounts();
  };

  // 实时数据更新处理
  const handleApiKeyUpdate = (updatedApiKey: ApiKeyStatistics) => {
    const index = apiKeys.value.findIndex(key => key.keyId === updatedApiKey.keyId);
    if (index !== -1) {
      apiKeys.value[index] = updatedApiKey;
    } else {
      apiKeys.value.push(updatedApiKey);
    }
  };

  const handleAccountUpdate = (updatedAccount: AccountStatistics) => {
    const index = accounts.value.findIndex(account => account.accountId === updatedAccount.accountId);
    if (index !== -1) {
      accounts.value[index] = updatedAccount;
    } else {
      accounts.value.push(updatedAccount);
    }
  };

  const handleSystemMetricsUpdate = (metrics: SystemMetrics) => {
    systemMetrics.value = metrics;
  };

  // 自动刷新控制
  const setAutoRefresh = (enabled: boolean) => {
    isAutoRefresh.value = enabled;
  };

  const setRefreshInterval = (interval: number) => {
    refreshInterval.value = interval;
  };

  // 初始化数据
  const initializeData = async () => {
    await Promise.all([
      fetchApiKeys(),
      fetchAccounts(), 
      fetchGroups(),
      fetchSystemMetrics()
    ]);

    // 设置WebSocket事件监听
    const socketStore = useSocketStore();
    socketStore.onApiKeyUpdate(handleApiKeyUpdate);
    socketStore.onAccountUpdate(handleAccountUpdate);
    socketStore.onSystemMetricsUpdate(handleSystemMetricsUpdate);
  };

  // 刷新所有数据
  const refreshAllData = async () => {
    if (loading.value) return;
    
    await Promise.all([
      fetchApiKeys(),
      fetchAccounts(),
      fetchSystemMetrics()
    ]);
  };

  // 清除错误
  const clearError = () => {
    error.value = null;
  };

  return {
    // 状态
    apiKeys,
    accounts,
    groups,
    systemMetrics,
    loading,
    error,
    apiKeyFilters,
    accountFilters,
    refreshInterval,
    lastRefresh,
    isAutoRefresh,

    // 计算属性
    activeApiKeys,
    totalDailyCost,
    topUsageAccounts,
    activeAccountsCount,
    totalTodayRequests,
    averageRPM,

    // Actions
    fetchApiKeys,
    fetchAccounts,
    fetchGroups,
    fetchSystemMetrics,
    getApiKeyById,
    getAccountById,
    getGroupMembers,
    updateApiKeyFilters,
    updateAccountFilters,
    handleApiKeyUpdate,
    handleAccountUpdate,
    handleSystemMetricsUpdate,
    setAutoRefresh,
    setRefreshInterval,
    initializeData,
    refreshAllData,
    clearError
  };
});