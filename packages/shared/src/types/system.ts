// 系统指标类型
export interface SystemMetrics {
  timestamp: string;
  requests: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreateTokens?: number;
  cacheReadTokens?: number;
  activeConnections?: number;
  errorRate?: number;
  avgResponseTime?: number;
}

// WebSocket事件类型
export interface SocketEvents {
  // 客户端 -> 服务器
  'subscribe:apikey': { keyId: string };
  'subscribe:account': { accountId: string };
  'subscribe:group': { groupId: string };
  'subscribe:system': {};
  'unsubscribe': { type: string; id: string };
  
  // 服务器 -> 客户端
  'apikey:update': ApiKeyStatistics;
  'account:update': AccountStatistics;
  'group:update': GroupStatistics;
  'metrics:update': SystemMetrics;
  'alert': {
    type: 'warning' | 'error' | 'info' | 'success';
    title: string;
    message: string;
    data?: any;
  };
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 查询参数类型
export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
}

export interface ApiKeyQueryParams extends QueryParams {
  groupId?: string;
  isActive?: boolean;
  platform?: string;
  userId?: string;
}

export interface AccountQueryParams extends QueryParams {
  platform?: string;
  groupId?: string;
  status?: string;
  accountType?: string;
}

import { ApiKeyStatistics } from './apikey';
import { AccountStatistics } from './account';
import { GroupStatistics } from './group';