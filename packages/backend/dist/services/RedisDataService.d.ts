import { ApiKeyInfo, ApiKeyStatistics, UsageData } from '@account-dashboard/shared';
export declare class RedisDataService {
    /**
     * 获取API Key基本信息
     */
    getApiKeyInfo(keyId: string): Promise<ApiKeyInfo | null>;
    /**
     * 获取API Key使用统计数据
     */
    getApiKeyUsage(keyId: string, timeRange: 'today' | 'yesterday' | string): Promise<UsageData>;
    /**
     * 计算API Key的RPM（每分钟请求数）
     */
    calculateRPM(keyId: string, minutes?: number): Promise<number>;
    /**
     * 获取API Key的费用信息
     */
    getApiKeyCost(keyId: string, dateStr: string): Promise<number>;
    /**
     * 获取分组信息
     */
    getGroupInfo(groupId: string): Promise<{
        id: string;
        name: string;
    } | null>;
    /**
     * 获取所有API Key列表
     */
    getAllApiKeys(): Promise<string[]>;
    /**
     * 获取完整的API Key统计信息
     */
    getApiKeyStatistics(keyId: string): Promise<ApiKeyStatistics | null>;
    /**
     * 计算最近N分钟的总请求数
     */
    private calculateRecentRequests;
    /**
     * 获取多个API Key的统计信息
     */
    getMultipleApiKeyStatistics(keyIds: string[]): Promise<ApiKeyStatistics[]>;
    /**
     * 获取系统分钟级指标
     */
    getSystemMetrics(timestamp?: number): Promise<any>;
    /**
     * 健康检查
     */
    healthCheck(): Promise<{
        status: 'healthy' | 'unhealthy';
        latency?: number;
        error?: string;
    }>;
    /**
     * 获取集合成员
     */
    smembers(key: string): Promise<string[]>;
}
//# sourceMappingURL=RedisDataService.d.ts.map