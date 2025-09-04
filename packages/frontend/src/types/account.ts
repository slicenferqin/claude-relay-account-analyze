// 账户相关类型
export interface AccountInfo {
  id: string;
  name: string;
  description?: string;
  email?: string;
  platform: 'claude-console' | 'claude' | 'gemini' | 'openai' | 'bedrock' | 'azure-openai';
  isActive: boolean;
  lastUsedAt: string;
  lastRefreshAt?: string;
  status: 'active' | 'expired' | 'error' | 'created';
  accountType: 'shared' | 'dedicated' | 'group';
  priority: number;
  schedulable: boolean;
  autoStopOnWarning?: boolean;
  proxy?: string;
  createdAt: string;
  errorMessage?: string;
  apiUrl?: string;
  rateLimitDuration?: number;
  rateLimitStatus?: 'limited' | '';
  rateLimitedAt?: string;
}

export interface AccountStatistics {
  accountId: string;
  accountName: string;
  platform: string;
  isActive: boolean;
  status: string;
  todayTokenUsage: number;
  todayExpense: number;
  recentAvgRpm: number;
  lastUsedAt: string;
  group?: {
    id: string;
    name: string;
    totalMembers: number;
    activeMembers: number;
  };
  usage: {
    today: {
      requests: number;
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      cost: number;
    };
    hourly: Array<{
      hour: string;
      requests: number;
      tokens: number;
      cost: number;
    }>;
    models: Record<string, {
      requests: number;
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    }>;
  };
}

export interface CostBreakdown {
  daily: number;
  weekly: number;
  monthly: number;
  total: number;
  breakdown: Array<{
    date: string;
    cost: number;
    requests: number;
    tokens: number;
  }>;
}