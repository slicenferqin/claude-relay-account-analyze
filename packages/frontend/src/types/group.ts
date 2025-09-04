// 分组相关类型
export interface AccountGroup {
  id: string;
  name: string;
  platform: string;
  description?: string;
  memberCount: number;
  members: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GroupStatistics extends AccountGroup {
  activeMembers: number;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  avgRpm: number;
  topAccounts: Array<{
    accountId: string;
    accountName: string;
    requests: number;
    tokens: number;
    cost: number;
  }>;
}

export interface GroupMemberInfo {
  accountId: string;
  accountName: string;
  isActive: boolean;
  lastUsedAt: string;
  todayRequests: number;
  todayTokens: number;
  todayCost: number;
}