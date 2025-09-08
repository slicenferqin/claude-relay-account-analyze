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
  // 分页显示数据（当前页数据）
  const apiKeys = ref<ApiKeyStatistics[]>([]);
  const accounts = ref<AccountStatistics[]>([]);
  
  // 全量统计数据
  const apiKeysStats = ref({
    total: 0,
    active: 0,
    totalDailyCost: 0,
    totalTodayRequests: 0,
    averageRPM: 0
  });
  
  const accountsStats = ref({
    total: 0,
    active: 0
  });
  
  // 其他数据
  const groups = ref<AccountGroup[]>([]);
  const systemMetrics = ref<SystemMetrics | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 分页和过滤状态
  const apiKeyFilters = ref<ApiKeyQueryParams>({
    page: 1,
    limit: 20,
    isActive: true  // 默认显示活跃的API Keys
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

  // 计算属性 - 基于统计数据
  const activeApiKeys = computed(() => {
    return apiKeysStats.value.active;
  });

  const totalDailyCost = computed(() => {
    return apiKeysStats.value.totalDailyCost;
  });

  const topUsageAccounts = computed(() => {
    return accounts.value
      .sort((a, b) => b.todayTokenUsage - a.todayTokenUsage)
      .slice(0, 10);
  });

  const activeAccountsCount = computed(() => {
    return accountsStats.value.active;
  });

  const totalTodayRequests = computed(() => {
    return apiKeysStats.value.totalTodayRequests;
  });

  const averageRPM = computed(() => {
    return apiKeysStats.value.averageRPM;
  });

  // Actions
  // 获取API Keys统计数据
  const fetchApiKeysStats = async () => {
    try {
      const response = await apiClient.get('/api/apikeys', {
        params: { 
          // 获取全量数据进行统计，不分页
          page: 1,
          limit: 10000  // 获取足够大的数据量
        }
      });
      
      if (response.data.success) {
        const allApiKeys = response.data.data;
        
        // 计算统计数据
        apiKeysStats.value = {
          total: allApiKeys.length,
          active: allApiKeys.filter((key: any) => key.isActive).length,
          totalDailyCost: allApiKeys.reduce((sum: number, key: any) => {
            return sum + (key.usage?.today?.cost || 0);
          }, 0),
          totalTodayRequests: allApiKeys.reduce((sum: number, key: any) => {
            return sum + (key.usage?.today?.requests || 0);
          }, 0),
          averageRPM: allApiKeys.length > 0 ? 
            Math.round(allApiKeys.reduce((sum: number, key: any) => sum + key.rpm, 0) / allApiKeys.length) : 0
        };
      }
    } catch (err) {
      console.error('Error fetching API keys stats:', err);
    }
  };

  // 获取账号统计数据
  const fetchAccountsStats = async () => {
    try {
      const response = await apiClient.get('/api/accounts', {
        params: { 
          page: 1,
          limit: 10000
        }
      });
      
      if (response.data.success) {
        const allAccounts = response.data.data;
        
        accountsStats.value = {
          total: allAccounts.length,
          active: allAccounts.filter((account: any) => account.isActive).length
        };
      }
    } catch (err) {
      console.error('Error fetching accounts stats:', err);
    }
  };

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
      fetchApiKeysStats(),  // 获取统计数据
      fetchAccountsStats(), // 获取统计数据
      fetchApiKeys(),       // 获取分页数据
      fetchAccounts(),      // 获取分页数据
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
      fetchApiKeysStats(),  // 刷新统计数据
      fetchAccountsStats(), // 刷新统计数据
      fetchApiKeys(),       // 刷新分页数据
      fetchAccounts(),      // 刷新分页数据
      fetchSystemMetrics()
    ]);
  };

  // 清除错误
  const clearError = () => {
    error.value = null;
  };

  return {
    // 分页数据（当前页）
    apiKeys,
    accounts,
    
    // 统计数据（全量）
    apiKeysStats,
    accountsStats,
    
    // 其他数据
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
    fetchApiKeysStats,
    fetchAccountsStats,
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