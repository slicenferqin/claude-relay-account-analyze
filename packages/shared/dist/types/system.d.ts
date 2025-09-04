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
export interface SocketEvents {
    'subscribe:apikey': {
        keyId: string;
    };
    'subscribe:account': {
        accountId: string;
    };
    'subscribe:group': {
        groupId: string;
    };
    'subscribe:system': {};
    'unsubscribe': {
        type: string;
        id: string;
    };
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
